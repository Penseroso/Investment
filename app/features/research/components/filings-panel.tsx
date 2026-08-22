"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  FileText,
} from "@phosphor-icons/react";
import type { SecFiling } from "@/lib/research-contracts";
import type { FetchState } from "../hooks/use-sec-filings";

function FilingRows({ filings }: { filings: SecFiling[] }) {
  return (
    <div className="filing-list">
      {filings.map((filing) => (
        <a
          className="filing-row"
          href={filing.url}
          target="_blank"
          rel="noreferrer"
          key={filing.accession}
        >
          <span className="form-code">{filing.form}</span>
          <span className="filing-copy">
            <strong>{filing.title}</strong>
            <small>
              {filing.filingDate}
              {filing.reportDate ? ` / 기준 ${filing.reportDate}` : ""}
            </small>
          </span>
          <ArrowSquareOut size={17} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function FilingState({
  fetchState,
  filings,
  secCompanyUrl,
  onRefresh,
}: {
  fetchState: FetchState;
  filings: SecFiling[];
  secCompanyUrl: string;
  onRefresh: () => void;
}) {
  if (fetchState === "loading") {
    return (
      <div className="skeleton-list" aria-label="공시 불러오는 중">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (fetchState === "success" && filings.length) {
    return <FilingRows filings={filings} />;
  }

  if (fetchState === "error") {
    return (
      <div className="state-message state-error">
        <FileText size={22} />
        <div>
          <strong>공시를 불러오지 못했습니다.</strong>
          <p>다시 시도하거나 SEC에서 원문을 확인해 주세요.</p>
        </div>
        <div className="state-actions">
          <a href={secCompanyUrl} target="_blank" rel="noreferrer">
            SEC 원문 <ArrowSquareOut size={14} />
          </a>
          <button type="button" onClick={onRefresh}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="state-message">
      <FileText size={22} />
      <div>
        <strong>
          {fetchState === "success" ? "표시할 공시가 없습니다." : "공시 연결이 필요합니다."}
        </strong>
        <p>
          {fetchState === "success"
            ? "선택한 공시 유형에는 결과가 없습니다."
            : "CIK 확인 후 공시를 연결할 수 있습니다."}
        </p>
      </div>
    </div>
  );
}

export function FilingsPanel({
  fetchState,
  filings,
  secCompanyUrl,
  lastUpdatedAt,
  refreshing,
  refreshFailed,
  onRefresh,
}: {
  fetchState: FetchState;
  filings: SecFiling[];
  secCompanyUrl: string;
  lastUpdatedAt: string | null;
  refreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => void;
}) {
  const updatedLabel =
    lastUpdatedAt && new Date(lastUpdatedAt).getTime() > 0
      ? new Intl.DateTimeFormat("ko-KR", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(lastUpdatedAt))
      : null;

  return (
    <section className="workspace-section filing-section">
      <div className="section-heading">
        <div>
          <h2>공시</h2>
          {updatedLabel && (
            <small className={refreshFailed ? "section-meta is-warning" : "section-meta"}>
              {refreshFailed ? "갱신 실패 · 저장본 표시" : `업데이트 ${updatedLabel}`}
            </small>
          )}
        </div>
        <button
          type="button"
          className="refresh-button"
          onClick={onRefresh}
          disabled={fetchState === "loading" || refreshing}
        >
          <ArrowClockwise size={16} className={refreshing ? "is-spinning" : undefined} />
          {refreshing ? "갱신 중" : "갱신"}
        </button>
      </div>
      <FilingState
        fetchState={fetchState}
        filings={filings}
        secCompanyUrl={secCompanyUrl}
        onRefresh={onRefresh}
      />
    </section>
  );
}
