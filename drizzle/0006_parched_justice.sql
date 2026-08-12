ALTER TABLE `workers` ADD `doctor_status` varchar(24);--> statement-breakpoint
ALTER TABLE `workers` ADD `doctor_checks` json;--> statement-breakpoint
ALTER TABLE `workers` ADD `doctor_checked_at` timestamp;