-- Avisos en fechas fijas de calendario (ej: días 1, 5 y 10 de cada mes), en vez de la
-- ventana relativa "N días antes del vencimiento" que usa el cron por defecto. NULL/vacío
-- = usa el comportamiento relativo existente (sin cambios para los gyms que no lo configuren).
ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS dias_aviso_fijos INTEGER[];
