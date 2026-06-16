-- Función atómica para registrar un gym completo en una sola transacción.
-- La creación del usuario Auth (supabase.auth.admin.createUser) ocurre en
-- la app ANTES de llamar esta función; si la función falla, la app hace
-- deleteUser como único punto de cleanup externo.
--
-- SECURITY DEFINER: necesario para bypassear RLS durante el registro
-- (no hay sesión autenticada aún).
-- SET search_path fija el search path para prevenir ataques de hijacking.

CREATE OR REPLACE FUNCTION crear_gym_completo(
  p_user_id      UUID,
  p_nombre       TEXT,
  p_slug         TEXT,
  p_email        TEXT,
  p_nombre_admin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_gym_id            UUID;
  v_fecha_inicio      DATE := current_date;
  v_fecha_vencimiento DATE := current_date + INTERVAL '30 days';
BEGIN
  -- Slug único — dentro de la TX para evitar TOCTOU
  IF EXISTS (SELECT 1 FROM gyms WHERE slug = p_slug AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'slug_taken' USING ERRCODE = 'unique_violation';
  END IF;

  -- Gym
  INSERT INTO gyms (nombre, slug, email_contacto)
  VALUES (p_nombre, p_slug, p_email)
  RETURNING id INTO v_gym_id;

  -- Usuario owner
  INSERT INTO gym_usuarios (id, gym_id, nombre, rol)
  VALUES (p_user_id, v_gym_id, p_nombre_admin, 'owner');

  -- Config por defecto (email activo, WhatsApp desactivado hasta que el gym lo configure)
  INSERT INTO gym_config (gym_id, email_activo, whatsapp_activo)
  VALUES (v_gym_id, true, false);

  -- Licencia basic — trial 30 días
  INSERT INTO licencias (gym_id, plan, fecha_inicio, fecha_vencimiento, activa, es_trial, trial_hasta)
  VALUES (v_gym_id, 'basic', v_fecha_inicio, v_fecha_vencimiento, true, true, v_fecha_vencimiento);

  -- Sucursal principal
  INSERT INTO sucursales (gym_id, nombre, es_principal)
  VALUES (v_gym_id, 'Principal', true);

  RETURN v_gym_id;
END;
$$;

-- Solo el rol service_role puede invocarla (la app usa el admin client)
REVOKE ALL ON FUNCTION crear_gym_completo(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crear_gym_completo(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
