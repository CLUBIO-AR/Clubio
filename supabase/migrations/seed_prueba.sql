-- =============================================
-- SEED DE PRUEBA — Gym 167e8985-3ef7-4274-ab33-a1bd46b9df5e
-- Ejecutar en Supabase SQL Editor
-- =============================================

DO $$
DECLARE
  v_gym UUID := '167e8985-3ef7-4274-ab33-a1bd46b9df5e';
  v_suc UUID;

  -- IDs fijos para poder re-correr sin duplicados
  a1 UUID := '8663fcfd-a4f9-4702-a295-29ec0b976205';
  a2 UUID := '158f0d7f-38b7-4132-9e86-945000b7a21c';
  a3 UUID := '3d300198-4838-4fa9-ae57-b6dfce6154da';
  a4 UUID := 'ff919c41-7bba-46d3-8523-3679cb28d6b8';
  a5 UUID := '63e9c4a4-e848-4882-9584-7edbbae864f2';
BEGIN

  -- ① Configurar MP credentials del gym
  UPDATE gym_config
  SET mp_access_token = 'APP_USR-7953962424679769-060415-618a95d226ac8a282b55bf5a03231f78-3450458182'
  WHERE gym_id = v_gym;

  -- ② Obtener sucursal principal
  SELECT id INTO v_suc FROM sucursales WHERE gym_id = v_gym ORDER BY created_at LIMIT 1;

  -- ③ Insertar alumnos (ON CONFLICT para poder re-correr)
  INSERT INTO alumnos (id, gym_id, sucursal_id, nombre, apellido, dni, email, telefono, activo, monto_cuota_personalizado)
  VALUES
    (a1, v_gym, v_suc, 'Juan',    'García',    '30123456', 'valensosa157@gmail.com', '+5491112345671', true,  25000),
    (a2, v_gym, v_suc, 'María',   'López',     '31234567', 'valensosa157@gmail.com', '+5491112345672', true,  22000),
    (a3, v_gym, v_suc, 'Carlos',  'Martínez',  '32345678', NULL,                     '+5491112345673', true,  18000),
    (a4, v_gym, v_suc, 'Ana',     'Rodríguez', '33456789', 'valensosa157@gmail.com', '+5491112345674', true,  30000),
    (a5, v_gym, v_suc, 'Diego',   'Fernández', '34567890', 'valensosa157@gmail.com', '+5491112345675', true,  20000)
  ON CONFLICT (id) DO NOTHING;

  -- ④ Cuotas Junio 2026 — pendientes (vencen el 10)
  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, monto_base, monto_recargo, estado, fecha_vencimiento)
  VALUES
    (v_gym, a1, 6, 2026, 25000, 0, 'pendiente', '2026-06-10'),
    (v_gym, a2, 6, 2026, 22000, 0, 'pendiente', '2026-06-10'),
    (v_gym, a3, 6, 2026, 18000, 0, 'pendiente', '2026-06-10'),
    (v_gym, a4, 6, 2026, 30000, 0, 'pendiente', '2026-06-10'),
    (v_gym, a5, 6, 2026, 20000, 0, 'pendiente', '2026-06-10')
  ON CONFLICT (alumno_id, mes, anio) DO NOTHING;

  -- ⑤ Cuotas Mayo 2026 — vencidas (venció el 10/05, 26 días vencida)
  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, monto_base, monto_recargo, estado, fecha_vencimiento, recargo_nivel, recargo_aplicado_en)
  VALUES
    (v_gym, a1, 5, 2026, 25000, 2500, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00'),
    (v_gym, a2, 5, 2026, 22000, 2200, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00'),
    (v_gym, a4, 5, 2026, 30000, 3000, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00'),
    (v_gym, a5, 5, 2026, 20000, 0,    'pagada',  '2026-05-10', NULL, NULL)
  ON CONFLICT (alumno_id, mes, anio) DO NOTHING;

  -- ⑥ Cuota Abril 2026 — muy vencida con recargo nivel 2 (a4)
  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, monto_base, monto_recargo, estado, fecha_vencimiento, recargo_nivel, recargo_aplicado_en)
  VALUES
    (v_gym, a4, 4, 2026, 30000, 6000, 'vencida', '2026-04-10', 2, '2026-05-01 10:00:00+00')
  ON CONFLICT (alumno_id, mes, anio) DO NOTHING;

  -- ⑦ Pago registrado para Diego (mayo pagada — audit trail)
  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo, registrado_por)
  SELECT v_gym, c.id, a5, 20000, 'efectivo', NULL
  FROM cuotas c
  WHERE c.alumno_id = a5 AND c.mes = 5 AND c.anio = 2026 AND c.gym_id = v_gym
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed completado — gym: %', v_gym;
END $$;
