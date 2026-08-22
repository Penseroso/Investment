"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import {
  classifySurprise,
  earningsSurpriseTolerance,
  type CalendarEvent,
  type CalendarPayload,
} from "@/lib/calendar-contracts";
import {
  MobileBottomNavigation,
  PrimaryNavigation,
} from "@/app/components/app-navigation";

type CalendarView = "week" | "month";
type CalendarFilter = "all" | "macro" | "fed" | "earnings";

const DAY_MS = 86_400_000;
const KST_TIME_ZONE = "Asia/Seoul";
const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];
const filterOptions: Array<{ id: CalendarFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "macro", label: "경제" },
  { id: "fed", label: "연준" },
  { id: "earnings", label: "실적" },
];

function dateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function keyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(key: string, days: number) {
  return keyFromDate(new Date(dateFromKey(key).getTime() + days * DAY_MS));
}

function addMonths(key: string, months: number) {
  const date = dateFromKey(key);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const finalDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, finalDay));
  return keyFromDate(date);
}

function startOfWeek(key: string) {
  const date = dateFromKey(key);
  const weekday = date.getUTCDay() || 7;
  return addDays(key, 1 - weekday);
}

function monthGridKeys(key: string) {
  const date = dateFromKey(key);
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const weekday = monthStart.getUTCDay() || 7;
  const gridStart = new Date(monthStart.getTime() - (weekday - 1) * DAY_MS);
  return Array.from({ length: 42 }, (_, index) =>
    keyFromDate(new Date(gridStart.getTime() + index * DAY_MS)),
  );
}

function kstParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    key: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function dateHeading(key: string, includeYear = false) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    ...(includeYear ? { year: "numeric" as const } : {}),
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(dateFromKey(key));
}

function monthHeading(key: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(dateFromKey(key));
}

function rangeHeading(selected: string, view: CalendarView) {
  if (view === "month") return monthHeading(selected);
  const start = startOfWeek(selected);
  const end = addDays(start, 6);
  const startDate = dateFromKey(start);
  const endDate = dateFromKey(end);
  if (startDate.getUTCFullYear() !== endDate.getUTCFullYear()) {
    return `${dateHeading(start, true)} - ${dateHeading(end, true)}`;
  }
  return `${startDate.getUTCFullYear()}년 ${startDate.getUTCMonth() + 1}월 ${startDate.getUTCDate()}일 - ${endDate.getUTCMonth() + 1}월 ${endDate.getUTCDate()}일`;
}

function sessionLabel(event: CalendarEvent) {
  if (event.timePrecision === "date") return "종일";
  if (event.timePrecision === "session") {
    if (event.marketSession === "pre_market") return "미국 장전";
    if (event.marketSession === "after_market") return "미국 장후";
    return "시간 미정";
  }
  return kstParts(event.startsAtUtc).time;
}

function categoryLabel(event: CalendarEvent) {
  if (event.eventType === "earnings") return "실적";
  if (event.eventType === "central_bank") return "FOMC";
  if (event.eventType === "conference") return "행사";
  if (event.category === "inflation") return "물가";
  if (event.category === "labor") return "고용";
  if (event.category === "growth") return "성장";
  return "경제";
}

function filterEvent(event: CalendarEvent, filter: CalendarFilter) {
  if (filter === "all") return true;
  if (filter === "earnings") return event.eventType === "earnings";
  if (filter === "fed") {
    return event.eventType === "central_bank" || event.eventType === "conference";
  }
  return event.eventType === "macro";
}

function sourceLabel(provider: string) {
  const labels: Record<string, string> = {
    BLS: "BLS",
    BEA: "BEA",
    "Federal Reserve": "Federal Reserve",
    "Kansas City Fed": "Kansas City Fed",
    Finnhub: "Finnhub",
  };
  return labels[provider] ?? provider;
}

function surpriseLabel(label: ReturnType<typeof classifySurprise>) {
  if (label === "above") return "상회";
  if (label === "below") return "하회";
  if (label === "in_line") return "부합";
  return "발표 전";
}

