CREATE TABLE `calendar_event_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`metric_key` text NOT NULL,
	`value_role` text NOT NULL,
	`numeric_value` real,
	`text_value` text,
	`unit` text,
	`currency` text,
	`reference_period` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`source_provider` text NOT NULL,
	`known_at` text NOT NULL,
	`collected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_observations_identity` ON `calendar_event_observations` (`event_id`,`metric_key`,`value_role`,`revision`,`source_provider`);--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`ticker` text,
	`scheduled_date` text,
	`starts_at_utc` text NOT NULL,
	`ends_at_utc` text,
	`source_timezone` text DEFAULT 'UTC' NOT NULL,
	`time_precision` text DEFAULT 'exact' NOT NULL,
	`market_session` text DEFAULT 'unknown' NOT NULL,
	`importance` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`actual` real,
	`consensus` real,
	`previous` real,
	`unit` text,
	`eps_actual` real,
	`eps_consensus` real,
	`revenue_actual` real,
	`revenue_consensus` real,
	`currency` text,
	`fiscal_period` text,
	`fiscal_year` integer,
	`fiscal_quarter` integer,
	`source_provider` text NOT NULL,
	`source_event_id` text NOT NULL,
	`source_url` text NOT NULL,
	`source_priority` integer DEFAULT 50 NOT NULL,
	`source_sequence` integer,
	`source_updated_at` text,
	`source_metadata` text DEFAULT '{}' NOT NULL,
	`confirmed_at` text,
	`discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_source_identity` ON `calendar_events` (`source_provider`,`source_event_id`);--> statement-breakpoint
CREATE TABLE `calendar_ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_provider` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`events_seen` integer DEFAULT 0 NOT NULL,
	`events_upserted` integer DEFAULT 0 NOT NULL,
	`response_updated_at` text,
	`response_hash` text,
	`http_status` integer,
	`error_code` text,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `collection_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`target_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_for` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`locked_at` text,
	`completed_at` text,
	`last_error_code` text,
	`last_error_message` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_jobs_identity` ON `collection_jobs` (`job_type`,`target_key`,`scheduled_for`);--> statement-breakpoint
CREATE INDEX `collection_jobs_due` ON `collection_jobs` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `companies` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`legal_name` text,
	`market` text NOT NULL,
	`sector` text NOT NULL,
	`country_code` text,
	`fiscal_year_end` text,
	`default_currency` text DEFAULT 'USD' NOT NULL,
	`summary` text NOT NULL,
	`website_url` text DEFAULT '' NOT NULL,
	`cik` text DEFAULT '' NOT NULL,
	`ir_url` text DEFAULT '' NOT NULL,
	`filing_forms` text NOT NULL,
	`sec_enabled` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`seed_version` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_business_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`revenue_role` text NOT NULL,
	`end_markets` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`ticker` text NOT NULL,
	`exchange` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`active_from` text,
	`active_to` text,
	`source_provider` text,
	`source_updated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_listings_exchange_ticker` ON `company_listings` (`exchange`,`ticker`);--> statement-breakpoint
CREATE INDEX `company_listings_company` ON `company_listings` (`company_ticker`);--> statement-breakpoint
CREATE TABLE `company_metric_configs` (
	`company_ticker` text NOT NULL,
	`metric_code` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`company_ticker`, `metric_code`),
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`metric_code`) REFERENCES `metric_definitions`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_research_points` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_research_profiles` (
	`company_ticker` text PRIMARY KEY NOT NULL,
	`business_model` text NOT NULL,
	`revenue_model` text NOT NULL,
	`customer_structure` text NOT NULL,
	`cost_structure` text NOT NULL,
	`capital_intensity` text NOT NULL,
	`as_of_date` text NOT NULL,
	`source_ids` text NOT NULL,
	`content_version` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `filing_documents` (
	`accession` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`cik` text NOT NULL,
	`form` text NOT NULL,
	`filing_date` text NOT NULL,
	`report_date` text,
	`accepted_at` text,
	`act` text,
	`file_number` text,
	`film_number` text,
	`items` text,
	`size_bytes` integer,
	`is_xbrl` integer,
	`is_inline_xbrl` integer,
	`title` text NOT NULL,
	`primary_document` text NOT NULL,
	`primary_document_description` text,
	`url` text NOT NULL,
	`submission_file` text,
	`source_metadata` text DEFAULT '{}' NOT NULL,
	`source_type` text DEFAULT 'SEC' NOT NULL,
	`discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `financial_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`taxonomy` text NOT NULL,
	`concept` text NOT NULL,
	`label` text,
	`numeric_value` real,
	`text_value` text,
	`unit` text NOT NULL,
	`period_start` text,
	`period_end` text NOT NULL,
	`fiscal_year` integer,
	`fiscal_period` text,
	`form` text NOT NULL,
	`accession` text NOT NULL,
	`filed_at` text NOT NULL,
	`frame` text,
	`decimals` text,
	`source_provider` text DEFAULT 'SEC XBRL' NOT NULL,
	`collected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accession`) REFERENCES `filing_documents`(`accession`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `financial_facts_context` ON `financial_facts` (`company_ticker`,`taxonomy`,`concept`,`unit`,`period_start`,`period_end`,`accession`);--> statement-breakpoint
CREATE INDEX `financial_facts_company_period` ON `financial_facts` (`company_ticker`,`period_end`);--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`source_type` text NOT NULL,
	`source_provider` text,
	`source_config_id` text,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`documents_seen` integer DEFAULT 0 NOT NULL,
	`documents_inserted` integer DEFAULT 0 NOT NULL,
	`request_cursor` text,
	`response_updated_at` text,
	`response_hash` text,
	`http_status` integer,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ir_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`adapter_key` text,
	`document_type` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text,
	`event_date` text,
	`fiscal_year` integer,
	`fiscal_quarter` integer,
	`language` text DEFAULT 'en' NOT NULL,
	`mime_type` text,
	`publication_status` text DEFAULT 'observed' NOT NULL,
	`content_hash` text,
	`source_page_url` text NOT NULL,
	`source_order` integer DEFAULT 0 NOT NULL,
	`discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ir_source_configs` (
	`company_ticker` text NOT NULL,
	`adapter_key` text NOT NULL,
	`source_kind` text DEFAULT 'mixed' NOT NULL,
	`listing_url` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`source_timezone` text,
	`enabled` integer DEFAULT true NOT NULL,
	`max_documents` integer DEFAULT 24 NOT NULL,
	`refresh_interval_minutes` integer DEFAULT 360 NOT NULL,
	`etag` text,
	`last_modified` text,
	`content_hash` text,
	`last_attempt_at` text,
	`last_successful_at` text,
	`last_error_code` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`company_ticker`, `adapter_key`),
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `market_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`series_key` text NOT NULL,
	`observation_date` text NOT NULL,
	`value` real NOT NULL,
	`realtime_start` text,
	`realtime_end` text,
	`revision_indicator` text,
	`source_metadata` text DEFAULT '{}' NOT NULL,
	`collected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`series_key`) REFERENCES `market_series`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_observations_vintage` ON `market_observations` (`series_key`,`observation_date`,`realtime_start`);--> statement-breakpoint
