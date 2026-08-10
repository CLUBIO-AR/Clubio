-- Día fijo opcional (calendario) para un último aviso post-vencimiento con
-- el recargo ya aplicado, avisando que si no abonan quedan dados de baja y
-- tienen que pedir el alta de nuevo el mes siguiente. NULL = no se envía.
ALTER TABLE gym_config ADD COLUMN dia_ultimo_aviso INTEGER;
