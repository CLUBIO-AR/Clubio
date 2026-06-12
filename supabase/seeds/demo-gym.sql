-- ============================================================
-- SEED DEMO — Iron House Gym
-- Cubre todos los estados posibles del sistema:
--   cuotas: pendiente, vencida, pagada, pagada_parcial, condonada
--   recargos nivel 1 y 2 aplicados
--   alumnos: activos, inactivo, con/sin email, múltiples actividades
--   pagos: efectivo, transferencia, mercadopago
--
-- INSTRUCCIONES:
--   1. Aplicar todas las migraciones 0001→0012 + 0008_cuota_lotes
--   2. Ejecutar este script en Supabase SQL Editor
--   3. Idempotente: si el gym ya existe no hace nada
--   4. Para el usuario owner: crear manualmente en Supabase Auth Dashboard
--      con email: diego@ironhouse.ar y luego ejecutar al final:
--      UPDATE gym_usuarios SET id = '<auth_user_id>' WHERE email = 'diego@ironhouse.ar';
-- ============================================================

DO $$
DECLARE
  -- Gym y config
  v_gym  uuid := '00000000-0000-0000-0003-000000000001';
  v_lic  uuid := '00000000-0000-0000-0003-000000000002';
  v_suc  uuid := '00000000-0000-0000-0003-000000000003';

  -- Actividades
  act_musc uuid := '00000000-0000-0000-0003-000000000011'; -- Musculación
  act_crof uuid := '00000000-0000-0000-0003-000000000012'; -- Crossfit
  act_yoga uuid := '00000000-0000-0000-0003-000000000013'; -- Yoga
  act_pila uuid := '00000000-0000-0000-0003-000000000014'; -- Pilates

  -- Alumnos
  a01 uuid := '00000000-0000-0000-0003-000000000021'; -- María López
  a02 uuid := '00000000-0000-0000-0003-000000000022'; -- Carlos Rodríguez
  a03 uuid := '00000000-0000-0000-0003-000000000023'; -- Ana Martínez
  a04 uuid := '00000000-0000-0000-0003-000000000024'; -- Luis González (pagar todo)
  a05 uuid := '00000000-0000-0000-0003-000000000025'; -- Sofía Pérez (pago parcial)
  a06 uuid := '00000000-0000-0000-0003-000000000026'; -- Martín Sánchez (inactivo)
  a07 uuid := '00000000-0000-0000-0003-000000000027'; -- Laura Gómez (condonada)
  a08 uuid := '00000000-0000-0000-0003-000000000028'; -- Javier Torres (recargos)
  a09 uuid := '00000000-0000-0000-0003-000000000029'; -- Valentina Ruiz (sin email, alta reciente)
  a10 uuid := '00000000-0000-0000-0003-000000000030'; -- Pablo Díaz (sin actividad)
  a11 uuid := '00000000-0000-0000-0003-000000000031'; -- Romina Castro (MP pagos)
  a12 uuid := '00000000-0000-0000-0003-000000000032'; -- Diego Herrera (sin email, 2 actividades)

