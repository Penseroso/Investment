import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { filingDocuments, ingestRuns } from "@/db/schema";
import type { SecFiling, SecPayload } from "@/lib/research-contracts";
import { getSecEnabledCompany } from "@/lib/server/company-service";

const MAX_STORED_FILINGS = 80;
const MAX_FILINGS_PER_FORM = 20;
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

type SecCompany = NonNullable<Awaited<ReturnType<typeof getSecEnabledCompany>>>;

type SecRecent = {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime?: string[];
  form: string[];
  primaryDocument: string[];
  primaryDocDescription?: string[];
};

type SecSubmission = {
  cik: string;
  name: string;
  filings: { recent: SecRecent };
};

type IngestTrigger = "read_through" | "manual";

export class SecIngestionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

function isStale(completedAt: string | null) {
  if (!completedAt) return true;
  const completedTime = new Date(completedAt).getTime();
  return !Number.isFinite(completedTime) || Date.now() - completedTime > STALE_AFTER_MS;
}

function normalizeSubmission(submission: SecSubmission, company: SecCompany) {
  const recent = submission.filings.recent;
  const allowedForms = new Set(company.filingForms);
  const cikCompact = String(Number(company.cik));
  const formCounts = new Map<string, number>();

  return recent.form
    .map((form, index) => ({ form, index }))
    .filter(({ form }) => allowedForms.has(form))
    .filter(({ form }) => {
      const nextCount = (formCounts.get(form) ?? 0) + 1;
      formCounts.set(form, nextCount);
      return nextCount <= MAX_FILINGS_PER_FORM;
    })
    .slice(0, MAX_STORED_FILINGS)
    .map(({ form, index }) => {
      const accession = recent.accessionNumber[index];
      const primaryDocument = recent.primaryDocument[index];
      const accessionCompact = accession.replaceAll("-", "");
      return {
        accession,
        companyTicker: company.ticker,
        cik: company.cik,
        form,
        filingDate: recent.filingDate[index],
        reportDate: recent.reportDate[index] || null,
        acceptedAt: recent.acceptanceDateTime?.[index] || null,
        title:
          recent.primaryDocDescription?.[index] ||
          `${form} filing for ${submission.name}`,
        primaryDocument,
        url: `https://www.sec.gov/Archives/edgar/data/${cikCompact}/${accessionCompact}/${primaryDocument}`,
      };
    });
}

async function listStoredFilings(company: SecCompany): Promise<SecFiling[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(filingDocuments)
    .where(
      and(
        eq(filingDocuments.companyTicker, company.ticker),
        inArray(filingDocuments.form, company.filingForms),
      ),
    )
    .orderBy(desc(filingDocuments.filingDate), desc(filingDocuments.acceptedAt))
    .limit(MAX_STORED_FILINGS);

  return rows.map((row) => ({
    form: row.form,
    filingDate: row.filingDate,
    reportDate: row.reportDate,
    acceptedAt: row.acceptedAt,
    accession: row.accession,
    title: row.title,
    url: row.url,
  }));
}

async function latestSuccessfulRun(companyTicker: string) {
  const db = await getDb();
  const rows = await db
    .select({ completedAt: ingestRuns.completedAt })
    .from(ingestRuns)
    .where(
      and(
        eq(ingestRuns.companyTicker, companyTicker),
        eq(ingestRuns.sourceType, "SEC"),
        eq(ingestRuns.status, "success"),
      ),
    )
    .orderBy(desc(ingestRuns.completedAt))
    .limit(1);
  return rows[0]?.completedAt ?? null;
}

async function ingestSecFilings(company: SecCompany, trigger: IngestTrigger) {
  const db = await getDb();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await db
    .update(ingestRuns)
    .set({
      status: "error",
      completedAt: startedAt,
      errorCode: "superseded",
      errorMessage: "A newer ingestion run replaced this incomplete run.",
    })
    .where(
      and(
        eq(ingestRuns.companyTicker, company.ticker),
        eq(ingestRuns.sourceType, "SEC"),
        eq(ingestRuns.status, "running"),
      ),
    );

  await db.insert(ingestRuns).values({
    id: runId,
    companyTicker: company.ticker,
    sourceType: "SEC",
    trigger,
    status: "running",
    startedAt,
  });

  try {
    const response = await fetch(
      `https://data.sec.gov/submissions/CIK${company.cik}.json`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "InvestmentSignalDesk/0.2 personal-research",
        },
      },
    );

    if (!response.ok) {
      throw new SecIngestionError(
        `SEC upstream returned ${response.status}`,
        `sec_${response.status}`,
      );
    }

    const submission = (await response.json()) as SecSubmission;
    const documents = normalizeSubmission(submission, company);
    const existing = documents.length
      ? await db
          .select({ accession: filingDocuments.accession })
          .from(filingDocuments)
          .where(inArray(filingDocuments.accession, documents.map((item) => item.accession)))
      : [];
    const existingAccessions = new Set(existing.map((item) => item.accession));
    const lastSeenAt = new Date().toISOString();

    const upserts = documents.map((document) =>
      db
        .insert(filingDocuments)
        .values({ ...document, sourceType: "SEC", lastSeenAt })
        .onConflictDoUpdate({
          target: filingDocuments.accession,
          set: {
            form: document.form,
            filingDate: document.filingDate,
            reportDate: document.reportDate,
            acceptedAt: document.acceptedAt,
            title: document.title,
            primaryDocument: document.primaryDocument,
            url: document.url,
            lastSeenAt,
          },
        }),
    );
    if (upserts.length) {
      await db.batch(
        upserts as [typeof upserts[number], ...Array<typeof upserts[number]>],
      );
    }

    const completedAt = new Date().toISOString();
    await db
      .update(ingestRuns)
      .set({
        status: "success",
        completedAt,
        documentsSeen: documents.length,
        documentsInserted: documents.filter(
          (document) => !existingAccessions.has(document.accession),
        ).length,
      })
      .where(eq(ingestRuns.id, runId));
    return completedAt;
  } catch (error) {
    const ingestionError =
      error instanceof SecIngestionError
        ? error
        : new SecIngestionError(
            error instanceof Error ? error.message : "Unknown SEC ingestion error",
            "sec_ingestion_failed",
          );
    await db
      .update(ingestRuns)
      .set({
        status: "error",
        completedAt: new Date().toISOString(),
        errorCode: ingestionError.code,
        errorMessage: ingestionError.message.slice(0, 500),
      })
      .where(eq(ingestRuns.id, runId));
    throw ingestionError;
  }
}

export async function getSecFilingFeed(
  ticker: string,
  options: { forceRefresh?: boolean } = {},
): Promise<SecPayload> {
  const company = await getSecEnabledCompany(ticker);
  if (!company) {
    throw new SecIngestionError("공시 수집이 활성화된 종목이 아닙니다.", "unsupported_company");
  }

  let storedFilings = await listStoredFilings(company);
  let completedAt = await latestSuccessfulRun(company.ticker);
  let source: SecPayload["source"] = "stored";
  const refreshNeeded = options.forceRefresh || !storedFilings.length || isStale(completedAt);

  if (refreshNeeded) {
    try {
      completedAt = await ingestSecFilings(
        company,
        options.forceRefresh ? "manual" : "read_through",
      );
      storedFilings = await listStoredFilings(company);
      source = "refreshed";
    } catch (error) {
      if (options.forceRefresh || !storedFilings.length) throw error;
    }
  }

  return {
    companyName: company.name,
    cik: company.cik,
    filings: storedFilings,
    fetchedAt: completedAt ?? new Date(0).toISOString(),
    source,
    stale: isStale(completedAt),
  };
}
