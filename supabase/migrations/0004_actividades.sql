-- =============================================
-- Actividades (catálogo de clases/disciplinas del gym)
-- Cada gym define sus propias actividades con precio y mora propios.
-- =============================================
CREATE TABLE actividades (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                UUID NOT NULL REFERENCES gyms(id),
  nombre                TEXT NOT NULL,
  monto_base            DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Recargo propio (NULL = usar el del gym_config)
  recargo_1_dias        INT,
  recargo_1_porcentaje  DECIMAL(5,2),
  recargo_2_dias        INT,
  recargo_2_porcentaje  DECIMAL(5,2),
  color                 TEXT DEFAULT '#00ff88',
  activa                BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  UNIQUE(gym_id, nombre)
);

-- =============================================
-- Inscripción alumno ↔ actividad
-- =============================================
CREATE TABLE alumno_actividades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id               UUID NOT NULL REFERENCES gyms(id),
  alumno_id            UUID NOT NULL REFERENCES alumnos(id),
  actividad_id         UUID NOT NULL REFERENCES actividades(id),
  monto_personalizado  DECIMAL(10,2),   -- override del precio de la actividad
  activa               BOOLEAN DEFAULT true,
  fecha_inicio         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, actividad_id)
);

-- =============================================
-- cuotas: FK opcional a actividad
-- NULL = cuota sin actividad (comportamiento legacy)
-- =============================================
ALTER TABLE cuotas ADD COLUMN actividad_id UUID REFERENCES actividades(id);

-- =============================================
-- Cambio de constraint en cuotas:
-- Antes: UNIQUE(alumno_id, mes, anio)           → solo 1 cuota por alumno/mes
-- Ahora: permitir 1 por actividad + 1 legacy (sin actividad)
-- =============================================
ALTER TABLE cuotas DROP CONSTRAINT IF EXISTS cuotas_alumno_id_mes_anio_key;

-- Cuotas legacy (sin actividad): 1 por alumno/mes/año
CREATE UNIQUE INDEX cuotas_unique_legacy
  ON cuotas(alumno_id, mes, anio) WHERE actividad_id IS NULL;

-- Cuotas con actividad: 1 por alumno/mes/año/actividad
CREATE UNIQUE INDEX cuotas_unique_por_actividad
  ON cuotas(alumno_id, mes, anio, actividad_id) WHERE actividad_id IS NOT NULL;

-- Índices
CREATE INDEX idx_actividades_gym ON actividades(gym_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_alumno_actividades_alumno ON alumno_actividades(alumno_id) WHERE activa = true;
CREATE INDEX idx_cuotas_actividad ON cuotas(actividad_id) WHERE actividad_id IS NOT NULL;

-- RLS
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumno_actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_isolation" ON actividades
  USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_isolation" ON alumno_actividades
  USING (gym_id = get_user_gym_id());

-- updated_at trigger para actividades
CREATE TRIGGER trg_actividades
  BEFORE UPDATE ON actividades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
