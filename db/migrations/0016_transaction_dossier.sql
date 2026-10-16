-- Additive schema; existing files are reorganized by scripts/install-transaction-dossier.mjs.
CREATE TABLE IF NOT EXISTS inm_expedientes (
  inmueble_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  configuracion TEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  actualizado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expediente_inmueble FOREIGN KEY (inmueble_id) REFERENCES inm_inmuebles(id)
);
