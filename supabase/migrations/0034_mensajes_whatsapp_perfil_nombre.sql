-- Nombre de perfil de WhatsApp de quien escribe (Meta lo manda en value.contacts[].profile.name).
-- Es el nombre que la persona puso en su WhatsApp: sirve para mostrar algo más que el
-- número en las consultas de quien todavía no es alumno.
alter table mensajes_whatsapp
  add column if not exists perfil_nombre text;
