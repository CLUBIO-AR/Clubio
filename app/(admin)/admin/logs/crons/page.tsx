import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { CronsLogClient, type CronLogRow } from "@/components/admin/CronsLogClient";

const PAGE_SIZE = 15;

export default async function AdminLogsCronsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tipo?: string; alcance?: string; con_errores?: string; gym_id?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const tipo = sp.tipo ?? "";
  const alcance = sp.alcance ?? "";
  const conErrores = sp.con_errores === "1";
  const gymId = sp.gym_id ?? "";
  const desde = sp.desde ?? "";
  const hasta = sp.hasta ?? "";

  const admin = createAdminClient();

  let query = admin
    .from("cron_logs")
    .select(
      `id, gym_id, tipo, es_dispatcher, gyms_total, gyms_ok, gyms_error,
       items_creados, items_saltados, items_error, duracion_ms, error_detalle, triggered_by, created_at,
       gyms(id, nombre)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);
  if (alcance === "dispatcher") query = query.eq("es_dispatcher", true);
  if (alcance === "worker") query = query.eq("es_dispatcher", false);
  if (conErrores) query = query.or("items_error.gt.0,gyms_error.gt.0,error_detalle.not.is.null");
  if (gymId) query = query.eq("gym_id", gymId);
  if (desde) query = query.gte("created_at", `${desde}T00:00:00`);
  if (hasta) query = query.lte("created_at", `${hasta}T23:59:59`);

  const [result, gymsRes] = await Promise.all([
    paginate<CronLogRow>(query, page, PAGE_SIZE),
    admin.from("gyms").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <CronsLogClient
      logs={result.data}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ tipo, alcance, con_errores: conErrores, gym_id: gymId, desde, hasta }}
      gyms={gymsRes.data ?? []}
    />
  );
}
