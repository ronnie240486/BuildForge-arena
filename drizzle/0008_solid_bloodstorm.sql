CREATE TABLE `ai_provider_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(32) NOT NULL,
	`encrypted_api_key` text,
	`preferred_model` varchar(160),
	`enabled` boolean NOT NULL DEFAULT false,
	`updated_by_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_provider_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_provider_configs_provider_unique` UNIQUE(`provider`)
);
--> statement-breakpoint
ALTER TABLE `ai_provider_configs` ADD CONSTRAINT `ai_provider_configs_updated_by_id_users_id_fk` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_provider_configs_enabled_idx` ON `ai_provider_configs` (`enabled`);