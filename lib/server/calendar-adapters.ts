import type {
  CalendarCategory,
  CalendarEvent,
  CalendarImportance,
  MarketSession,
  TimePrecision,
} from "@/lib/calendar-contracts";

const BLS_ICS_URL = "https://www.bls.gov/schedule/news_release/bls.ics";
const BLS_SOURCE_URL = "https://www.bls.gov/schedule/";
const BEA_JSON_URL = "https://apps.bea.gov/API/signup/release_dates.json";
const BEA_SOURCE_URL = "https://www.bea.gov/news/schedule";
const FED_SOURCE_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
const JACKSON_HOLE_URL =
  "https://www.kansascityfed.org/research/jackson-hole-economic-policy-symposium/";
const FINNHUB_SOURCE_URL = "https://finnhub.io/docs/api/earnings-calendar";

type IcsEvent = {
  uid: string;
  summary: string;
  startsAt: string;
};

type BlsRule = {
  title: string;
  category: CalendarCategory;
  importance: CalendarImportance;
};

const blsRules: Record<string, BlsRule> = {
  "Consumer Price Index": {
    title: "미국 소비자물가지수 (CPI)",
    category: "inflation",
    importance: "high",
  },
  "Producer Price Index": {
    title: "미국 생산자물가지수 (PPI)",
    category: "inflation",
    importance: "high",
  },
  "Employment Situation": {
    title: "미국 고용보고서",
    category: "labor",
    importance: "high",
  },
  "Job Openings and Labor Turnover Survey": {
    title: "미국 구인·이직 보고서 (JOLTS)",
    category: "labor",
    importance: "medium",
  },
  "Employment Cost Index": {
    title: "미국 고용비용지수",
    category: "labor",
    importance: "medium",
  },
};

type BlsScheduleEntry = {
  release: keyof typeof blsRules;
  date: string;
  hour: number;
  minute: number;
};

// Verified against the BLS 2026 release calendar. This is only used when the
// official ICS endpoint rejects the deployment network, and is replaced by the
// live calendar as soon as that endpoint becomes reachable again.
const bls2026Schedule: BlsScheduleEntry[] = [
  { release: "Employment Situation", date: "2026-07-02", hour: 8, minute: 30 },
  { release: "Consumer Price Index", date: "2026-07-14", hour: 8, minute: 30 },
  { release: "Producer Price Index", date: "2026-07-15", hour: 8, minute: 30 },
  { release: "Employment Cost Index", date: "2026-07-31", hour: 8, minute: 30 },
  { release: "Job Openings and Labor Turnover Survey", date: "2026-08-04", hour: 10, minute: 0 },
  { release: "Employment Situation", date: "2026-08-07", hour: 8, minute: 30 },
  { release: "Consumer Price Index", date: "2026-08-12", hour: 8, minute: 30 },
  { release: "Producer Price Index", date: "2026-08-13", hour: 8, minute: 30 },
  { release: "Job Openings and Labor Turnover Survey", date: "2026-09-01", hour: 10, minute: 0 },
  { release: "Employment Situation", date: "2026-09-04", hour: 8, minute: 30 },
  { release: "Producer Price Index", date: "2026-09-10", hour: 8, minute: 30 },
  { release: "Consumer Price Index", date: "2026-09-11", hour: 8, minute: 30 },
  { release: "Job Openings and Labor Turnover Survey", date: "2026-09-29", hour: 10, minute: 0 },
  { release: "Employment Situation", date: "2026-10-02", hour: 8, minute: 30 },
  { release: "Consumer Price Index", date: "2026-10-14", hour: 8, minute: 30 },
  { release: "Producer Price Index", date: "2026-10-15", hour: 8, minute: 30 },
  { release: "Employment Cost Index", date: "2026-10-30", hour: 8, minute: 30 },
  { release: "Job Openings and Labor Turnover Survey", date: "2026-11-03", hour: 10, minute: 0 },
  { release: "Employment Situation", date: "2026-11-06", hour: 8, minute: 30 },
  { release: "Consumer Price Index", date: "2026-11-10", hour: 8, minute: 30 },
  { release: "Producer Price Index", date: "2026-11-13", hour: 8, minute: 30 },
  { release: "Job Openings and Labor Turnover Survey", date: "2026-12-01", hour: 10, minute: 0 },
  { release: "Employment Situation", date: "2026-12-04", hour: 8, minute: 30 },
  { release: "Consumer Price Index", date: "2026-12-10", hour: 8, minute: 30 },
  { release: "Producer Price Index", date: "2026-12-15", hour: 8, minute: 30 },
];

