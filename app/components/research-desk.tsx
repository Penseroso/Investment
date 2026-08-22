"use client";

import {
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import type { Company } from "@/lib/companies";
import type { ResearchTab } from "@/lib/research-contracts";
import { companyFromFormData } from "../features/research/data/company-repository";
import {
  CompanyHeader,
  MobileAppbar,
  ResearchTabs,
  Watchlist,
} from "../features/research/components/research-navigation";
import { OverviewPanel } from "../features/research/components/overview-panel";
import { ValuationPanel } from "../features/research/components/valuation-panel";
import { FilingsPanel } from "../features/research/components/filings-panel";
import { IrPanel } from "../features/research/components/ir-panel";
import {
  AddCompanyDialog,
  MetricDialog,
  TickerPickerDialog,
} from "../features/research/components/research-dialogs";
import { useCompanies } from "../features/research/hooks/use-companies";
import { useOverlayFocus } from "../features/research/hooks/use-overlay-focus";
import { useSecFilings } from "../features/research/hooks/use-sec-filings";
import { useIrDocuments } from "../features/research/hooks/use-ir-documents";
import { MobileBottomNavigation } from "./app-navigation";

export default function ResearchDesk({ initialCompanies }: { initialCompanies: Company[] }) {
  const { companies, saveCustomCompany } = useCompanies(initialCompanies);
  const [selectedTicker, setSelectedTicker] = useState("CEG");
  const [activeTab, setActiveTab] = useState<ResearchTab>("overview");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [tickerPickerOpen, setTickerPickerOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState<string | null>(null);
  const [addCompanyError, setAddCompanyError] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const overlayTriggerRef = useRef<HTMLButtonElement | null>(null);

  const company = companies.find((item) => item.ticker === selectedTicker) ?? companies[0];
  const activeMetric = company.metrics.find((metric) => metric.code === metricOpen);
  const overlayOpen = addCompanyOpen || tickerPickerOpen || Boolean(activeMetric);
  const overlayKey = addCompanyOpen
    ? "add-company"
    : tickerPickerOpen
      ? "ticker-picker"
      : activeMetric
        ? `metric-${activeMetric.code}`
        : "";
  const secCompanyUrl = company.cik
    ? `https://www.sec.gov/edgar/browse/?CIK=${company.cik}&owner=exclude&action=getcompany`
    : "";
  const {
    fetchState,
    filings,
    lastUpdatedAt,
    refreshing,
    refreshFailed,
    refresh,
  } = useSecFilings(company, company.secEnabled);
  const {
    fetchState: irFetchState,
    documents: irDocuments,
    lastUpdatedAt: irLastUpdatedAt,
    refreshing: irRefreshing,
    refreshFailed: irRefreshFailed,
    refresh: refreshIr,
  } = useIrDocuments(company, activeTab === "ir");

  const closeOverlay = useCallback(() => {
    setAddCompanyOpen(false);
    setTickerPickerOpen(false);
    setMetricOpen(null);
  }, []);

  useOverlayFocus(overlayKey, dialogRef, overlayTriggerRef, closeOverlay);

  function selectCompany(ticker: string) {
    setSelectedTicker(ticker);
    setActiveTab("overview");
    setMetricOpen(null);
    setTickerPickerOpen(false);
  }

  async function addCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = companyFromFormData(new FormData(event.currentTarget));
    if (!next.ticker || !next.name) return;

    setAddCompanyError("");
    setSavingCompany(true);
    try {
      if (companies.some((existing) => existing.ticker === next.ticker)) {
        selectCompany(next.ticker);
      } else {
        await saveCustomCompany(next);
        selectCompany(next.ticker);
      }
      setAddCompanyOpen(false);
      event.currentTarget.reset();
    } catch {
      setAddCompanyError("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSavingCompany(false);
    }
  }

  function openAddCompany(event: ReactMouseEvent<HTMLButtonElement>) {
    overlayTriggerRef.current = event.currentTarget;
    setTickerPickerOpen(false);
    setMetricOpen(null);
    setAddCompanyError("");
    setAddCompanyOpen(true);
  }

  function openTickerPicker(event: ReactMouseEvent<HTMLButtonElement>) {
    overlayTriggerRef.current = event.currentTarget;
    setAddCompanyOpen(false);
    setMetricOpen(null);
    setTickerPickerOpen(true);
  }

  function openMetricDialog(code: string, event: ReactMouseEvent<HTMLButtonElement>) {
    overlayTriggerRef.current = event.currentTarget;
    setAddCompanyOpen(false);
    setTickerPickerOpen(false);
    setMetricOpen(code);
  }

  return (
    <main className="app-shell">
      <Watchlist
        companies={companies}
        selectedTicker={company.ticker}
        inert={overlayOpen}
        onSelect={selectCompany}
        onAdd={openAddCompany}
      />

      <section className="workspace" inert={overlayOpen}>
        <MobileAppbar
          ticker={company.ticker}
          pickerOpen={tickerPickerOpen}
          onOpenPicker={openTickerPicker}
        />
        <CompanyHeader company={company} />
        <ResearchTabs activeTab={activeTab} onChange={setActiveTab} />

        <div
          className="content-area"
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === "overview" && <OverviewPanel company={company} />}
          {activeTab === "valuation" && (
            <ValuationPanel company={company} onOpenMetric={openMetricDialog} />
          )}
          {activeTab === "filings" && (
            <FilingsPanel
              fetchState={fetchState}
              filings={filings}
              secCompanyUrl={secCompanyUrl}
              lastUpdatedAt={lastUpdatedAt}
              refreshing={refreshing}
              refreshFailed={refreshFailed}
              onRefresh={refresh}
            />
          )}
          {activeTab === "ir" && (
            <IrPanel
              fetchState={irFetchState}
              documents={irDocuments}
              irUrl={company.irUrl}
              lastUpdatedAt={irLastUpdatedAt}
              refreshing={irRefreshing}
              refreshFailed={irRefreshFailed}
              onRefresh={refreshIr}
            />
          )}
        </div>
      </section>

      {tickerPickerOpen && (
        <TickerPickerDialog
          companies={companies}
          selectedTicker={company.ticker}
          dialogRef={dialogRef}
          onClose={closeOverlay}
          onSelect={selectCompany}
          onAdd={openAddCompany}
        />
      )}
      {activeMetric && (
        <MetricDialog metric={activeMetric} dialogRef={dialogRef} onClose={closeOverlay} />
      )}
      {addCompanyOpen && (
        <AddCompanyDialog
          dialogRef={dialogRef}
          onClose={closeOverlay}
          onSubmit={addCompany}
          error={addCompanyError}
          saving={savingCompany}
        />
      )}
      <MobileBottomNavigation active="research" />
    </main>
  );
}
