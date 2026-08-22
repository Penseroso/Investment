CREATE TABLE `companies` (
	`ticker` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`market` text NOT NULL,
	`sector` text NOT NULL,
	`summary` text NOT NULL,
	`website_url` text DEFAULT '' NOT NULL,
	`cik` text DEFAULT '' NOT NULL,
	`ir_url` text DEFAULT '' NOT NULL,
	`filing_forms` text NOT NULL,
	`sec_enabled` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
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
