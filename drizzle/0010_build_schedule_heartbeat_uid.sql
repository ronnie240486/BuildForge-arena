ALTER TABLE `build_schedules`
  ADD COLUMN `schedule_cron_task_uid` varchar(65) NULL;
--> statement-breakpoint
CREATE INDEX `build_schedules_task_uid_idx` ON `build_schedules` (`schedule_cron_task_uid`);
