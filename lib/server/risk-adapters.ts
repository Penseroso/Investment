import {
  calculateRiskSignal,
  type RiskPoint,
  type RiskSignal,
  type RiskSignalKey,
} from "@/lib/risk-contracts";

const FRED_GRAPH_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const FRED_SERIES_URL = "https://fred.stlouisfed.org/series";
const NY_FED_SOFR_URL = "https://markets.newyorkfed.org/api/rates/secured/sofr/search.json";
const NY_FED_SOURCE_URL = "https://www.newyorkfed.org/markets/reference-rates/sofr";
const OFR_CSV_URL = "https://www.financialresearch.gov/financial-stress-index/data/fsi.csv";
const OFR_SOURCE_URL = "https://www.financialresearch.gov/financial-stress-index/";

export type RiskAdapterResult = {
  key: RiskSignalKey;
  signal: RiskSignal;
  observationsSeen: number;
};

function csvCells(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseFredCsv(csv: string): RiskPoint[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .flatMap((line) => {
      const [date, rawValue] = csvCells(line);
      const value = Number(rawValue);
      return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value)
        ? [{ date, value }]
        : [];
    });
}

export function parseNyFedSofr(payload: unknown): RiskPoint[] {
  const rates = (payload as { refRates?: Array<Record<string, unknown>> })?.refRates;
  if (!Array.isArray(rates)) return [];
  return rates.flatMap((rate) => {
    const date = String(rate.effectiveDate ?? "");
    const value = Number(rate.percentRate);
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(value)
      ? [{ date, value }]
      : [];
  });
}

export function parseOfrCsv(csv: string): RiskPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = csvCells(lines[0] ?? "");
  const dateIndex = headers.indexOf("Date");
  const valueIndex = headers.indexOf("OFR FSI");
  if (dateIndex < 0 || valueIndex < 0) return [];
  return lines.slice(1).flatMap((line) => {
    const cells = csvCells(line);
    const rawDate = cells[dateIndex] ?? "";
    const value = Number(cells[valueIndex]);
    const parsedDate = new Date(`${rawDate}T00:00:00.000Z`);
    return Number.isFinite(value) && !Number.isNaN(parsedDate.getTime())
      ? [{ date: parsedDate.toISOString().slice(0, 10), value }]
      : [];
  });
}

async function textResponse(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "text/csv,text/plain;q=0.9,*/*;q=0.5" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function startDate(now: Date) {
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - 3);
  return start.toISOString().slice(0, 10);
}

async function fetchFredSeries(seriesId: string, now: Date) {
  const url = new URL(FRED_GRAPH_URL);
  url.searchParams.set("id", seriesId);
  url.searchParams.set("cosd", startDate(now));
  return parseFredCsv(await textResponse(url.toString()));
}

async function fetchSofr(now: Date) {
  const url = new URL(NY_FED_SOFR_URL);
  url.searchParams.set("startDate", startDate(now));
  url.searchParams.set("endDate", now.toISOString().slice(0, 10));
  url.searchParams.set("type", "rate");
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseNyFedSofr(await response.json());
}

function alignedDifference(left: RiskPoint[], right: RiskPoint[], scale = 1) {
  const orderedRight = [...right].sort((a, b) => a.date.localeCompare(b.date));
  let rightIndex = 0;
  let lastRight: RiskPoint | undefined;
  return [...left]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((point) => {
      while (
        rightIndex < orderedRight.length &&
        orderedRight[rightIndex].date <= point.date
      ) {
        lastRight = orderedRight[rightIndex];
        rightIndex += 1;
      }
      if (!lastRight) return [];
      return [{ date: point.date, value: (point.value - lastRight.value) * scale }];
    });
}

function alignedRatio(numerator: RiskPoint[], denominator: RiskPoint[]) {
  const denominatorByDate = new Map(
    denominator.map((point) => [point.date, point.value]),
  );
  return numerator.flatMap((point) => {
    const denominatorValue = denominatorByDate.get(point.date);
    return denominatorValue && denominatorValue > 0
      ? [{ date: point.date, value: point.value / denominatorValue }]
      : [];
  });
}

