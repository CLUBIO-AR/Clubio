-- Permite marcar una inscripción alumno-actividad como bonificada:
-- no se genera cuota mensual para esa actividad (ni aviso de cobro),
-- pero el alumno sigue contando en el total de inscriptos de la actividad.
ALTER TABLE alumno_actividades ADD COLUMN bonificada BOOLEAN NOT NULL DEFAULT false;
