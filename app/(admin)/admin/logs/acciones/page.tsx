import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { AccionesLogClient } from "@/components/admin/AccionesLogClient";

const PAGE_SIZE = 30;

export type AccionLogRow = {
  id: string;
  accion: string;
  gym_id: string | null;
  detalle: Record<string, unknown> | null;
  created_at: string;
  admin_users: { nombre: string; email: string } | { nombre: string; email: string }[] | null;
  gyms: { nombre: string } | { nombre: string }[] | null;
};

export default async function AdminLogsAccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; accion?: string; gym_id?: string; admin_id?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const accionFiltro = sp.accion ?? "";
  const gymId = sp.gym_id ?? "";
  const adminId = sp.admin_id ?? "";

  const admin = createAdminClient();

  let query = admin
    .from("admin_logs")
    .select("id, accion, gym_id, detalle, created_at, admin_users(nombre, email), gyms(nombre)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (accionFiltro) query = query.eq("accion", accionFiltro);
  if (gymId) query = query.eq("gym_id", gymId);
  if (adminId) query = query.eq("admin_id", adminId);

  const [result, accionesRes, adminsRes, gymsRes] = await Promise.all([
    paginate(query, page, PAGE_SIZE),
    admin.from("admin_logs").select("accion").order("accion"),
    admin.from("admin_users").select("id, nombre, email").eq("activo", true).order("nombre"),
    admin.from("gyms").select("id, nombre").order("nombre"),
  ]);

  const accionesUnicas = [...new Set((accionesRes.data ?? []).map((r) => r.accion))];

  return (
    <AccionesLogClient
      logs={result.data as unknown as AccionLogRow[]}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      accionesUnicas={accionesUnicas}
      admins={adminsRes.data ?? []}
      gyms={gymsRes.data ?? []}
      filtros={{ accion: accionFiltro, gymId, adminId }}
    />
  );
}
