CREATE TABLE `inm_codigos_anteriores` (
	`codigo` varchar(350) NOT NULL,
	`inmueble_id` bigint unsigned NOT NULL,
	CONSTRAINT `inm_codigos_anteriores_codigo` PRIMARY KEY(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `inm_secuencias` (
	`nombre` varchar(50) NOT NULL,
	`valor` bigint unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `inm_secuencias_nombre` PRIMARY KEY(`nombre`)
);
--> statement-breakpoint
ALTER TABLE `inm_inmuebles` MODIFY COLUMN `codigo` varchar(350) NOT NULL;--> statement-breakpoint
ALTER TABLE `inm_inmuebles` ADD `numero_orden` bigint unsigned;--> statement-breakpoint
ALTER TABLE `inm_inmuebles` ADD CONSTRAINT `uq_inm_inmuebles_numero_orden` UNIQUE(`numero_orden`);--> statement-breakpoint
ALTER TABLE `inm_codigos_anteriores` ADD CONSTRAINT `inm_codigos_anteriores_inmueble_id_inm_inmuebles_id_fk` FOREIGN KEY (`inmueble_id`) REFERENCES `inm_inmuebles`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO inm_secuencias(nombre,valor) VALUES('inmueble',0) ON DUPLICATE KEY UPDATE valor=valor;
