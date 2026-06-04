-- =============================================
-- Migración 0002: Corrección de planes y schema
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Reemplazar enum plan_tipo: starter/pro/multi → basic/plus/multi
--
-- ALTER TYPE ADD VALUE no se puede usar en la misma transacción.
-- Solución: crear un nuevo enum con los valores correctos y hacer el swap.

-- Paso 1a: crear el enum correcto
CREATE TYPE plan_tipo_v2 AS ENUM ('basic', 'plus', 'multi');

-- Paso 1b: soltar el DEFAULT y liberar la columna del enum viejo
ALTER TABLE licencias
  ALTER COLUMN plan DROP DEFAULT,
  ALTER COLUMN plan TYPE TEXT;

-- Paso 1c: corregir los datos (starter→basic, pro→plus)
UPDATE licencias SET plan = 'basic' WHERE plan = 'starter';
UPDATE licencias SET plan = 'plus'  WHERE plan = 'pro';

-- Paso 1d: eliminar el enum viejo y renombrar el nuevo
DROP TYPE plan_tipo;
ALTER TYPE plan_tipo_v2 RENAME TO plan_tipo;

-- Paso 1e: restaurar la columna con el enum correcto y nuevo DEFAULT
ALTER TABLE licencias
  ALTER COLUMN plan TYPE plan_tipo USING plan::plan_tipo,
  ALTER COLUMN plan SET DEFAULT 'basic';

-- =============================================
-- 2. Agregar columnas faltantes en gym_config
-- =============================================

ALTER TABLE gym_config
  ADD COLUMN IF NOT EXISTS email_activo            BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_activo         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_access_token   TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_template_aviso TEXT DEFAULT 'aviso_vencimiento',
  ADD COLUMN IF NOT EXISTS whatsapp_template_confirmacion TEXT DEFAULT 'confirmacion_pago';

-- =============================================
-- 3. Agregar columnas faltantes en licencias
-- =============================================

ALTER TABLE licencias
  ADD COLUMN IF NOT EXISTS feature_cobros   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_avisos   BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS feature_whatsapp BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_trial         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_hasta      DATE;

-- =============================================
-- 4. Agregar columna 'canal' en notificaciones_log
--    Para tracking multi-canal (email | whatsapp)
-- =============================================

ALTER TABLE notificaciones_log
  ADD COLUMN IF NOT EXISTS canal        TEXT NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS provider_id  TEXT,
  ADD COLUMN IF NOT EXISTS error_detail TEXT;

-- Renombrar resend_id → provider_id si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notificaciones_log' AND column_name = 'resend_id') THEN
    ALTER TABLE notificaciones_log RENAME COLUMN resend_id TO provider_id_old;
    UPDATE notificaciones_log SET provider_id = provider_id_old WHERE provider_id_old IS NOT NULL;
    ALTER TABLE notificaciones_log DROP COLUMN IF EXISTS provider_id_old;
  END IF;
END $$;

-- =============================================
-- 5. Índice para tracking de notificaciones por canal
-- =============================================

CREATE INDEX IF NOT EXISTS idx_notif_cuota_canal
  ON notificaciones_log(cuota_id, canal);

-- =============================================
-- 6. Trigger updated_at para tablas que faltaban
-- =============================================

DROP TRIGGER IF EXISTS trg_sucursal_config ON sucursal_config;
CREATE TRIGGER trg_sucursal_config
  BEFORE UPDATE ON sucursal_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 7. Policy RLS faltante para sucursal_config
-- =============================================

DO $$ BEGIN
  CREATE POLICY "gym_isolation" ON sucursal_config
    USING (gym_id = get_user_gym_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
