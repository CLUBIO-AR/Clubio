-- Configuración global del panel superadmin.
-- Tabla singleton (solo 1 fila garantizada por el CHECK).
CREATE TABLE IF NOT EXISTS admin_settings (
  id        boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  notification_email text NOT NULL DEFAULT 'contacto@clubio.com.ar',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO admin_settings DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

-- Solo service-role puede leer/escribir
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_deny_all" ON admin_settings FOR ALL USING (false);
