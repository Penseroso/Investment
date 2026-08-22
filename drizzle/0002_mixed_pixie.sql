CREATE TABLE `filing_documents` (
	`accession` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`cik` text NOT NULL,
	`form` text NOT NULL,
	`filing_date` text NOT NULL,
	`report_date` text,
	`accepted_at` text,
	`title` text NOT NULL,
	`primary_document` text NOT NULL,
	`url` text NOT NULL,
	`source_type` text DEFAULT 'SEC' NOT NULL,
	`discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`source_type` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`documents_seen` integer DEFAULT 0 NOT NULL,
	`documents_inserted` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
