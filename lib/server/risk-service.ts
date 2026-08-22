import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  riskIngestRuns,
  riskReports,
  riskSignalSnapshots,
} from "@/db/schema";
import {
  buildRiskReport,
  riskSignalOrder,
  type RiskLevel,
  type RiskPayload,
  type RiskReport,
  type RiskSignal,
  type RiskSignalKey,
  type RiskSourceState,
  type RiskStatusPayload,
  type RiskTrend,
} from "@/lib/risk-contracts";
import { riskAdapters, type RiskAdapterResult } from "@/lib/server/risk-adapters";

const REFRESH_INTERVAL_MS = 20 * 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 60 * 1000;
let activeRefresh: Promise<RiskSourceState[]> | null = null;

type RefreshTrigger = "read_through" | "manual" | "scheduled";

const providerBySignal: Record<RiskSignalKey, string> = {
  credit_stress: "FRED · ICE BofA",
  funding_stress: "New York Fed · Federal Reserve",
  system_liquidity: "Federal Reserve H.4.1 · FRED",
  equity_risk_off: "Cboe · FRED",
  financial_stress_composite: "U.S. OFR",
};

function kstDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function asSignal(row: typeof riskSignalSnapshots.$inferSelect): RiskSignal {
  return {
    key: row.signalKey as RiskSignalKey,
    label: "",
    role: "",
    asOfDate: row.asOfDate,
    value: row.value,
    unit: row.unit,
    delta1: row.delta1,
    delta5: row.delta5,
    delta20: row.delta20,
    zScore: row.zScore,
    percentile: row.percentile,
    level: row.level as RiskLevel,
    trend: row.trend as RiskTrend,
    sourceProvider: row.sourceProvider,
    sourceUrl: row.sourceUrl,
    dataFrequency: row.dataFrequency as "daily" | "weekly",
    detail: row.detail,
    calculatedAt: row.calculatedAt,
  };
}

async function readSignals() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(riskSignalSnapshots)
    .orderBy(desc(riskSignalSnapshots.asOfDate), desc(riskSignalSnapshots.calculatedAt));
  const latest = new Map<RiskSignalKey, RiskSignal>();
  for (const row of rows) {
    const signal = asSignal(row);
    if (!latest.has(signal.key)) latest.set(signal.key, signal);
  }
  const { riskSignalMeta } = await import("@/lib/risk-contracts");
  return riskSignalOrder.flatMap((key) => {
    const signal = latest.get(key);
    return signal
      ? [{ ...signal, label: riskSignalMeta[key].label, role: riskSignalMeta[key].role }]
      : [];
  });
}

function asReport(row: typeof riskReports.$inferSelect): RiskReport {
  return {
    reportDate: row.reportDate,
    overallLevel: row.overallLevel as RiskLevel,
    headline: row.headline,
    summary: row.summary,
    driverKeys: row.driverKeys as RiskSignalKey[],
    signalKeys: row.signalKeys as RiskSignalKey[],
    generatedAt: row.generatedAt,
    readAt: row.readAt,
  };
}

async function readLatestReport() {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(riskReports)
    .orderBy(desc(riskReports.reportDate))
    .limit(1);
  return row ? asReport(row) : null;
}

