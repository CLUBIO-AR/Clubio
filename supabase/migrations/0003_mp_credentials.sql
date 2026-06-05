-- =============================================
-- Migración 0003: Credenciales MercadoPago por gym
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Cada gym conecta su propia cuenta de MP (Checkout Pro per-gym).
-- Las credenciales se guardan en gym_config, no en variables de entorno.

ALTER TABLE gym_config
  ADD COLUMN IF NOT EXISTS mp_access_token   TEXT,
  ADD COLUMN IF NOT EXISTS mp_public_key     TEXT,
  ADD COLUMN IF NOT EXISTS mp_webhook_secret TEXT;

-- Índice para lookup rápido en webhook handler
CREATE INDEX IF NOT EXISTS idx_gym_config_gym_id ON gym_config(gym_id);
