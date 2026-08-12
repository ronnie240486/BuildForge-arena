CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`events` json NOT NULL,
	`secret` varchar(512),
	`enabled` boolean NOT NULL DEFAULT true,
	`last_status` varchar(80),
	`last_delivered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `webhooks_owner_created_idx` ON `webhooks` (`owner_id`,`created_at`);