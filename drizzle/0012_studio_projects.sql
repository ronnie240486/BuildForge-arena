CREATE TABLE `studio_projects` (
  `id` int AUTO_INCREMENT NOT NULL,
  `owner_id` int NOT NULL,
  `name` varchar(180) NOT NULL,
  `project_type` varchar(24) NOT NULL DEFAULT 'website',
  `framework` varchar(40) NOT NULL DEFAULT 'react',
  `github_repository` varchar(320),
  `github_branch` varchar(180) NOT NULL DEFAULT 'main',
  `preview_token` varchar(96) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `studio_projects_preview_token_unique` UNIQUE (`preview_token`),
  CONSTRAINT `studio_projects_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `studio_projects_owner_updated_idx` (`owner_id`,`updated_at`)
);

CREATE TABLE `studio_files` (
  `id` int AUTO_INCREMENT NOT NULL,
  `studio_project_id` int NOT NULL,
  `file_path` varchar(1024) NOT NULL,
  `language` varchar(48) NOT NULL DEFAULT 'text',
  `content` text NOT NULL,
  `source_storage_key` varchar(512),
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `studio_files_project_path_unique` UNIQUE (`studio_project_id`,`file_path`),
  CONSTRAINT `studio_files_project_id_studio_projects_id_fk` FOREIGN KEY (`studio_project_id`) REFERENCES `studio_projects`(`id`) ON DELETE CASCADE,
  INDEX `studio_files_project_idx` (`studio_project_id`)
);

CREATE TABLE `studio_messages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `studio_project_id` int NOT NULL,
  `author_id` int,
  `role` varchar(24) NOT NULL,
  `content` text NOT NULL,
  `changed_files` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `studio_messages_project_id_studio_projects_id_fk` FOREIGN KEY (`studio_project_id`) REFERENCES `studio_projects`(`id`) ON DELETE CASCADE,
  CONSTRAINT `studio_messages_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `studio_messages_project_created_idx` (`studio_project_id`,`created_at`)
);
