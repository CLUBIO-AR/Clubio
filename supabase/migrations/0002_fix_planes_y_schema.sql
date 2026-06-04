-- =============================================
-- Migración 0002: Corrección de planes y schema
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Renombrar enum plan_tipo: starter/pro/multi → basic/plus/multi
--    PostgreSQL no permite ALTER ENUM RENAME VALUE directamente en todas las versiones,
--    así que creamos un nuevo enum y reemplazamos.

-- Agregar nuevos valores al enum existente
ALTER TYPE plan_tipo ADD VALUE IF NOT EXISTS 'basic';
ALTER TYPE plan_tipo ADD VALUE IF NOT EXISTS 'plus';

-- Actualizar registros existentes antes de eliminar los valores viejos
UPDATE licencias SET plan = 'basic' WHERE plan = 'starter';
UPDATE licencias SET plan = 'plus'  WHERE plan = 'pro';

-- Nota: PostgreSQL no permite DROP VALUE de un enum.
-- Los valores 'starter' y 'pro' quedan en el enum pero no deben usarse.
-- El código solo usará 'basic', 'plus', 'multi'.

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