export function rollingPercentChange(series: RiskPoint[], periods: number) {
  const ordered = [...series].sort((a, b) => a.date.localeCompare(b.date));
  return ordered.slice(periods).flatMap((point, index) => {
    const prior = ordered[index].value;
    return prior !== 0
      ? [{ date: point.date, value: ((point.value / prior) - 1) * 100 }]
      : [];
  });
}

export async function fetchCreditStress(now = new Date()): Promise<RiskAdapterResult> {
  const series = await fetchFredSeries("BAMLH0A0HYM2", now);
  return {
    key: "credit_stress",
    observationsSeen: series.length,
    signal: calculateRiskSignal({
      key: "credit_stress",
      series,
      unit: "%",
      sourceProvider: "FRED · ICE BofA",
      sourceUrl: `${FRED_SERIES_URL}/BAMLH0A0HYM2`,
      dataFrequency: "daily",
      now,
    }),
  };
}

export async function fetchFundingStress(now = new Date()): Promise<RiskAdapterResult> {
  const [sofr, iorb] = await Promise.all([
    fetchSofr(now),
    fetchFredSeries("IORB", now),
  ]);
  const spread = alignedDifference(sofr, iorb, 100);
  const latestSofr = sofr.at(-1)?.value ?? null;
  const latestIorb = iorb.at(-1)?.value ?? null;
  return {
    key: "funding_stress",
    observationsSeen: spread.length,
    signal: calculateRiskSignal({
      key: "funding_stress",
      series: spread,
      unit: "bp",
      sourceProvider: "New York Fed · Federal Reserve",
      sourceUrl: NY_FED_SOURCE_URL,
      dataFrequency: "daily",
      detail: { sofr: latestSofr, iorb: latestIorb },
      now,
    }),
  };
}

export async function fetchSystemLiquidity(now = new Date()): Promise<RiskAdapterResult> {
  const reserves = await fetchFredSeries("WRESBAL", now);
  const change = rollingPercentChange(reserves, 4);
  return {
    key: "system_liquidity",
    observationsSeen: reserves.length,
    signal: calculateRiskSignal({
      key: "system_liquidity",
      series: change,
      unit: "% / 4주",
      sourceProvider: "Federal Reserve H.4.1 · FRED",
      sourceUrl: `${FRED_SERIES_URL}/WRESBAL`,
      dataFrequency: "weekly",
      detail: { reserveBalanceMillions: reserves.at(-1)?.value ?? null },
      now,
    }),
  };
}

export async function fetchEquityRiskOff(now = new Date()): Promise<RiskAdapterResult> {
  const [vix, vix3m] = await Promise.all([
    fetchFredSeries("VIXCLS", now),
    fetchFredSeries("VXVCLS", now),
  ]);
  const ratio = alignedRatio(vix, vix3m);
  return {
    key: "equity_risk_off",
    observationsSeen: ratio.length,
    signal: calculateRiskSignal({
      key: "equity_risk_off",
      series: ratio,
      unit: "배",
      sourceProvider: "Cboe · FRED",
      sourceUrl: "https://www.cboe.com/tradable-products/vix/term-structure/",
      dataFrequency: "daily",
      detail: { vix: vix.at(-1)?.value ?? null, vix3m: vix3m.at(-1)?.value ?? null },
      now,
    }),
  };
}

export async function fetchFinancialStress(now = new Date()): Promise<RiskAdapterResult> {
  const series = parseOfrCsv(await textResponse(OFR_CSV_URL)).filter(
    (point) => point.date >= startDate(now),
  );
  return {
    key: "financial_stress_composite",
    observationsSeen: series.length,
    signal: calculateRiskSignal({
      key: "financial_stress_composite",
      series,
      unit: "지수",
      sourceProvider: "U.S. OFR",
      sourceUrl: OFR_SOURCE_URL,
      dataFrequency: "daily",
      detail: { publicationLag: "T+2" },
      now,
    }),
  };
}

export const riskAdapters = [
  fetchCreditStress,
  fetchFundingStress,
  fetchSystemLiquidity,
  fetchEquityRiskOff,
  fetchFinancialStress,
] as const;
