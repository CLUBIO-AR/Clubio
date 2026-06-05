-- ============================================================
-- SEED AMPLIADO — Gym 167e8985-3ef7-4274-ab33-a1bd46b9df5e
-- Ejecutar en Supabase SQL Editor (idempotente)
-- Requiere migraciones 0001→0005 ya aplicadas
-- ============================================================

DO $$
DECLARE
  v_gym UUID := '167e8985-3ef7-4274-ab33-a1bd46b9df5e';
  v_suc UUID;

  -- ── Actividades ──────────────────────────────────────────
  act_musc UUID := '00000000-0000-0000-0001-000000000001'; -- Musculación
  act_pila UUID := '00000000-0000-0000-0001-000000000002'; -- Pilates
  act_boxe UUID := '00000000-0000-0000-0001-000000000003'; -- Boxeo
  act_crof UUID := '00000000-0000-0000-0001-000000000004'; -- CrossFit
  act_spin UUID := '00000000-0000-0000-0001-000000000005'; -- Spinning
  act_yoga UUID := '00000000-0000-0000-0001-000000000006'; -- Yoga

  -- ── Alumnos originales (seed_prueba) ─────────────────────
  a1 UUID := '8663fcfd-a4f9-4702-a295-29ec0b976205'; -- Juan García
  a2 UUID := '158f0d7f-38b7-4132-9e86-945000b7a21c'; -- María López
  a3 UUID := '3d300198-4838-4fa9-ae57-b6dfce6154da'; -- Carlos Martínez
  a4 UUID := 'ff919c41-7bba-46d3-8523-3679cb28d6b8'; -- Ana Rodríguez
  a5 UUID := '63e9c4a4-e848-4882-9584-7edbbae864f2'; -- Diego Fernández

  -- ── Nuevos alumnos ───────────────────────────────────────
  a6  UUID := '00000000-0000-0000-0002-000000000006';  -- Valentina Torres
  a7  UUID := '00000000-0000-0000-0002-000000000007';  -- Sebastián Gómez
  a8  UUID := '00000000-0000-0000-0002-000000000008';  -- Lucía Herrera
  a9  UUID := '00000000-0000-0000-0002-000000000009';  -- Matías Alvarez
  a10 UUID := '00000000-0000-0000-0002-000000000010';  -- Camila Díaz
  a11 UUID := '00000000-0000-0000-0002-000000000011';  -- Agustín Pérez
  a12 UUID := '00000000-0000-0000-0002-000000000012';  -- Florencia Morales
  a13 UUID := '00000000-0000-0000-0002-000000000013';  -- Nicolás Castro
  a14 UUID := '00000000-0000-0000-0002-000000000014';  -- Paula Ramírez
  a15 UUID := '00000000-0000-0000-0002-000000000015';  -- Facundo Ruiz
  a16 UUID := '00000000-0000-0000-0002-000000000016';  -- Marina Jiménez
  a17 UUID := '00000000-0000-0000-0002-000000000017';  -- Rodrigo Sánchez
  a18 UUID := '00000000-0000-0000-0002-000000000018';  -- Antonella Vega
  a19 UUID := '00000000-0000-0000-0002-000000000019';  -- Tomás Blanco
  a20 UUID := '00000000-0000-0000-0002-000000000020';  -- Daniela Ríos
  a21 UUID := '00000000-0000-0000-0002-000000000021';  -- Ezequiel Acosta
  a22 UUID := '00000000-0000-0000-0002-000000000022';  -- Victoria Méndez
  a23 UUID := '00000000-0000-0000-0002-000000000023';  -- Ignacio Suárez
  a24 UUID := '00000000-0000-0000-0002-000000000024';  -- Julieta Ponce
  a25 UUID := '00000000-0000-0000-0002-000000000025';  -- Max Lara (inactivo)

