-- Modo alternativo de desactivación por mora: en vez de un número fijo de días
-- vencida (dias_mora_desactivacion), desactiva al alumno apenas arranca el mes
-- siguiente al de la cuota impaga — sin importar si ese mes tiene 28, 30 o 31 días.
ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS mora_desactivar_mes_siguiente BOOLEAN NOT NULL DEFAULT false;
