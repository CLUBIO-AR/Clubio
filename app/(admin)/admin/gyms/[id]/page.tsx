import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GymDetailClient } from "@/components/admin/GymDetailClient";

export default async function AdminGymDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const [gymRes, sucursalesRes, usuariosRes, alumnosRes, pagosRes, cobrosRes] = await Promise.all([
    admin
      .from("gyms")
      .select(`id, nombre, email_contacto, telefono, direccion, activo, created_at,
               licencias(id, plan, activa, es_trial, fecha_inicio, fecha_vencimiento, precio_pagado, moneda),
               gym_config(mp_access_token, monto_base_defecto)`)
      .eq("id", id)
      .single(),
    admin.from("sucursales").select("id, nombre, direccion, activa, es_principal").eq("gym_id", id).is("deleted_at", null),
    admin.from("gym_usuarios").select("id, nombre, email, rol, activo").eq("gym_id", id),
    admin.from("alumnos").select("id", { count: "exact", head: true }).eq("gym_id", id).eq("activo", true),
    admin.from("pagos").select("monto").eq("gym_id", id).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from("cobros_suscripcion").select("id, periodo, plan, monto_usd, monto_ars, estado, link_pago, email_enviado_at, paid_at").eq("gym_id", id).order("created_at", { ascending: false }).limit(5),
  ]);

  if (!gymRes.data) notFound();

  const cobradoMes = (pagosRes.data ?? []).reduce((s, p) => s + Number(p.monto), 0);

  return (
    <GymDetailClient
      gym={gymRes.data as never}
      sucursales={sucursalesRes.data ?? []}
      usuarios={usuariosRes.data ?? []}
      cobros={cobrosRes.data ?? []}
      totalAlumnos={alumnosRes.count ?? 0}
      cobradoMes={cobradoMes}
    />
  );
}
