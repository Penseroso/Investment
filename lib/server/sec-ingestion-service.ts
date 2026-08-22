import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { filingDocuments, ingestRuns } from "@/db/schema";
import type { SecFiling, SecPayload } from "@/lib/research-contracts";
import { getSecEnabledCompany } from "@/lib/server/company-service";

const MAX_STORED_FILINGS = 80;
const MAX_FILINGS_PER_FORM = 20;
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

function secUserAgent() {
  const contactName = process.env.SEC_CONTACT_NAME?.trim();
  const contactEmail = process.env.SEC_CONTACT_EMAIL?.trim();
  return ["InvestmentSignalDesk/1.0", contactName, contactEmail]
    .filter(Boolean)
    .join(" ");
}

type SecCompany = NonNullable<Awaited<ReturnType<typeof getSecEnabledCompany>>>;

type SecRecent = {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime?: string[];
  act?: string[];
  form: string[];
  fileNumber?: string[];
  filmNumber?: string[];
  items?: string[];
  core_type?: string[];
  size?: number[];
  isXBRL?: number[];
  isInlineXBRL?: number[];
  isXBRLNumeric?: number[];
  primaryDocument: string[];
  primaryDocDescription?: string[];
};

type SecSubmission = {
  cik: string;
  name: string;
  filings: {
    recent: SecRecent;
    files?: Array<{
      name: string;
      filingCount: number;
      filingFrom: string;
      filingTo: string;
    }>;
  };
};

type SecRecentBatch = { recent: SecRecent; submissionFile: string | null };

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

export function normalizeSubmission(
  submissionName: string,
  batches: SecRecentBatch[],
  company: SecCompany,
) {
  const allowedForms = new Set(company.filingForms);
  const cikCompact = String(Number(company.cik));
  const formCounts = new Map<string, number>();

  return batches
    .flatMap(({ recent, submissionFile }) =>
      recent.form.map((form, index) => ({ form, index, recent, submissionFile })),
    )
    .filter(({ form }) => allowedForms.has(form))
    .sort(
      (left, right) =>
        right.recent.filingDate[right.index].localeCompare(
          left.recent.filingDate[left.index],
        ) ||
        (right.recent.acceptanceDateTime?.[right.index] ?? "").localeCompare(
          left.recent.acceptanceDateTime?.[left.index] ?? "",
        ),
    )
    .filter(({ form }) => {
      const nextCount = (formCounts.get(form) ?? 0) + 1;
      formCounts.set(form, nextCount);
      return nextCount <= MAX_FILINGS_PER_FORM;
    })
    .slice(0, MAX_STORED_FILINGS)
    .map(({ form, index, recent, submissionFile }) => {
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
        act: recent.act?.[index] || null,
        fileNumber: recent.fileNumber?.[index] || null,
        filmNumber: recent.filmNumber?.[index] || null,
        items: (recent.items?.[index] ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        sizeBytes: recent.size?.[index] ?? null,
        isXbrl: recent.isXBRL?.[index] === 1,
        isInlineXbrl: recent.isInlineXBRL?.[index] === 1,
        title:
          recent.primaryDocDescription?.[index] ||
          `${form} filing for ${submissionName}`,
        primaryDocument,
        primaryDocumentDescription: recent.primaryDocDescription?.[index] || null,
        url: `https://www.sec.gov/Archives/edgar/data/${cikCompact}/${accessionCompact}/${primaryDocument}`,
        submissionFile,
        sourceMetadata: {
          coreType: recent.core_type?.[index] || null,
          isXbrlNumeric: recent.isXBRLNumeric?.[index] === 1,
        },
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
          "User-Agent": secUserAgent(),
        },
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      throw new SecIngestionError(
        `SEC upstream returned ${response.status}`,
        `sec_${response.status}`,
      );
    }

    const submission = (await response.json()) as SecSubmission;
    const historicalResults = await Promise.allSettled(
      (submission.filings.files ?? []).slice(0, 4).map(async (file) => {
        const historicalResponse = await fetch(
          `https://data.sec.gov/submissions/${file.name}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": secUserAgent(),
            },
            signal: AbortSignal.timeout(15_000),
          },
        );
        if (!historicalResponse.ok) {
          throw new Error(`SEC history returned ${historicalResponse.status}`);
        }
        return {
          recent: (await historicalResponse.json()) as SecRecent,
          submissionFile: file.name,
        } satisfies SecRecentBatch;
      }),
    );
    const historicalBatches = historicalResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const documents = normalizeSubmission(
      submission.name,
      [
        { recent: submission.filings.recent, submissionFile: null },
        ...historicalBatches,
      ],
      company,
    );
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
            act: document.act,
            fileNumber: document.fileNumber,
            filmNumber: document.filmNumber,
            items: document.items,
            sizeBytes: document.sizeBytes,
            isXbrl: document.isXbrl,
            isInlineXbrl: document.isInlineXbrl,
            title: document.title,
            primaryDocument: document.primaryDocument,
            primaryDocumentDescription: document.primaryDocumentDescription,
            url: document.url,
            submissionFile: document.submissionFile,
            sourceMetadata: document.sourceMetadata,
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
        responseUpdatedAt: response.headers.get("last-modified"),
        httpStatus: response.status,
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
