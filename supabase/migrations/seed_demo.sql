-- ============================================================
-- SEED DEMO — PowerFit GBA
-- Gym: 167e8985-3ef7-4274-ab33-a1bd46b9df5e
-- Propósito: datos realistas para capturas del video demo
-- Idempotente — seguro re-ejecutar
-- Requiere: seed_prueba + seed_ampliado ya aplicados
-- ============================================================

DO $$
DECLARE
  v_gym UUID := '167e8985-3ef7-4274-ab33-a1bd46b9df5e';
  v_suc UUID;

  -- Alumnos (mismos IDs que seed_prueba / seed_ampliado)
  a1  UUID := '8663fcfd-a4f9-4702-a295-29ec0b976205'; -- Juan García
  a2  UUID := '158f0d7f-38b7-4132-9e86-945000b7a21c'; -- María López
  a3  UUID := '3d300198-4838-4fa9-ae57-b6dfce6154da'; -- Carlos Martínez
  a4  UUID := 'ff919c41-7bba-46d3-8523-3679cb28d6b8'; -- Ana Rodríguez
  a5  UUID := '63e9c4a4-e848-4882-9584-7edbbae864f2'; -- Diego Fernández
  a6  UUID := '00000000-0000-0000-0002-000000000006'; -- Valentina Torres
  a7  UUID := '00000000-0000-0000-0002-000000000007'; -- Sebastián Gómez
  a8  UUID := '00000000-0000-0000-0002-000000000008'; -- Lucía Herrera
  a9  UUID := '00000000-0000-0000-0002-000000000009'; -- Matías Alvarez
  a10 UUID := '00000000-0000-0000-0002-000000000010'; -- Camila Díaz
  a11 UUID := '00000000-0000-0000-0002-000000000011'; -- Agustín Pérez
  a12 UUID := '00000000-0000-0000-0002-000000000012'; -- Florencia Morales
  a13 UUID := '00000000-0000-0000-0002-000000000013'; -- Nicolás Castro
  a14 UUID := '00000000-0000-0000-0002-000000000014'; -- Paula Ramírez
  a15 UUID := '00000000-0000-0000-0002-000000000015'; -- Facundo Ruiz
  a16 UUID := '00000000-0000-0000-0002-000000000016'; -- Marina Jiménez
  a17 UUID := '00000000-0000-0000-0002-000000000017'; -- Rodrigo Sánchez
  a18 UUID := '00000000-0000-0000-0002-000000000018'; -- Antonella Vega
  a19 UUID := '00000000-0000-0000-0002-000000000019'; -- Tomás Blanco
  a20 UUID := '00000000-0000-0000-0002-000000000020'; -- Daniela Ríos
  a21 UUID := '00000000-0000-0000-0002-000000000021'; -- Ezequiel Acosta
  a22 UUID := '00000000-0000-0000-0002-000000000022'; -- Victoria Méndez
  a23 UUID := '00000000-0000-0000-0002-000000000023'; -- Ignacio Suárez
  a24 UUID := '00000000-0000-0000-0002-000000000024'; -- Julieta Ponce

  -- Actividades
  act_musc UUID := '00000000-0000-0000-0001-000000000001';
  act_pila UUID := '00000000-0000-0000-0001-000000000002';
  act_boxe UUID := '00000000-0000-0000-0001-000000000003';
  act_crof UUID := '00000000-0000-0000-0001-000000000004';
  act_spin UUID := '00000000-0000-0000-0001-000000000005';
  act_yoga UUID := '00000000-0000-0000-0001-000000000006';

