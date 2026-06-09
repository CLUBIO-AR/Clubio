-- Desnormalizar email en gym_usuarios para evitar N+1 queries a auth.users
-- en el panel de superadmin. El email se sincroniza al crear el usuario;
-- auth.users sigue siendo la fuente de verdad para autenticación.
ALTER TABLE gym_usuarios ADD COLUMN IF NOT EXISTS email text;

-- Backfill desde auth.users (acceso al schema auth disponible en migraciones)
UPDATE gym_usuarios gu
SET email = au.email
FROM auth.users au
WHERE au.id = gu.id
  AND gu.email IS NULL;
