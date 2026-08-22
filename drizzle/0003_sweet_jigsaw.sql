CREATE TABLE `ir_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`document_type` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text,
	`source_page_url` text NOT NULL,
	`source_order` integer DEFAULT 0 NOT NULL,
	`discovered_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ir_source_configs` (
	`company_ticker` text PRIMARY KEY NOT NULL,
	`adapter_key` text NOT NULL,
	`listing_url` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`max_documents` integer DEFAULT 24 NOT NULL,
	`last_attempt_at` text,
	`last_successful_at` text,
	`last_error_code` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
