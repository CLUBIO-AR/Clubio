-- =============================================
-- Branding de emails a alumnos: logo del gym,
-- color de acento y plantillas personalizables
-- =============================================

-- Color de acento de los emails a alumnos. NULL = usar el verde de CLUBIO.
-- (No reutilizamos gym_config.color_primario/color_secundario: existen desde
-- 0001 con default '#000000'/'#ffffff' pero nunca se usaron en ningún lado —
-- pasarlos tal cual pintaría de negro los emails de todos los gyms existentes.)
ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS email_color_acento TEXT;

-- Plantillas personalizadas de asunto/cuerpo por tipo de notificación.
-- NULL/ausente = usar el copy por defecto de CLUBIO.
ALTER TABLE gym_config ADD COLUMN IF NOT EXISTS email_templates JSONB;

-- =============================================
-- Bucket de Storage para logos de gyms
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-logos', 'gym-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Lectura pública (los logos se embeben en emails que llegan a inboxes externos).
CREATE POLICY "gym_logos_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'gym-logos');

-- Escritura scoped por gym: cada gym solo puede escribir en su propia carpeta
-- gym-logos/{gym_id}/..., usando el mismo helper get_user_gym_id() que las
-- políticas gym_isolation del resto del esquema (ver 0001_initial.sql).
CREATE POLICY "gym_logos_owner_write" ON storage.objects
  FOR ALL
  USING (bucket_id = 'gym-logos' AND (storage.foldername(name))[1] = get_user_gym_id()::text)
  WITH CHECK (bucket_id = 'gym-logos' AND (storage.foldername(name))[1] = get_user_gym_id()::text);
