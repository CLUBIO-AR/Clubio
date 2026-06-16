-- Tabla para lotes de cuotas ("pagar todo") — un solo pago MP por múltiples cuotas
CREATE TABLE IF NOT EXISTS cuota_lotes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid        NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  alumno_id  uuid        NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  cuota_ids  uuid[]      NOT NULL,
  mp_preference_id text,
  mp_payment_id    text  UNIQUE,
  estado     text        NOT NULL DEFAULT 'pendiente',
  monto_total numeric(10,2) NOT NULL DEFAULT 0,
  paid_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuota_lotes_gym    ON cuota_lotes(gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cuota_lotes_alumno ON cuota_lotes(alumno_id);
