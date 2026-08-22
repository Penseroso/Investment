import { sql } from "drizzle-orm";
import {
  index,
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
  legalName: text("legal_name"),
  market: text("market").notNull(),
  sector: text("sector").notNull(),
  countryCode: text("country_code"),
  fiscalYearEnd: text("fiscal_year_end"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
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
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  seedVersion: integer("seed_version").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const companyListings = sqliteTable(
  "company_listings",
  {
    id: text("id").primaryKey(),
    companyTicker: text("company_ticker")
      .notNull()
      .references(() => companies.ticker, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    exchange: text("exchange").notNull(),
    currency: text("currency").notNull().default("USD"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    activeFrom: text("active_from"),
    activeTo: text("active_to"),
    sourceProvider: text("source_provider"),
    sourceUpdatedAt: text("source_updated_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("company_listings_exchange_ticker").on(table.exchange, table.ticker),
    index("company_listings_company").on(table.companyTicker),
  ],
);

export const seedVersions = sqliteTable("seed_versions", {
  key: text("key").primaryKey(),
  version: integer("version").notNull(),
  checksum: text("checksum").notNull(),
  appliedAt: text("applied_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  accession: text("accession"),
  retrievedAt: text("retrieved_at"),
  lastVerifiedAt: text("last_verified_at"),
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
  contentVersion: integer("content_version").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const researchEvidenceLinks = sqliteTable(
  "research_evidence_links",
  {
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => researchSources.id, { onDelete: "cascade" }),
    evidenceNote: text("evidence_note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.entityType, table.entityId, table.sourceId] }),
  ],
);

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
  act: text("act"),
  fileNumber: text("file_number"),
  filmNumber: text("film_number"),
  items: text("items", { mode: "json" }).$type<string[]>(),
  sizeBytes: integer("size_bytes"),
  isXbrl: integer("is_xbrl", { mode: "boolean" }),
  isInlineXbrl: integer("is_inline_xbrl", { mode: "boolean" }),
  title: text("title").notNull(),
  primaryDocument: text("primary_document").notNull(),
  primaryDocumentDescription: text("primary_document_description"),
  url: text("url").notNull(),
  submissionFile: text("submission_file"),
  sourceMetadata: text("source_metadata", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
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
  sourceProvider: text("source_provider"),
  sourceConfigId: text("source_config_id"),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  documentsSeen: integer("documents_seen").notNull().default(0),
  documentsInserted: integer("documents_inserted").notNull().default(0),
  requestCursor: text("request_cursor"),
  responseUpdatedAt: text("response_updated_at"),
  responseHash: text("response_hash"),
  httpStatus: integer("http_status"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});

export const irSourceConfigs = sqliteTable(
  "ir_source_configs",
  {
    companyTicker: text("company_ticker")
      .notNull()
      .references(() => companies.ticker, { onDelete: "cascade" }),
    adapterKey: text("adapter_key").notNull(),
    sourceKind: text("source_kind").notNull().default("mixed"),
    listingUrl: text("listing_url").notNull(),
    language: text("language").notNull().default("en"),
    sourceTimezone: text("source_timezone"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    maxDocuments: integer("max_documents").notNull().default(24),
    refreshIntervalMinutes: integer("refresh_interval_minutes").notNull().default(360),
    etag: text("etag"),
    lastModified: text("last_modified"),
    contentHash: text("content_hash"),
    lastAttemptAt: text("last_attempt_at"),
    lastSuccessfulAt: text("last_successful_at"),
    lastErrorCode: text("last_error_code"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.companyTicker, table.adapterKey] })],
);

export const irDocuments = sqliteTable("ir_documents", {
  id: text("id").primaryKey(),
  companyTicker: text("company_ticker")
    .notNull()
      .references(() => companies.ticker, { onDelete: "cascade" }),
  adapterKey: text("adapter_key"),
  documentType: text("document_type").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publishedAt: text("published_at"),
  eventDate: text("event_date"),
  fiscalYear: integer("fiscal_year"),
  fiscalQuarter: integer("fiscal_quarter"),
  language: text("language").notNull().default("en"),
  mimeType: text("mime_type"),
  publicationStatus: text("publication_status").notNull().default("observed"),
  contentHash: text("content_hash"),
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
    scheduledDate: text("scheduled_date"),
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
    fiscalYear: integer("fiscal_year"),
    fiscalQuarter: integer("fiscal_quarter"),
    sourceProvider: text("source_provider").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourcePriority: integer("source_priority").notNull().default(50),
    sourceSequence: integer("source_sequence"),
    sourceUpdatedAt: text("source_updated_at"),
    sourceMetadata: text("source_metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
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

export const calendarEventObservations = sqliteTable(
  "calendar_event_observations",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    metricKey: text("metric_key").notNull(),
    valueRole: text("value_role").notNull(),
    numericValue: real("numeric_value"),
    textValue: text("text_value"),
    unit: text("unit"),
    currency: text("currency"),
    referencePeriod: text("reference_period"),
    revision: integer("revision").notNull().default(0),
    sourceProvider: text("source_provider").notNull(),
    knownAt: text("known_at").notNull(),
    collectedAt: text("collected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("calendar_observations_identity").on(
      table.eventId,
      table.metricKey,
      table.valueRole,
      table.revision,
      table.sourceProvider,
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
  responseUpdatedAt: text("response_updated_at"),
  responseHash: text("response_hash"),
  httpStatus: integer("http_status"),
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
    methodologyVersion: integer("methodology_version").notNull().default(1),
    windowStartDate: text("window_start_date"),
    dataThroughDate: text("data_through_date").notNull(),
    sourceObservationIds: text("source_observation_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
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
  responseUpdatedAt: text("response_updated_at"),
  responseHash: text("response_hash"),
  httpStatus: integer("http_status"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
});

export const marketSeries = sqliteTable("market_series", {
  key: text("key").primaryKey(),
  provider: text("provider").notNull(),
  providerSeriesId: text("provider_series_id").notNull(),
  label: text("label").notNull(),
  unit: text("unit").notNull(),
  frequency: text("frequency").notNull(),
  revisionPolicy: text("revision_policy").notNull().default("latest"),
  sourceUrl: text("source_url").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const marketObservations = sqliteTable(
  "market_observations",
  {
    id: text("id").primaryKey(),
    seriesKey: text("series_key")
      .notNull()
      .references(() => marketSeries.key, { onDelete: "cascade" }),
    observationDate: text("observation_date").notNull(),
    value: real("value").notNull(),
    realtimeStart: text("realtime_start"),
    realtimeEnd: text("realtime_end"),
    revisionIndicator: text("revision_indicator"),
    sourceMetadata: text("source_metadata", { mode: "json" })
      .$type<Record<string, number | string | null>>()
      .notNull()
      .default({}),
    collectedAt: text("collected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("market_observations_vintage").on(
      table.seriesKey,
      table.observationDate,
      table.realtimeStart,
    ),
    index("market_observations_series_date").on(table.seriesKey, table.observationDate),
  ],
);

export const financialFacts = sqliteTable(
  "financial_facts",
  {
    id: text("id").primaryKey(),
    companyTicker: text("company_ticker")
      .notNull()
      .references(() => companies.ticker, { onDelete: "cascade" }),
    taxonomy: text("taxonomy").notNull(),
    concept: text("concept").notNull(),
    label: text("label"),
    numericValue: real("numeric_value"),
    textValue: text("text_value"),
    unit: text("unit").notNull(),
    periodStart: text("period_start"),
    periodEnd: text("period_end").notNull(),
    fiscalYear: integer("fiscal_year"),
    fiscalPeriod: text("fiscal_period"),
    form: text("form").notNull(),
    accession: text("accession")
      .notNull()
      .references(() => filingDocuments.accession, { onDelete: "cascade" }),
    filedAt: text("filed_at").notNull(),
    frame: text("frame"),
    decimals: text("decimals"),
    sourceProvider: text("source_provider").notNull().default("SEC XBRL"),
    collectedAt: text("collected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("financial_facts_context").on(
      table.companyTicker,
      table.taxonomy,
      table.concept,
      table.unit,
      table.periodStart,
      table.periodEnd,
      table.accession,
    ),
    index("financial_facts_company_period").on(table.companyTicker, table.periodEnd),
  ],
);

export const marketPriceObservations = sqliteTable(
  "market_price_observations",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => companyListings.id, { onDelete: "cascade" }),
    priceDate: text("price_date").notNull(),
    priceType: text("price_type").notNull().default("close"),
    price: real("price").notNull(),
    adjustedPrice: real("adjusted_price"),
    currency: text("currency").notNull(),
    sourceProvider: text("source_provider").notNull(),
    collectedAt: text("collected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("market_prices_listing_date_type").on(
      table.listingId,
      table.priceDate,
      table.priceType,
      table.sourceProvider,
    ),
  ],
);

export const valuationObservations = sqliteTable(
  "valuation_observations",
  {
    id: text("id").primaryKey(),
    companyTicker: text("company_ticker")
      .notNull()
      .references(() => companies.ticker, { onDelete: "cascade" }),
    metricCode: text("metric_code")
      .notNull()
      .references(() => metricDefinitions.code, { onDelete: "cascade" }),
    asOfDate: text("as_of_date").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    currency: text("currency"),
    calculationVersion: integer("calculation_version").notNull(),
    inputFactIds: text("input_fact_ids", { mode: "json" }).$type<string[]>().notNull(),
    priceObservationId: text("price_observation_id").references(
      () => marketPriceObservations.id,
      { onDelete: "set null" },
    ),
    calculatedAt: text("calculated_at").notNull(),
  },
  (table) => [
    uniqueIndex("valuation_company_metric_date_version").on(
      table.companyTicker,
      table.metricCode,
      table.asOfDate,
      table.calculationVersion,
    ),
  ],
);

export const collectionJobs = sqliteTable(
  "collection_jobs",
  {
    id: text("id").primaryKey(),
    jobType: text("job_type").notNull(),
    targetKey: text("target_key").notNull(),
    status: text("status").notNull().default("pending"),
    scheduledFor: text("scheduled_for").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lockedAt: text("locked_at"),
    completedAt: text("completed_at"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    payload: text("payload", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("collection_jobs_identity").on(
      table.jobType,
      table.targetKey,
      table.scheduledFor,
    ),
    index("collection_jobs_due").on(table.status, table.scheduledFor),
  ],
);
