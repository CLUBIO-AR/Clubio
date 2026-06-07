-- =============================================
-- Permitir notificaciones sin alumno asociado
-- (ej. emails de prueba/sistema enviados desde
-- el panel de configuración de crons)
-- =============================================

ALTER TABLE notificaciones_log ALTER COLUMN alumno_id DROP NOT NULL;
