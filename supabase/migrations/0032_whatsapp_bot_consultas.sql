-- Respuestas automáticas para consultas de números que no son alumnos (bot de WhatsApp).
-- Apagado por defecto: cada gym lo activa desde Configuración → WhatsApp.
alter table gym_config
  add column if not exists whatsapp_bot_activo boolean not null default false,
  add column if not exists whatsapp_bot_bienvenida text,
  add column if not exists whatsapp_bot_info text;
