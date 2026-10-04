-- Trackea si el gym ya vio un mensaje entrante, para poder filtrar conversaciones
-- por leídas/no leídas en el inbox del dashboard.
alter table mensajes_whatsapp
  add column if not exists leido boolean not null default true;

-- Los mensajes salientes no aplican (siempre quedan "leídos" desde la perspectiva
-- del gym); solo los entrantes arrancan en false — lo setea el webhook al insertar.
create index if not exists idx_mensajes_whatsapp_no_leidos
  on mensajes_whatsapp(gym_id, telefono)
  where direccion = 'entrante' and leido = false;
