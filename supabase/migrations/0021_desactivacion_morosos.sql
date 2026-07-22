-- Desactivación automática de alumnos morosos (configurable por gym).
-- dias_mora_desactivacion: NULL = feature desactivada. Si está seteado, un alumno
-- se desactiva automáticamente cuando alguna de sus cuotas lleva esa cantidad de
-- días vencida (mismo patrón que recargo_1_dias/recargo_2_dias).
ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS dias_mora_desactivacion INTEGER;

-- Distingue una baja automática por mora de una baja manual del admin, para saber
-- si corresponde reactivar automáticamente al alumno cuando paga.
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS desactivado_por_mora BOOLEAN NOT NULL DEFAULT false;

-- Evita que una misma cuota vencida dispare la desactivación más de una vez
-- (idempotencia, mismo patrón que recargo_nivel).
ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS desactivo_alumno BOOLEAN NOT NULL DEFAULT false;
