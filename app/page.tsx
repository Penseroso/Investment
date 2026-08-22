import { CalendarWorkspace } from "./features/calendar/components/calendar-workspace";
import type { CalendarPayload } from "@/lib/calendar-contracts";
import {
  defaultCalendarRange,
  getCalendarSeedEvents,
  listCalendarEvents,
} from "@/lib/server/calendar-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const now = new Date();
  const kstToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const range = defaultCalendarRange(now);
  let payload: CalendarPayload = {
    events: getCalendarSeedEvents(now).filter(
      (event) => event.startsAtUtc >= `${range.from}T00:00:00.000Z` && event.startsAtUtc <= `${range.to}T23:59:59.999Z`,
    ),
    fetchedAt: now.toISOString(),
    stale: true,
    sources: [
      { provider: "Federal Reserve", status: "ready" },
      { provider: "Kansas City Fed", status: "ready" },
      { provider: "BLS", status: "unavailable" },
      { provider: "BEA", status: "unavailable" },
      { provider: "Finnhub", status: "unavailable" },
    ],
  };
  try {
    payload = await listCalendarEvents(range);
  } catch {
    // Verified Fed dates keep the calendar useful until D1 or remote sources are ready.
  }
  return (
    <CalendarWorkspace
      initialPayload={payload}
      initialRange={range}
      today={kstToday}
    />
  );
}
