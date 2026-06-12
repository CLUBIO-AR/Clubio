-- Plan 'plus' eliminado del catálogo activo en junio 2026.
-- Se mantiene el valor 'plus' en el ENUM plan_tipo_v2 para preservar
-- la integridad referencial de gyms legacy. No se migran datos existentes.
-- Nuevas licencias solo pueden ser 'basic' o 'multi'.

-- Comentario de auditoría en la tabla de licencias
COMMENT ON COLUMN licencias.plan IS
  'Valores activos: basic | multi. Valor legacy: plus (solo gyms existentes pre-junio-2026, no se emite más).';
