-- Agregar filtro activo=true a get_user_gym_id() para que usuarios desactivados
-- no puedan leer datos de su ex-gym vía RLS aunque la app los bloquee a nivel layout.
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT gym_id
  FROM gym_usuarios
  WHERE id = auth.uid()
    AND activo = true
$$;
