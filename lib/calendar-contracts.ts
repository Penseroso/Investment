export type CalendarEventType =
  | "macro"
  | "earnings"
  | "central_bank"
  | "conference";

export type CalendarCategory =
  | "inflation"
  | "labor"
  | "growth"
  | "consumption"
  | "fed"
  | "earnings"
  | "special";

export type CalendarImportance = "high" | "medium" | "low";
export type CalendarStatus =
  | "scheduled"
  | "confirmed"
  | "rescheduled"
  | "released"
  | "cancelled";
export type MarketSession =
  | "pre_market"
  | "regular"
  | "after_market"
  | "unknown";
export type TimePrecision = "exact" | "session" | "date";
export type SurpriseLabel = "above" | "in_line" | "below" | "pending";

export type CalendarEvent = {
  id: string;
  eventType: CalendarEventType;
  category: CalendarCategory;
  title: string;
  ticker: string | null;
  startsAtUtc: string;
  endsAtUtc: string | null;
  sourceTimezone: string;
  timePrecision: TimePrecision;
  marketSession: MarketSession;
  importance: CalendarImportance;
  status: CalendarStatus;
  actual: number | null;
  consensus: number | null;
  previous: number | null;
  unit: string | null;
  epsActual: number | null;
  epsConsensus: number | null;
  revenueActual: number | null;
  revenueConsensus: number | null;
  currency: string | null;
  fiscalPeriod: string | null;
  sourceProvider: string;
  sourceEventId: string;
  sourceUrl: string;
  sourcePriority: number;
  updatedAt: string;
};

export type CalendarSourceState = {
  provider: string;
  status: "ready" | "unavailable" | "not_configured";
};

export type CalendarPayload = {
  events: CalendarEvent[];
  fetchedAt: string;
  stale: boolean;
  sources: CalendarSourceState[];
};

export type SurpriseTolerance = {
  absolute: number;
  relative: number;
};

export const earningsSurpriseTolerance = {
  eps: { absolute: 0.01, relative: 0.01 },
  revenue: { absolute: 0, relative: 0.005 },
} satisfies Record<"eps" | "revenue", SurpriseTolerance>;

export function classifySurprise(
  actual: number | null,
  consensus: number | null,
  tolerance: SurpriseTolerance,
): SurpriseLabel {
  if (actual === null || consensus === null) return "pending";
  const allowedDifference = Math.max(
    tolerance.absolute,
    Math.abs(consensus) * tolerance.relative,
  );
  const difference = actual - consensus;
  if (Math.abs(difference) <= allowedDifference) return "in_line";
  return difference > 0 ? "above" : "below";
}

export function surprisePercent(actual: number | null, consensus: number | null) {
  if (actual === null || consensus === null || Math.abs(consensus) < 1e-9) return null;
  return ((actual - consensus) / Math.abs(consensus)) * 100;
}