BEGIN
  SELECT id INTO v_suc FROM sucursales WHERE gym_id = v_gym ORDER BY created_at LIMIT 1;

  -- ===========================================================
  -- 1. ACTIVIDADES
  -- ===========================================================
  INSERT INTO actividades (id, gym_id, nombre, monto_base, color, activa)
  VALUES
    (act_musc, v_gym, 'Musculación', 18000, '#22c55e', true),
    (act_pila, v_gym, 'Pilates',     22000, '#ec4899', true),
    (act_boxe, v_gym, 'Boxeo',       20000, '#f97316', true),
    (act_crof, v_gym, 'CrossFit',    25000, '#3b82f6', true),
    (act_spin, v_gym, 'Spinning',    16000, '#eab308', true),
    (act_yoga, v_gym, 'Yoga',        15000, '#a855f7', true)
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================
  -- 2. ALUMNOS (a1-a5 ya existen, se actualizan; a6-a25 nuevos)
  -- ===========================================================

  -- Actualizar originales (por si no tienen fecha_alta correcta)
  INSERT INTO alumnos (id, gym_id, sucursal_id, nombre, apellido, dni, email, telefono, activo, fecha_alta, monto_cuota_personalizado)
  VALUES
    (a1, v_gym, v_suc, 'Juan',    'García',    '30123456', 'valensosa157@gmail.com', '+5491112345671', true, '2024-03-01', 25000),
    (a2, v_gym, v_suc, 'María',   'López',     '31234567', 'valensosa157@gmail.com', '+5491112345672', true, '2024-05-15', 22000),
    (a3, v_gym, v_suc, 'Carlos',  'Martínez',  '32345678', NULL,                     '+5491112345673', true, '2024-07-20', 18000),
    (a4, v_gym, v_suc, 'Ana',     'Rodríguez', '33456789', 'valensosa157@gmail.com', '+5491112345674', true, '2024-02-10', 30000),
    (a5, v_gym, v_suc, 'Diego',   'Fernández', '34567890', 'valensosa157@gmail.com', '+5491112345675', true, '2025-01-08', 20000)
  ON CONFLICT (id) DO NOTHING;

  -- Nuevos alumnos
  INSERT INTO alumnos (id, gym_id, sucursal_id, nombre, apellido, dni, email, telefono, activo, fecha_alta, fecha_nacimiento)
  VALUES
    (a6,  v_gym, v_suc, 'Valentina', 'Torres',   '35678901', 'valensosa157@gmail.com', '+5491122334401', true,  '2025-02-01', '1998-04-12'),
    (a7,  v_gym, v_suc, 'Sebastián', 'Gómez',    '36789012', NULL,                     '+5491122334402', true,  '2024-08-15', '1992-11-03'),
    (a8,  v_gym, v_suc, 'Lucía',     'Herrera',  '37890123', 'valensosa157@gmail.com', '+5491122334403', true,  '2025-03-20', '2001-07-22'),
    (a9,  v_gym, v_suc, 'Matías',    'Alvarez',  '38901234', NULL,                     '+5491122334404', true,  '2024-11-01', '1989-02-14'),
    (a10, v_gym, v_suc, 'Camila',    'Díaz',     '39012345', 'valensosa157@gmail.com', '+5491122334405', true,  '2025-01-10', '2000-09-30'),
    (a11, v_gym, v_suc, 'Agustín',   'Pérez',    '40123456', NULL,                     '+5491122334406', true,  '2024-06-05', '1995-12-18'),
    (a12, v_gym, v_suc, 'Florencia', 'Morales',  '41234567', 'valensosa157@gmail.com', '+5491122334407', true,  '2025-04-14', '1997-03-07'),
    (a13, v_gym, v_suc, 'Nicolás',   'Castro',   '42345678', NULL,                     '+5491122334408', true,  '2024-09-22', '1993-08-25'),
    (a14, v_gym, v_suc, 'Paula',     'Ramírez',  '43456789', 'valensosa157@gmail.com', '+5491122334409', true,  '2025-02-28', '1999-06-11'),
    (a15, v_gym, v_suc, 'Facundo',   'Ruiz',     '44567890', NULL,                     '+5491122334410', true,  '2024-10-03', '1991-01-29'),
    (a16, v_gym, v_suc, 'Marina',    'Jiménez',  '45678901', 'valensosa157@gmail.com', '+5491122334411', true,  '2025-01-20', '2003-10-05'),
    (a17, v_gym, v_suc, 'Rodrigo',   'Sánchez',  '46789012', NULL,                     '+5491122334412', true,  '2024-04-18', '1988-05-16'),
    (a18, v_gym, v_suc, 'Antonella', 'Vega',     '47890123', 'valensosa157@gmail.com', '+5491122334413', true,  '2025-03-07', '2002-12-01'),
    (a19, v_gym, v_suc, 'Tomás',     'Blanco',   '48901234', NULL,                     '+5491122334414', true,  '2024-12-12', '1996-07-20'),
    (a20, v_gym, v_suc, 'Daniela',   'Ríos',     '49012345', 'valensosa157@gmail.com', '+5491122334415', true,  '2025-05-02', '2004-02-28'),
    (a21, v_gym, v_suc, 'Ezequiel',  'Acosta',   '50123456', NULL,                     '+5491122334416', true,  '2024-07-09', '1990-11-14'),
    (a22, v_gym, v_suc, 'Victoria',  'Méndez',   '51234567', 'valensosa157@gmail.com', '+5491122334417', true,  '2025-01-30', '1994-04-03'),
    (a23, v_gym, v_suc, 'Ignacio',   'Suárez',   '52345678', NULL,                     '+5491122334418', true,  '2024-05-23', '1987-09-09'),
    (a24, v_gym, v_suc, 'Julieta',   'Ponce',    '53456789', 'valensosa157@gmail.com', '+5491122334419', true,  '2025-04-01', '2000-03-17'),
    (a25, v_gym, v_suc, 'Maximiliano','Lara',    '54567890', NULL,                     '+5491122334420', false, '2023-08-01', '1985-06-06')
  ON CONFLICT (id) DO NOTHING;

  -- Alumno dado de baja (a25)
  UPDATE alumnos SET activo = false, fecha_baja = '2025-12-31' WHERE id = a25 AND gym_id = v_gym;

  -- ===========================================================
  -- 3. INSCRIPCIONES ALUMNO ↔ ACTIVIDAD
  -- ===========================================================
  INSERT INTO alumno_actividades (gym_id, alumno_id, actividad_id, activa, fecha_inicio)
  VALUES
    -- Valentina Torres: Pilates + Yoga
    (v_gym, a6,  act_pila, true, '2025-02-01'),
    (v_gym, a6,  act_yoga, true, '2025-03-01'),
    -- Sebastián Gómez: Musculación + CrossFit
    (v_gym, a7,  act_musc, true, '2024-08-15'),
    (v_gym, a7,  act_crof, true, '2025-01-01'),
    -- Lucía Herrera: Spinning
    (v_gym, a8,  act_spin, true, '2025-03-20'),
    -- Matías Alvarez: Boxeo + Musculación
    (v_gym, a9,  act_boxe, true, '2024-11-01'),
    (v_gym, a9,  act_musc, true, '2025-02-01'),
    -- Camila Díaz: Pilates
    (v_gym, a10, act_pila, true, '2025-01-10'),
    -- Agustín Pérez: CrossFit
    (v_gym, a11, act_crof, true, '2024-06-05'),
    -- Florencia Morales: Yoga + Pilates
    (v_gym, a12, act_yoga, true, '2025-04-14'),
    (v_gym, a12, act_pila, true, '2025-04-14'),
    -- Nicolás Castro: Musculación
    (v_gym, a13, act_musc, true, '2024-09-22'),
    -- Paula Ramírez: Spinning + Pilates
    (v_gym, a14, act_spin, true, '2025-02-28'),
    (v_gym, a14, act_pila, true, '2025-02-28'),
    -- Facundo Ruiz: Boxeo
    (v_gym, a15, act_boxe, true, '2024-10-03'),
    -- Marina Jiménez: Yoga
    (v_gym, a16, act_yoga, true, '2025-01-20'),
    -- Rodrigo Sánchez: CrossFit + Boxeo
    (v_gym, a17, act_crof, true, '2024-04-18'),
    (v_gym, a17, act_boxe, true, '2024-07-01'),
    -- Antonella Vega: Pilates
    (v_gym, a18, act_pila, true, '2025-03-07'),
    -- Tomás Blanco: Musculación
    (v_gym, a19, act_musc, true, '2024-12-12'),
    -- Daniela Ríos: Spinning
    (v_gym, a20, act_spin, true, '2025-05-02'),
    -- Ezequiel Acosta: CrossFit
    (v_gym, a21, act_crof, true, '2024-07-09'),
    -- Victoria Méndez: Yoga
    (v_gym, a22, act_yoga, true, '2025-01-30'),
    -- Ignacio Suárez: Musculación + Boxeo
    (v_gym, a23, act_musc, true, '2024-05-23'),
    (v_gym, a23, act_boxe, true, '2024-05-23'),
    -- Julieta Ponce: Pilates + Spinning
    (v_gym, a24, act_pila, true, '2025-04-01'),
    (v_gym, a24, act_spin, true, '2025-04-01')
  ON CONFLICT (alumno_id, actividad_id) DO NOTHING;

  -- ===========================================================
  -- 4. CUOTAS — FEBRERO 2026 (todas pagadas — historia limpia)
  -- ===========================================================

  -- Legacy: a1-a5 sin actividad
  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a1, 2, 2026, 'mensual', 25000, 0, 'pagada', '2026-02-10', '2026-02-08 14:30:00+00', 'transferencia'),
    (v_gym, a2, 2, 2026, 'mensual', 22000, 0, 'pagada', '2026-02-10', '2026-02-07 10:00:00+00', 'efectivo'),
    (v_gym, a3, 2, 2026, 'mensual', 18000, 0, 'pagada', '2026-02-10', '2026-02-10 16:00:00+00', 'efectivo'),
    (v_gym, a4, 2, 2026, 'mensual', 30000, 0, 'pagada', '2026-02-10', '2026-02-05 09:00:00+00', 'transferencia'),
    (v_gym, a5, 2, 2026, 'mensual', 20000, 0, 'pagada', '2026-02-10', '2026-02-09 11:00:00+00', 'efectivo')
  ON CONFLICT DO NOTHING;

  -- Con actividades: selección representativa
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a6,  act_pila, 2, 2026, 'mensual', 22000, 0, 'pagada', '2026-02-10', '2026-02-06 09:30:00+00', 'transferencia'),
    (v_gym, a6,  act_yoga, 2, 2026, 'mensual', 15000, 0, 'pagada', '2026-02-10', '2026-02-06 09:30:00+00', 'transferencia'),
    (v_gym, a7,  act_musc, 2, 2026, 'mensual', 18000, 0, 'pagada', '2026-02-10', '2026-02-04 18:00:00+00', 'efectivo'),
    (v_gym, a7,  act_crof, 2, 2026, 'mensual', 25000, 0, 'pagada', '2026-02-10', '2026-02-04 18:00:00+00', 'efectivo'),
    (v_gym, a8,  act_spin, 2, 2026, 'mensual', 16000, 0, 'pagada', '2026-02-10', '2026-02-11 10:00:00+00', 'transferencia'),
    (v_gym, a9,  act_boxe, 2, 2026, 'mensual', 20000, 0, 'pagada', '2026-02-10', '2026-02-09 15:00:00+00', 'efectivo'),
    (v_gym, a9,  act_musc, 2, 2026, 'mensual', 18000, 0, 'pagada', '2026-02-10', '2026-02-09 15:00:00+00', 'efectivo'),
    (v_gym, a10, act_pila, 2, 2026, 'mensual', 22000, 0, 'pagada', '2026-02-10', '2026-02-08 12:00:00+00', 'transferencia'),
    (v_gym, a11, act_crof, 2, 2026, 'mensual', 25000, 0, 'pagada', '2026-02-10', '2026-02-03 17:00:00+00', 'efectivo'),
    (v_gym, a13, act_musc, 2, 2026, 'mensual', 18000, 0, 'pagada', '2026-02-10', '2026-02-07 13:00:00+00', 'efectivo'),
    (v_gym, a14, act_spin, 2, 2026, 'mensual', 16000, 0, 'pagada', '2026-02-10', '2026-02-10 08:00:00+00', 'transferencia'),
    (v_gym, a14, act_pila, 2, 2026, 'mensual', 22000, 0, 'pagada', '2026-02-10', '2026-02-10 08:00:00+00', 'transferencia'),
    (v_gym, a15, act_boxe, 2, 2026, 'mensual', 20000, 0, 'pagada', '2026-02-10', '2026-02-09 19:00:00+00', 'efectivo'),
    (v_gym, a17, act_crof, 2, 2026, 'mensual', 25000, 0, 'pagada', '2026-02-10', '2026-02-05 10:00:00+00', 'efectivo'),
    (v_gym, a17, act_boxe, 2, 2026, 'mensual', 20000, 0, 'pagada', '2026-02-10', '2026-02-05 10:00:00+00', 'efectivo'),
    (v_gym, a18, act_pila, 2, 2026, 'mensual', 22000, 0, 'pagada', '2026-02-10', '2026-02-08 14:00:00+00', 'transferencia'),
    (v_gym, a19, act_musc, 2, 2026, 'mensual', 18000, 0, 'pagada', '2026-02-10', '2026-02-06 16:00:00+00', 'efectivo'),
    (v_gym, a21, act_crof, 2, 2026, 'mensual', 25000, 0, 'pagada', '2026-02-10', '2026-02-07 11:00:00+00', 'transferencia'),
    (v_gym, a22, act_yoga, 2, 2026, 'mensual', 15000, 0, 'pagada', '2026-02-10', '2026-02-08 09:00:00+00', 'transferencia'),
    (v_gym, a23, act_musc, 2, 2026, 'mensual', 18000, 0, 'pagada', '2026-02-10', '2026-02-04 20:00:00+00', 'efectivo'),
    (v_gym, a23, act_boxe, 2, 2026, 'mensual', 20000, 0, 'pagada', '2026-02-10', '2026-02-04 20:00:00+00', 'efectivo')
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 5. CUOTAS — MARZO 2026 (80% pagadas, algunos vencidos)
  -- ===========================================================

  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a1, 3, 2026, 'mensual', 25000, 0,    'pagada',   '2026-03-10', '2026-03-09 14:00:00+00', 'transferencia'),
    (v_gym, a2, 3, 2026, 'mensual', 22000, 0,    'pagada',   '2026-03-10', '2026-03-10 09:30:00+00', 'efectivo'),
    (v_gym, a3, 3, 2026, 'mensual', 18000, 0,    'pagada',   '2026-03-10', '2026-03-08 17:00:00+00', 'efectivo'),
    (v_gym, a4, 3, 2026, 'mensual', 30000, 3000, 'vencida',  '2026-03-10', NULL, NULL),
    (v_gym, a5, 3, 2026, 'mensual', 20000, 0,    'pagada',   '2026-03-10', '2026-03-07 12:00:00+00', 'efectivo')
  ON CONFLICT DO NOTHING;

  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a6,  act_pila, 3, 2026, 'mensual', 22000, 0,    'pagada',  '2026-03-10', '2026-03-07 10:00:00+00', 'transferencia'),
    (v_gym, a6,  act_yoga, 3, 2026, 'mensual', 15000, 0,    'pagada',  '2026-03-10', '2026-03-07 10:00:00+00', 'transferencia'),
    (v_gym, a7,  act_musc, 3, 2026, 'mensual', 18000, 0,    'pagada',  '2026-03-10', '2026-03-05 18:00:00+00', 'efectivo'),
    (v_gym, a7,  act_crof, 3, 2026, 'mensual', 25000, 0,    'pagada',  '2026-03-10', '2026-03-05 18:00:00+00', 'efectivo'),
    (v_gym, a8,  act_spin, 3, 2026, 'mensual', 16000, 1600, 'vencida', '2026-03-10', NULL, NULL),
    (v_gym, a9,  act_boxe, 3, 2026, 'mensual', 20000, 0,    'pagada',  '2026-03-10', '2026-03-09 14:00:00+00', 'efectivo'),
    (v_gym, a9,  act_musc, 3, 2026, 'mensual', 18000, 0,    'pagada',  '2026-03-10', '2026-03-09 14:00:00+00', 'efectivo'),
    (v_gym, a10, act_pila, 3, 2026, 'mensual', 22000, 0,    'pagada',  '2026-03-10', '2026-03-06 11:00:00+00', 'transferencia'),
    (v_gym, a11, act_crof, 3, 2026, 'mensual', 25000, 2500, 'vencida', '2026-03-10', NULL, NULL),
    (v_gym, a13, act_musc, 3, 2026, 'mensual', 18000, 0,    'pagada',  '2026-03-10', '2026-03-08 16:00:00+00', 'efectivo'),
    (v_gym, a14, act_spin, 3, 2026, 'mensual', 16000, 0,    'pagada',  '2026-03-10', '2026-03-10 08:30:00+00', 'transferencia'),
    (v_gym, a14, act_pila, 3, 2026, 'mensual', 22000, 0,    'pagada',  '2026-03-10', '2026-03-10 08:30:00+00', 'transferencia'),
    (v_gym, a15, act_boxe, 3, 2026, 'mensual', 20000, 2000, 'vencida', '2026-03-10', NULL, NULL),
    (v_gym, a17, act_crof, 3, 2026, 'mensual', 25000, 0,    'pagada',  '2026-03-10', '2026-03-04 09:00:00+00', 'efectivo'),
    (v_gym, a17, act_boxe, 3, 2026, 'mensual', 20000, 0,    'pagada',  '2026-03-10', '2026-03-04 09:00:00+00', 'efectivo'),
    (v_gym, a18, act_pila, 3, 2026, 'mensual', 22000, 0,    'pagada',  '2026-03-10', '2026-03-09 15:00:00+00', 'transferencia'),
    (v_gym, a19, act_musc, 3, 2026, 'mensual', 18000, 0,    'pagada',  '2026-03-10', '2026-03-07 13:00:00+00', 'efectivo'),
    (v_gym, a21, act_crof, 3, 2026, 'mensual', 25000, 0,    'pagada',  '2026-03-10', '2026-03-06 17:00:00+00', 'transferencia'),
    (v_gym, a22, act_yoga, 3, 2026, 'mensual', 15000, 0,    'pagada',  '2026-03-10', '2026-03-08 10:00:00+00', 'transferencia'),
    (v_gym, a23, act_musc, 3, 2026, 'mensual', 18000, 0,    'pagada',  '2026-03-10', '2026-03-05 20:00:00+00', 'efectivo'),
    (v_gym, a23, act_boxe, 3, 2026, 'mensual', 20000, 0,    'pagada',  '2026-03-10', '2026-03-05 20:00:00+00', 'efectivo')
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 6. CUOTAS — ABRIL 2026 (vencidas con recargo nivel 1 y 2)
  -- ===========================================================

  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, recargo_nivel, recargo_aplicado_en, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a1, 4, 2026, 'mensual', 25000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-08 14:00:00+00', 'transferencia'),
    (v_gym, a2, 4, 2026, 'mensual', 22000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-09 10:00:00+00', 'efectivo'),
    (v_gym, a3, 4, 2026, 'mensual', 18000, 1800, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL),
    (v_gym, a4, 4, 2026, 'mensual', 30000, 6000, 'vencida', '2026-04-10', 2, '2026-05-01 10:00:00+00', NULL, NULL),
    (v_gym, a5, 4, 2026, 'mensual', 20000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-07 11:00:00+00', 'efectivo')
  ON CONFLICT DO NOTHING;

  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, recargo_nivel, recargo_aplicado_en, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a6,  act_pila, 4, 2026, 'mensual', 22000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-06 10:00:00+00', 'transferencia'),
    (v_gym, a6,  act_yoga, 4, 2026, 'mensual', 15000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-06 10:00:00+00', 'transferencia'),
    (v_gym, a7,  act_musc, 4, 2026, 'mensual', 18000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-05 18:00:00+00', 'efectivo'),
    (v_gym, a7,  act_crof, 4, 2026, 'mensual', 25000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-05 18:00:00+00', 'efectivo'),
    (v_gym, a8,  act_spin, 4, 2026, 'mensual', 16000, 1600, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL),
    (v_gym, a9,  act_boxe, 4, 2026, 'mensual', 20000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-08 14:00:00+00', 'efectivo'),
    (v_gym, a9,  act_musc, 4, 2026, 'mensual', 18000, 1800, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL),
    (v_gym, a10, act_pila, 4, 2026, 'mensual', 22000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-07 12:00:00+00', 'transferencia'),
    (v_gym, a11, act_crof, 4, 2026, 'mensual', 25000, 2500, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL),
    (v_gym, a13, act_musc, 4, 2026, 'mensual', 18000, 3600, 'vencida', '2026-04-10', 2, '2026-05-01 10:00:00+00', NULL, NULL),
    (v_gym, a14, act_spin, 4, 2026, 'mensual', 16000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-09 09:00:00+00', 'transferencia'),
    (v_gym, a14, act_pila, 4, 2026, 'mensual', 22000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-09 09:00:00+00', 'transferencia'),
    (v_gym, a15, act_boxe, 4, 2026, 'mensual', 20000, 2000, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL),
    (v_gym, a16, act_yoga, 4, 2026, 'mensual', 15000, 3000, 'vencida', '2026-04-10', 2, '2026-05-01 10:00:00+00', NULL, NULL),
    (v_gym, a17, act_crof, 4, 2026, 'mensual', 25000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-04 10:00:00+00', 'efectivo'),
    (v_gym, a17, act_boxe, 4, 2026, 'mensual', 20000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-04 10:00:00+00', 'efectivo'),
    (v_gym, a18, act_pila, 4, 2026, 'mensual', 22000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-08 15:00:00+00', 'transferencia'),
    (v_gym, a19, act_musc, 4, 2026, 'mensual', 18000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-07 16:00:00+00', 'efectivo'),
    (v_gym, a21, act_crof, 4, 2026, 'mensual', 25000, 2500, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL),
    (v_gym, a22, act_yoga, 4, 2026, 'mensual', 15000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-06 09:00:00+00', 'transferencia'),
    (v_gym, a23, act_musc, 4, 2026, 'mensual', 18000, 0,    'pagada',  '2026-04-10', NULL, NULL, '2026-04-05 20:00:00+00', 'efectivo'),
    (v_gym, a23, act_boxe, 4, 2026, 'mensual', 20000, 2000, 'vencida', '2026-04-10', 1, '2026-04-21 10:00:00+00', NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 7. CUOTAS — MAYO 2026 (mix: pagadas, vencidas, pendientes)
  -- ===========================================================

  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, recargo_nivel, recargo_aplicado_en, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a1, 5, 2026, 'mensual', 25000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-08 14:00:00+00', 'transferencia'),
    (v_gym, a2, 5, 2026, 'mensual', 22000, 2200, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a3, 5, 2026, 'mensual', 18000, 1800, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a4, 5, 2026, 'mensual', 30000, 3000, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a5, 5, 2026, 'mensual', 20000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-07 11:00:00+00', 'efectivo')
  ON CONFLICT DO NOTHING;

  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, recargo_nivel, recargo_aplicado_en, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a6,  act_pila, 5, 2026, 'mensual', 22000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-09 10:00:00+00', 'transferencia'),
    (v_gym, a6,  act_yoga, 5, 2026, 'mensual', 15000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-09 10:00:00+00', 'transferencia'),
    (v_gym, a7,  act_musc, 5, 2026, 'mensual', 18000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-06 18:00:00+00', 'efectivo'),
    (v_gym, a7,  act_crof, 5, 2026, 'mensual', 25000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-06 18:00:00+00', 'efectivo'),
    (v_gym, a8,  act_spin, 5, 2026, 'mensual', 16000, 1600, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a9,  act_boxe, 5, 2026, 'mensual', 20000, 2000, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a9,  act_musc, 5, 2026, 'mensual', 18000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-08 14:00:00+00', 'efectivo'),
    (v_gym, a10, act_pila, 5, 2026, 'mensual', 22000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-07 12:00:00+00', 'transferencia'),
    (v_gym, a11, act_crof, 5, 2026, 'mensual', 25000, 2500, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a13, act_musc, 5, 2026, 'mensual', 18000, 1800, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a14, act_spin, 5, 2026, 'mensual', 16000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-10 08:00:00+00', 'transferencia'),
    (v_gym, a14, act_pila, 5, 2026, 'mensual', 22000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-10 08:00:00+00', 'transferencia'),
    (v_gym, a15, act_boxe, 5, 2026, 'mensual', 20000, 2000, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a16, act_yoga, 5, 2026, 'mensual', 15000, 1500, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a17, act_crof, 5, 2026, 'mensual', 25000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-05 10:00:00+00', 'efectivo'),
    (v_gym, a17, act_boxe, 5, 2026, 'mensual', 20000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-05 10:00:00+00', 'efectivo'),
    (v_gym, a18, act_pila, 5, 2026, 'mensual', 22000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-09 15:00:00+00', 'transferencia'),
    (v_gym, a19, act_musc, 5, 2026, 'mensual', 18000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-08 16:00:00+00', 'efectivo'),
    (v_gym, a21, act_crof, 5, 2026, 'mensual', 25000, 2500, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL),
    (v_gym, a22, act_yoga, 5, 2026, 'mensual', 15000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-07 09:00:00+00', 'transferencia'),
    (v_gym, a23, act_musc, 5, 2026, 'mensual', 18000, 0,    'pagada',  '2026-05-10', NULL, NULL, '2026-05-06 20:00:00+00', 'efectivo'),
    (v_gym, a23, act_boxe, 5, 2026, 'mensual', 20000, 2000, 'vencida', '2026-05-10', 1, '2026-05-21 10:00:00+00', NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 8. CUOTAS — JUNIO 2026 (mes actual — estados variados)
  -- ===========================================================

  -- Legacy sin actividad
  INSERT INTO cuotas (gym_id, alumno_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    (v_gym, a1, 6, 2026, 'mensual', 25000, 0, 'pagada',   '2026-06-10', '2026-06-03 14:00:00+00', 'transferencia'),
    (v_gym, a2, 6, 2026, 'mensual', 22000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    (v_gym, a3, 6, 2026, 'mensual', 18000, 0, 'vencida',   '2026-06-01', NULL, NULL),
    (v_gym, a4, 6, 2026, 'mensual', 30000, 0, 'vencida',   '2026-06-01', NULL, NULL),
    (v_gym, a5, 6, 2026, 'mensual', 20000, 0, 'pendiente', '2026-06-10', NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- Con actividades — distintos estados
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, monto_base, monto_recargo, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    -- Valentina: Pilates pendiente, Yoga pendiente
    (v_gym, a6,  act_pila, 6, 2026, 'mensual', 22000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    (v_gym, a6,  act_yoga, 6, 2026, 'mensual', 15000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Sebastián: ambas pagadas
    (v_gym, a7,  act_musc, 6, 2026, 'mensual', 18000, 0, 'pagada',   '2026-06-10', '2026-06-02 18:00:00+00', 'efectivo'),
    (v_gym, a7,  act_crof, 6, 2026, 'mensual', 25000, 0, 'pagada',   '2026-06-10', '2026-06-02 18:00:00+00', 'efectivo'),
    -- Lucía: Spinning pendiente
    (v_gym, a8,  act_spin, 6, 2026, 'mensual', 16000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Matías: Boxeo vencida, Musculación vencida
    (v_gym, a9,  act_boxe, 6, 2026, 'mensual', 20000, 0, 'vencida',  '2026-06-01', NULL, NULL),
    (v_gym, a9,  act_musc, 6, 2026, 'mensual', 18000, 0, 'vencida',  '2026-06-01', NULL, NULL),
    -- Camila: Pilates pagada
    (v_gym, a10, act_pila, 6, 2026, 'mensual', 22000, 0, 'pagada',   '2026-06-10', '2026-06-04 12:00:00+00', 'transferencia'),
    -- Agustín: CrossFit pendiente
    (v_gym, a11, act_crof, 6, 2026, 'mensual', 25000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Nicolás: Musculación vencida
    (v_gym, a13, act_musc, 6, 2026, 'mensual', 18000, 0, 'vencida',  '2026-06-01', NULL, NULL),
    -- Paula: Spinning + Pilates pagadas
    (v_gym, a14, act_spin, 6, 2026, 'mensual', 16000, 0, 'pagada',   '2026-06-10', '2026-06-05 08:00:00+00', 'transferencia'),
    (v_gym, a14, act_pila, 6, 2026, 'mensual', 22000, 0, 'pagada',   '2026-06-10', '2026-06-05 08:00:00+00', 'transferencia'),
    -- Facundo: Boxeo pendiente
    (v_gym, a15, act_boxe, 6, 2026, 'mensual', 20000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Marina: Yoga vencida
    (v_gym, a16, act_yoga, 6, 2026, 'mensual', 15000, 0, 'vencida',  '2026-06-01', NULL, NULL),
    -- Rodrigo: CrossFit pendiente, Boxeo pendiente
    (v_gym, a17, act_crof, 6, 2026, 'mensual', 25000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    (v_gym, a17, act_boxe, 6, 2026, 'mensual', 20000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Antonella: Pilates pagada
    (v_gym, a18, act_pila, 6, 2026, 'mensual', 22000, 0, 'pagada',   '2026-06-10', '2026-06-03 15:00:00+00', 'transferencia'),
    -- Tomás: Musculación pendiente
    (v_gym, a19, act_musc, 6, 2026, 'mensual', 18000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Ezequiel: CrossFit vencida
    (v_gym, a21, act_crof, 6, 2026, 'mensual', 25000, 0, 'vencida',  '2026-06-01', NULL, NULL),
    -- Victoria: Yoga pagada
    (v_gym, a22, act_yoga, 6, 2026, 'mensual', 15000, 0, 'pagada',   '2026-06-10', '2026-06-01 09:00:00+00', 'transferencia'),
    -- Ignacio: Musculación pendiente, Boxeo pendiente
    (v_gym, a23, act_musc, 6, 2026, 'mensual', 18000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    (v_gym, a23, act_boxe, 6, 2026, 'mensual', 20000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    -- Julieta: Pilates pendiente, Spinning pendiente
    (v_gym, a24, act_pila, 6, 2026, 'mensual', 22000, 0, 'pendiente', '2026-06-10', NULL, NULL),
    (v_gym, a24, act_spin, 6, 2026, 'mensual', 16000, 0, 'pendiente', '2026-06-10', NULL, NULL)
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 9. CUOTAS ESPECIALES (clase_suelta, evento, inscripción)
  -- ===========================================================
  INSERT INTO cuotas (gym_id, alumno_id, actividad_id, mes, anio, tipo, descripcion, monto_base, estado, fecha_vencimiento, fecha_pago, metodo_pago)
  VALUES
    -- Clases sueltas Junio
    (v_gym, a2,  act_spin, 6, 2026, 'clase_suelta', 'Clase de prueba Spinning',     3500, 'pagada',  '2026-06-10', '2026-06-02 09:00:00+00', 'efectivo'),
    (v_gym, a5,  act_boxe, 6, 2026, 'clase_suelta', 'Clase de prueba Boxeo',        4000, 'pagada',  '2026-06-10', '2026-06-03 11:00:00+00', 'efectivo'),
    (v_gym, a12, act_crof, 6, 2026, 'clase_suelta', 'Trial CrossFit x3 clases',     7500, 'pendiente','2026-06-10', NULL, NULL),
    (v_gym, a20, act_pila, 6, 2026, 'clase_suelta', 'Clase de prueba Pilates',      3500, 'pendiente','2026-06-10', NULL, NULL),
    -- Evento especial
    (v_gym, a7,  NULL,     6, 2026, 'evento',       'Torneo interno Junio 2026',    5000, 'pagada',  '2026-06-15', '2026-06-05 17:00:00+00', 'efectivo'),
    (v_gym, a9,  NULL,     6, 2026, 'evento',       'Torneo interno Junio 2026',    5000, 'pendiente','2026-06-15', NULL, NULL),
    (v_gym, a15, NULL,     6, 2026, 'evento',       'Torneo interno Junio 2026',    5000, 'pendiente','2026-06-15', NULL, NULL),
    -- Inscripciones nuevos alumnos (mayo)
    (v_gym, a20, act_spin, 5, 2026, 'inscripcion',  'Inscripción Spinning',         8000, 'pagada',  '2026-05-10', '2026-05-02 10:00:00+00', 'transferencia'),
    (v_gym, a24, act_pila, 4, 2026, 'inscripcion',  'Inscripción Pilates',          8000, 'pagada',  '2026-04-10', '2026-04-01 09:00:00+00', 'transferencia'),
    (v_gym, a24, act_spin, 4, 2026, 'inscripcion',  'Inscripción Spinning',         8000, 'pagada',  '2026-04-10', '2026-04-01 09:00:00+00', 'transferencia')
  ON CONFLICT DO NOTHING;

  -- ===========================================================
  -- 10. PAGOS (audit trail de cuotas pagadas — idempotente)
  -- ===========================================================
  INSERT INTO pagos (gym_id, cuota_id, alumno_id, monto, metodo, created_at)
  SELECT
    c.gym_id,
    c.id,
    c.alumno_id,
    c.monto_total,
    c.metodo_pago,
    c.fecha_pago
  FROM cuotas c
  WHERE c.gym_id = v_gym
    AND c.estado = 'pagada'
    AND c.fecha_pago IS NOT NULL
    AND c.metodo_pago IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pagos p WHERE p.cuota_id = c.id
    );

  -- ===========================================================
  -- 11. CRON LOGS (historial simulado)
  -- ===========================================================
  INSERT INTO cron_logs (gym_id, tipo, es_dispatcher, gyms_total, gyms_ok, gyms_error, items_creados, duracion_ms, created_at)
  VALUES
    -- Dispatchers (gym_id NULL = aplica a todos)
    (NULL, 'generar_cuotas',   true,  3, 3, 0, 72, 1840, '2026-06-01 03:05:12+00'),
    (NULL, 'aplicar_recargos', true,  3, 3, 0, 18, 920,  '2026-06-01 03:10:08+00'),
    (NULL, 'enviar_avisos',    true,  3, 2, 1, 14, 3200, '2026-06-02 09:05:33+00'),
    (NULL, 'generar_cuotas',   true,  3, 3, 0, 0,  780,  '2026-06-02 03:05:09+00'),
    (NULL, 'aplicar_recargos', true,  3, 3, 0, 5,  1100, '2026-06-04 03:10:14+00'),
    -- Workers del gym actual
    (v_gym, 'generar_cuotas',   false, NULL, NULL, NULL, 25, 420,  '2026-06-01 03:05:14+00'),
    (v_gym, 'aplicar_recargos', false, NULL, NULL, NULL, 7,  310,  '2026-06-01 03:10:10+00'),
    (v_gym, 'enviar_avisos',    false, NULL, NULL, NULL, 8,  1800, '2026-06-02 09:05:36+00'),
    (v_gym, 'aplicar_recargos', false, NULL, NULL, NULL, 2,  280,  '2026-06-04 03:10:16+00');

  RAISE NOTICE '✓ Seed ampliado completado — gym: %', v_gym;
  RAISE NOTICE '  Actividades: 6 | Alumnos: 25 (24 activos) | Meses: Feb–Jun 2026';
END $$;
