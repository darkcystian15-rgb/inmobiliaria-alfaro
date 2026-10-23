-- Reviewed additive change; installer checks each column and supports retries.
-- Existing amounts retain their values and the previous PEN interpretation.
ALTER TABLE inm_tasaciones ADD COLUMN valor_referencia_moneda VARCHAR(3) NOT NULL DEFAULT 'PEN';
ALTER TABLE inm_tasaciones ADD COLUMN precio_objetivo_moneda VARCHAR(3) NOT NULL DEFAULT 'PEN';
ALTER TABLE inm_tasaciones ADD COLUMN precio_venta_moneda VARCHAR(3) NOT NULL DEFAULT 'PEN';
ALTER TABLE inm_anuncios ADD COLUMN precio_publicado_moneda VARCHAR(3) NOT NULL DEFAULT 'PEN';
