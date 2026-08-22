"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  CaretDown,
  CaretUp,
  Minus,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import {
  type RiskLevel,
  type RiskPayload,
  type RiskSignal,
  type RiskTrend,
} from "@/lib/risk-contracts";
import {
  MobileBottomNavigation,
  PrimaryNavigation,
} from "@/app/components/app-navigation";

const levelLabel: Record<RiskLevel, string> = {
  normal: "정상",
  watch: "관찰",
  warning: "경고",
  stress: "스트레스",
};

const trendLabel: Record<RiskTrend, string> = {
  improving: "개선",
  stable: "보합",
  worsening: "악화",
};

function formatNumber(value: number, unit: string) {
  const digits = unit === "배" ? 2 : Math.abs(value) < 10 ? 2 : 1;
  return value.toLocaleString("ko-KR", { maximumFractionDigits: digits });
}

function formatDelta(value: number | null, unit: string) {
  if (value === null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, unit)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function Trend({ trend }: { trend: RiskTrend }) {
  const Icon = trend === "worsening" ? CaretUp : trend === "improving" ? CaretDown : Minus;
  return <span className={`risk-trend risk-trend-${trend}`}><Icon size={13} />{trendLabel[trend]}</span>;
}

function SignalRow({ signal }: { signal: RiskSignal }) {
  return (
    <article className="risk-signal-row">
      <div className="risk-signal-identity">
        <span className={`risk-level-mark risk-level-${signal.level}`} aria-hidden="true" />
        <div><h2>{signal.label}</h2><p>{signal.role}</p></div>
      </div>
      <div className="risk-value">
        <strong>{formatNumber(signal.value, signal.unit)}</strong>
        <span>{signal.unit}</span>
      </div>
      <dl className="risk-change">
        <div><dt>1일</dt><dd>{formatDelta(signal.delta1, signal.unit)}</dd></div>
        <div><dt>5일</dt><dd>{formatDelta(signal.delta5, signal.unit)}</dd></div>
      </dl>
      <div className="risk-percentile"><span>3년 스트레스 백분위</span><strong>{Math.round(signal.percentile)}</strong></div>
      <div className="risk-state"><span className={`risk-level-text risk-level-${signal.level}`}>{levelLabel[signal.level]}</span><Trend trend={signal.trend} /></div>
      <div className="risk-source">
        <a href={signal.sourceUrl} target="_blank" rel="noreferrer">{signal.sourceProvider}<ArrowSquareOut size={12} /></a>
        <span>{formatDate(signal.asOfDate)} · {signal.dataFrequency === "weekly" ? "주간" : "일간"}</span>
      </div>
    </article>
  );
}

export function RiskWorkspace({ initialPayload }: { initialPayload: RiskPayload }) {
  const [payload, setPayload] = useState(initialPayload);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!payload.report || payload.report.readAt) return;
    void fetch("/api/risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", reportDate: payload.report.reportDate }),
    }).then((response) => {
      if (response.ok) window.dispatchEvent(new Event("risk-report-read"));
    });
  }, [payload.report]);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!response.ok) throw new Error("refresh failed");
      setPayload(await response.json() as RiskPayload);
    } catch {
      setError("새 데이터를 가져오지 못했습니다. 저장된 관측치는 그대로 유지됩니다.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="risk-shell">
      <aside className="risk-sidebar"><PrimaryNavigation active="risk" /></aside>
      <main className="risk-workspace">
        <header className="risk-mobile-header"><strong>리스크</strong></header>
        <section className="risk-report-header">
          <div className="risk-report-copy">
            <h1>{payload.report?.headline ?? "첫 관측치를 수집하고 있습니다"}</h1>
            <div className="risk-report-meta">
              <span className={`risk-level-text risk-level-${payload.report?.overallLevel ?? "normal"}`}>{payload.report ? levelLabel[payload.report.overallLevel] : "대기"}</span>
              {payload.report && <time dateTime={payload.report.reportDate}>{payload.report.reportDate} KST</time>}
              {payload.stale && <span>일부 지연</span>}
            </div>
            <p>{payload.report?.summary ?? "공식 데이터가 저장되면 일별 리스크 리포트가 생성됩니다."}</p>
          </div>
          <button className="risk-refresh" onClick={refresh} disabled={refreshing} aria-label="리스크 데이터 새로고침">
            <ArrowClockwise size={17} className={refreshing ? "is-spinning" : ""} />
            <span>{refreshing ? "수집 중" : "새로고침"}</span>
          </button>
        </section>
        {error && <p className="risk-error" role="alert">{error}</p>}
        <section className="risk-ledger" aria-label="시장 리스크 신호">
          <header className="risk-ledger-heading">
            <span>신호</span><span>현재</span><span>변화</span><span>분포</span><span>판정</span><span>출처</span>
          </header>
          {payload.signals.length ? payload.signals.map((signal) => <SignalRow key={signal.key} signal={signal} />) : (
            <div className="risk-empty"><strong>저장된 관측치가 없습니다</strong><p>새로고침으로 공식 소스 수집을 다시 시도할 수 있습니다.</p></div>
          )}
        </section>
        <footer className="risk-method-note">
          <p>OFR FSI는 독립 신호의 확인 지표로만 사용하며 종합 판정에 중복 가중하지 않습니다.</p>
          <span>{payload.signals.length}/5 신호 · {payload.sources.filter((source) => source.status === "ready").length}/5 소스 응답</span>
        </footer>
      </main>
      <MobileBottomNavigation active="risk" />
    </div>
  );
}
