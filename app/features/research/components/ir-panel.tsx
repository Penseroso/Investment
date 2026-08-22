"use client";

import {
  ArrowClockwise,
  ArrowSquareOut,
  PresentationChart,
} from "@phosphor-icons/react";
import type { IrDocument, IrDocumentType } from "@/lib/research-contracts";
import type { FetchState } from "../hooks/use-sec-filings";

const typeLabels: Record<IrDocumentType, string> = {
  earnings_release: "실적",
  presentation: "자료",
  quarterly_results: "분기",
  monthly_revenue: "월매출",
  event: "행사",
};

function IrRows({ documents }: { documents: IrDocument[] }) {
  return (
    <div className="filing-list">
      {documents.map((document) => (
        <a
          className="filing-row ir-document-row"
          href={document.url}
          target="_blank"
          rel="noreferrer"
          key={document.id}
        >
          <span className="form-code">{typeLabels[document.documentType]}</span>
          <span className="filing-copy">
            <strong>{document.title}</strong>
            {document.publishedAt && <small>{document.publishedAt}</small>}
          </span>
          <ArrowSquareOut size={17} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function IrState({
  fetchState,
  documents,
  irUrl,
  onRefresh,
}: {
  fetchState: FetchState;
  documents: IrDocument[];
  irUrl: string;
  onRefresh: () => void;
}) {
  if (fetchState === "loading") {
    return (
      <div className="skeleton-list" aria-label="IR 자료 불러오는 중">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (fetchState === "success" && documents.length) return <IrRows documents={documents} />;

  if (fetchState === "error") {
    return (
      <div className="state-message state-error">
        <PresentationChart size={22} />
        <div>
          <strong>IR 자료를 불러오지 못했습니다.</strong>
          <p>다시 시도하거나 기업의 공식 IR 페이지를 확인해 주세요.</p>
        </div>
        <div className="state-actions">
          {irUrl && (
            <a href={irUrl} target="_blank" rel="noreferrer">
              공식 IR <ArrowSquareOut size={14} />
            </a>
          )}
          <button type="button" onClick={onRefresh}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="state-message state-message-plain">
      <div>
        <strong>
          {fetchState === "success" ? "표시할 IR 자료가 없습니다." : "IR 주소가 없습니다."}
        </strong>
        <p>
          {fetchState === "success"
            ? "공식 페이지에서 인식 가능한 자료를 찾지 못했습니다."
            : "종목 정보에 공식 IR 주소를 등록해 주세요."}
        </p>
      </div>
    </div>
  );
}

export function IrPanel({
  fetchState,
  documents,
  irUrl,
  lastUpdatedAt,
  refreshing,
  refreshFailed,
  onRefresh,
}: {
  fetchState: FetchState;
  documents: IrDocument[];
  irUrl: string;
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
    <section className="workspace-section ir-section">
      <div className="section-heading">
        <div>
          <h2>IR</h2>
          {updatedLabel && (
            <small className={refreshFailed ? "section-meta is-warning" : "section-meta"}>
              {refreshFailed ? "갱신 실패 · 저장본 표시" : `업데이트 ${updatedLabel}`}
            </small>
          )}
        </div>
        <div className="section-actions">
          {irUrl && (
            <a className="source-link" href={irUrl} target="_blank" rel="noreferrer">
              공식 페이지 <ArrowSquareOut size={14} />
            </a>
          )}
          <button
            type="button"
            className="refresh-button"
            onClick={onRefresh}
            disabled={fetchState === "loading" || refreshing || !irUrl}
          >
            <ArrowClockwise size={16} className={refreshing ? "is-spinning" : undefined} />
            {refreshing ? "갱신 중" : "갱신"}
          </button>
        </div>
      </div>
      <IrState
        fetchState={fetchState}
        documents={documents}
        irUrl={irUrl}
        onRefresh={onRefresh}
      />
    </section>
  );
}
