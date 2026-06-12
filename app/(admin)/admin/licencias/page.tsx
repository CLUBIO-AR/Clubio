import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { LicenciasClient, type LicenciaRow } from "@/components/admin/LicenciasClient";

const PAGE_SIZE = 20;

export default async function AdminLicenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; plan?: string; estado?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const plan = sp.plan ?? "";
  const estado = sp.estado ?? "";
  const search = sp.search ?? "";

  const admin = createAdminClient();
  const hoy = new Date().toISOString().split("T")[0];
  const limite7dias = new Date();
  limite7dias.setDate(limite7dias.getDate() + 7);
  const en7dias = limite7dias.toISOString().split("T")[0];

  let query = admin
    .from("licencias")
    .select(
      `id, plan, fecha_inicio, fecha_vencimiento, activa, es_trial, precio_pagado, moneda,
       gyms!inner(id, nombre, email_contacto, activo)`,
      { count: "exact" }
    )
    .order("fecha_vencimiento", { ascending: true });

  if (search) query = query.ilike("gyms.nombre", `%${search}%`);
  if (plan) query = query.eq("plan", plan);
  if (estado === "vigente") query = query.gte("fecha_vencimiento", en7dias);
  if (estado === "por_vencer") query = query.gte("fecha_vencimiento", hoy).lt("fecha_vencimiento", en7dias);
  if (estado === "vencida") query = query.lt("fecha_vencimiento", hoy);

  const result = await paginate<LicenciaRow>(query, page, PAGE_SIZE);

  return (
    <LicenciasClient
      licencias={result.data}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ plan, estado, search }}
    />
  );
}
