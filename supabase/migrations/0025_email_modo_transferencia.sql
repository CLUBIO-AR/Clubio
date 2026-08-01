-- Permite a un gym avisar por email pidiendo transferencia directa (alias) en vez del
-- link de pago MP, mientras se resuelve el tema de comisiones de agosto 2026.
-- Y permite restringir el checkout de MP a "dinero en cuenta" únicamente.
alter table gym_config
  add column if not exists email_modo text not null default 'link' check (email_modo in ('link', 'transferencia')),
  add column if not exists transferencia_alias text,
  add column if not exists transferencia_titular text,
  add column if not exists transferencia_banco text,
  add column if not exists mp_solo_dinero_cuenta boolean not null default false;
