import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  market: text("market").notNull(),
  sector: text("sector").notNull(),
  summary: text("summary").notNull(),
  websiteUrl: text("website_url").notNull().default(""),
  cik: text("cik").notNull().default(""),
  irUrl: text("ir_url").notNull().default(""),
  filingForms: text("filing_forms", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  secEnabled: integer("sec_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const metricDefinitions = sqliteTable("metric_definitions", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  definition: text("definition").notNull(),
  formulaDisplay: text("formula_display"),
  interpretation: text("interpretation").notNull(),
  calculationKey: text("calculation_key"),
  definitionVersion: integer("definition_version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companyMetricConfigs = sqliteTable(
  "company_metric_configs",
  {
    companyTicker: text("company_ticker")
      .notNull()
      .references(() => companies.ticker, { onDelete: "cascade" }),
    metricCode: text("metric_code")
      .notNull()
      .references(() => metricDefinitions.code, { onDelete: "cascade" }),
    whyItMatters: text("why_it_matters").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.companyTicker, table.metricCode] })],
);

export const researchSources = sqliteTable("research_sources", {
  id: text("id").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publishedAt: text("published_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companyResearchProfiles = sqliteTable("company_research_profiles", {
  companyTicker: text("company_ticker")
    .primaryKey()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  businessModel: text("business_model").notNull(),
  revenueModel: text("revenue_model").notNull(),
  customerStructure: text("customer_structure").notNull(),
  costStructure: text("cost_structure").notNull(),
  capitalIntensity: text("capital_intensity").notNull(),
  asOfDate: text("as_of_date").notNull(),
  sourceIds: text("source_ids", { mode: "json" }).$type<string[]>().notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companyBusinessLines = sqliteTable("company_business_lines", {
  id: text("id").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  revenueRole: text("revenue_role").notNull(),
  endMarkets: text("end_markets").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const companyResearchPoints = sqliteTable("company_research_points", {
  id: text("id").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const filingDocuments = sqliteTable("filing_documents", {
  accession: text("accession").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  cik: text("cik").notNull(),
  form: text("form").notNull(),
  filingDate: text("filing_date").notNull(),
  reportDate: text("report_date"),
  acceptedAt: text("accepted_at"),
  title: text("title").notNull(),
  primaryDocument: text("primary_document").notNull(),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull().default("SEC"),
  discoveredAt: text("discovered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ingestRuns = sqliteTable("ingest_runs", {
  id: text("id").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  documentsSeen: integer("documents_seen").notNull().default(0),
  documentsInserted: integer("documents_inserted").notNull().default(0),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});

export const irSourceConfigs = sqliteTable("ir_source_configs", {
  companyTicker: text("company_ticker")
    .primaryKey()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  adapterKey: text("adapter_key").notNull(),
  listingUrl: text("listing_url").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  maxDocuments: integer("max_documents").notNull().default(24),
  lastAttemptAt: text("last_attempt_at"),
  lastSuccessfulAt: text("last_successful_at"),
  lastErrorCode: text("last_error_code"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const irDocuments = sqliteTable("ir_documents", {
  id: text("id").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
    .references(() => companies.ticker, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publishedAt: text("published_at"),
  sourcePageUrl: text("source_page_url").notNull(),
  sourceOrder: integer("source_order").notNull().default(0),
  discoveredAt: text("discovered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    ticker: text("ticker"),
    startsAtUtc: text("starts_at_utc").notNull(),
    endsAtUtc: text("ends_at_utc"),
    sourceTimezone: text("source_timezone").notNull().default("UTC"),
    timePrecision: text("time_precision").notNull().default("exact"),
    marketSession: text("market_session").notNull().default("unknown"),
    importance: text("importance").notNull().default("medium"),
    status: text("status").notNull().default("scheduled"),
    actual: real("actual"),
    consensus: real("consensus"),
    previous: real("previous"),
    unit: text("unit"),
    epsActual: real("eps_actual"),
    epsConsensus: real("eps_consensus"),
    revenueActual: real("revenue_actual"),
    revenueConsensus: real("revenue_consensus"),
    currency: text("currency"),
    fiscalPeriod: text("fiscal_period"),
    sourceProvider: text("source_provider").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourcePriority: integer("source_priority").notNull().default(50),
    confirmedAt: text("confirmed_at"),
    discoveredAt: text("discovered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("calendar_events_source_identity").on(
      table.sourceProvider,
      table.sourceEventId,
    ),
  ],
);

export const calendarIngestRuns = sqliteTable("calendar_ingest_runs", {
  id: text("id").primaryKey(),
  sourceProvider: text("source_provider").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  eventsSeen: integer("events_seen").notNull().default(0),
  eventsUpserted: integer("events_upserted").notNull().default(0),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});

export const riskSignalSnapshots = sqliteTable(
  "risk_signal_snapshots",
  {
    id: text("id").primaryKey(),
    signalKey: text("signal_key").notNull(),
    asOfDate: text("as_of_date").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    delta1: real("delta_1"),
    delta5: real("delta_5"),
    delta20: real("delta_20"),
    zScore: real("z_score"),
    percentile: real("percentile").notNull(),
    level: text("level").notNull(),
    trend: text("trend").notNull(),
    sourceProvider: text("source_provider").notNull(),
    sourceUrl: text("source_url").notNull(),
    dataFrequency: text("data_frequency").notNull(),
    detail: text("detail", { mode: "json" })
      .$type<Record<string, number | string | null>>()
      .notNull(),
    calculatedAt: text("calculated_at").notNull(),
  },
  (table) => [
    uniqueIndex("risk_snapshots_signal_date").on(
      table.signalKey,
      table.asOfDate,
    ),
  ],
);

export const riskReports = sqliteTable("risk_reports", {
  reportDate: text("report_date").primaryKey(),
  overallLevel: text("overall_level").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  driverKeys: text("driver_keys", { mode: "json" }).$type<string[]>().notNull(),
  signalKeys: text("signal_keys", { mode: "json" }).$type<string[]>().notNull(),
  generatedAt: text("generated_at").notNull(),
  readAt: text("read_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const riskIngestRuns = sqliteTable("risk_ingest_runs", {
  id: text("id").primaryKey(),
  signalKey: text("signal_key").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  observationsSeen: integer("observations_seen").notNull().default(0),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});