const beaRules: Record<
  string,
  { title: string; category: CalendarCategory; importance: CalendarImportance }
> = {
  "Gross Domestic Product": {
    title: "미국 국내총생산 (GDP)",
    category: "growth",
    importance: "high",
  },
  "Personal Income and Outlays": {
    title: "미국 개인소득·소비지출 (PCE)",
    category: "consumption",
    importance: "high",
  },
};

function emptyObservation() {
  return {
    actual: null,
    consensus: null,
    previous: null,
    unit: null,
    epsActual: null,
    epsConsensus: null,
    revenueActual: null,
    revenueConsensus: null,
    currency: null,
  };
}

function nthSunday(year: number, monthIndex: number, occurrence: number) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return 1 + ((7 - firstDay) % 7) + (occurrence - 1) * 7;
}

function isNewYorkDaylightTime(year: number, month: number, day: number) {
  if (month < 3 || month > 11) return false;
  if (month > 3 && month < 11) return true;
  if (month === 3) return day >= nthSunday(year, 2, 2);
  return day < nthSunday(year, 10, 1);
}

export function newYorkLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const offsetHours = isNewYorkDaylightTime(year, month, day) ? 4 : 5;
  return new Date(Date.UTC(year, month - 1, day, hour + offsetHours, minute)).toISOString();
}

function parseIcsDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  if (value.endsWith("Z")) {
    return new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)),
    ).toISOString();
  }
  return newYorkLocalToUtc(
    Number(year),
    Number(month),
    Number(day),
    Number(hour),
    Number(minute),
  );
}

export function parseIcsEvents(ics: string): IcsEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  return unfolded
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((block) => {
      const value = (key: string) =>
        block.match(new RegExp(`(?:^|\\n)${key}(?:;[^:]*)?:(.*)`))?.[1]?.trim() ?? "";
      return {
        uid: value("UID"),
        summary: value("SUMMARY").replaceAll("\\,", ","),
        startsAt: value("DTSTART"),
      };
    })
    .filter((event) => event.uid && event.summary && event.startsAt);
}

export function parseBlsCalendar(ics: string, now = new Date()): CalendarEvent[] {
  const updatedAt = now.toISOString();
  return parseIcsEvents(ics).flatMap((event) => {
    const rule = blsRules[event.summary];
    const startsAtUtc = parseIcsDate(event.startsAt);
    if (!rule || !startsAtUtc) return [];
    const sourceEventId = `release:${event.summary}:${startsAtUtc.slice(0, 10)}`;
    return [
      {
        id: `bls:${sourceEventId}`,
        eventType: "macro",
        category: rule.category,
        title: rule.title,
        ticker: null,
        startsAtUtc,
        endsAtUtc: null,
        sourceTimezone: "America/New_York",
        timePrecision: "exact",
        marketSession: "unknown",
        importance: rule.importance,
        status: new Date(startsAtUtc) < now ? "released" : "confirmed",
        ...emptyObservation(),
        fiscalPeriod: null,
        sourceProvider: "BLS",
        sourceEventId,
        sourceUrl: BLS_SOURCE_URL,
        sourcePriority: 100,
        updatedAt,
      } satisfies CalendarEvent,
    ];
  });
}

export function officialBlsFallbackEvents(now = new Date()): CalendarEvent[] {
  const updatedAt = now.toISOString();
  return bls2026Schedule.map((entry) => {
    const [year, month, day] = entry.date.split("-").map(Number);
    const startsAtUtc = newYorkLocalToUtc(
      year,
      month,
      day,
      entry.hour,
      entry.minute,
    );
    const rule = blsRules[entry.release];
    const sourceEventId = `release:${entry.release}:${entry.date}`;
    return {
      id: `bls:${sourceEventId}`,
      eventType: "macro",
      category: rule.category,
      title: rule.title,
      ticker: null,
      startsAtUtc,
      endsAtUtc: null,
      sourceTimezone: "America/New_York",
      timePrecision: "exact",
      marketSession: "unknown",
      importance: rule.importance,
      status: new Date(startsAtUtc) < now ? "released" : "confirmed",
      ...emptyObservation(),
      fiscalPeriod: null,
      sourceProvider: "BLS",
      sourceEventId,
      sourceUrl: BLS_SOURCE_URL,
      sourcePriority: 95,
      updatedAt,
    } satisfies CalendarEvent;
  });
}

type BeaReleaseDatePayload = Record<
  string,
  { release_dates?: string[] } | string
>;

