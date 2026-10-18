CREATE TABLE IF NOT EXISTS inm_eliminaciones_pendientes (
  id varchar(36) NOT NULL PRIMARY KEY,
  inmueble_id bigint unsigned NOT NULL,
  zona_id int unsigned NOT NULL,
  usuario_id bigint unsigned NOT NULL,
  estado varchar(20) NOT NULL,
  motivo varchar(40) NOT NULL DEFAULT '',
  detalle varchar(500) NOT NULL DEFAULT '',
  huella varchar(64) NOT NULL,
  rutas mediumtext NOT NULL,
  expira datetime NOT NULL,
  creado timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_eliminaciones_zona (zona_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
