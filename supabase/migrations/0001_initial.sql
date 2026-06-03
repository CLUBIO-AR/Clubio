-- =============================================
-- EXTENSIONES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- GYMS (tenant raíz)
-- =============================================
CREATE TABLE gyms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  email_contacto  TEXT NOT NULL,
  telefono        TEXT,
  direccion       TEXT,
  logo_url        TEXT,
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- =============================================
-- LICENCIAS
-- =============================================
CREATE TYPE plan_tipo AS ENUM ('starter', 'pro', 'multi');

CREATE TABLE licencias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID NOT NULL REFERENCES gyms(id),
  plan                plan_tipo NOT NULL DEFAULT 'starter',
  fecha_inicio        DATE NOT NULL,
  fecha_vencimiento   DATE NOT NULL,
  activa              BOOLEAN DEFAULT true,
  max_sucursales      INT NOT NULL DEFAULT 1,
  feature_qr          BOOLEAN DEFAULT false,
  feature_clases      BOOLEAN DEFAULT false,
  feature_reportes    BOOLEAN DEFAULT false,
  feature_branding    BOOLEAN DEFAULT false,
  max_admins          INT NOT NULL DEFAULT 1,
  precio_pagado       DECIMAL(10,2),
  moneda              TEXT DEFAULT 'USD',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUCURSALES
-- =============================================
CREATE TABLE sucursales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id),
  nombre      TEXT NOT NULL,
  direccion   TEXT,
  telefono    TEXT,
  activa      BOOLEAN DEFAULT true,
  es_principal BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- =============================================
-- CONFIGURACIÓN
-- =============================================
CREATE TABLE gym_config (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                    UUID NOT NULL UNIQUE REFERENCES gyms(id),
  mp_access_token           TEXT,
  mp_public_key             TEXT,
  monto_base_defecto        DECIMAL(10,2),
  dia_vencimiento_mensual   INT DEFAULT 10,
  dias_gracia               INT DEFAULT 0,
  recargo_1_dias            INT DEFAULT 0,
  recargo_1_porcentaje      DECIMAL(5,2) DEFAULT 10,
  recargo_2_dias            INT,
  recargo_2_porcentaje      DECIMAL(5,2),
  dias_aviso_antes          INT[] DEFAULT '{7,3,1}',
  aviso_post_vencimiento_dias INT DEFAULT 3,
  max_avisos_post           INT DEFAULT 3,
  email_remitente_nombre    TEXT,
  email_remitente_address   TEXT,
  color_primario            TEXT DEFAULT '#000000',
  color_secundario          TEXT DEFAULT '#ffffff',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sucursal_config (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id               UUID NOT NULL UNIQUE REFERENCES sucursales(id),
  gym_id                    UUID NOT NULL REFERENCES gyms(id),
  monto_base_defecto        DECIMAL(10,2),
  dia_vencimiento_mensual   INT,
  dias_gracia               INT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USUARIOS ADMIN
-- =============================================
CREATE TABLE gym_usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  gym_id      UUID NOT NULL REFERENCES gyms(id),
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'admin',
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ALUMNOS
-- =============================================
CREATE TABLE alumnos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID NOT NULL REFERENCES gyms(id),
  sucursal_id     UUID REFERENCES sucursales(id),
  nombre          TEXT NOT NULL,
  apellido        TEXT NOT NULL,
  dni             TEXT NOT NULL,
  email           TEXT,
  telefono        TEXT,
  fecha_nacimiento DATE,
  fecha_alta      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_baja      DATE,
  activo          BOOLEAN DEFAULT true,
  auth_user_id    UUID REFERENCES auth.users(id),
  monto_cuota_personalizado DECIMAL(10,2),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(gym_id, dni)
);

-- =============================================
-- CUOTAS
-- =============================================
CREATE TYPE cuota_estado AS ENUM (
  'pendiente',
  'vencida',
  'pagada',
  'pagada_parcial',
  'condonada'
);

CREATE TABLE cuotas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id              UUID NOT NULL REFERENCES gyms(id),
  alumno_id           UUID NOT NULL REFERENCES alumnos(id),
  mes                 INT NOT NULL,
  anio                INT NOT NULL,
  monto_base          DECIMAL(10,2) NOT NULL,
  monto_recargo       DECIMAL(10,2) DEFAULT 0,
  monto_total         DECIMAL(10,2) GENERATED ALWAYS AS (monto_base + monto_recargo) STORED,
  estado              cuota_estado DEFAULT 'pendiente',
  fecha_vencimiento   DATE NOT NULL,
  recargo_aplicado_en TIMESTAMPTZ,
  recargo_nivel       INT,
  mp_preference_id    TEXT,
  mp_payment_id       TEXT,
  fecha_pago          TIMESTAMPTZ,
  metodo_pago         TEXT,
  pagado_por          TEXT,
  avisos_enviados     INT DEFAULT 0,
  ultimo_aviso_en     TIMESTAMPTZ,
  pago_token          TEXT UNIQUE,
  pago_token_expira   TIMESTAMPTZ,
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alumno_id, mes, anio)
);

