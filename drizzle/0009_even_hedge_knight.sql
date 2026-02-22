CREATE TABLE `processNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`processId` int NOT NULL,
	`module` enum('kpis','dofa','interacciones','proyectos','organigrama') NOT NULL,
	`message` text NOT NULL,
	`adminName` varchar(255),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processNotifications_id` PRIMARY KEY(`id`)
);
