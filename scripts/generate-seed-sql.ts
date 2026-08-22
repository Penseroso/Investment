import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { genericMetrics, starterCompanies } from "../lib/companies";
import { irSourceSeeds } from "../lib/server/ir-adapters";
import { starterCompanyResearch } from "../lib/server/company-research-seed";

type SqlValue = boolean | null | number | string | string[] | Record<string, unknown>;
type SqlRow = Record<string, SqlValue>;

const companyFacts: Record<
  string,
  {
    countryCode: string;
    currency: string;
    fiscalYearEnd: string;
    listings: Array<{ exchange: string; ticker: string; currency: string; primary: boolean }>;
  }
> = {
  CEG: {
    countryCode: "US",
    currency: "USD",
    fiscalYearEnd: "1231",
    listings: [{ exchange: "NASDAQ", ticker: "CEG", currency: "USD", primary: true }],
  },
  COHR: {
    countryCode: "US",
    currency: "USD",
    fiscalYearEnd: "0630",
    listings: [{ exchange: "NYSE", ticker: "COHR", currency: "USD", primary: true }],
  },
  TSM: {
    countryCode: "TW",
    currency: "TWD",
    fiscalYearEnd: "1231",
    listings: [
      { exchange: "NYSE", ticker: "TSM", currency: "USD", primary: true },
      { exchange: "OTC", ticker: "TSMWF", currency: "USD", primary: false },
    ],
  },
};

