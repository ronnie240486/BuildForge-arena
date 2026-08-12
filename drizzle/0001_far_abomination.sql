CREATE TABLE `ai_fixes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`build_id` int NOT NULL,
	`requested_by_id` int NOT NULL,
	`ai_fix_status` enum('proposed','approved','applied','rejected') NOT NULL DEFAULT 'proposed',
	`model` varchar(120) NOT NULL,
	`diagnosis` text NOT NULL,
	`explanation` text NOT NULL,
	`patch` text NOT NULL,
	`affected_files` json NOT NULL,
	`applied_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_fixes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`build_id` int,
	`uploaded_by_id` int NOT NULL,
	`artifact_type` enum('apk','aab','keystore','log','source') NOT NULL DEFAULT 'apk',
	`filename` varchar(255) NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`content_type` varchar(120),
	`size_bytes` bigint NOT NULL DEFAULT 0,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `artifacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `artifacts_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_id` int,
	`action` varchar(120) NOT NULL,
	`entity_type` varchar(80) NOT NULL,
	`entity_id` varchar(120),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_by_id` int NOT NULL,
	`scope` varchar(32) NOT NULL DEFAULT 'workspace',
	`storage_key` varchar(512) NOT NULL,
	`checksum` varchar(128) NOT NULL,
	`size_bytes` bigint NOT NULL DEFAULT 0,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backups_id` PRIMARY KEY(`id`),
	CONSTRAINT `backups_storage_key_unique` UNIQUE(`storage_key`)
);
--> statement-breakpoint
CREATE TABLE `build_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`build_id` int NOT NULL,
	`sequence` int NOT NULL,
	`level` varchar(16) NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `build_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `build_logs_build_sequence_unique` UNIQUE(`build_id`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`requested_by_id` int NOT NULL,
	`worker_id` int,
	`build_status` enum('queued','running','succeeded','failed','cancelled') NOT NULL DEFAULT 'queued',
	`project_framework` enum('android','flutter','react_native','webview','unknown') NOT NULL DEFAULT 'unknown',
	`artifact_type` enum('apk','aab','keystore','log','source') NOT NULL DEFAULT 'apk',
	`progress` int NOT NULL DEFAULT 0,
	`queue_position` int,
	`version_name` varchar(80),
	`version_code` int,
	`cancellation_requested` boolean NOT NULL DEFAULT false,
	`summary` text,
	`started_at` timestamp,
	`finished_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `builds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`build_id` int NOT NULL,
	`notification_event` enum('build_queued','build_succeeded','build_failed') NOT NULL,
	`notification_status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`summary` text NOT NULL,
	`artifact_id` int,
	`sent_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`project_framework` enum('android','flutter','react_native','webview','unknown') NOT NULL DEFAULT 'webview',
	`manifest` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_templates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`project_source` enum('github','git','zip','template','webview') NOT NULL DEFAULT 'github',
	`project_framework` enum('android','flutter','react_native','webview','unknown') NOT NULL DEFAULT 'unknown',
	`project_status` enum('active','archived') NOT NULL DEFAULT 'active',
	`repo_url` text,
	`branch` varchar(160) NOT NULL DEFAULT 'main',
	`source_storage_key` varchar(512),
	`template_slug` varchar(80),
	`detected_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signing_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`key_alias` varchar(160) NOT NULL,
	`encrypted_storage_key` varchar(512) NOT NULL,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signing_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `signing_keys_owner_label_unique` UNIQUE(`owner_id`,`label`)
);
--> statement-breakpoint
CREATE TABLE `system_migrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `system_migrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_migrations_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `webview_apps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`site_url` text NOT NULL,
	`app_name` varchar(120) NOT NULL,
	`icon_artifact_id` int,
	`splash_artifact_id` int,
	`permissions` json NOT NULL,
	`allow_navigation` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webview_apps_id` PRIMARY KEY(`id`),
	CONSTRAINT `webview_apps_project_id_unique` UNIQUE(`project_id`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`worker_kind` enum('local','github_actions','docker') NOT NULL,
	`worker_status` enum('online','offline','disabled') NOT NULL DEFAULT 'offline',
	`token_hash` varchar(255) NOT NULL,
	`capabilities` json NOT NULL,
	`max_concurrency` int NOT NULL DEFAULT 1,
	`active_builds` int NOT NULL DEFAULT 0,
	`last_heartbeat_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','member','user') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `users` ADD `buildLimit` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `buildsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarColor` varchar(32) DEFAULT 'indigo' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `ai_fixes` ADD CONSTRAINT `ai_fixes_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_fixes` ADD CONSTRAINT `ai_fixes_requested_by_id_users_id_fk` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `artifacts` ADD CONSTRAINT `artifacts_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `artifacts` ADD CONSTRAINT `artifacts_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `artifacts` ADD CONSTRAINT `artifacts_uploaded_by_id_users_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `backups` ADD CONSTRAINT `backups_created_by_id_users_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `build_logs` ADD CONSTRAINT `build_logs_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `builds` ADD CONSTRAINT `builds_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `builds` ADD CONSTRAINT `builds_requested_by_id_users_id_fk` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `builds` ADD CONSTRAINT `builds_worker_id_workers_id_fk` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_build_id_builds_id_fk` FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_artifact_id_artifacts_id_fk` FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signing_keys` ADD CONSTRAINT `signing_keys_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webview_apps` ADD CONSTRAINT `webview_apps_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webview_apps` ADD CONSTRAINT `webview_apps_icon_artifact_id_artifacts_id_fk` FOREIGN KEY (`icon_artifact_id`) REFERENCES `artifacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webview_apps` ADD CONSTRAINT `webview_apps_splash_artifact_id_artifacts_id_fk` FOREIGN KEY (`splash_artifact_id`) REFERENCES `artifacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workers` ADD CONSTRAINT `workers_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_fixes_build_status_idx` ON `ai_fixes` (`build_id`,`ai_fix_status`);--> statement-breakpoint
CREATE INDEX `artifacts_project_type_idx` ON `artifacts` (`project_id`,`artifact_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_idx` ON `audit_logs` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `backups_created_by_created_idx` ON `backups` (`created_by_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `builds_project_created_idx` ON `builds` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `builds_status_created_idx` ON `builds` (`build_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_status_created_idx` ON `notifications` (`notification_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `templates_active_category_idx` ON `project_templates` (`active`,`category`);--> statement-breakpoint
CREATE INDEX `projects_owner_status_idx` ON `projects` (`owner_id`,`project_status`);--> statement-breakpoint
CREATE INDEX `workers_owner_status_idx` ON `workers` (`owner_id`,`worker_status`);