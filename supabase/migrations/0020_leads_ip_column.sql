-- Agregar columna ip a leads para rate limiting por IP (máx 5 solicitudes/hora por IP).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ip TEXT;
