CREATE TABLE `open5e_spell_cache` (
	`document_key` text PRIMARY KEY NOT NULL,
	`document_name` text NOT NULL,
	`spell_count` integer NOT NULL,
	`spells` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_open5e_defaults` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enabled_sources` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_open5e_defaults_user_id_unique` ON `user_open5e_defaults` (`user_id`);