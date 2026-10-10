-- Canal de los avisos automáticos de cuota: email, WhatsApp o ambos.
-- El email ya se controla con email_activo. Para WhatsApp no alcanza con whatsapp_activo,
-- porque eso también prende el inbox y el bot: un gym puede querer el inbox sin mandar
-- los avisos de cuota por WhatsApp. Por defecto true, así no cambia nada para quien ya
-- tenía WhatsApp conectado.
alter table gym_config
  add column if not exists avisos_whatsapp_activo boolean not null default true;
