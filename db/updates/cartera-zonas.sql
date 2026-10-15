-- Additive cutover. Legacy position tables remain available for recovery.
CREATE TABLE IF NOT EXISTS inm_zonas (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 clave VARCHAR(100) NOT NULL UNIQUE,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 capacidad TINYINT UNSIGNED NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 departamento VARCHAR(100) NULL,
 provincia VARCHAR(100) NULL,
 distrito VARCHAR(100) NULL,
 CONSTRAINT ck_zona_cupo CHECK (capacidad BETWEEN 1 AND 90)
);
CREATE TABLE IF NOT EXISTS inm_posiciones_zona (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 zona_id INT UNSIGNED NOT NULL,
 numero TINYINT UNSIGNED NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 UNIQUE KEY uq_zona_numero (zona_id,numero),
 CONSTRAINT fk_pos_zona FOREIGN KEY(zona_id) REFERENCES inm_zonas(id)
);
CREATE TABLE IF NOT EXISTS inm_asignaciones_zona (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 inmueble_id BIGINT UNSIGNED NOT NULL,
 posicion_id INT UNSIGNED NOT NULL,
 fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_fin TIMESTAMP NULL,
 activa TINYINT(1) NOT NULL DEFAULT 1,
 posicion_activa INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN activa=1 THEN posicion_id ELSE NULL END) STORED,
 inmueble_activo BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN activa=1 THEN inmueble_id ELSE NULL END) STORED,
 UNIQUE KEY uq_posicion_zona_activa(posicion_activa),
 UNIQUE KEY uq_inmueble_zona_activo(inmueble_activo),
 CONSTRAINT fk_asig_zona_inm FOREIGN KEY(inmueble_id) REFERENCES inm_inmuebles(id),
 CONSTRAINT fk_asig_zona_pos FOREIGN KEY(posicion_id) REFERENCES inm_posiciones_zona(id)
);
CREATE TABLE IF NOT EXISTS inm_zona_cutover (id TINYINT NOT NULL PRIMARY KEY, activo TINYINT NOT NULL DEFAULT 0);
INSERT IGNORE INTO inm_zona_cutover(id,activo) VALUES(1,0);
