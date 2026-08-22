"use client";

import { CaretDown, Plus } from "@phosphor-icons/react";
import type { MouseEventHandler } from "react";
import type { Company } from "@/lib/companies";
import { researchTabs, type ResearchTab } from "@/lib/research-contracts";
import { PrimaryNavigation } from "@/app/components/app-navigation";

export function Watchlist({
  companies,
  selectedTicker,
  inert,
  onSelect,
  onAdd,
}: {
  companies: Company[];
  selectedTicker: string;
  inert: boolean;
  onSelect: (ticker: string) => void;
  onAdd: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <aside className="watchlist" aria-label="관심 종목" inert={inert}>
      <PrimaryNavigation active="research" />
      <div className="watchlist-heading">
        <strong>관심 종목</strong>
      </div>
      <nav className="company-list" aria-label="종목 선택">
        {companies.map((company) => (
          <button
            type="button"
            key={company.ticker}
            className={`company-button ${company.ticker === selectedTicker ? "company-button-active" : ""}`}
            aria-current={company.ticker === selectedTicker ? "true" : undefined}
            onClick={() => onSelect(company.ticker)}
          >
            <span>{company.ticker}</span>
            <span className="company-button-name">{company.name}</span>
          </button>
        ))}
      </nav>
      <button className="add-company" type="button" onClick={onAdd}>
        <Plus size={17} weight="bold" />
        종목 추가
      </button>
    </aside>
  );
}

export function MobileAppbar({
  ticker,
  pickerOpen,
  onOpenPicker,
}: {
  ticker: string;
  pickerOpen: boolean;
  onOpenPicker: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <header className="mobile-appbar">
      <strong className="mobile-title">관심 종목</strong>
      <button
        className="ticker-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={pickerOpen}
        onClick={onOpenPicker}
      >
        <span>{ticker}</span>
        <CaretDown size={16} weight="bold" />
      </button>
    </header>
  );
}

export function CompanyHeader({ company }: { company: Company }) {
  return (
    <div className="company-header">
      <div className="company-title">
        <div className="company-heading-line">
          <span className="ticker-code">{company.ticker}</span>
          <h1>{company.name}</h1>
        </div>
        <p>
          {company.market} / {company.sector.replaceAll(" · ", ", ")}
        </p>
      </div>
    </div>
  );
}

export function ResearchTabs({
  activeTab,
  onChange,
}: {
  activeTab: ResearchTab;
  onChange: (tab: ResearchTab) => void;
}) {
  return (
    <div className="tabs" role="tablist" aria-label="종목 정보">
      {researchTabs.map((tab) => (
        <button
          id={`tab-${tab.id}`}
          key={tab.id}
          type="button"
          role="tab"
          aria-controls={`panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? "tab-active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
