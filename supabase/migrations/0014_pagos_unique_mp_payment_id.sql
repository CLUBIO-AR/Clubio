-- Unique partial index on pagos.mp_payment_id to prevent duplicate payment processing.
-- Partial (WHERE mp_payment_id IS NOT NULL) because manual payments (efectivo, transferencia)
-- have NULL mp_payment_id and there can be multiple of those per cuota.
-- With this index, concurrent webhook + from-redirect requests for the same MP payment
-- will result in only one INSERT succeeding; the other gets error code 23505 and is
-- handled as a duplicate by the application layer.
CREATE UNIQUE INDEX IF NOT EXISTS pagos_mp_payment_id_unique
  ON pagos (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;
