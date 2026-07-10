-- RPC atómica para procesar el pago de un lote de cuotas.
-- Reemplaza las operaciones separadas en el webhook de MP que podían quedar
-- parcialmente aplicadas si fallaba algún INSERT/UPDATE.
-- SECURITY DEFINER: llamado desde el webhook con admin client (bypassea RLS).

CREATE OR REPLACE FUNCTION procesar_pago_lote(
  p_lote_id    UUID,
  p_payment_id TEXT,
  p_gym_id     UUID
)
RETURNS TABLE(cuotas_pagadas INT, alumno_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lote        RECORD;
  v_cuota       RECORD;
  v_count       INT := 0;
  v_alumno_id   UUID;
  v_ahora       TIMESTAMPTZ := NOW();
BEGIN
  -- Lock el lote para prevenir procesamiento concurrente del mismo payment
  SELECT * INTO v_lote
  FROM cuota_lotes
  WHERE id = p_lote_id
    AND gym_id = p_gym_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lote_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_lote.gym_id <> p_gym_id THEN
    RAISE EXCEPTION 'gym_mismatch' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotente: si ya está pagado retornar sin hacer nada
  IF v_lote.estado = 'pagado' THEN
    RETURN QUERY SELECT 0::INT, v_lote.alumno_id;
    RETURN;
  END IF;

  v_alumno_id := v_lote.alumno_id;

  -- Marcar el lote
  UPDATE cuota_lotes SET
    estado        = 'pagado',
    mp_payment_id = p_payment_id,
    paid_at       = v_ahora
  WHERE id = p_lote_id;

  -- Por cada cuota del lote, insertar pago y marcar como pagada
  FOR v_cuota IN
    SELECT id, alumno_id, monto_total
    FROM cuotas
    WHERE id = ANY(v_lote.cuota_ids)
      AND gym_id = p_gym_id
      AND estado NOT IN ('pagada', 'condonada')
  LOOP
    INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo, mp_payment_id)
    VALUES (p_gym_id, v_cuota.id, v_cuota.alumno_id, COALESCE(v_cuota.monto_total, 0), 'mercadopago', p_payment_id)
    ON CONFLICT (mp_payment_id) DO NOTHING;

    UPDATE cuotas SET
      estado      = 'pagada',
      fecha_pago  = v_ahora,
      metodo_pago = 'mercadopago'
    WHERE id = v_cuota.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count, v_alumno_id;
END;
$$;
