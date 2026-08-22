"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Company } from "@/lib/companies";
import type { IrPayload } from "@/lib/research-contracts";
import type { FetchState } from "./use-sec-filings";

export function useIrDocuments(company: Company, enabled: boolean) {
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [irData, setIrData] = useState<IrPayload | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const activeTicker = useRef(company.ticker);

  useEffect(() => {
    activeTicker.current = company.ticker;
  }, [company.ticker]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadDocuments() {
      setIrData(null);
      setRefreshFailed(false);
      if (!company.irUrl || !enabled) {
        setFetchState("idle");
        return;
      }

      setFetchState("loading");
      try {
        const response = await fetch(
          `/api/ir?ticker=${encodeURIComponent(company.ticker)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("IR request failed");
        const payload = (await response.json()) as IrPayload;
        if (cancelled) return;
        setIrData(payload);
        setFetchState("success");
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setFetchState("error");
        }
      }
    }

    void loadDocuments();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [company.irUrl, company.ticker, enabled]);

  const refresh = useCallback(async () => {
    if (!company.irUrl || !enabled || refreshing) return;
    const requestedTicker = company.ticker;
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const response = await fetch(
        `/api/ir?ticker=${encodeURIComponent(requestedTicker)}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("IR refresh failed");
      const payload = (await response.json()) as IrPayload;
      if (activeTicker.current !== requestedTicker) return;
      setIrData(payload);
      setFetchState("success");
    } catch {
      if (activeTicker.current !== requestedTicker) return;
      if (irData) setRefreshFailed(true);
      else setFetchState("error");
    } finally {
      if (activeTicker.current === requestedTicker) setRefreshing(false);
    }
  }, [company.irUrl, company.ticker, enabled, irData, refreshing]);

  return {
    fetchState,
    documents: irData?.documents ?? [],
    lastUpdatedAt: irData?.fetchedAt ?? null,
    refreshing,
    refreshFailed,
    refresh,
  };
}
