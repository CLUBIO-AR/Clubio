-- =============================================
-- PANEL DE SUPERADMIN — admin_users, leads, admin_logs
-- + columnas extra en notificaciones_log / cron_logs
-- + índices para paginación del panel
-- =============================================

-- ---------------------------------------------
-- TABLA DE SUPERADMINS (separada de gym_usuarios)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Un superadmin solo puede ver su propia fila (el panel usa service_role para todo lo demás)
CREATE POLICY "admin_users_select_self" ON admin_users
  FOR SELECT
  USING (id = auth.uid());

-- Bloquear inserts/updates desde cliente autenticado — solo service_role
CREATE POLICY "admin_users_insert_deny" ON admin_users
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "admin_users_update_deny" ON admin_users
  FOR UPDATE
  USING (false);

-- ---------------------------------------------
-- LEADS (formulario de demo de la landing)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefono         TEXT,
  gym_nombre       TEXT,
  cantidad_alumnos TEXT,
  -- '<50' | '50-100' | '100-200' | '200+'
  como_nos_conocio TEXT,
  estado           TEXT NOT NULL DEFAULT 'nuevo',
  -- 'nuevo' | 'contactado' | 'demo_agendada' | 'convertido' | 'perdido'
  notas            TEXT,
  gym_id           UUID REFERENCES gyms(id),
  -- si se convirtió en gym
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Solo el panel de admin (service_role) accede a leads — nada para anon/authenticated
CREATE POLICY "leads_select_deny" ON leads
  FOR SELECT
  USING (false);

CREATE POLICY "leads_insert_deny" ON leads
  FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------
-- ADMIN_LOGS (audit trail de acciones del superadmin)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS admin_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES admin_users(id),
  accion      TEXT NOT NULL,
  -- 'tenant_created' | 'licencia_renovada' | 'plan_cambiado' |
  -- 'gym_suspendido' | 'lead_actualizado' | 'impersonacion'
  gym_id      UUID REFERENCES gyms(id),
  detalle     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Solo el panel de admin (service_role) accede al audit trail
CREATE POLICY "admin_logs_select_deny" ON admin_logs
  FOR SELECT
  USING (false);

CREATE POLICY "admin_logs_insert_deny" ON admin_logs
  FOR INSERT
  WITH CHECK (false);

-- ---------------------------------------------
-- AMPLIAR notificaciones_log CON MÁS DETALLE
-- ---------------------------------------------
ALTER TABLE notificaciones_log
  ADD COLUMN IF NOT EXISTS subject  TEXT,
  ADD COLUMN IF NOT EXISTS preview  TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ---------------------------------------------
-- AMPLIAR cron_logs CON MÁS DETALLE
-- ---------------------------------------------
ALTER TABLE cron_logs
  ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'schedule',
  -- 'schedule' | 'manual' (disparado desde el panel admin)
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ---------------------------------------------
-- ÍNDICES PARA PERFORMANCE CON PAGINACIÓN
-- ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_gym ON admin_logs(gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_gym_canal
  ON notificaciones_log(gym_id, canal, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_tipo
  ON notificaciones_log(tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_created
  ON cron_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_created
  ON pagos(created_at DESC);
