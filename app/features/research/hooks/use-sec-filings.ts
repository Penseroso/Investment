"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Company } from "@/lib/companies";
import type { SecPayload } from "@/lib/research-contracts";

export type FetchState = "idle" | "loading" | "success" | "error";

export function useSecFilings(company: Company, supported: boolean) {
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [secData, setSecData] = useState<SecPayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const activeTicker = useRef(company.ticker);

  useEffect(() => {
    activeTicker.current = company.ticker;
  }, [company.ticker]);

  useEffect(() => {
    let cancelled = false;

    async function loadFilings() {
      setSecData(null);
      setRefreshFailed(false);
      if (!company.cik || !supported) {
        setFetchState("idle");
        return;
      }

      setFetchState("loading");
      try {
        const response = await fetch(
          `/api/filings?ticker=${encodeURIComponent(company.ticker)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("SEC request failed");
        const payload = (await response.json()) as SecPayload;
        if (cancelled) return;
        setSecData(payload);
        setFetchState("success");
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setFetchState("error");
        }
      }
    }

    const controller = new AbortController();
    void loadFilings();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [company.cik, company.ticker, supported]);

  const refresh = useCallback(async () => {
    if (!company.cik || !supported || refreshing) return;
    const requestedTicker = company.ticker;
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const response = await fetch(
        `/api/filings?ticker=${encodeURIComponent(requestedTicker)}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("SEC refresh failed");
      const payload = (await response.json()) as SecPayload;
      if (activeTicker.current !== requestedTicker) return;
      setSecData(payload);
      setFetchState("success");
    } catch {
      if (activeTicker.current !== requestedTicker) return;
      if (secData) {
        setRefreshFailed(true);
      } else {
        setFetchState("error");
      }
    } finally {
      if (activeTicker.current === requestedTicker) setRefreshing(false);
    }
  }, [company.cik, company.ticker, refreshing, secData, supported]);

  const filings = useMemo(() => {
    if (!secData) return [];
    return secData.filings.filter((filing) => company.filingForms.includes(filing.form));
  }, [company.filingForms, secData]);

  return {
    fetchState,
    filings,
    lastUpdatedAt: secData?.fetchedAt ?? null,
    refreshing,
    refreshFailed,
    refresh,
  };
}
