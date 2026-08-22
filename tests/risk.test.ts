import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRiskReport,
  calculateRiskSignal,
  classifyOverallRisk,
  classifyRiskSignal,
  type RiskLevel,
  type RiskSignal,
  type RiskSignalKey,
} from "../lib/risk-contracts";
import {
  parseFredCsv,
  parseNyFedSofr,
  parseOfrCsv,
  rollingPercentChange,
} from "../lib/server/risk-adapters";

test("parses official FRED, NY Fed, and OFR observations", () => {
  assert.deepEqual(parseFredCsv("observation_date,SOFR\n2026-08-12,5.31\n2026-08-13,."), [
    { date: "2026-08-12", value: 5.31 },
  ]);
  assert.deepEqual(parseNyFedSofr({ refRates: [
    { effectiveDate: "2026-08-12", percentRate: 5.31 },
  ] }), [{ date: "2026-08-12", value: 5.31 }]);
  assert.deepEqual(parseOfrCsv("Date,OFR FSI,Credit\n2026-08-11,0.42,0.1"), [
    { date: "2026-08-11", value: 0.42 },
  ]);
});

test("calculates a four-period liquidity change", () => {
  const series = [100, 110, 120, 130, 80].map((value, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    value,
  }));
  assert.ok(Math.abs(rollingPercentChange(series, 4)[0].value + 20) < 1e-9);
});

test("uses absolute thresholds and history percentile for signal levels", () => {
  assert.equal(classifyRiskSignal("credit_stress", 5.2, 50), "warning");
  assert.equal(classifyRiskSignal("funding_stress", 2, 99), "stress");
  assert.equal(classifyRiskSignal("system_liquidity", -8, 50), "warning");
  assert.equal(classifyRiskSignal("equity_risk_off", 0.9, 50), "normal");
});

function signal(key: RiskSignalKey, level: RiskLevel): RiskSignal {
  return {
    ...calculateRiskSignal({
      key,
      series: Array.from({ length: 24 }, (_, index) => ({
        date: `2026-07-${String(index + 1).padStart(2, "0")}`,
        value: index + 1,
      })),
      unit: "index",
      sourceProvider: "test",
      sourceUrl: "https://example.com",
      dataFrequency: "daily",
    }),
    level,
  };
}

test("uses OFR only as confirmation instead of a fifth equal vote", () => {
  assert.equal(classifyOverallRisk([
    signal("credit_stress", "normal"),
    signal("funding_stress", "normal"),
    signal("system_liquidity", "normal"),
    signal("equity_risk_off", "normal"),
    signal("financial_stress_composite", "stress"),
  ]), "watch");
  assert.equal(classifyOverallRisk([
    signal("credit_stress", "warning"),
    signal("funding_stress", "warning"),
    signal("system_liquidity", "normal"),
    signal("equity_risk_off", "normal"),
    signal("financial_stress_composite", "warning"),
  ]), "stress");
});

test("builds a deterministic Korean daily report without trade language", () => {
  const report = buildRiskReport([
    signal("credit_stress", "warning"),
    signal("funding_stress", "normal"),
  ], "2026-08-14");
  assert.equal(report.reportDate, "2026-08-14");
  assert.doesNotMatch(`${report.headline} ${report.summary}`, /매수|매도/);
});
