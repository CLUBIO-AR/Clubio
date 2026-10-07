-- Datos de cada actividad para el bot de WhatsApp: descripción corta, horarios semanales y
-- si acepta clase de prueba. horarios = [{"dias":[1,3,5],"hora":"18:00"}, ...] con
-- dias 0=domingo … 6=sábado y hora en horario de Argentina.
alter table actividades
  add column if not exists descripcion text,
  add column if not exists horarios jsonb not null default '[]'::jsonb,
  add column if not exists clase_prueba boolean not null default true;
