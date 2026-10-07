-- Inbox de WhatsApp en tiempo real: publica los cambios de mensajes_whatsapp en Supabase
-- Realtime. El navegador se suscribe con la sesión del usuario, así que RLS
-- (gym_isolation) sigue aplicando: cada gym recibe solo sus propios mensajes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensajes_whatsapp'
  ) then
    alter publication supabase_realtime add table public.mensajes_whatsapp;
  end if;
end $$;
