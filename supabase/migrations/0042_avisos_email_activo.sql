-- Separa "mandar avisos de cuota por email" de "el gym usa email" (email_activo).
-- Así un gym puede mandar los avisos solo por WhatsApp y seguir mandando por email
-- la confirmación de pago. Por defecto true: no cambia nada para los gyms actuales.
alter table gym_config
  add column if not exists avisos_email_activo boolean not null default true;