async function recentlyFailed(key: RiskSignalKey) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - FAILURE_COOLDOWN_MS).toISOString();
  const [row] = await db
    .select({ id: riskIngestRuns.id })
    .from(riskIngestRuns)
    .where(
      and(
        eq(riskIngestRuns.signalKey, key),
        eq(riskIngestRuns.status, "failed"),
        gte(riskIngestRuns.completedAt, cutoff),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function recordRun(
  key: RiskSignalKey,
  trigger: RefreshTrigger,
  status: "success" | "failed",
  startedAt: string,
  observationsSeen: number,
  error?: unknown,
) {
  const db = await getDb();
  await db.insert(riskIngestRuns).values({
    id: crypto.randomUUID(),
    signalKey: key,
    trigger,
    status,
    startedAt,
    completedAt: new Date().toISOString(),
    observationsSeen,
    errorCode: status === "failed" ? "SOURCE_FETCH_FAILED" : null,
    errorMessage:
      status === "failed" && error instanceof Error
        ? error.message.slice(0, 500)
        : null,
  });
}

async function upsertSignal(result: RiskAdapterResult) {
  const db = await getDb();
  const signal = result.signal;
  await db
    .insert(riskSignalSnapshots)
    .values({
      id: `${signal.key}:${signal.asOfDate}`,
      signalKey: signal.key,
      asOfDate: signal.asOfDate,
      value: signal.value,
      unit: signal.unit,
      delta1: signal.delta1,
      delta5: signal.delta5,
      delta20: signal.delta20,
      zScore: signal.zScore,
      percentile: signal.percentile,
      level: signal.level,
      trend: signal.trend,
      sourceProvider: signal.sourceProvider,
      sourceUrl: signal.sourceUrl,
      dataFrequency: signal.dataFrequency,
      detail: signal.detail,
      calculatedAt: signal.calculatedAt,
    })
    .onConflictDoUpdate({
      target: [riskSignalSnapshots.signalKey, riskSignalSnapshots.asOfDate],
      set: {
        value: signal.value,
        unit: signal.unit,
        delta1: signal.delta1,
        delta5: signal.delta5,
        delta20: signal.delta20,
        zScore: signal.zScore,
        percentile: signal.percentile,
        level: signal.level,
        trend: signal.trend,
        sourceProvider: signal.sourceProvider,
        sourceUrl: signal.sourceUrl,
        dataFrequency: signal.dataFrequency,
        detail: signal.detail,
        calculatedAt: signal.calculatedAt,
      },
    });
}

async function upsertReport(signals: RiskSignal[], now = new Date()) {
  if (!signals.length) return null;
  const db = await getDb();
  const reportDate = kstDate(now);
  const [existing] = await db
    .select()
    .from(riskReports)
    .where(eq(riskReports.reportDate, reportDate))
    .limit(1);
  const preview = buildRiskReport(signals, reportDate, null, now);
  const next = buildRiskReport(
    signals,
    reportDate,
    existing?.overallLevel === preview.overallLevel ? existing.readAt : null,
    now,
  );
  await db
    .insert(riskReports)
    .values({ ...next, updatedAt: now.toISOString() })
    .onConflictDoUpdate({
      target: riskReports.reportDate,
      set: {
        overallLevel: next.overallLevel,
        headline: next.headline,
        summary: next.summary,
        driverKeys: next.driverKeys,
        signalKeys: next.signalKeys,
        generatedAt: next.generatedAt,
        readAt: next.readAt,
        updatedAt: now.toISOString(),
      },
    });
  return next;
}

async function runRefresh(trigger: RefreshTrigger): Promise<RiskSourceState[]> {
  const states: RiskSourceState[] = [];
  await Promise.all(
    riskAdapters.map(async (adapter, index) => {
      const key = riskSignalOrder[index];
      if (trigger === "read_through" && (await recentlyFailed(key))) {
        states.push({ provider: providerBySignal[key], status: "unavailable" });
        return;
      }
      const startedAt = new Date().toISOString();
      try {
        const result = await adapter(new Date());
        await upsertSignal(result);
        await recordRun(key, trigger, "success", startedAt, result.observationsSeen);
        states.push({ provider: providerBySignal[key], status: "ready" });
      } catch (error) {
        await recordRun(key, trigger, "failed", startedAt, 0, error);
        states.push({ provider: providerBySignal[key], status: "unavailable" });
      }
    }),
  );
  await upsertReport(await readSignals());
  return riskSignalOrder.map((key) =>
    states.find((state) => state.provider === providerBySignal[key]) ?? {
      provider: providerBySignal[key],
      status: "unavailable" as const,
    },
  );
}

export async function refreshRisk(trigger: RefreshTrigger) {
  if (activeRefresh) return activeRefresh;
  const refresh = runRefresh(trigger);
  activeRefresh = refresh;
  try {
    return await refresh;
  } finally {
    if (activeRefresh === refresh) activeRefresh = null;
  }
}

export async function listRisk({ forceRefresh = false } = {}): Promise<RiskPayload> {
  let signals = await readSignals();
  const due =
    signals.length < riskSignalOrder.length ||
    signals.some(
      (signal) =>
        Date.now() - new Date(signal.calculatedAt).getTime() > REFRESH_INTERVAL_MS,
    );
  let sources: RiskSourceState[] = [];
  if (forceRefresh || due || !signals.length) {
    sources = await refreshRisk(forceRefresh ? "manual" : "read_through");
    signals = await readSignals();
  }
  if (!sources.length) {
    sources = riskSignalOrder.map((key) => ({
      provider: providerBySignal[key],
      status: "ready" as const,
    }));
  }
  let report = await readLatestReport();
  if (!report && signals.length) report = await upsertReport(signals);
  return {
    report,
    signals,
    sources,
    stale:
      signals.length < riskSignalOrder.length ||
      sources.some((source) => source.status === "unavailable"),
    fetchedAt: new Date().toISOString(),
  };
}

export async function riskStatus(): Promise<RiskStatusPayload> {
  const report = await readLatestReport();
  return {
    reportDate: report?.reportDate ?? null,
    overallLevel: report?.overallLevel ?? null,
    unread: Boolean(report && !report.readAt),
  };
}

export async function markRiskReportRead(reportDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) throw new Error("Invalid report date");
  const db = await getDb();
  await db
    .update(riskReports)
    .set({ readAt: new Date().toISOString() })
    .where(eq(riskReports.reportDate, reportDate));
  return riskStatus();
}