-- =============================================
-- HISTORIAL DE PAGOS (inmutable)
-- =============================================
CREATE TABLE pagos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID NOT NULL REFERENCES gyms(id),
  cuota_id        UUID NOT NULL REFERENCES cuotas(id),
  alumno_id       UUID NOT NULL REFERENCES alumnos(id),
  monto           DECIMAL(10,2) NOT NULL,
  metodo          TEXT NOT NULL,
  mp_payment_id   TEXT,
  mp_status       TEXT,
  mp_detail       JSONB,
  registrado_por  UUID REFERENCES gym_usuarios(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- LOG DE NOTIFICACIONES
-- =============================================
CREATE TABLE notificaciones_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID NOT NULL REFERENCES gyms(id),
  alumno_id   UUID NOT NULL REFERENCES alumnos(id),
  cuota_id    UUID REFERENCES cuotas(id),
  tipo        TEXT NOT NULL,
  enviado_a   TEXT NOT NULL,
  estado      TEXT DEFAULT 'enviado',
  resend_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_alumnos_gym ON alumnos(gym_id);
CREATE INDEX idx_alumnos_dni ON alumnos(gym_id, dni);
CREATE INDEX idx_cuotas_gym ON cuotas(gym_id);
CREATE INDEX idx_cuotas_alumno ON cuotas(alumno_id);
CREATE INDEX idx_cuotas_estado ON cuotas(gym_id, estado);
CREATE INDEX idx_cuotas_vencimiento ON cuotas(fecha_vencimiento) WHERE estado = 'pendiente';
CREATE INDEX idx_pagos_gym ON pagos(gym_id);
CREATE INDEX idx_pagos_cuota ON pagos(cuota_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_log ENABLE ROW LEVEL SECURITY;

-- Helper: obtiene gym_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM gym_usuarios WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas RLS (aislamiento por gym)
CREATE POLICY "gym_isolation" ON alumnos
  USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_isolation" ON cuotas
  USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_isolation" ON pagos
  USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_isolation" ON sucursales
  USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_isolation" ON gym_config
  USING (gym_id = get_user_gym_id());

CREATE POLICY "gym_isolation" ON notificaciones_log
  USING (gym_id = get_user_gym_id());

-- Política para alumno viendo su propia fila
CREATE POLICY "alumno_self" ON alumnos
  USING (auth_user_id = auth.uid());

-- gym_usuarios: cada usuario ve solo su propio registro
CREATE POLICY "usuario_self" ON gym_usuarios
  USING (id = auth.uid());

-- gyms: el owner ve su gym
CREATE POLICY "gym_owner" ON gyms
  USING (id = get_user_gym_id());

-- licencias: el gym ve su propia licencia
CREATE POLICY "licencia_own" ON licencias
  USING (gym_id = get_user_gym_id());

-- =============================================
-- TRIGGERS: updated_at automático
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gyms BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_licencias BEFORE UPDATE ON licencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sucursales BEFORE UPDATE ON sucursales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gym_config BEFORE UPDATE ON gym_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sucursal_config BEFORE UPDATE ON sucursal_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gym_usuarios BEFORE UPDATE ON gym_usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_alumnos BEFORE UPDATE ON alumnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cuotas BEFORE UPDATE ON cuotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
