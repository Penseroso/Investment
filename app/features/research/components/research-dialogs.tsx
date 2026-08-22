"use client";

import { CheckCircle, Plus, X } from "@phosphor-icons/react";
import type {
  FormEventHandler,
  MouseEventHandler,
  RefObject,
} from "react";
import type { Company, MetricDefinition } from "@/lib/companies";

type DialogRef = RefObject<HTMLElement | null>;

export function TickerPickerDialog({
  companies,
  selectedTicker,
  dialogRef,
  onClose,
  onSelect,
  onAdd,
}: {
  companies: Company[];
  selectedTicker: string;
  dialogRef: DialogRef;
  onClose: () => void;
  onSelect: (ticker: string) => void;
  onAdd: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="ticker-picker"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticker-picker-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 id="ticker-picker-title">관심 종목</h2>
          <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="ticker-options">
          {companies.map((company) => (
            <button
              className="ticker-option"
              type="button"
              key={company.ticker}
              aria-current={company.ticker === selectedTicker ? "true" : undefined}
              onClick={() => onSelect(company.ticker)}
            >
              <span className="ticker-option-code">{company.ticker}</span>
              <span>
                <strong>{company.name}</strong>
                <small>
                  {company.market} / {company.sector}
                </small>
              </span>
              {company.ticker === selectedTicker && <CheckCircle size={19} weight="fill" />}
            </button>
          ))}
        </div>
        <button className="picker-add" type="button" onClick={onAdd}>
          <Plus size={18} weight="bold" />
          관심 종목 추가
        </button>
      </section>
    </div>
  );
}

export function MetricDialog({
  metric,
  dialogRef,
  onClose,
}: {
  metric: MetricDefinition;
  dialogRef: DialogRef;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop metric-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="metric-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 id="metric-dialog-title">{metric.label}</h2>
          <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="metric-details">
          <section>
            <h3>정의</h3>
            <p>{metric.definition}</p>
          </section>
          {metric.formulaDisplay && (
            <section>
              <h3>계산</h3>
              <p className="metric-formula">{metric.formulaDisplay}</p>
            </section>
          )}
          <section>
            <h3>읽는 법</h3>
            <p>{metric.interpretation}</p>
          </section>
        </div>
      </section>
    </div>
  );
}

export function AddCompanyDialog({
  dialogRef,
  onClose,
  onSubmit,
  error,
  saving,
}: {
  dialogRef: DialogRef;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  error: string;
  saving: boolean;
}) {
  return (
    <div className="modal-backdrop panel-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="add-panel"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-company-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="add-panel-header">
          <h2 id="add-company-title">관심 종목 추가</h2>
          <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} aria-busy={saving}>
          <label>
            티커
            <input name="ticker" required maxLength={8} autoComplete="off" />
          </label>
          <label>
            회사명
            <input name="name" required autoComplete="organization" />
          </label>
          <label>
            SEC CIK <span>선택</span>
            <input name="cik" inputMode="numeric" autoComplete="off" />
          </label>
          <label>
            공식 IR 주소 <span>선택</span>
            <input name="irUrl" type="url" autoComplete="url" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "저장 중" : "종목 저장"}
          </button>
        </form>
      </section>
    </div>
  );
}
