CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableName` varchar(64) NOT NULL,
	`recordId` int NOT NULL,
	`action` enum('create','update','delete') NOT NULL,
	`oldData` text,
	`newData` text,
	`userId` int,
	`userName` varchar(200),
	`userEmail` varchar(200),
	`processId` int,
	`processName` varchar(200),
	`description` varchar(500),
	`isRestored` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
