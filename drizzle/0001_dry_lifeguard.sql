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
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`company_ticker` text NOT NULL,
	`source_type` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_ticker`) REFERENCES `companies`(`ticker`) ON UPDATE no action ON DELETE cascade
);
