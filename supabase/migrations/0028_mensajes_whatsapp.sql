-- Inbox propio de WhatsApp: guarda los mensajes entrantes (recibidos por el webhook)
-- y salientes (mandados desde el dashboard o por los avisos automáticos) para poder
-- armar una pantalla de chat dentro de Clubio sin depender de un inbox externo.
CREATE TABLE mensajes_whatsapp (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       UUID NOT NULL REFERENCES gyms(id),
  alumno_id    UUID REFERENCES alumnos(id),
  telefono     TEXT NOT NULL,
  direccion    TEXT NOT NULL CHECK (direccion IN ('entrante', 'saliente')),
  cuerpo       TEXT NOT NULL,
  wa_message_id TEXT,
  estado       TEXT NOT NULL DEFAULT 'recibido', -- recibido | enviado | entregado | leido | error
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mensajes_whatsapp_gym_telefono ON mensajes_whatsapp(gym_id, telefono, created_at);
CREATE UNIQUE INDEX idx_mensajes_whatsapp_wa_message_id ON mensajes_whatsapp(wa_message_id) WHERE wa_message_id IS NOT NULL;

ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_isolation" ON mensajes_whatsapp
  USING (gym_id = get_user_gym_id());
