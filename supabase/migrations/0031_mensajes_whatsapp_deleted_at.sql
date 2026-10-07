-- Soft delete de conversaciones en el inbox de WhatsApp (acción "Eliminar" con
-- selección múltiple). Regla del proyecto: nunca DELETE físico en datos de clientes.
-- Si el alumno vuelve a escribir, la conversación reaparece solo con los mensajes nuevos.
-- (0031 y no 0030: la 0030 está reservada para la rama feature/qr-mp-a-demanda.)
alter table mensajes_whatsapp
  add column if not exists deleted_at timestamptz;

create index if not exists idx_mensajes_whatsapp_vivos
  on mensajes_whatsapp(gym_id, telefono, created_at)
  where deleted_at is null;