CREATE INDEX `market_observations_series_date` ON `market_observations` (`series_key`,`observation_date`);--> statement-breakpoint
CREATE TABLE `market_price_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`price_date` text NOT NULL,
	`price_type` text DEFAULT 'close' NOT NULL,
	`price` real NOT NULL,
	`adjusted_price` real,
	`currency` text NOT NULL,
	`source_provider` text NOT NULL,
	`collected_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `company_listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_prices_listing_date_type` ON `market_price_observations` (`listing_id`,`price_date`,`price_type`,`source_provider`);--> statement-breakpoint
CREATE TABLE `market_series` (
	`key` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_series_id` text NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`frequency` text NOT NULL,
	`revision_policy` text DEFAULT 'latest' NOT NULL,
	`source_url` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metric_definitions` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`definition` text NOT NULL,
	`formula_display` text,
	`interpretation` text NOT NULL,
	`calculation_key` text,
	`definition_version` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_evidence_links` (
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`source_id` text NOT NULL,
	`evidence_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`entity_type`, `entity_id`, `source_id`),
	FOREIGN KEY (`source_id`) REFERENCES `research_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text NOT NULL,
	`accession` text,
	`retrieved_at` text,
	`last_verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `risk_ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_key` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`observations_seen` integer DEFAULT 0 NOT NULL,
	`response_updated_at` text,
	`response_hash` text,
	`http_status` integer,
	`error_code` text,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `risk_reports` (
	`report_date` text PRIMARY KEY NOT NULL,
	`overall_level` text NOT NULL,
	`headline` text NOT NULL,
	`summary` text NOT NULL,
	`driver_keys` text NOT NULL,
	`signal_keys` text NOT NULL,
	`generated_at` text NOT NULL,
	`read_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `risk_signal_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_key` text NOT NULL,
	`as_of_date` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`delta_1` real,
	`delta_5` real,
	`delta_20` real,
	`z_score` real,
	`percentile` real NOT NULL,
	`level` text NOT NULL,
	`trend` text NOT NULL,
	`source_provider` text NOT NULL,
	`source_url` text NOT NULL,
	`data_frequency` text NOT NULL,
	`detail` text NOT NULL,
	`methodology_version` integer DEFAULT 1 NOT NULL,
	`window_start_date` text,
	`data_through_date` text NOT NULL,
	`source_observation_ids` text DEFAULT '[]' NOT NULL,
	`calculated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `risk_snapshots_signal_date` ON `risk_signal_snapshots` (`signal_key`,`as_of_date`);--> statement-breakpoint
CREATE TABLE `seed_versions` (
	`key` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`checksum` text NOT NULL,
	`applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `valuation_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`metric_code` text NOT NULL,
	`as_of_date` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`currency` text,
	`calculation_version` integer NOT NULL,
	`input_fact_ids` text NOT NULL,
	`price_observation_id` text,
	`calculated_at` text NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`metric_code`) REFERENCES `metric_definitions`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`price_observation_id`) REFERENCES `market_price_observations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `valuation_company_metric_date_version` ON `valuation_observations` (`company_ticker`,`metric_code`,`as_of_date`,`calculation_version`);
