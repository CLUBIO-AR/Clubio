-- Avisos de cuota por WhatsApp: registro de lo enviado para no duplicar (ver
-- PROMPT_AVISO_CUOTA) y marca en el alumno cuando Meta no pudo entregar el mensaje.

-- Un aviso por cuota y etapa. etapa = "<tipo>:<días respecto del vencimiento>", ej.
-- "previo:3", "hoy:0", "vencida:-3". Si el cron corre dos veces el mismo día, el índice
-- único impide el segundo envío.
create table if not exists avisos_whatsapp_enviados (
  id             uuid primary key default gen_random_uuid(),
  gym_id         uuid not null references gyms(id),
  alumno_id      uuid not null references alumnos(id),
  cuota_id       uuid not null references cuotas(id),
  etapa          text not null,
  plantilla      text,
  wa_message_id  text,
  estado         text not null default 'enviado', -- enviado | entregado | leido | error
  error_detail   text,
  created_at     timestamptz not null default now(),
  unique (cuota_id, etapa)
);

create index if not exists idx_avisos_whatsapp_alumno_dia on avisos_whatsapp_enviados(gym_id, alumno_id, created_at);
create index if not exists idx_avisos_whatsapp_wamid on avisos_whatsapp_enviados(wa_message_id) where wa_message_id is not null;

alter table avisos_whatsapp_enviados enable row level security;
create policy "gym_isolation_select" on avisos_whatsapp_enviados
  for select using (gym_id = get_user_gym_id());

-- Cuando un aviso falla en Meta (número inválido, sin WhatsApp…), el gym lo ve en la ficha.
alter table alumnos
  add column if not exists whatsapp_error text,
  add column if not exists whatsapp_error_at timestamptz;