BEGIN
  -- Idempotencia: salir si el gym ya existe
  IF EXISTS (SELECT 1 FROM gyms WHERE id = v_gym) THEN
    RAISE NOTICE 'Seed demo ya aplicado. Nada que hacer.';
    RETURN;
  END IF;

  -- ================================================================
  -- 1. GYM
  -- ================================================================
  INSERT INTO gyms (id, nombre, slug, email_contacto, telefono, direccion, activo)
  VALUES (
    v_gym,
    'Iron House',
    'iron-house',
    'hola@ironhouse.ar',
    '+5491122334455',
    'Av. Corrientes 1234, CABA',
    true
  );

  -- ================================================================
  -- 2. LICENCIA (Plan Plus, vigente 1 año)
  -- ================================================================
  INSERT INTO licencias (
    id, gym_id, plan, fecha_inicio, fecha_vencimiento, activa,
    max_sucursales, max_admins,
    feature_qr, feature_clases, feature_reportes,
    feature_branding, feature_whatsapp, feature_cobros, feature_avisos,
    precio_pagado, moneda, es_trial
  ) VALUES (
    v_lic, v_gym, 'basic',
    '2026-01-01', '2027-01-01', true,
    1, 3,
    true, true, true, true, true, true, true,
    45, 'USD', false
  );

  -- ================================================================
  -- 3. SUCURSAL
  -- ================================================================
  INSERT INTO sucursales (id, gym_id, nombre, direccion, activa, es_principal)
  VALUES (v_suc, v_gym, 'Iron House Central', 'Av. Corrientes 1234, CABA', true, true);

  INSERT INTO sucursal_config (sucursal_id, gym_id, monto_base_defecto, dia_vencimiento_mensual, dias_gracia)
  VALUES (v_suc, v_gym, 15000, 10, 3);

  -- ================================================================
  -- 4. GYM CONFIG
  -- ================================================================
  INSERT INTO gym_config (
    gym_id,
    mp_access_token, mp_public_key,
    monto_base_defecto,
    dia_vencimiento_mensual, dias_gracia,
    recargo_1_dias, recargo_1_porcentaje,
    recargo_2_dias, recargo_2_porcentaje,
    dias_aviso_antes, aviso_post_vencimiento_dias, max_avisos_post,
    email_activo, email_remitente_nombre,
    email_color_acento,
    generar_cuota_al_alta, cuota_alta_proporcional, dias_minimos_para_cuota_alta,
    color_primario, color_secundario
  ) VALUES (
    v_gym,
    'TEST-REEMPLAZAR-CON-ACCESS-TOKEN', 'TEST-REEMPLAZAR-CON-PUBLIC-KEY',
    15000,
    10, 3,
    5, 10,
    15, 20,
    ARRAY[7, 3], 2, 3,
    true, 'Iron House',
    '#6366f1',
    true, true, 10,
    '#6366f1', '#4f46e5'
  );

  -- ================================================================
  -- 5. ACTIVIDADES
  -- ================================================================
  INSERT INTO actividades (id, gym_id, nombre, monto_base, color, activa)
  VALUES
    (act_musc, v_gym, 'Musculación', 15000, '#22c55e', true),
    (act_crof, v_gym, 'Crossfit',    18000, '#f59e0b', true),
    (act_yoga, v_gym, 'Yoga',        12000, '#a855f7', true),
    (act_pila, v_gym, 'Pilates',     13500, '#ec4899', true);

  -- ================================================================
  -- 6. ALUMNOS
  -- ================================================================
  INSERT INTO alumnos (id, gym_id, sucursal_id, nombre, apellido, dni, email, telefono, fecha_alta, fecha_nacimiento, activo, notas)
  VALUES
    -- 01 María López — activa, Musculación + Yoga, cuotas al día
    (a01, v_gym, v_suc, 'María',     'López',      '30100001', 'maria.lopez@demo.com',     '+54911 0000 0001', '2025-08-01', '1992-03-15', true,  NULL),
    -- 02 Carlos Rodríguez — activo, Crossfit, cuota junio pendiente
    (a02, v_gym, v_suc, 'Carlos',    'Rodríguez',  '30100002', 'carlos.rodriguez@demo.com', '+54911 0000 0002', '2025-09-15', '1988-07-22', true,  NULL),
    -- 03 Ana Martínez — activa, Musculación, mayo vencida sin pagar
    (a03, v_gym, v_suc, 'Ana',       'Martínez',   '30100003', 'ana.martinez@demo.com',    '+54911 0000 0003', '2025-11-01', '1995-11-30', true,  NULL),
    -- 04 Luis González — activo, Yoga, 3 cuotas sin pagar (test "pagar todo")
    (a04, v_gym, v_suc, 'Luis',      'González',   '30100004', 'luis.gonzalez@demo.com',   '+54911 0000 0004', '2025-10-01', '1990-05-10', true,  'Test: flujo pagar todo'),
    -- 05 Sofía Pérez — activa, Crossfit, monto personalizado, pago parcial
    (a05, v_gym, v_suc, 'Sofía',     'Pérez',      '30100005', 'sofia.perez@demo.com',     '+54911 0000 0005', '2025-07-20', '1997-09-08', true,  NULL),
    -- 06 Martín Sánchez — INACTIVO, Musculación, historial pagado
    (a06, v_gym, v_suc, 'Martín',    'Sánchez',    '30100006', NULL,                       '+54911 0000 0006', '2025-03-01', '1985-02-14', false, 'Baja voluntaria abril 2026'),
    -- 07 Laura Gómez — activa, Pilates + Musculación, cuota condonada
    (a07, v_gym, v_suc, 'Laura',     'Gómez',      '30100007', 'laura.gomez@demo.com',     '+54911 0000 0007', '2025-06-01', '1993-12-01', true,  NULL),
    -- 08 Javier Torres — activo, Crossfit, múltiples vencidas con recargos
    (a08, v_gym, v_suc, 'Javier',    'Torres',     '30100008', 'javier.torres@demo.com',   '+54911 0000 0008', '2025-12-01', '1982-08-25', true,  'Deudor crónico — ver recargos'),
    -- 09 Valentina Ruiz — activa, Yoga, sin email, alta muy reciente
    (a09, v_gym, v_suc, 'Valentina', 'Ruiz',       '30100009', NULL,                       '+54911 0000 0009', '2026-06-05', '2000-01-20', true,  'Alta reciente sin cuota'),
    -- 10 Pablo Díaz — activo, sin actividad específica, cuota global
    (a10, v_gym, v_suc, 'Pablo',     'Díaz',       '30100010', 'pablo.diaz@demo.com',      '+54911 0000 0010', '2025-05-01', '1991-04-17', true,  NULL),
    -- 11 Romina Castro — activa, Musculación, pagos históricos via MP
    (a11, v_gym, v_suc, 'Romina',    'Castro',     '30100011', 'romina.castro@demo.com',   '+54911 0000 0011', '2025-04-01', '1996-06-30', true,  NULL),
    -- 12 Diego Herrera — activo, Crossfit + Pilates, sin email, 2 cuotas vencidas
    (a12, v_gym, v_suc, 'Diego',     'Herrera',    '30100012', NULL,                       '+54911 0000 0012', '2025-10-15', '1987-03-05', true,  'Sin email — no recibe avisos');

  -- Sofía: monto personalizado (override crossfit 18000 → 12000)
  UPDATE alumnos SET monto_cuota_personalizado = 12000 WHERE id = a05;

  -- ================================================================
  -- 7. INSCRIPCIONES EN ACTIVIDADES
  -- ================================================================
  INSERT INTO alumno_actividades (gym_id, alumno_id, actividad_id, activa, fecha_inicio)
  VALUES
    -- María: Musculación + Yoga
    (v_gym, a01, act_musc, true, '2025-08-01'),
    (v_gym, a01, act_yoga, true, '2025-08-01'),
    -- Carlos: Crossfit
    (v_gym, a02, act_crof, true, '2025-09-15'),
    -- Ana: Musculación
    (v_gym, a03, act_musc, true, '2025-11-01'),
    -- Luis: Yoga
    (v_gym, a04, act_yoga, true, '2025-10-01'),
    -- Sofía: Crossfit (monto personalizado en alumno)
    (v_gym, a05, act_crof, true, '2025-07-20'),
    -- Martín: Musculación (inactivo)
    (v_gym, a06, act_musc, false, '2025-03-01'),
    -- Laura: Pilates + Musculación
    (v_gym, a07, act_pila, true, '2025-06-01'),
    (v_gym, a07, act_musc, true, '2025-06-01'),
    -- Javier: Crossfit
    (v_gym, a08, act_crof, true, '2025-12-01'),
    -- Valentina: Yoga
    (v_gym, a09, act_yoga, true, '2026-06-05'),
    -- Pablo: sin actividad (cuota global — no se inserta nada aquí)
    -- Romina: Musculación
    (v_gym, a11, act_musc, true, '2025-04-01'),
    -- Diego: Crossfit + Pilates
    (v_gym, a12, act_crof, true, '2025-10-15'),
    (v_gym, a12, act_pila, true, '2025-10-15');

  -- ================================================================
  -- 8. CUOTAS
  -- Día de vencimiento del gym: 10 → fecha_vencimiento = ANIO-MES-10
  -- Hoy: 2026-06-09 → junio aún no vence (vence el 10)
  -- Mayo y antes: VENCIDA si no pagada
  -- ================================================================

  -- ── María López (a01): Musculación + Yoga ──────────────────────
  -- Mayo: ambas pagadas
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, metodo_pago, fecha_pago, tipo)
  VALUES
    (v_gym, a01, act_musc, 5, 2026, 15000, 0, 15000, 'pagada',   '2026-05-10', 'efectivo',      '2026-05-08', 'mensual'),
    (v_gym, a01, act_yoga, 5, 2026, 12000, 0, 12000, 'pagada',   '2026-05-10', 'transferencia', '2026-05-09', 'mensual'),
    -- Junio: pendientes
    (v_gym, a01, act_musc, 6, 2026, 15000, 0, 15000, 'pendiente', '2026-06-10', NULL, NULL, 'mensual'),
    (v_gym, a01, act_yoga, 6, 2026, 12000, 0, 12000, 'pendiente', '2026-06-10', NULL, NULL, 'mensual');

  -- Pagos de mayo
  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a01, monto_total, metodo_pago FROM cuotas
  WHERE alumno_id = a01 AND mes = 5 AND anio = 2026;

  -- ── Carlos Rodríguez (a02): Crossfit ───────────────────────────
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, metodo_pago, fecha_pago, mp_payment_id, tipo)
  VALUES
    (v_gym, a02, act_crof, 4, 2026, 18000, 0, 18000, 'pagada',   '2026-04-10', 'mercadopago', '2026-04-08', 'MP-DEMO-0002-APR', 'mensual'),
    (v_gym, a02, act_crof, 5, 2026, 18000, 0, 18000, 'pagada',   '2026-05-10', 'mercadopago', '2026-05-07', 'MP-DEMO-0002-MAY', 'mensual'),
    (v_gym, a02, act_crof, 6, 2026, 18000, 0, 18000, 'pendiente', '2026-06-10', NULL, NULL, NULL, 'mensual');

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo, mp_payment_id, mp_status)
  SELECT v_gym, id, a02, monto_total, metodo_pago, mp_payment_id, 'approved'
  FROM cuotas WHERE alumno_id = a02 AND estado = 'pagada';

  -- ── Ana Martínez (a03): Musculación ────────────────────────────
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, tipo)
  VALUES
    (v_gym, a03, act_musc, 4, 2026, 15000, 0, 15000, 'pagada',   '2026-04-10', 'mensual'),
    (v_gym, a03, act_musc, 5, 2026, 15000, 0, 15000, 'vencida',  '2026-05-10', 'mensual'),  -- sin pagar
    (v_gym, a03, act_musc, 6, 2026, 15000, 0, 15000, 'pendiente', '2026-06-10', 'mensual');

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a03, monto_total, 'efectivo'
  FROM cuotas WHERE alumno_id = a03 AND mes = 4 AND anio = 2026;

  UPDATE cuotas SET metodo_pago = 'efectivo', fecha_pago = '2026-04-05'
  WHERE alumno_id = a03 AND mes = 4 AND anio = 2026;

  -- ── Luis González (a04): Yoga — 3 cuotas sin pagar (test pagar todo) ──
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, avisos_enviados, tipo)
  VALUES
    (v_gym, a04, act_yoga, 4, 2026, 12000, 1200, 13200, 'vencida',  '2026-04-10', 3, 'mensual'),
    (v_gym, a04, act_yoga, 5, 2026, 12000, 1200, 13200, 'vencida',  '2026-05-10', 2, 'mensual'),
    (v_gym, a04, act_yoga, 6, 2026, 12000, 0,    12000, 'pendiente', '2026-06-10', 0, 'mensual');

  UPDATE cuotas SET recargo_nivel = 1, recargo_aplicado_en = '2026-04-15'
  WHERE alumno_id = a04 AND mes = 4 AND anio = 2026;
  UPDATE cuotas SET recargo_nivel = 1, recargo_aplicado_en = '2026-05-15'
  WHERE alumno_id = a04 AND mes = 5 AND anio = 2026;

  -- ── Sofía Pérez (a05): Crossfit, monto_personalizado = 12000 ───
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, tipo)
  VALUES
    (v_gym, a05, act_crof, 4, 2026, 12000, 0, 12000, 'pagada',        '2026-04-10', 'mensual'),
    (v_gym, a05, act_crof, 5, 2026, 12000, 0, 12000, 'pagada_parcial', '2026-05-10', 'mensual'),
    (v_gym, a05, act_crof, 6, 2026, 12000, 0, 12000, 'pendiente',      '2026-06-10', 'mensual');

  -- Pago completo de abril
  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a05, 12000, 'efectivo'
  FROM cuotas WHERE alumno_id = a05 AND mes = 4 AND anio = 2026;

  UPDATE cuotas SET metodo_pago = 'efectivo', fecha_pago = '2026-04-09'
  WHERE alumno_id = a05 AND mes = 4 AND anio = 2026;

  -- Pago parcial de mayo (6000 de 12000)
  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a05, 6000, 'efectivo'
  FROM cuotas WHERE alumno_id = a05 AND mes = 5 AND anio = 2026;

  -- ── Martín Sánchez (a06): INACTIVO, historial de 3 meses pagados ──
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, metodo_pago, fecha_pago, tipo)
  VALUES
    (v_gym, a06, act_musc, 2, 2026, 15000, 0, 15000, 'pagada', '2026-02-10', 'efectivo', '2026-02-07', 'mensual'),
    (v_gym, a06, act_musc, 3, 2026, 15000, 0, 15000, 'pagada', '2026-03-10', 'efectivo', '2026-03-06', 'mensual'),
    (v_gym, a06, act_musc, 4, 2026, 15000, 0, 15000, 'pagada', '2026-04-10', 'efectivo', '2026-04-05', 'mensual');

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a06, monto_total, 'efectivo'
  FROM cuotas WHERE alumno_id = a06;

  -- ── Laura Gómez (a07): Pilates + Musculación, junio Pilates condonada ──
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, metodo_pago, fecha_pago, tipo, notas)
  VALUES
    (v_gym, a07, act_pila, 5, 2026, 13500, 0, 13500, 'pagada',   '2026-05-10', 'transferencia', '2026-05-08', 'mensual', NULL),
    (v_gym, a07, act_musc, 5, 2026, 15000, 0, 15000, 'pagada',   '2026-05-10', 'efectivo',      '2026-05-08', 'mensual', NULL),
    (v_gym, a07, act_pila, 6, 2026, 13500, 0, 13500, 'condonada', '2026-06-10', NULL, NULL,       'mensual', 'Beca deportiva — exención mes junio'),
    (v_gym, a07, act_musc, 6, 2026, 15000, 0, 15000, 'pendiente', '2026-06-10', NULL, NULL,       'mensual', NULL);

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a07, monto_total, metodo_pago
  FROM cuotas WHERE alumno_id = a07 AND estado = 'pagada';

  -- ── Javier Torres (a08): Crossfit, múltiples vencidas con recargos ──
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, avisos_enviados, recargo_nivel, recargo_aplicado_en, tipo)
  VALUES
    (v_gym, a08, act_crof, 2, 2026, 18000, 0,    18000, 'pagada',  '2026-02-10', 0, NULL, NULL,         'mensual'),
    (v_gym, a08, act_crof, 3, 2026, 18000, 3600, 21600, 'vencida', '2026-03-10', 3, 2,    '2026-03-25', 'mensual'),
    (v_gym, a08, act_crof, 4, 2026, 18000, 3600, 21600, 'vencida', '2026-04-10', 3, 2,    '2026-04-25', 'mensual'),
    (v_gym, a08, act_crof, 5, 2026, 18000, 1800, 19800, 'vencida', '2026-05-10', 2, 1,    '2026-05-15', 'mensual'),
    (v_gym, a08, act_crof, 6, 2026, 18000, 0,    18000, 'pendiente','2026-06-10', 0, NULL, NULL,         'mensual');

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a08, monto_total, 'efectivo'
  FROM cuotas WHERE alumno_id = a08 AND mes = 2 AND anio = 2026;

  UPDATE cuotas SET metodo_pago = 'efectivo', fecha_pago = '2026-02-09'
  WHERE alumno_id = a08 AND mes = 2 AND anio = 2026;

  -- ── Valentina Ruiz (a09): sin email, alta 2026-06-05, sin cuotas ──
  -- No se generó cuota por días_minimos_para_cuota_alta = 10 (quedan 5 días)
  -- No se inserta nada intencionalmente

  -- ── Pablo Díaz (a10): sin actividad, cuota global ──────────────
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, metodo_pago, fecha_pago, tipo)
  VALUES
    (v_gym, a10, NULL, 3, 2026, 15000, 0, 15000, 'pagada',   '2026-03-10', 'efectivo', '2026-03-07', 'mensual'),
    (v_gym, a10, NULL, 4, 2026, 15000, 0, 15000, 'pagada',   '2026-04-10', 'efectivo', '2026-04-08', 'mensual'),
    (v_gym, a10, NULL, 5, 2026, 15000, 0, 15000, 'pagada',   '2026-05-10', 'efectivo', '2026-05-09', 'mensual'),
    (v_gym, a10, NULL, 6, 2026, 15000, 0, 15000, 'pendiente', '2026-06-10', NULL, NULL, 'mensual');

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo)
  SELECT v_gym, id, a10, monto_total, 'efectivo'
  FROM cuotas WHERE alumno_id = a10 AND estado = 'pagada';

  -- ── Romina Castro (a11): Musculación, historial pagado via MP ───
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, metodo_pago, fecha_pago, mp_payment_id, tipo)
  VALUES
    (v_gym, a11, act_musc, 3, 2026, 15000, 0, 15000, 'pagada',   '2026-03-10', 'mercadopago', '2026-03-08', 'MP-DEMO-0011-MAR', 'mensual'),
    (v_gym, a11, act_musc, 4, 2026, 15000, 0, 15000, 'pagada',   '2026-04-10', 'mercadopago', '2026-04-09', 'MP-DEMO-0011-APR', 'mensual'),
    (v_gym, a11, act_musc, 5, 2026, 15000, 0, 15000, 'pagada',   '2026-05-10', 'mercadopago', '2026-05-08', 'MP-DEMO-0011-MAY', 'mensual'),
    (v_gym, a11, act_musc, 6, 2026, 15000, 0, 15000, 'pendiente', '2026-06-10', NULL, NULL,    NULL,         'mensual');

  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo, mp_payment_id, mp_status)
  SELECT v_gym, id, a11, monto_total, 'mercadopago', mp_payment_id, 'approved'
  FROM cuotas WHERE alumno_id = a11 AND estado = 'pagada';

  -- ── Diego Herrera (a12): Crossfit + Pilates, sin email, mayo vencidas ──
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, monto_base, monto_recargo, monto_total, estado, fecha_vencimiento, avisos_enviados, tipo)
  VALUES
    (v_gym, a12, act_crof, 5, 2026, 18000, 1800, 19800, 'vencida',  '2026-05-10', 0, 'mensual'),
    (v_gym, a12, act_pila, 5, 2026, 13500, 1350, 14850, 'vencida',  '2026-05-10', 0, 'mensual'),
    (v_gym, a12, act_crof, 6, 2026, 18000, 0,    18000, 'pendiente', '2026-06-10', 0, 'mensual'),
    (v_gym, a12, act_pila, 6, 2026, 13500, 0,    13500, 'pendiente', '2026-06-10', 0, 'mensual');

  UPDATE cuotas SET recargo_nivel = 1, recargo_aplicado_en = '2026-05-15'
  WHERE alumno_id = a12 AND mes = 5 AND anio = 2026;

  RAISE NOTICE 'Seed demo Iron House aplicado correctamente.';
  RAISE NOTICE 'Gym ID: 00000000-0000-0000-0003-000000000001';
  RAISE NOTICE 'IMPORTANTE: Crear usuario owner en Supabase Auth Dashboard:';
  RAISE NOTICE '  Email: diego@ironhouse.ar | Password: IronHouse2026!';
  RAISE NOTICE '  Luego copiar el auth user ID y ejecutar:';
  RAISE NOTICE '  INSERT INTO gym_usuarios (id, gym_id, nombre, email, rol, activo)';
  RAISE NOTICE '  VALUES (''<AUTH_USER_ID>'', ''00000000-0000-0000-0003-000000000001'', ''Diego Fernández'', ''diego@ironhouse.ar'', ''owner'', true);';

END $$;
