import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { ingestRuns, irDocuments, irSourceConfigs } from "@/db/schema";
import type { IrDocument, IrPayload } from "@/lib/research-contracts";
import { getCompanyRecord } from "@/lib/server/company-service";
import {
  parseIrListing,
  type IrSourceSeed,
} from "@/lib/server/ir-adapters";

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
type IngestTrigger = "read_through" | "manual";

export class IrIngestionError extends Error {
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

function documentId(ticker: string, url: string) {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${ticker.toLowerCase()}-${(hash >>> 0).toString(36)}`;
}

async function getIrSource(ticker: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(irSourceConfigs)
    .where(
      and(
        eq(irSourceConfigs.companyTicker, ticker.trim().toUpperCase()),
        eq(irSourceConfigs.enabled, true),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ticker: row.companyTicker as IrSourceSeed["ticker"],
    adapterKey: row.adapterKey as IrSourceSeed["adapterKey"],
    listingUrl: row.listingUrl,
    maxDocuments: row.maxDocuments,
  } satisfies IrSourceSeed;
}

async function listStoredDocuments(source: IrSourceSeed): Promise<IrDocument[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(irDocuments)
    .where(eq(irDocuments.companyTicker, source.ticker))
    .orderBy(desc(irDocuments.publishedAt), irDocuments.sourceOrder)
    .limit(source.maxDocuments);
  return rows.map((row) => ({
    id: row.id,
    documentType: row.documentType as IrDocument["documentType"],
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt,
  }));
}

async function latestSuccessfulRun(ticker: string) {
  const db = await getDb();
  const rows = await db
    .select({ completedAt: ingestRuns.completedAt })
    .from(ingestRuns)
    .where(
      and(
        eq(ingestRuns.companyTicker, ticker),
        eq(ingestRuns.sourceType, "IR"),
        eq(ingestRuns.status, "success"),
      ),
    )
    .orderBy(desc(ingestRuns.completedAt))
    .limit(1);
  return rows[0]?.completedAt ?? null;
}

async function ingestIrDocuments(source: IrSourceSeed, trigger: IngestTrigger) {
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
        eq(ingestRuns.companyTicker, source.ticker),
        eq(ingestRuns.sourceType, "IR"),
        eq(ingestRuns.status, "running"),
      ),
    );
  await db.insert(ingestRuns).values({
    id: runId,
    companyTicker: source.ticker,
    sourceType: "IR",
    trigger,
    status: "running",
    startedAt,
  });
  await db
    .update(irSourceConfigs)
    .set({ lastAttemptAt: startedAt, lastErrorCode: null })
    .where(eq(irSourceConfigs.companyTicker, source.ticker));

  try {
    let html = "";
    if (source.adapterKey !== "tsm_official_paths") {
      const response = await fetch(source.listingUrl, {
        signal: AbortSignal.timeout(20_000),
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "InvestmentSignalDesk/0.3 personal-research",
        },
      });
      if (!response.ok) {
        throw new IrIngestionError(
          `IR upstream returned ${response.status}`,
          `ir_${response.status}`,
        );
      }
      html = await response.text();
    }
    const documents = parseIrListing(source, html);
    if (!documents.length) {
      throw new IrIngestionError("No recognized IR documents", "ir_parser_empty");
    }
    const ids = documents.map((document) => documentId(source.ticker, document.url));
    const existing = await db
      .select({ id: irDocuments.id })
      .from(irDocuments)
      .where(inArray(irDocuments.id, ids));
    const existingIds = new Set(existing.map((item) => item.id));
    const lastSeenAt = new Date().toISOString();
    const upserts = documents.map((document, index) => {
      const id = ids[index];
      return db
        .insert(irDocuments)
        .values({
          id,
          companyTicker: source.ticker,
          ...document,
          sourcePageUrl: source.listingUrl,
          lastSeenAt,
        })
        .onConflictDoUpdate({
          target: irDocuments.id,
          set: {
            documentType: document.documentType,
            title: document.title,
            url: document.url,
            publishedAt: document.publishedAt,
            sourcePageUrl: source.listingUrl,
            sourceOrder: document.sourceOrder,
            lastSeenAt,
          },
        });
    });
    await db.batch(
      upserts as [typeof upserts[number], ...Array<typeof upserts[number]>],
    );

    const completedAt = new Date().toISOString();
    await db.batch([
      db
        .update(ingestRuns)
        .set({
          status: "success",
          completedAt,
          documentsSeen: documents.length,
          documentsInserted: ids.filter((id) => !existingIds.has(id)).length,
        })
        .where(eq(ingestRuns.id, runId)),
      db
        .update(irSourceConfigs)
        .set({ lastSuccessfulAt: completedAt, lastErrorCode: null })
        .where(eq(irSourceConfigs.companyTicker, source.ticker)),
    ]);
    return completedAt;
  } catch (error) {
    const ingestionError =
      error instanceof IrIngestionError
        ? error
        : new IrIngestionError(
            error instanceof Error ? error.message : "Unknown IR ingestion error",
            "ir_ingestion_failed",
          );
    await db.batch([
      db
        .update(ingestRuns)
        .set({
          status: "error",
          completedAt: new Date().toISOString(),
          errorCode: ingestionError.code,
          errorMessage: ingestionError.message.slice(0, 500),
        })
        .where(eq(ingestRuns.id, runId)),
      db
        .update(irSourceConfigs)
        .set({ lastErrorCode: ingestionError.code })
        .where(eq(irSourceConfigs.companyTicker, source.ticker)),
    ]);
    throw ingestionError;
  }
}

export async function getIrDocumentFeed(
  ticker: string,
  options: { forceRefresh?: boolean } = {},
): Promise<IrPayload> {
  const source = await getIrSource(ticker);
  const company = await getCompanyRecord(ticker);
  if (!source || !company) {
    throw new IrIngestionError("IR 자동 수집이 등록된 종목이 아닙니다.", "unsupported_company");
  }

  let documents = await listStoredDocuments(source);
  let completedAt = await latestSuccessfulRun(source.ticker);
  let payloadSource: IrPayload["source"] = "stored";
  const refreshNeeded = options.forceRefresh || !documents.length || isStale(completedAt);

  if (refreshNeeded) {
    try {
      completedAt = await ingestIrDocuments(
        source,
        options.forceRefresh ? "manual" : "read_through",
      );
      documents = await listStoredDocuments(source);
      payloadSource = "refreshed";
    } catch (error) {
      if (options.forceRefresh || !documents.length) throw error;
    }
  }

  return {
    companyName: company.name,
    documents,
    fetchedAt: completedAt ?? new Date(0).toISOString(),
    source: payloadSource,
    stale: isStale(completedAt),
  };
}
