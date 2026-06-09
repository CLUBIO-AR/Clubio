-- Tabla de cobros de suscripción a gyms (CLUBIO cobra a sus clientes)
-- Separada de pagos/cuotas que son los cobros de los gyms a sus alumnos.
CREATE TABLE cobros_suscripcion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES gyms(id),
  licencia_id uuid NOT NULL REFERENCES licencias(id),
  periodo text NOT NULL,                           -- 'YYYY-MM' del vencimiento a renovar
  plan text NOT NULL,                              -- basic | plus | multi
  monto_usd numeric(10,2) NOT NULL,
  tipo_cambio numeric(10,2) NOT NULL,
  monto_ars numeric(10,2) NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',        -- pendiente | pagado | vencido | cancelado
  mp_preference_id text,
  mp_payment_id text,
  link_pago text,                                  -- init_point de Mercado Pago
  email_enviado_at timestamptz,
  paid_at timestamptz,
  renovacion_aplicada boolean NOT NULL DEFAULT false,
  triggered_by text NOT NULL DEFAULT 'cron',       -- 'cron' | 'manual'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(licencia_id, periodo)
);

CREATE INDEX idx_cobros_gym ON cobros_suscripcion(gym_id, created_at DESC);
CREATE INDEX idx_cobros_estado ON cobros_suscripcion(estado, created_at DESC);

-- Solo el service_role puede leer/escribir cobros de suscripción
ALTER TABLE cobros_suscripcion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_cobros_suscripcion" ON cobros_suscripcion FOR ALL USING (false) WITH CHECK (false);

-- Extender admin_settings con campos de facturación
ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS tipo_cambio_usd numeric(10,2) NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS dias_cobro_antes_vencimiento int NOT NULL DEFAULT 10;
