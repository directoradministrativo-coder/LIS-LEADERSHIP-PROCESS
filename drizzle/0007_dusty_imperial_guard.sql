CREATE TABLE `appConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appConfig_id` PRIMARY KEY(`id`),
	CONSTRAINT `appConfig_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`impact` int NOT NULL,
	`difficulty` int NOT NULL,
	`subtotal` int NOT NULL,
	`status` enum('por_priorizar','en_ejecucion','finalizado','suspendido','cancelado') NOT NULL DEFAULT 'por_priorizar',
	`statusObservations` text,
	`hasNotification` boolean NOT NULL DEFAULT false,
	`notificationMessage` text,
	`adminModifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