BEGIN
  SELECT id INTO v_suc FROM sucursales WHERE gym_id = v_gym ORDER BY created_at LIMIT 1;

  -- ============================================================
  -- 1. GYM — nombre y datos de contacto realistas
  -- ============================================================
  UPDATE gyms
  SET
    nombre         = 'PowerFit GBA',
    slug           = 'powerfit-gba',
    email_contacto = 'info@powerfitgba.com.ar',
    telefono       = '+5491155443322',
    direccion      = 'Av. Rivadavia 4520, Flores, CABA',
    updated_at     = NOW()
  WHERE id = v_gym;

  -- ============================================================
  -- 2. SUCURSAL — nombre realista
  -- ============================================================
  UPDATE sucursales
  SET
    nombre    = 'Sede Flores',
    direccion = 'Av. Rivadavia 4520, Flores, CABA',
    telefono  = '+5491155443322'
  WHERE gym_id = v_gym
    AND id = v_suc;

  -- ============================================================
  -- 3. ADMIN — nombre realista
  -- ============================================================
  UPDATE gym_usuarios
  SET
    nombre     = 'Martín Ferreyra',
    rol        = 'owner',
    updated_at = NOW()
  WHERE gym_id = v_gym;

  -- ============================================================
  -- 4. GYM CONFIG — config completa y realista
  -- ============================================================
  UPDATE gym_config
  SET
    monto_base_defecto         = 20000,
    dia_vencimiento_mensual    = 10,
    dias_gracia                = 0,
    recargo_1_dias             = 10,
    recargo_1_porcentaje       = 10,
    recargo_2_dias             = 20,
    recargo_2_porcentaje       = 20,
    dias_aviso_antes           = '{7,3,1}',
    aviso_post_vencimiento_dias = 3,
    max_avisos_post            = 3,
    email_remitente_nombre     = 'PowerFit GBA',
    email_remitente_address    = 'avisos@clubio.com.ar',
    email_color_acento         = '#22c55e',
    updated_at                 = NOW()
  WHERE gym_id = v_gym;

  -- ============================================================
  -- 5. CUOTAS JULIO 2026 — mes próximo (solo pendientes)
  --    Generadas automáticamente por el cron el 01/07
  -- ============================================================
  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento)
  VALUES
    (v_gym, a1, 7, 2026, 'mensual', 25000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a2, 7, 2026, 'mensual', 22000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a3, 7, 2026, 'mensual', 18000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a4, 7, 2026, 'mensual', 30000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a5, 7, 2026, 'mensual', 20000, 0, 'pendiente', '2026-07-10')
  ON CONFLICT DO NOTHING;

  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento)
  VALUES
    (v_gym, a6,  act_pila, 7, 2026, 'mensual', 22000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a6,  act_yoga, 7, 2026, 'mensual', 15000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a7,  act_musc, 7, 2026, 'mensual', 18000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a7,  act_crof, 7, 2026, 'mensual', 25000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a8,  act_spin, 7, 2026, 'mensual', 16000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a9,  act_boxe, 7, 2026, 'mensual', 20000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a9,  act_musc, 7, 2026, 'mensual', 18000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a10, act_pila, 7, 2026, 'mensual', 22000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a11, act_crof, 7, 2026, 'mensual', 25000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a12, act_yoga, 7, 2026, 'mensual', 15000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a13, act_musc, 7, 2026, 'mensual', 18000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a14, act_spin, 7, 2026, 'mensual', 16000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a14, act_pila, 7, 2026, 'mensual', 22000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a15, act_boxe, 7, 2026, 'mensual', 20000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a16, act_yoga, 7, 2026, 'mensual', 15000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a17, act_crof, 7, 2026, 'mensual', 25000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a17, act_boxe, 7, 2026, 'mensual', 20000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a18, act_pila, 7, 2026, 'mensual', 22000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a19, act_musc, 7, 2026, 'mensual', 18000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a20, act_spin, 7, 2026, 'mensual', 16000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a21, act_crof, 7, 2026, 'mensual', 25000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a22, act_yoga, 7, 2026, 'mensual', 15000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a23, act_musc, 7, 2026, 'mensual', 18000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a23, act_boxe, 7, 2026, 'mensual', 20000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a24, act_pila, 7, 2026, 'mensual', 22000, 0, 'pendiente', '2026-07-10'),
    (v_gym, a24, act_spin, 7, 2026, 'mensual', 16000, 0, 'pendiente', '2026-07-10')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- 6. NOTIFICACIONES LOG — historial realista de emails
  --    Muestra el flujo: aviso → vencimiento → pago confirmado
  -- ============================================================

  -- Limpiar logs de demo anteriores para re-ejecutar limpio
  DELETE FROM notificaciones_log
  WHERE gym_id = v_gym
    AND created_at >= '2026-06-01 00:00:00+00';

  -- ── Avisos PRE-vencimiento Junio (7 días antes = 03/06) ────
  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_vencimiento_proximo',
    a.email,
    'enviado',
    ('2026-06-03 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND a.email IS NOT NULL
    AND c.estado IN ('pendiente', 'pagada');

  -- ── Avisos PRE-vencimiento Junio (3 días antes = 07/06) ────
  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_vencimiento_proximo',
    a.email,
    'enviado',
    ('2026-06-07 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND a.email IS NOT NULL
    AND c.estado IN ('pendiente', 'pagada');

  -- ── Avisos PRE-vencimiento Junio (1 día antes = 09/06) ────
  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_vencimiento_proximo',
    a.email,
    'enviado',
    ('2026-06-09 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND a.email IS NOT NULL
    AND c.estado IN ('pendiente', 'pagada');

  -- ── Confirmaciones de pago (cuotas pagadas Junio) ──────────
  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'pago_confirmado',
    a.email,
    'enviado',
    c.fecha_pago + interval '2 minutes'
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.estado = 'pagada'
    AND c.fecha_pago IS NOT NULL
    AND a.email IS NOT NULL;

  -- ── Avisos POST-vencimiento (cuotas vencidas Junio — 13/06, 16/06, 19/06) ──
  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_cuota_vencida',
    a.email,
    'enviado',
    ('2026-06-13 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND c.estado = 'vencida'
    AND a.email IS NOT NULL;

  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_cuota_vencida',
    a.email,
    'enviado',
    ('2026-06-16 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND c.estado = 'vencida'
    AND a.email IS NOT NULL;

  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_cuota_vencida',
    a.email,
    'enviado',
    ('2026-06-19 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 6 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND c.estado = 'vencida'
    AND a.email IS NOT NULL;

  -- ── Avisos previos (Mayo — muestra historial acumulado) ────
  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'aviso_vencimiento_proximo',
    a.email,
    'enviado',
    ('2026-05-03 09:05:' || LPAD((ROW_NUMBER() OVER())::text, 2, '0') || '+00')::timestamptz
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 5 AND c.anio = 2026
    AND c.tipo = 'mensual'
    AND a.email IS NOT NULL;

  INSERT INTO notificaciones_log (gym_id, alumno_id, cuota_id, tipo, enviado_a, estado, created_at)
  SELECT
    v_gym, c.alumno_id, c.id,
    'pago_confirmado',
    a.email,
    'enviado',
    c.fecha_pago + interval '2 minutes'
  FROM cuotas c
  JOIN alumnos a ON a.id = c.alumno_id
  WHERE c.gym_id = v_gym
    AND c.mes = 5 AND c.anio = 2026
    AND c.estado = 'pagada'
    AND c.fecha_pago IS NOT NULL
    AND a.email IS NOT NULL;

  -- ── CRON LOGS — actualizados con nombre de gym correcto ────
  INSERT INTO cron_logs (gym_id, tipo, es_dispatcher, gyms_total, gyms_ok, gyms_error, items_creados, duracion_ms, created_at)
  VALUES
    (NULL,  'generar_cuotas',   true,  4, 4, 0, 89,  1920, '2026-07-01 03:05:08+00'),
    (NULL,  'enviar_avisos',    true,  4, 4, 0, 31,  2840, '2026-07-03 09:05:02+00'),
    (v_gym, 'generar_cuotas',   false, NULL, NULL, NULL, 26, 390, '2026-07-01 03:05:10+00'),
    (v_gym, 'enviar_avisos',    false, NULL, NULL, NULL, 14, 1640, '2026-07-03 09:05:05+00')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Seed demo completado';
  RAISE NOTICE '  Gym: PowerFit GBA | Admin: Martín Ferreyra';
  RAISE NOTICE '  Cuotas Julio 2026: 31 pendientes generadas';
  RAISE NOTICE '  Notificaciones log: ~120 registros (Mayo + Junio)';
END $$;
