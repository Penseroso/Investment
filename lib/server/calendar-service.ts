import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { calendarEvents, calendarIngestRuns, companies } from "@/db/schema";
import type {
  CalendarEvent,
  CalendarPayload,
  CalendarSourceState,
} from "@/lib/calendar-contracts";
import {
  fetchBeaEvents,
  fetchBlsEvents,
  fetchFinnhubEvents,
  officialBlsFallbackEvents,
  officialFedEvents,
} from "@/lib/server/calendar-adapters";
import { starterCompanies } from "@/lib/companies";

const DAY_MS = 86_400_000;
const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const activeRefreshes = new Map<string, Promise<CalendarSourceState[]>>();

type RefreshTrigger = "read_through" | "manual";

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) || dateOnly(date) !== value ? null : date;
}

function rangeBounds(from: string, to: string) {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to, true);
  if (
    !fromDate ||
    !toDate ||
    toDate < fromDate ||
    toDate.getTime() - fromDate.getTime() > 370 * DAY_MS
  ) {
    throw new Error("Invalid calendar range");
  }
  return {
    fromUtc: new Date(fromDate.getTime() - DAY_MS).toISOString(),
    toUtc: new Date(toDate.getTime() + DAY_MS).toISOString(),
  };
}

function asCalendarEvent(row: typeof calendarEvents.$inferSelect): CalendarEvent {
  return row as CalendarEvent;
}

export function getCalendarSeedEvents(now = new Date()) {
  return [...officialFedEvents(now), ...officialBlsFallbackEvents(now)];
}

async function readStoredEvents(from: string, to: string) {
  const db = await getDb();
  const bounds = rangeBounds(from, to);
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        gte(calendarEvents.startsAtUtc, bounds.fromUtc),
        lte(calendarEvents.startsAtUtc, bounds.toUtc),
      ),
    )
    .orderBy(asc(calendarEvents.startsAtUtc), asc(calendarEvents.title));
  return rows.map(asCalendarEvent);
}

async function latestSuccessfulRefresh() {
  const db = await getDb();
  const [run] = await db
    .select({ completedAt: calendarIngestRuns.completedAt })
    .from(calendarIngestRuns)
    .where(
      and(
        eq(calendarIngestRuns.sourceProvider, "BLS"),
        eq(calendarIngestRuns.status, "success"),
        gte(calendarIngestRuns.eventsUpserted, 1),
      ),
    )
    .orderBy(desc(calendarIngestRuns.completedAt))
    .limit(1);
  return run?.completedAt ? new Date(run.completedAt) : null;
}

async function latestProviderAttempt(provider: string) {
  const db = await getDb();
  const [run] = await db
    .select({ completedAt: calendarIngestRuns.completedAt })
    .from(calendarIngestRuns)
    .where(eq(calendarIngestRuns.sourceProvider, provider))
    .orderBy(desc(calendarIngestRuns.completedAt))
    .limit(1);
  return run?.completedAt ? new Date(run.completedAt) : null;
}

async function recordRun(
  provider: string,
  trigger: RefreshTrigger,
  status: "success" | "failed",
  startedAt: string,
  eventsSeen: number,
  eventsUpserted: number,
  error?: unknown,
) {
  const db = await getDb();
  const completedAt = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message.slice(0, 500) : null;
  await db.insert(calendarIngestRuns).values({
    id: crypto.randomUUID(),
    sourceProvider: provider,
    trigger,
    status,
    startedAt,
    completedAt,
    eventsSeen,
    eventsUpserted,
    errorCode: status === "failed" ? "SOURCE_FETCH_FAILED" : null,
    errorMessage,
  });
}

async function upsertEvents(events: CalendarEvent[]) {
  if (!events.length) return 0;
  const db = await getDb();
  for (const event of events) {
    await db
      .insert(calendarEvents)
      .values({
        ...event,
        confirmedAt: event.status === "confirmed" ? event.updatedAt : null,
      })
      .onConflictDoUpdate({
        target: calendarEvents.id,
        set: {
          eventType: event.eventType,
          category: event.category,
          title: event.title,
          ticker: event.ticker,
          startsAtUtc: event.startsAtUtc,
          endsAtUtc: event.endsAtUtc,
          sourceTimezone: event.sourceTimezone,
          timePrecision: event.timePrecision,
          marketSession: event.marketSession,
          importance: event.importance,
          status: event.status,
          actual: event.actual,
          consensus: event.consensus,
          previous: event.previous,
          unit: event.unit,
          epsActual: event.epsActual,
          epsConsensus: event.epsConsensus,
          revenueActual: event.revenueActual,
          revenueConsensus: event.revenueConsensus,
          currency: event.currency,
          fiscalPeriod: event.fiscalPeriod,
          sourceUrl: event.sourceUrl,
          sourcePriority: event.sourcePriority,
          confirmedAt: event.status === "confirmed" ? event.updatedAt : null,
          updatedAt: event.updatedAt,
        },
      });
  }
  return events.length;
}

