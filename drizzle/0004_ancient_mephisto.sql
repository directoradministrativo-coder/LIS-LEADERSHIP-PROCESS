CREATE TABLE `authorizedUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255) NOT NULL,
	`areaName` varchar(255),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`isEnrolled` boolean NOT NULL DEFAULT false,
	`enrolledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorizedUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `authorizedUsers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `moduleObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`module` enum('kpi','proveedor','cliente','dofa','organigrama') NOT NULL,
	`observations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moduleObservations_id` PRIMARY KEY(`id`)
);
