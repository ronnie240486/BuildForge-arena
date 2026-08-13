CREATE TABLE IF NOT EXISTS `github_credentials` (
  `id` int AUTO_INCREMENT NOT NULL,
  `encrypted_token` text NOT NULL,
  `updated_by_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `github_credentials_id` PRIMARY KEY(`id`),
  CONSTRAINT `github_credentials_updated_by_id_fk` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