async function finnhubKey() {
  try {
    const { env } = await import("cloudflare:workers");
    return (env as unknown as { FINNHUB_API_KEY?: string }).FINNHUB_API_KEY?.trim() ?? "";
  } catch {
    return process.env.FINNHUB_API_KEY?.trim() ?? "";
  }
}

async function watchlistTickers() {
  try {
    const db = await getDb();
    const rows = await db.select({ ticker: companies.ticker }).from(companies);
    if (rows.length) return new Set(rows.map((row) => row.ticker));
  } catch {
    // Local builds use the starter catalog.
  }
  return new Set(starterCompanies.map((company) => company.ticker));
}

export async function refreshCalendar(
  from: string,
  to: string,
  trigger: RefreshTrigger,
): Promise<CalendarSourceState[]> {
  const refreshKey = `${from}:${to}`;
  const activeRefresh = activeRefreshes.get(refreshKey);
  if (activeRefresh) return activeRefresh;
  const refresh = runCalendarRefresh(from, to, trigger);
  activeRefreshes.set(refreshKey, refresh);
  try {
    return await refresh;
  } finally {
    if (activeRefreshes.get(refreshKey) === refresh) {
      activeRefreshes.delete(refreshKey);
    }
  }
}

async function runCalendarRefresh(
  from: string,
  to: string,
  trigger: RefreshTrigger,
): Promise<CalendarSourceState[]> {
  const now = new Date();
  const providers: Array<{
    name: string;
    load: () => Promise<CalendarEvent[]>;
  }> = [
    { name: "BLS", load: () => fetchBlsEvents(now) },
    { name: "BEA", load: () => fetchBeaEvents(now) },
  ];

  const key = await finnhubKey();
  const latestFinnhubAttempt = key ? await latestProviderAttempt("Finnhub") : null;
  const finnhubCoolingDown =
    latestFinnhubAttempt !== null &&
    Date.now() - latestFinnhubAttempt.getTime() < 60_000;
  if (key && !finnhubCoolingDown) {
    const watchlist = await watchlistTickers();
    providers.push({
      name: "Finnhub",
      load: () => fetchFinnhubEvents(key, from, to, watchlist, now),
    });
  }

  const fedEvents = officialFedEvents(now);
  const fedCount = await upsertEvents(fedEvents);
  const sourceStates: CalendarSourceState[] = [
    { provider: "Federal Reserve", status: "ready" },
    { provider: "Kansas City Fed", status: "ready" },
  ];
  if (key && finnhubCoolingDown) {
    sourceStates.push({ provider: "Finnhub", status: "ready" });
  }
  await recordRun(
    "Federal Reserve",
    trigger,
    "success",
    now.toISOString(),
    fedEvents.length,
    fedCount,
  );

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const startedAt = new Date().toISOString();
      try {
        const events = await provider.load();
        const upserted = await upsertEvents(events);
        await recordRun(
          provider.name,
          trigger,
          "success",
          startedAt,
          events.length,
          upserted,
        );
        return { provider: provider.name, status: "ready" as const };
      } catch (error) {
        await recordRun(provider.name, trigger, "failed", startedAt, 0, 0, error);
        return { provider: provider.name, status: "unavailable" as const };
      }
    }),
  );

  for (const result of results) {
    sourceStates.push(
      result.status === "fulfilled"
        ? result.value
        : { provider: "Unknown", status: "unavailable" },
    );
  }
  if (!key) sourceStates.push({ provider: "Finnhub", status: "not_configured" });
  return sourceStates;
}

export async function listCalendarEvents({
  from,
  to,
  forceRefresh = false,
}: {
  from: string;
  to: string;
  forceRefresh?: boolean;
}): Promise<CalendarPayload> {
  rangeBounds(from, to);
  let events = await readStoredEvents(from, to);
  const lastRefresh = await latestSuccessfulRefresh();
  const stale =
    !lastRefresh || Date.now() - lastRefresh.getTime() > REFRESH_INTERVAL_MS;
  let sources: CalendarSourceState[] = [];

  if (forceRefresh || stale || !events.length) {
    sources = await refreshCalendar(from, to, forceRefresh ? "manual" : "read_through");
    events = await readStoredEvents(from, to);
  }

  if (!sources.length) {
    const key = await finnhubKey();
    sources = [
      { provider: "BLS", status: "ready" },
      { provider: "BEA", status: "ready" },
      { provider: "Federal Reserve", status: "ready" },
      { provider: "Kansas City Fed", status: "ready" },
      { provider: "Finnhub", status: key ? "ready" : "not_configured" },
    ];
  }

  return {
    events,
    fetchedAt: new Date().toISOString(),
    stale: sources.some((source) => source.status === "unavailable"),
    sources,
  };
}

export function defaultCalendarRange(now = new Date()) {
  return {
    from: dateOnly(new Date(now.getTime() - 45 * DAY_MS)),
    to: dateOnly(new Date(now.getTime() + 120 * DAY_MS)),
  };
}
