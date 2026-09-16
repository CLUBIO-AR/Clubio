-- Permite a un gym conectar una hoja de Google Sheets (ej: respuestas de un
-- Google Form) como fuente de alumnos nuevos. NULL = feature desactivada.
-- Ver app/api/cron/workers/importar-alumnos-sheet-gym/route.ts.
ALTER TABLE gym_config ADD COLUMN google_sheet_id TEXT;
ALTER TABLE gym_config ADD COLUMN google_sheet_gid INTEGER NOT NULL DEFAULT 0;
