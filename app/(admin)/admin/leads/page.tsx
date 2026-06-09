import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { LeadsClient, type LeadRow } from "@/components/admin/LeadsClient";

const PAGE_SIZE = 25;

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; estado?: string; cantidad?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const estado = sp.estado ?? "";
  const cantidad = sp.cantidad ?? "";
  const search = sp.search ?? "";

  const admin = createAdminClient();

  let query = admin
    .from("leads")
    .select("id, nombre, email, telefono, gym_nombre, cantidad_alumnos, como_nos_conocio, estado, notas, gym_id, created_at, updated_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) query = query.or(`nombre.ilike.%${search}%,email.ilike.%${search}%,gym_nombre.ilike.%${search}%`);
  if (estado) query = query.eq("estado", estado);
  if (cantidad) query = query.eq("cantidad_alumnos", cantidad);

  // KPIs sobre el total de leads (no solo la página actual)
  const limite7dias = new Date();
  limite7dias.setDate(limite7dias.getDate() - 7);
  const hace7dias = limite7dias.toISOString();

  const limite48hs = new Date();
  limite48hs.setHours(limite48hs.getHours() - 48);
  const hace48hs = limite48hs.toISOString();

  const [result, nuevosRes, enProcesoRes, convertidosRes, totalRes, sinContactarRes] = await Promise.all([
    paginate<LeadRow>(query, page, PAGE_SIZE),
    admin.from("leads").select("id", { count: "exact", head: true }).gte("created_at", hace7dias),
    admin.from("leads").select("id", { count: "exact", head: true }).in("estado", ["contactado", "demo_agendada"]),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("estado", "convertido"),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("estado", "nuevo").lt("created_at", hace48hs),
  ]);

  const totalLeads = totalRes.count ?? 0;
  const convertidos = convertidosRes.count ?? 0;
  const tasaConversion = totalLeads > 0 ? (convertidos / totalLeads) * 100 : 0;

  return (
    <LeadsClient
      leads={result.data}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ estado, cantidad, search }}
      kpis={{
        nuevosSemana: nuevosRes.count ?? 0,
        enProceso: enProcesoRes.count ?? 0,
        convertidos,
        tasaConversion,
        sinContactar48hs: sinContactarRes.count ?? 0,
      }}
    />
  );
}
