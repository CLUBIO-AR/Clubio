-- Bot de WhatsApp: estado de cuenta más seguro, "Ya transferí" con comprobante y
-- "Hablar con alguien" con handoff real (ver PROMPT_BOT_ESTADO_CUENTA).

-- 1. Estado de la conversación con el bot, por gym y teléfono.
--    estado = 'awaiting_receipt' mientras esperamos la foto/PDF del comprobante
--    (expira_at = 30 min). handoff_hasta: mientras esté en el futuro, el bot no responde
--    mensajes libres de ese número (lo atiende una persona del gym).
create table if not exists whatsapp_bot_estado (
  gym_id        uuid not null references gyms(id),
  telefono      text not null,
  estado        text check (estado in ('awaiting_receipt')),
  datos         jsonb not null default '{}'::jsonb,
  expira_at     timestamptz,
  handoff_hasta timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (gym_id, telefono)
);

alter table whatsapp_bot_estado enable row level security;

-- Lo escriben el webhook y los crons (service_role). El staff solo lo lee.
create policy "gym_isolation_select" on whatsapp_bot_estado
  for select using (gym_id = get_user_gym_id());

-- 2. Comprobantes de transferencia que mandan los alumnos por WhatsApp.
--    No marcan nada como pagado: el staff los confirma o rechaza desde Pagos.
create table if not exists comprobantes_pago (
  id              uuid primary key default gen_random_uuid(),
  gym_id          uuid not null references gyms(id),
  alumno_id       uuid not null references alumnos(id),
  telefono        text not null,
  cuota_ids       uuid[] not null default '{}',
  storage_path    text not null,
  mime_type       text,
  wa_message_id   text unique,
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'rechazado')),
  revisado_por    uuid,
  revisado_at     timestamptz,
  motivo_rechazo  text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists idx_comprobantes_pago_pendientes
  on comprobantes_pago(gym_id, created_at)
  where estado = 'pendiente' and deleted_at is null;

-- Para saber rápido si una cuota tiene un comprobante en revisión (no re-avisar).
create index if not exists idx_comprobantes_pago_cuotas on comprobantes_pago using gin (cuota_ids);

alter table comprobantes_pago enable row level security;

create policy "gym_isolation_select" on comprobantes_pago
  for select using (gym_id = get_user_gym_id());
create policy "gym_isolation_update" on comprobantes_pago
  for update using (gym_id = get_user_gym_id()) with check (gym_id = get_user_gym_id());

-- 3. Bucket privado para las imágenes/PDF. Ruta: receipts/{gym_id}/{alumno_id}/{archivo}.
--    Sube el webhook con service_role; lee solo el staff del gym dueño de la carpeta.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

create policy "comprobantes_staff_read" on storage.objects
  for select
  using (
    bucket_id = 'comprobantes'
    and (storage.foldername(name))[1] = 'receipts'
    and (storage.foldername(name))[2] = get_user_gym_id()::text
  );

-- 4. CBU/CVU para mostrar junto al alias (el alumno verifica a quién transfiere).
alter table gym_config
  add column if not exists transferencia_cbu text;