function formatEps(value: number | null) {
  if (value === null) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function formatRevenue(value: number | null) {
  if (value === null) return "-";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString("en-US")}`;
}

function EventResults({ event }: { event: CalendarEvent }) {
  if (event.eventType !== "earnings") {
    if (event.actual === null && event.consensus === null && event.previous === null) return null;
    return (
      <dl className="event-result-list">
        <div><dt>이전</dt><dd>{event.previous ?? "-"}</dd></div>
        <div><dt>예상</dt><dd>{event.consensus ?? "-"}</dd></div>
        <div><dt>실제</dt><dd>{event.actual ?? "-"}</dd></div>
      </dl>
    );
  }

  const epsLabel = classifySurprise(
    event.epsActual,
    event.epsConsensus,
    earningsSurpriseTolerance.eps,
  );
  const revenueLabel = classifySurprise(
    event.revenueActual,
    event.revenueConsensus,
    earningsSurpriseTolerance.revenue,
  );
  if (
    event.epsActual === null &&
    event.epsConsensus === null &&
    event.revenueActual === null &&
    event.revenueConsensus === null
  ) return null;

  return (
    <dl className="earnings-results">
      <div>
        <dt>EPS</dt>
        <dd>{formatEps(event.epsActual)} <span>/ {formatEps(event.epsConsensus)}</span></dd>
        <dd className={`surprise surprise-${epsLabel}`}>{surpriseLabel(epsLabel)}</dd>
      </div>
      <div>
        <dt>매출</dt>
        <dd>{formatRevenue(event.revenueActual)} <span>/ {formatRevenue(event.revenueConsensus)}</span></dd>
        <dd className={`surprise surprise-${revenueLabel}`}>{surpriseLabel(revenueLabel)}</dd>
      </div>
    </dl>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <article className={`calendar-event calendar-event-${event.importance}`}>
      <time dateTime={event.startsAtUtc}>{sessionLabel(event)}</time>
      <div className="calendar-event-copy">
        <div className="calendar-event-title-line">
          <span>{categoryLabel(event)}</span>
          <h3>{event.title}</h3>
        </div>
        <div className="calendar-event-meta">
          {event.fiscalPeriod && <span>{event.fiscalPeriod}</span>}
          <a href={event.sourceUrl} target="_blank" rel="noreferrer">
            {sourceLabel(event.sourceProvider)}
            <ArrowSquareOut size={13} />
          </a>
        </div>
        <EventResults event={event} />
      </div>
    </article>
  );
}

function WeekTimeline({
  selected,
  today,
  eventsByDay,
}: {
  selected: string;
  today: string;
  eventsByDay: Map<string, CalendarEvent[]>;
}) {
  const start = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return (
    <div className="week-timeline">
      {days.map((day) => {
        const events = eventsByDay.get(day) ?? [];
        return (
          <section className="timeline-day" key={day} aria-labelledby={`day-${day}`}>
            <header className={day === today ? "timeline-day-today" : ""}>
              <time id={`day-${day}`} dateTime={day}>{dateHeading(day)}</time>
              <span>{events.length || ""}</span>
            </header>
            <div className="timeline-day-events">
              {events.length ? (
                events.map((event) => <EventRow key={event.id} event={event} />)
              ) : (
                <p className="calendar-empty-day">일정 없음</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MonthCalendar({
  selected,
  today,
  eventsByDay,
  onSelect,
}: {
  selected: string;
  today: string;
  eventsByDay: Map<string, CalendarEvent[]>;
  onSelect: (date: string) => void;
}) {
  const grid = monthGridKeys(selected);
  const selectedMonth = selected.slice(0, 7);
  const selectedEvents = eventsByDay.get(selected) ?? [];
  return (
    <>
      <div className="month-calendar" role="grid" aria-label={monthHeading(selected)}>
        {weekdayLabels.map((label) => (
          <div className="month-weekday" role="columnheader" key={label}>{label}</div>
        ))}
        {grid.map((day) => {
          const events = eventsByDay.get(day) ?? [];
          const outside = !day.startsWith(selectedMonth);
          return (
            <button
              type="button"
              role="gridcell"
              key={day}
              className={`month-day ${outside ? "month-day-outside" : ""} ${day === selected ? "month-day-selected" : ""}`}
              aria-selected={day === selected}
              aria-label={`${dateHeading(day, true)}, 일정 ${events.length}건`}
              onClick={() => onSelect(day)}
            >
              <span className={day === today ? "month-date-today" : ""}>{Number(day.slice(-2))}</span>
              <span className="month-event-count">{events.length ? `${events.length}건` : ""}</span>
              <span className="month-event-preview">
                {events.slice(0, 2).map((event) => (
                  <span key={event.id}>{event.title}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <section className="selected-day-events" aria-labelledby="selected-day-heading">
        <h2 id="selected-day-heading">{dateHeading(selected, true)}</h2>
        {selectedEvents.length ? (
          selectedEvents.map((event) => <EventRow key={event.id} event={event} />)
        ) : (
          <p className="calendar-empty-day">일정 없음</p>
        )}
      </section>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="calendar-skeleton" aria-label="일정 불러오는 중" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
    </div>
  );
}

export function CalendarWorkspace({
  initialPayload,
  initialRange,
  today,
}: {
  initialPayload: CalendarPayload;
  initialRange: { from: string; to: string };
  today: string;
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [range, setRange] = useState(initialRange);
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<CalendarView>("week");
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRange = useCallback(async (
    nextRange: { from: string; to: string },
    force = false,
  ) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(nextRange);
      const response = await fetch(`/api/calendar?${params}`, {
        method: force ? "POST" : "GET",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Calendar request failed");
      setPayload((await response.json()) as CalendarPayload);
      setRange(nextRange);
    } catch {
      setError("일정을 갱신하지 못했습니다. 저장된 일정을 표시합니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const visibleEvents = useMemo(
    () => payload.events.filter((event) => filterEvent(event, filter)),
    [filter, payload.events],
  );
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of visibleEvents) {
      const key = kstParts(event.startsAtUtc).key;
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
  }, [visibleEvents]);

  function selectDate(next: string) {
    setSelected(next);
    if (next < range.from || next > range.to) {
      void loadRange({ from: addDays(next, -45), to: addDays(next, 120) });
    }
  }

  function movePeriod(direction: -1 | 1) {
    selectDate(view === "week" ? addDays(selected, direction * 7) : addMonths(selected, direction));
  }

  return (
    <main className="calendar-shell">
      <aside className="calendar-sidebar">
        <PrimaryNavigation active="calendar" />
      </aside>
      <section className="calendar-workspace">
        <header className="calendar-mobile-header">
          <strong>일정</strong>
          <div className="view-switch" role="group" aria-label="일정 보기">
            <button type="button" className={view === "week" ? "view-active" : ""} onClick={() => setView("week")}>주</button>
            <button type="button" className={view === "month" ? "view-active" : ""} onClick={() => setView("month")}>월</button>
          </div>
        </header>

        <div className="calendar-toolbar">
          <div className="calendar-period-navigation">
            <button type="button" aria-label="이전 기간" onClick={() => movePeriod(-1)}><CaretLeft size={18} /></button>
            <button type="button" className="today-button" onClick={() => selectDate(today)}>오늘</button>
            <button type="button" aria-label="다음 기간" onClick={() => movePeriod(1)}><CaretRight size={18} /></button>
            <h1>{rangeHeading(selected, view)}</h1>
          </div>
          <div className="calendar-toolbar-actions">
            <div className="view-switch desktop-view-switch" role="group" aria-label="일정 보기">
              <button type="button" className={view === "week" ? "view-active" : ""} onClick={() => setView("week")}>주간</button>
              <button type="button" className={view === "month" ? "view-active" : ""} onClick={() => setView("month")}>월간</button>
            </div>
            <button
              className="calendar-refresh"
              type="button"
              aria-label="일정 새로고침"
              disabled={refreshing}
              onClick={() => void loadRange(range, true)}
            >
              <ArrowClockwise size={18} className={refreshing ? "is-spinning" : ""} />
            </button>
          </div>
        </div>

        <div className="calendar-filter-row" role="group" aria-label="일정 분류">
          {filterOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              className={filter === option.id ? "calendar-filter-active" : ""}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && <p className="calendar-error" role="status">{error}</p>}
        <div className="calendar-content">
          {loading ? (
            <CalendarSkeleton />
          ) : view === "week" ? (
            <WeekTimeline selected={selected} today={today} eventsByDay={eventsByDay} />
          ) : (
            <MonthCalendar
              selected={selected}
              today={today}
              eventsByDay={eventsByDay}
              onSelect={selectDate}
            />
          )}
        </div>
      </section>
      <MobileBottomNavigation active="calendar" />
    </main>
  );
}
