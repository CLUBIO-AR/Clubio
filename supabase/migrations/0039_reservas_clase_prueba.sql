-- Bot de WhatsApp: reservas de clase de prueba con cupo, cambiar/cancelar y recordatorio
-- (ver PROMPT_BOT_CONSULTAS). Antes la reserva era solo un mensaje sin leer en el inbox.

-- 1. Reservas. inicio = fecha y hora de la clase (Argentina, guardada como timestamptz).
create table if not exists reservas_prueba (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references gyms(id),
  actividad_id     uuid not null references actividades(id),
  telefono         text not null,
  nombre           text,
  inicio           timestamptz not null,
  estado           text not null default 'activa' check (estado in ('activa', 'cancelada')),
  recordatorio_at  timestamptz,
  cancelada_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_reservas_prueba_cupo
  on reservas_prueba(actividad_id, inicio) where estado = 'activa';
create index if not exists idx_reservas_prueba_recordatorio
  on reservas_prueba(inicio) where estado = 'activa' and recordatorio_at is null;
create index if not exists idx_reservas_prueba_gym on reservas_prueba(gym_id, inicio);

alter table reservas_prueba enable row level security;
-- Las escribe el bot (service_role); el staff las ve.
create policy "gym_isolation_select" on reservas_prueba
  for select using (gym_id = get_user_gym_id());

-- 2. Cupo de clase de prueba por horario (null = sin límite).
alter table actividades
  add column if not exists cupo_prueba integer check (cupo_prueba is null or cupo_prueba >= 0);

-- 3. Datos prácticos para la confirmación y plantilla del recordatorio.
alter table gym_config
  add column if not exists whatsapp_bot_recomendaciones text,
  add column if not exists whatsapp_bot_latitud double precision,
  add column if not exists whatsapp_bot_longitud double precision,
  add column if not exists whatsapp_template_recordatorio_prueba text;

-- 4. Reserva atómica: bloquea la actividad, cuenta las reservas activas de ese horario y
--    solo inserta si queda lugar. Devuelve el id, o null si se llenó.
create or replace function reservar_clase_prueba(
  p_gym_id       uuid,
  p_actividad_id uuid,
  p_telefono     text,
  p_nombre       text,
  p_inicio       timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_cupo     integer;
  v_ocupados integer;
  v_id       uuid;
begin
  select cupo_prueba into v_cupo
  from actividades
  where id = p_actividad_id and gym_id = p_gym_id and deleted_at is null
  for update;
  if not found then
    raise exception 'actividad_not_found' using errcode = 'P0001';
  end if;

  -- La misma persona eligiendo el mismo horario dos veces: misma reserva.
  select id into v_id from reservas_prueba
  where actividad_id = p_actividad_id and inicio = p_inicio and telefono = p_telefono and estado = 'activa'
  limit 1;
  if v_id is not null then
    return v_id;
  end if;

  if v_cupo is not null then
    select count(*) into v_ocupados from reservas_prueba
    where actividad_id = p_actividad_id and inicio = p_inicio and estado = 'activa';
    if v_ocupados >= v_cupo then
      return null;
    end if;
  end if;

  insert into reservas_prueba (gym_id, actividad_id, telefono, nombre, inicio)
  values (p_gym_id, p_actividad_id, p_telefono, p_nombre, p_inicio)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function reservar_clase_prueba(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
