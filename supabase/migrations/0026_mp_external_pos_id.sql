-- =============================================
-- Migración 0026: POS externo de Mercado Pago (QR in-store) por gym
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Gyms que quieran cobrar con el QR in-store de MP (menor comisión que Checkout Pro)
-- setean acá el external_pos_id de la caja que crearon en su cuenta de MP.
-- Si está NULL, el gym sigue usando el flujo actual de Checkout Pro sin cambios.

ALTER TABLE gym_config
  ADD COLUMN IF NOT EXISTS mp_external_pos_id TEXT;
