-- Previene doble-submit en pago de lote: dos renders simultáneos del mismo link
-- intentando insertar un lote para las mismas cuotas de un mismo alumno.
-- cuota_hash = sha256(alumno_id + ":" + sorted(cuota_ids).join(","))
-- Índice parcial solo sobre lotes pendientes — los pagados no compiten.

ALTER TABLE cuota_lotes ADD COLUMN IF NOT EXISTS cuota_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS cuota_lotes_alumno_hash_pendiente_unique
  ON cuota_lotes (alumno_id, cuota_hash)
  WHERE estado = 'pendiente' AND cuota_hash IS NOT NULL;