const marketSeriesRows: SqlRow[] = [
  { key: "FRED_BAMLH0A0HYM2", provider: "FRED", provider_series_id: "BAMLH0A0HYM2", label: "ICE BofA US High Yield OAS", unit: "%", frequency: "daily", revision_policy: "vintage", source_url: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2" },
  { key: "FRED_IORB", provider: "FRED", provider_series_id: "IORB", label: "Interest on Reserve Balances", unit: "%", frequency: "daily", revision_policy: "vintage", source_url: "https://fred.stlouisfed.org/series/IORB" },
  { key: "FRED_WRESBAL", provider: "FRED", provider_series_id: "WRESBAL", label: "Reserve Balances with Federal Reserve Banks", unit: "USD millions", frequency: "weekly", revision_policy: "vintage", source_url: "https://fred.stlouisfed.org/series/WRESBAL" },
  { key: "FRED_VIXCLS", provider: "FRED", provider_series_id: "VIXCLS", label: "Cboe VIX", unit: "index", frequency: "daily", revision_policy: "vintage", source_url: "https://fred.stlouisfed.org/series/VIXCLS" },
  { key: "FRED_VXVCLS", provider: "FRED", provider_series_id: "VXVCLS", label: "Cboe 3-Month Volatility Index", unit: "index", frequency: "daily", revision_policy: "vintage", source_url: "https://fred.stlouisfed.org/series/VXVCLS" },
  { key: "NYFED_SOFR", provider: "New York Fed", provider_series_id: "SOFR", label: "Secured Overnight Financing Rate", unit: "%", frequency: "daily", revision_policy: "revision_indicator", source_url: "https://www.newyorkfed.org/markets/reference-rates/sofr" },
  { key: "OFR_FSI", provider: "OFR", provider_series_id: "OFR FSI", label: "OFR Financial Stress Index", unit: "index", frequency: "daily", revision_policy: "latest", source_url: "https://www.financialresearch.gov/financial-stress-index/" },
  ...["Credit", "Equity valuation", "Safe assets", "Funding", "Volatility", "United States", "Other advanced economies", "Emerging markets"].map((label) => ({
    key: `OFR_FSI_${label.toUpperCase().replaceAll(" ", "_")}`,
    provider: "OFR",
    provider_series_id: label,
    label: `OFR FSI ${label}`,
    unit: "contribution",
    frequency: "daily",
    revision_policy: "latest",
    source_url: "https://www.financialresearch.gov/financial-stress-index/",
  })),
];

function value(value: SqlValue) {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return `'${serialized.replaceAll("'", "''")}'`;
}

function upserts(table: string, rows: SqlRow[], conflictColumns: string[]) {
  return rows.map((row) => {
    const columns = Object.keys(row);
    const updates = columns
      .filter((column) => !conflictColumns.includes(column))
      .map((column) => `\`${column}\` = excluded.\`${column}\``)
      .join(", ");
    return `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (${columns.map((column) => value(row[column])).join(", ")}) ON CONFLICT (${conflictColumns.map((column) => `\`${column}\``).join(", ")}) DO UPDATE SET ${updates};`;
  });
}

const metricRows = [
  ...new Map(
    [...starterCompanies.flatMap((company) => company.metrics), ...genericMetrics].map((metric) => [
      metric.code,
      metric,
    ]),
  ).values(),
].map<SqlRow>((metric) => ({
  code: metric.code,
  label: metric.label,
  category: metric.category,
  definition: metric.definition,
  formula_display: metric.formulaDisplay ?? null,
  interpretation: metric.interpretation,
  calculation_key: metric.calculationKey ?? null,
  definition_version: metric.definitionVersion ?? 1,
}));

const companyRows: SqlRow[] = starterCompanies.map((company, index) => {
  const facts = companyFacts[company.ticker];
  return {
    ticker: company.ticker,
    name: company.name,
    legal_name: company.name,
    market: company.market,
    sector: company.sector,
    country_code: facts.countryCode,
    fiscal_year_end: facts.fiscalYearEnd,
    default_currency: facts.currency,
    summary: company.summary,
    website_url: company.websiteUrl,
    cik: company.cik,
    ir_url: company.irUrl,
    filing_forms: company.filingForms,
    sec_enabled: company.secEnabled,
    is_active: true,
    seed_version: 1,
    sort_order: index,
  };
});

const listingRows: SqlRow[] = starterCompanies.flatMap((company) =>
  companyFacts[company.ticker].listings.map((listing) => ({
    id: `${listing.exchange}:${listing.ticker}`,
    company_ticker: company.ticker,
    ticker: listing.ticker,
    exchange: listing.exchange,
    currency: listing.currency,
    is_primary: listing.primary,
    source_provider: "SEC submissions",
  })),
);

const metricConfigRows: SqlRow[] = starterCompanies.flatMap((company) =>
  company.metrics.map((metric, index) => ({
    company_ticker: company.ticker,
    metric_code: metric.code,
    why_it_matters: metric.whyItMatters,
    display_order: index,
    enabled: true,
  })),
);

const sourceRows: SqlRow[] = [];
const profileRows: SqlRow[] = [];
const businessLineRows: SqlRow[] = [];
const pointRows: SqlRow[] = [];
const evidenceRows: SqlRow[] = [];
for (const [ticker, research] of Object.entries(starterCompanyResearch)) {
  for (const source of research.sources) {
    sourceRows.push({
      id: source.id,
      company_ticker: ticker,
      source_type: source.sourceType,
      title: source.title,
      url: source.url,
      published_at: source.publishedAt,
    });
  }
  profileRows.push({
    company_ticker: ticker,
    business_model: research.businessModel,
    revenue_model: research.revenueModel,
    customer_structure: research.customerStructure,
    cost_structure: research.costStructure,
    capital_intensity: research.capitalIntensity,
    as_of_date: research.asOfDate,
    source_ids: research.sources.map((source) => source.id),
    content_version: 1,
  });
  for (const [index, line] of research.businessLines.entries()) {
    businessLineRows.push({ id: line.id, company_ticker: ticker, name: line.name, description: line.description, revenue_role: line.revenueRole, end_markets: line.endMarkets, display_order: index });
  }
  for (const point of [...research.valueDrivers, ...research.risks]) {
    const collection = point.kind === "value_driver" ? research.valueDrivers : research.risks;
    pointRows.push({ id: point.id, company_ticker: ticker, kind: point.kind, title: point.title, description: point.description, display_order: collection.findIndex((item) => item.id === point.id) });
  }
  for (const source of research.sources) {
    evidenceRows.push({ entity_type: "profile", entity_id: ticker, source_id: source.id, evidence_note: "Profile basis" });
    for (const line of research.businessLines) evidenceRows.push({ entity_type: "business_line", entity_id: line.id, source_id: source.id, evidence_note: "Business-line basis" });
    for (const point of [...research.valueDrivers, ...research.risks]) evidenceRows.push({ entity_type: "research_point", entity_id: point.id, source_id: source.id, evidence_note: "Research-point basis" });
  }
}

const irRows: SqlRow[] = irSourceSeeds.map((source) => ({
  company_ticker: source.ticker,
  adapter_key: source.adapterKey,
  source_kind: "mixed",
  listing_url: source.listingUrl,
  language: "en",
  enabled: true,
  max_documents: source.maxDocuments,
  refresh_interval_minutes: 360,
}));

const seedPayload = { companyRows, listingRows, metricRows, metricConfigRows, sourceRows, profileRows, businessLineRows, pointRows, evidenceRows, irRows, marketSeriesRows };
const checksum = createHash("sha256").update(JSON.stringify(seedPayload)).digest("hex");
const statements = [
  "-- Generated by scripts/generate-seed-sql.ts. Do not edit by hand.",
  "PRAGMA foreign_keys = ON;",
  ...upserts("metric_definitions", metricRows, ["code"]),
  ...upserts("companies", companyRows, ["ticker"]),
  ...upserts("company_listings", listingRows, ["id"]),
  ...upserts("company_metric_configs", metricConfigRows, ["company_ticker", "metric_code"]),
  ...upserts("research_sources", sourceRows, ["id"]),
  ...upserts("company_research_profiles", profileRows, ["company_ticker"]),
  ...upserts("company_business_lines", businessLineRows, ["id"]),
  ...upserts("company_research_points", pointRows, ["id"]),
  ...upserts("research_evidence_links", evidenceRows, ["entity_type", "entity_id", "source_id"]),
  ...upserts("ir_source_configs", irRows, ["company_ticker", "adapter_key"]),
  ...upserts("market_series", marketSeriesRows, ["key"]),
  ...upserts("seed_versions", [{ key: "starter_catalog", version: 1, checksum }], ["key"]),
  "",
];

writeFileSync(resolve("db/seed.sql"), statements.join("\n"), "utf8");
console.log(`Generated db/seed.sql (${statements.length - 3} statements, ${checksum.slice(0, 12)})`);
