-- DNI opcional: hay gyms (ej. BOX CLUB) que no piden DNI al inscribir alumnos.
-- Postgres permite múltiples NULL bajo un UNIQUE compuesto sin conflicto,
-- así que UNIQUE(gym_id, dni) sigue funcionando igual para los alumnos que sí lo cargan.
ALTER TABLE alumnos ALTER COLUMN dni DROP NOT NULL;
