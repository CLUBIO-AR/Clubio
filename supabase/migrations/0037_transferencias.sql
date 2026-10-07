-- Cobro por transferencia con alias/CVU por alumno (la plata va directo a la cuenta del
-- gym; CLUBIO solo recibe el aviso del proveedor y registra el pago).
--
-- cuentas_cobro_alumno: el alias/CVU que el proveedor le asigna a cada alumno.
-- transferencias: cada transferencia que avisa el proveedor (bandeja de entrada).
-- imputar_transferencia(): reparte la plata en las cuotas abiertas del alumno, de la más
--   vieja a la más nueva, aceptando pagos parciales. Es atómica e idempotente.

create table if not exists cuentas_cobro_alumno (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id),
  alumno_id uuid not null references alumnos(id),
  proveedor text not null,
  cvu text,
  alias text,
  external_id text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (cvu is not null or alias is not null)
);
create unique index if not exists uq_cuentas_cobro_cvu on cuentas_cobro_alumno(proveedor, cvu) where cvu is not null and deleted_at is null;
create unique index if not exists uq_cuentas_cobro_alias on cuentas_cobro_alumno(proveedor, lower(alias)) where alias is not null and deleted_at is null;
create index if not exists idx_cuentas_cobro_alumno on cuentas_cobro_alumno(gym_id, alumno_id);

alter table cuentas_cobro_alumno enable row level security;
create policy "gym_isolation" on cuentas_cobro_alumno for all
  using (gym_id = get_user_gym_id()) with check (gym_id = get_user_gym_id());

create table if not exists transferencias (
  id uuid primary key default gen_random_uuid(),
  -- null solo si llegó a una cuenta que no conocemos (la ve CLUBIO, no un gym).
  gym_id uuid references gyms(id),
  proveedor text not null,
  external_id text not null,
  cuenta_cobro_id uuid references cuentas_cobro_alumno(id),
  alumno_id uuid references alumnos(id),
  cvu_destino text,
  alias_destino text,
  monto numeric(12,2) not null check (monto > 0),
  fecha timestamptz not null,
  pagador_nombre text,
  pagador_cuit text,
  concepto text,
  -- pendiente: recién llegada · imputada: aplicada completa a cuotas · saldo_a_favor: sobró
  -- plata después de cubrir todo · sin_asignar: no se sabe de qué alumno es.
  estado text not null default 'pendiente' check (estado in ('pendiente', 'imputada', 'saldo_a_favor', 'sin_asignar')),
  monto_imputado numeric(12,2) not null default 0,
  asignada_por uuid,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (proveedor, external_id)
);
create index if not exists idx_transferencias_gym on transferencias(gym_id, created_at desc);
create index if not exists idx_transferencias_alumno on transferencias(alumno_id);

alter table transferencias enable row level security;
-- El gym solo lee; las escrituras van por el webhook (service role) o por server actions.
create policy "gym_lectura" on transferencias for select using (gym_id = get_user_gym_id());

-- Cada pago que sale de una transferencia apunta a ella (pagos sigue siendo solo INSERT).
alter table pagos add column if not exists transferencia_id uuid references transferencias(id);
create unique index if not exists uq_pagos_transferencia_cuota on pagos(transferencia_id, cuota_id) where transferencia_id is not null;

create or replace function imputar_transferencia(p_transferencia_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t transferencias%rowtype;
  c record;
  v_restante numeric(12,2);
  v_pagado numeric(12,2);
  v_debe numeric(12,2);
  v_aplica numeric(12,2);
  v_cuotas jsonb := '[]'::jsonb;
begin
  -- Bloquea la transferencia: dos llamadas simultáneas no pueden imputar dos veces.
  select * into t from transferencias where id = p_transferencia_id for update;
  if not found then
    raise exception 'transferencia % no existe', p_transferencia_id;
  end if;
  -- 'saldo_a_favor' se puede volver a imputar: aplica lo que sobró a cuotas nuevas.
  if t.estado = 'imputada' then
    return jsonb_build_object('ya_imputada', true, 'estado', t.estado, 'monto_imputado', t.monto_imputado);
  end if;
  if t.alumno_id is null or t.gym_id is null then
    update transferencias set estado = 'sin_asignar' where id = t.id;
    return jsonb_build_object('estado', 'sin_asignar');
  end if;

  v_restante := t.monto - t.monto_imputado;

  for c in
    select id, monto_total from cuotas
    where gym_id = t.gym_id and alumno_id = t.alumno_id
      and estado in ('vencida', 'pendiente', 'pagada_parcial')
    order by fecha_vencimiento asc, created_at asc
    for update
  loop
    exit when v_restante <= 0;
    select coalesce(sum(monto), 0) into v_pagado from pagos where cuota_id = c.id;
    v_debe := c.monto_total - v_pagado;
    continue when v_debe <= 0;
    v_aplica := least(v_debe, v_restante);

    insert into pagos (gym_id, cuota_id, alumno_id, monto, metodo, transferencia_id)
    values (t.gym_id, c.id, t.alumno_id, v_aplica, 'transferencia', t.id);

    if v_aplica >= v_debe then
      update cuotas set estado = 'pagada', fecha_pago = t.fecha, metodo_pago = 'transferencia', updated_at = now() where id = c.id;
    else
      update cuotas set estado = 'pagada_parcial', metodo_pago = 'transferencia', updated_at = now() where id = c.id;
    end if;

    v_restante := v_restante - v_aplica;
    v_cuotas := v_cuotas || jsonb_build_object('cuota_id', c.id, 'monto', v_aplica, 'completa', v_aplica >= v_debe);
  end loop;

  update transferencias
     set monto_imputado = t.monto - v_restante,
         estado = case when v_restante > 0 then 'saldo_a_favor' else 'imputada' end
   where id = t.id;

  return jsonb_build_object(
    'estado', case when v_restante > 0 then 'saldo_a_favor' else 'imputada' end,
    'monto_imputado', t.monto - v_restante,
    'saldo_a_favor', v_restante,
    'cuotas', v_cuotas
  );
end;
$$;

-- Solo el servidor (service role) la ejecuta.
revoke all on function imputar_transferencia(uuid) from public, anon, authenticated;
