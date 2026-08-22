"use client";

import { Info } from "@phosphor-icons/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { Company, CompanyMetric } from "@/lib/companies";
import { metricCategoryOrder } from "@/lib/research-contracts";

function MetricRow({
  metric,
  onOpen,
}: {
  metric: CompanyMetric;
  onOpen: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="metric-row">
      <strong>{metric.label}</strong>
      <span>{metric.whyItMatters}</span>
      <button
        className="icon-button"
        type="button"
        aria-label={`${metric.label} 정의와 계산식`}
        aria-haspopup="dialog"
        onClick={onOpen}
      >
        <Info size={18} />
      </button>
    </div>
  );
}

export function ValuationPanel({
  company,
  onOpenMetric,
}: {
  company: Company;
  onOpenMetric: (code: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <section className="workspace-section valuation-section">
      <h2>이 종목에서 보는 지표</h2>
      {metricCategoryOrder.map((category) => {
        const metrics = company.metrics.filter((metric) => metric.category === category);
        if (!metrics.length) return null;
        return (
          <section className="metric-group" key={category}>
            <h3>{category}</h3>
            <div className="metric-list">
              {metrics.map((metric) => (
                <MetricRow
                  key={metric.code}
                  metric={metric}
                  onOpen={(event) => onOpenMetric(metric.code, event)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
