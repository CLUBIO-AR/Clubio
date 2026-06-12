import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { GymsClient, type GymRow } from "@/components/admin/GymsClient";

const PAGE_SIZE = 20;

export default async function AdminGymsPage({
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

  let query = admin
    .from("gyms")
    .select(
      `id, nombre, email_contacto, activo, created_at,
       licencias!inner(id, plan, activa, fecha_vencimiento, es_trial)`,
      { count: "exact" }
    )
    .eq("licencias.activa", true)
    .order("created_at", { ascending: false });

  if (search) query = query.or(`nombre.ilike.%${search}%,email_contacto.ilike.%${search}%`);
  if (plan) query = query.eq("licencias.plan", plan as "basic" | "plus" | "multi");
  if (estado === "activo") query = query.eq("activo", true).gte("licencias.fecha_vencimiento", hoy);
  if (estado === "suspendido") query = query.eq("activo", false);
  if (estado === "vencida") query = query.lt("licencias.fecha_vencimiento", hoy);

  const result = await paginate<GymRow>(query, page, PAGE_SIZE);

  const gymIds = result.data.map((g) => g.id);
  const mesInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [alumnosRes, pagosRes] = gymIds.length
    ? await Promise.all([
        admin.from("alumnos").select("gym_id").eq("activo", true).in("gym_id", gymIds),
        admin.from("pagos").select("gym_id, monto").gte("created_at", mesInicio).in("gym_id", gymIds),
      ])
    : [{ data: [] }, { data: [] }];

  const alumnosPorGym = new Map<string, number>();
  for (const a of alumnosRes.data ?? []) {
    alumnosPorGym.set(a.gym_id, (alumnosPorGym.get(a.gym_id) ?? 0) + 1);
  }
  const cobradoPorGym = new Map<string, number>();
  for (const p of pagosRes.data ?? []) {
    cobradoPorGym.set(p.gym_id, (cobradoPorGym.get(p.gym_id) ?? 0) + Number(p.monto));
  }

  return (
    <GymsClient
      gyms={result.data}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      alumnosPorGym={Object.fromEntries(alumnosPorGym)}
      cobradoPorGym={Object.fromEntries(cobradoPorGym)}
      filters={{ plan, estado, search }}
    />
  );
}