export function parseBeaCalendar(
  payload: BeaReleaseDatePayload,
  now = new Date(),
): CalendarEvent[] {
  const updatedAt = now.toISOString();
  return Object.entries(beaRules).flatMap(([sourceName, rule]) => {
    const releaseDates = payload[sourceName];
    if (!releaseDates || typeof releaseDates === "string") return [];
    return (releaseDates.release_dates ?? []).flatMap((startsAtUtc) => {
      const parsed = new Date(startsAtUtc);
      if (Number.isNaN(parsed.getTime())) return [];
      const sourceEventId = `${sourceName}:${startsAtUtc}`;
      return [
        {
          id: `bea:${sourceEventId}`,
          eventType: "macro",
          category: rule.category,
          title: rule.title,
          ticker: null,
          startsAtUtc: parsed.toISOString(),
          endsAtUtc: null,
          sourceTimezone: "America/New_York",
          timePrecision: "exact",
          marketSession: "unknown",
          importance: rule.importance,
          status: parsed < now ? "released" : "confirmed",
          ...emptyObservation(),
          fiscalPeriod: null,
          sourceProvider: "BEA",
          sourceEventId,
          sourceUrl: BEA_SOURCE_URL,
          sourcePriority: 100,
          updatedAt,
        } satisfies CalendarEvent,
      ];
    });
  });
}

type FomcMeeting = {
  year: number;
  month: number;
  startDay: number;
  endDay: number;
  projections: boolean;
};

const fomcMeetings: FomcMeeting[] = [
  { year: 2026, month: 1, startDay: 27, endDay: 28, projections: false },
  { year: 2026, month: 3, startDay: 17, endDay: 18, projections: true },
  { year: 2026, month: 4, startDay: 28, endDay: 29, projections: false },
  { year: 2026, month: 6, startDay: 16, endDay: 17, projections: true },
  { year: 2026, month: 7, startDay: 28, endDay: 29, projections: false },
  { year: 2026, month: 9, startDay: 15, endDay: 16, projections: true },
  { year: 2026, month: 10, startDay: 27, endDay: 28, projections: false },
  { year: 2026, month: 12, startDay: 8, endDay: 9, projections: true },
  { year: 2027, month: 1, startDay: 26, endDay: 27, projections: false },
  { year: 2027, month: 3, startDay: 16, endDay: 17, projections: true },
  { year: 2027, month: 4, startDay: 27, endDay: 28, projections: false },
  { year: 2027, month: 6, startDay: 8, endDay: 9, projections: true },
  { year: 2027, month: 7, startDay: 27, endDay: 28, projections: false },
  { year: 2027, month: 9, startDay: 14, endDay: 15, projections: true },
  { year: 2027, month: 10, startDay: 26, endDay: 27, projections: false },
  { year: 2027, month: 12, startDay: 7, endDay: 8, projections: true },
];

export function officialFedEvents(now = new Date()): CalendarEvent[] {
  const updatedAt = now.toISOString();
  const meetings: CalendarEvent[] = fomcMeetings.map((meeting) => {
    const startsAtUtc = newYorkLocalToUtc(
      meeting.year,
      meeting.month,
      meeting.endDay,
      14,
      0,
    );
    const sourceEventId = `${meeting.year}-${String(meeting.month).padStart(2, "0")}-${String(meeting.endDay).padStart(2, "0")}`;
    return {
      id: `fed:fomc:${sourceEventId}`,
      eventType: "central_bank",
      category: "fed",
      title: meeting.projections ? "FOMC 금리 결정·경제전망" : "FOMC 금리 결정",
      ticker: null,
      startsAtUtc,
      endsAtUtc: null,
      sourceTimezone: "America/New_York",
      timePrecision: "exact",
      marketSession: "unknown",
      importance: "high",
      status: new Date(startsAtUtc) < now ? "released" : "confirmed",
      ...emptyObservation(),
      fiscalPeriod: `${meeting.month}월 ${meeting.startDay}-${meeting.endDay}일 회의`,
      sourceProvider: "Federal Reserve",
      sourceEventId,
      sourceUrl: FED_SOURCE_URL,
      sourcePriority: 100,
      updatedAt,
    } satisfies CalendarEvent;
  });

  const jacksonHoleStart = "2026-08-27T12:00:00.000Z";
  const jacksonHoleEnd = "2026-08-29T22:00:00.000Z";
  meetings.push({
    id: "kc-fed:jackson-hole:2026",
    eventType: "conference",
    category: "special",
    title: "잭슨홀 경제정책 심포지엄",
    ticker: null,
    startsAtUtc: jacksonHoleStart,
    endsAtUtc: jacksonHoleEnd,
    sourceTimezone: "America/Denver",
    timePrecision: "date",
    marketSession: "unknown",
    importance: "high",
    status: new Date(jacksonHoleEnd) < now ? "released" : "confirmed",
    ...emptyObservation(),
    fiscalPeriod: "2026년 8월 27-29일",
    sourceProvider: "Kansas City Fed",
    sourceEventId: "jackson-hole-2026",
    sourceUrl: JACKSON_HOLE_URL,
    sourcePriority: 100,
    updatedAt,
  });

  return meetings;
}

