-- Notificaciones push (Web Push) del panel: un registro por navegador/dispositivo en el
-- que un usuario del gym activó "Avisarme en este dispositivo". El servidor (webhook de
-- WhatsApp) les manda un push cuando entra un mensaje, aunque el navegador esté cerrado.
create table if not exists push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id),
  usuario_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  ultimo_uso timestamptz
);

create index if not exists idx_push_suscripciones_gym on push_suscripciones(gym_id);

alter table push_suscripciones enable row level security;

-- Cada usuario ve y maneja solo sus propios dispositivos, dentro de su gym.
create policy "propias" on push_suscripciones
  for all
  using (usuario_id = auth.uid() and gym_id = get_user_gym_id())
  with check (usuario_id = auth.uid() and gym_id = get_user_gym_id());
