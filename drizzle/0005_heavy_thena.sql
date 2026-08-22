CREATE TABLE `risk_ingest_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_key` text NOT NULL,
	`trigger` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`observations_seen` integer DEFAULT 0 NOT NULL,
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
	`calculated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `risk_snapshots_signal_date` ON `risk_signal_snapshots` (`signal_key`,`as_of_date`);