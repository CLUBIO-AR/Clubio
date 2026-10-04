-- Plantilla de WhatsApp alternativa para cuando el gym está en modo transferencia
-- (gym_config.email_modo = 'transferencia'): sin botón de pago dinámico, muestra el
-- alias como variable de texto en el body.
alter table gym_config
  add column if not exists whatsapp_template_transferencia text;
