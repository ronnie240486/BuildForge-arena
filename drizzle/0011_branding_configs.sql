CREATE TABLE `branding_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `brand_name` varchar(120) NOT NULL DEFAULT 'BuildForge',
  `tagline` varchar(180) NOT NULL DEFAULT 'Build e entrega de aplicativos móveis',
  `primary_color` varchar(16) NOT NULL DEFAULT '#4f46e5',
  `accent_color` varchar(16) NOT NULL DEFAULT '#7c3aed',
  `logo_url` varchar(2048),
  `updated_by_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `branding_configs_id` PRIMARY KEY(`id`),
  CONSTRAINT `branding_configs_updated_by_id_users_id_fk` FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
