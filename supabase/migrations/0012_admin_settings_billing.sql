-- Extender admin_settings con configuración de facturación de suscripciones:
-- token de MP propio de CLUBIO, precios por plan y moneda.
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS clubio_mp_access_token text,
  ADD COLUMN IF NOT EXISTS plan_basic_precio numeric(10,2) NOT NULL DEFAULT 28,
  ADD COLUMN IF NOT EXISTS plan_plus_precio numeric(10,2) NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS plan_multi_precio numeric(10,2) NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS moneda_suscripcion text NOT NULL DEFAULT 'USD';
