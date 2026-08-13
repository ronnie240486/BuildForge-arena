CREATE TABLE `build_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`cron_expression` varchar(120) NOT NULL,
	`requested_artifact` varchar(12) NOT NULL DEFAULT 'apk',
	`enabled` boolean NOT NULL DEFAULT true,
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `build_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `github_integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`owner_id` int NOT NULL,
	`repository` varchar(320) NOT NULL,
	`branch` varchar(180) NOT NULL DEFAULT 'main',
	`encrypted_webhook_secret` text NOT NULL,
	`auto_build` boolean NOT NULL DEFAULT true,
	`requested_artifact` varchar(12) NOT NULL DEFAULT 'apk',
	`last_delivery_id` varchar(128),
	`last_triggered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `github_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `github_integrations_project_id_unique` UNIQUE(`project_id`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`author_id` int NOT NULL,
	`body` text NOT NULL,
	`internal` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_status_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`component` varchar(80) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'operational',
	`summary` varchar(300) NOT NULL,
	`checked_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_status_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_status_checks_component_unique` UNIQUE(`component`)
);
--> statement-breakpoint
ALTER TABLE `build_schedules` ADD CONSTRAINT `build_schedules_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `build_schedules` ADD CONSTRAINT `build_schedules_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_integrations` ADD CONSTRAINT `github_integrations_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `github_integrations` ADD CONSTRAINT `github_integrations_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `build_schedules_enabled_next_idx` ON `build_schedules` (`enabled`,`next_run_at`);--> statement-breakpoint
CREATE INDEX `github_integrations_owner_idx` ON `github_integrations` (`owner_id`);--> statement-breakpoint
CREATE INDEX `support_messages_ticket_created_idx` ON `support_messages` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `system_status_checks_status_idx` ON `system_status_checks` (`status`);
