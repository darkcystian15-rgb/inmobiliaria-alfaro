-- Additive only. Legacy text rows remain completed; existing publicado values remain intact.
ALTER TABLE inm_publicaciones ADD COLUMN texto_realizado TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE inm_publicaciones ADD COLUMN medios_difusion VARCHAR(10) NULL;
ALTER TABLE inm_publicaciones ADD COLUMN cartel_colocado TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE inm_publicaciones ADD COLUMN redes_publicadas TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE inm_publicaciones ADD COLUMN referencias_difusion TEXT NULL;
ALTER TABLE inm_publicaciones ADD COLUMN fecha_texto_realizado TIMESTAMP NULL;
