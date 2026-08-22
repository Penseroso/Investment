import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySurprise,
  earningsSurpriseTolerance,
} from "../lib/calendar-contracts";
import {
  newYorkLocalToUtc,
  officialBlsFallbackEvents,
  parseBlsCalendar,
  parseFinnhubEarnings,
} from "../lib/server/calendar-adapters";

test("classifies earnings with rounding tolerance", () => {
  assert.equal(classifySurprise(1.2, 1.1, earningsSurpriseTolerance.eps), "above");
  assert.equal(classifySurprise(1.101, 1.1, earningsSurpriseTolerance.eps), "in_line");
  assert.equal(classifySurprise(-0.2, -0.1, earningsSurpriseTolerance.eps), "below");
  assert.equal(classifySurprise(null, 1.1, earningsSurpriseTolerance.eps), "pending");
});

test("converts New York schedule time across daylight saving", () => {
  assert.equal(newYorkLocalToUtc(2026, 8, 12, 8, 30), "2026-08-12T12:30:00.000Z");
  assert.equal(newYorkLocalToUtc(2026, 12, 10, 8, 30), "2026-12-10T13:30:00.000Z");
});

test("keeps only core BLS releases", () => {
  const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:cpi-1
DTSTART;TZID=US-Eastern:20260812T083000
SUMMARY:Consumer Price Index
END:VEVENT
BEGIN:VEVENT
UID:regional-1
DTSTART;TZID=US-Eastern:20260813T100000
SUMMARY:State Employment and Unemployment (Monthly)
END:VEVENT
END:VCALENDAR`;
  const events = parseBlsCalendar(ics, new Date("2026-08-01T00:00:00.000Z"));
  assert.equal(events.length, 1);
  assert.equal(events[0].title, "미국 소비자물가지수 (CPI)");
  assert.equal(events[0].startsAtUtc, "2026-08-12T12:30:00.000Z");
  assert.equal(
    events[0].id,
    "bls:release:Consumer Price Index:2026-08-12",
  );
});

test("keeps the official BLS schedule when the ICS endpoint is blocked", () => {
  const events = officialBlsFallbackEvents(new Date("2026-08-14T00:00:00.000Z"));
  const augustPpi = events.find((event) =>
    event.sourceEventId.includes("Producer Price Index:2026-08-13"),
  );
  assert.equal(augustPpi?.startsAtUtc, "2026-08-13T12:30:00.000Z");
  assert.equal(augustPpi?.status, "released");
  assert.ok(events.every((event) => event.sourceProvider === "BLS"));
});

test("uses one canonical BLS identity for live and fallback releases", () => {
  const live = parseBlsCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:provider-specific-id
DTSTART;TZID=US-Eastern:20260813T083000
SUMMARY:Producer Price Index
END:VEVENT
END:VCALENDAR`, new Date("2026-08-01T00:00:00.000Z"));
  const fallback = officialBlsFallbackEvents(
    new Date("2026-08-01T00:00:00.000Z"),
  ).find((event) => event.startsAtUtc === "2026-08-13T12:30:00.000Z");
  assert.equal(live[0].id, fallback?.id);
  assert.equal(live[0].sourceEventId, fallback?.sourceEventId);
});

test("normalizes watchlist earnings and ignores other tickers", () => {
  const events = parseFinnhubEarnings(
    [
      {
        date: "2026-08-20",
        epsActual: 1.24,
        epsEstimate: 1.2,
        hour: "amc",
        quarter: 2,
        revenueActual: 3_200_000_000,
        revenueEstimate: 3_100_000_000,
        symbol: "CEG",
        year: 2026,
      },
      { date: "2026-08-20", symbol: "OTHER" },
    ],
    new Set(["CEG"]),
    new Date("2026-08-21T12:00:00.000Z"),
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].marketSession, "after_market");
  assert.equal(events[0].epsActual, 1.24);
  assert.equal(events[0].revenueConsensus, 3_100_000_000);
});
