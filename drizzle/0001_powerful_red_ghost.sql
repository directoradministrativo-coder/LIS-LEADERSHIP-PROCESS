CREATE TABLE `collaboratorFunctions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaboratorId` int NOT NULL,
	`description` text NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collaboratorFunctions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dofaMatrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`debilidades` json NOT NULL DEFAULT ('[]'),
	`oportunidades` json NOT NULL DEFAULT ('[]'),
	`fortalezas` json NOT NULL DEFAULT ('[]'),
	`amenazas` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dofaMatrix_id` PRIMARY KEY(`id`),
	CONSTRAINT `dofaMatrix_processId_unique` UNIQUE(`processId`)
);
--> statement-breakpoint
CREATE TABLE `interactionStrengths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interactionId` int NOT NULL,
	`type` enum('fortaleza','oportunidad') NOT NULL,
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interactionStrengths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interactionTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interactionId` int NOT NULL,
	`taskActivity` text NOT NULL,
	`documentRoute` text NOT NULL,
	`responsibleRole` varchar(255) NOT NULL,
	`ansUndefined` boolean NOT NULL DEFAULT false,
	`ansNumber` int,
	`ansType` enum('dias_calendario','dias_habiles','semanas','meses'),
	`ansCompliance` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interactionTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`objective` text NOT NULL,
	`frequency` enum('dia','semana','mes') NOT NULL,
	`formula` text NOT NULL,
	`responsible` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orgCollaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hierarchyId` int NOT NULL,
	`processId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`position` varchar(255),
	`functionsVisible` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orgCollaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orgHierarchies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`level` int NOT NULL,
	`parentId` int,
	`isCustom` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orgHierarchies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`type` enum('proveedor','cliente') NOT NULL,
	`relatedProcessName` varchar(255) NOT NULL,
	`isCustomProcess` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processInteractions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`processName` varchar(255) NOT NULL DEFAULT '',
	`areaName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processes_id` PRIMARY KEY(`id`)
);