type FinnhubEarningsEntry = {
  date?: string;
  epsActual?: number | null;
  epsEstimate?: number | null;
  hour?: string;
  quarter?: number;
  revenueActual?: number | null;
  revenueEstimate?: number | null;
  symbol?: string;
  year?: number;
};

function finnhubSession(hour: string | undefined): {
  marketSession: MarketSession;
  timePrecision: TimePrecision;
  localHour: number;
  localMinute: number;
} {
  if (hour === "bmo") {
    return { marketSession: "pre_market", timePrecision: "session", localHour: 8, localMinute: 0 };
  }
  if (hour === "amc") {
    return { marketSession: "after_market", timePrecision: "session", localHour: 16, localMinute: 5 };
  }
  return { marketSession: "unknown", timePrecision: "date", localHour: 12, localMinute: 0 };
}

export function parseFinnhubEarnings(
  entries: FinnhubEarningsEntry[],
  watchlist: Set<string>,
  now = new Date(),
): CalendarEvent[] {
  const updatedAt = now.toISOString();
  return entries.flatMap((entry) => {
    const ticker = entry.symbol?.trim().toUpperCase();
    const dateMatch = entry.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!ticker || !dateMatch || !watchlist.has(ticker)) return [];
    const session = finnhubSession(entry.hour);
    const startsAtUtc = newYorkLocalToUtc(
      Number(dateMatch[1]),
      Number(dateMatch[2]),
      Number(dateMatch[3]),
      session.localHour,
      session.localMinute,
    );
    const sourceEventId = `${ticker}:${entry.date}:${entry.year ?? ""}:Q${entry.quarter ?? ""}`;
    const released =
      entry.epsActual !== null && entry.epsActual !== undefined
        ? "released"
        : new Date(startsAtUtc) < now
          ? "scheduled"
          : "confirmed";

    return [
      {
        id: `finnhub:${sourceEventId}`,
        eventType: "earnings",
        category: "earnings",
        title: `${ticker} 실적 발표`,
        ticker,
        startsAtUtc,
        endsAtUtc: null,
        sourceTimezone: "America/New_York",
        timePrecision: session.timePrecision,
        marketSession: session.marketSession,
        importance: "high",
        status: released,
        actual: null,
        consensus: null,
        previous: null,
        unit: null,
        epsActual: entry.epsActual ?? null,
        epsConsensus: entry.epsEstimate ?? null,
        revenueActual: entry.revenueActual ?? null,
        revenueConsensus: entry.revenueEstimate ?? null,
        currency: "USD",
        fiscalPeriod:
          entry.year && entry.quarter ? `${entry.year} Q${entry.quarter}` : null,
        sourceProvider: "Finnhub",
        sourceEventId,
        sourceUrl: FINNHUB_SOURCE_URL,
        sourcePriority: 60,
        updatedAt,
      } satisfies CalendarEvent,
    ];
  });
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "InvestmentSignalDesk/1.0 calendar@local" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Calendar source returned ${response.status}`);
  return response.text();
}

export async function fetchBlsEvents(now = new Date()) {
  try {
    return parseBlsCalendar(await fetchText(BLS_ICS_URL), now);
  } catch {
    return officialBlsFallbackEvents(now);
  }
}

export async function fetchBeaEvents(now = new Date()) {
  const response = await fetch(BEA_JSON_URL, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`BEA calendar returned ${response.status}`);
  return parseBeaCalendar((await response.json()) as BeaReleaseDatePayload, now);
}

export async function fetchFinnhubEvents(
  apiKey: string,
  from: string,
  to: string,
  watchlist: Set<string>,
  now = new Date(),
) {
  const url = new URL("https://finnhub.io/api/v1/calendar/earnings");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("token", apiKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Finnhub calendar returned ${response.status}`);
  const payload = (await response.json()) as { earningsCalendar?: FinnhubEarningsEntry[] };
  return parseFinnhubEarnings(payload.earningsCalendar ?? [], watchlist, now);
}
