-- Habilitar RLS en cuota_lotes (faltaba desde 0008b_cuota_lotes.sql)
-- La tabla existía sin RLS, dejando abierta la lectura directa vía anon/authenticated.
ALTER TABLE cuota_lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_isolation"
  ON cuota_lotes
  USING (gym_id = get_user_gym_id());
