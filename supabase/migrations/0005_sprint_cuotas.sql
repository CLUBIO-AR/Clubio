-- =============================================
-- SPRINT CUOTAS: tipo, descripcion, gym_config al alta, cron_logs
-- =============================================

-- 1. CUOTAS: columnas tipo y descripcion
-- ---------------------------------------------
ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'mensual'
  CONSTRAINT cuotas_tipo_check CHECK (tipo IN ('mensual', 'clase_suelta', 'evento', 'inscripcion', 'personalizada'));
-- Backfill: asegurar que filas existentes tengan tipo='mensual'
UPDATE cuotas SET tipo = 'mensual' WHERE tipo IS NULL;

ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS descripcion TEXT;
-- Descripción libre, obligatoria si tipo <> 'mensual'

-- 2. CUOTAS: reemplazar índices únicos para permitir cuotas no-mensuales
-- ---------------------------------------------
-- Drop índices de migración 0004 (que no filtraban por tipo)
DROP INDEX IF EXISTS cuotas_unique_legacy;
DROP INDEX IF EXISTS cuotas_unique_por_actividad;
-- Nota: cuotas_alumno_id_mes_anio_key ya fue dropeado en migración 0004

-- Nuevos índices: unicidad SOLO para cuotas de tipo 'mensual'
-- Permite cuotas de clase_suelta/evento sin restricción de unicidad
CREATE UNIQUE INDEX IF NOT EXISTS cuotas_mensual_unique
  ON cuotas(alumno_id, mes, anio)
  WHERE tipo = 'mensual' AND actividad_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cuotas_mensual_actividad_unique
  ON cuotas(alumno_id, mes, anio, actividad_id)
  WHERE tipo = 'mensual' AND actividad_id IS NOT NULL;

-- 3. GYM_CONFIG: opciones de generación de cuota al alta de alumno
-- ---------------------------------------------
ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS generar_cuota_al_alta BOOLEAN DEFAULT true;
-- Si true: al crear alumno se genera cuota automáticamente

ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS cuota_alta_proporcional BOOLEAN DEFAULT false;
-- Si true: calcula proporcional según días restantes del mes
-- Si false: cobra cuota completa siempre

ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS dias_minimos_para_cuota_alta INT DEFAULT 15
  CONSTRAINT gym_config_dias_minimos_check CHECK (dias_minimos_para_cuota_alta >= 0 AND dias_minimos_para_cuota_alta <= 31);
-- Si los días restantes del mes < este valor, NO genera cuota del mes actual

-- 4. TABLA CRON_LOGS: monitoreo de ejecuciones de crons
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS cron_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID REFERENCES gyms(id),
  -- NULL = log del dispatcher (aplica a todos los gyms)
  tipo           TEXT NOT NULL,
  -- 'generar_cuotas' | 'enviar_avisos' | 'aplicar_recargos'
  es_dispatcher  BOOLEAN DEFAULT false,
  -- Métricas del dispatcher
  gyms_total     INT,
  gyms_ok        INT,
  gyms_error     INT,
  -- Métricas del worker (por gym)
  items_creados  INT,
  items_saltados INT,
  items_error    INT,
  -- Performance
  duracion_ms    INT,
  -- Error
  error_detalle  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_tipo_created ON cron_logs(tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_gym ON cron_logs(gym_id, created_at DESC);

ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- Solo SELECT para usuarios autenticados (inserts son exclusivamente via service_role / admin client)
CREATE POLICY "cron_logs_select" ON cron_logs
  FOR SELECT
  USING (
    gym_id = get_user_gym_id()
    OR (gym_id IS NULL AND EXISTS (
      SELECT 1 FROM gym_usuarios
      WHERE id = auth.uid() AND rol IN ('owner', 'admin')
    ))
  );

-- Bloquear inserts y updates desde cliente autenticado — solo service_role puede insertar
CREATE POLICY "cron_logs_insert_deny" ON cron_logs
  FOR INSERT
  WITH CHECK (false);
