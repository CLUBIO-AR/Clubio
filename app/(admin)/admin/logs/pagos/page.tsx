import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { PagosLogClient, type PagoLogRow } from "@/components/admin/PagosLogClient";

const PAGE_SIZE = 15;

export default async function AdminLogsPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; metodo?: string; gym_id?: string; desde?: string; hasta?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const metodo = sp.metodo ?? "";
  const gymId = sp.gym_id ?? "";
  const desde = sp.desde ?? "";
  const hasta = sp.hasta ?? "";
  const search = sp.search ?? "";

  const admin = createAdminClient();

  let query = admin
    .from("pagos")
    .select(
      `id, monto, metodo, mp_payment_id, mp_status, mp_detail, created_at,
       gyms!inner(id, nombre),
       alumnos(id, nombre, apellido)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) query = query.or(`mp_payment_id.ilike.%${search}%,gyms.nombre.ilike.%${search}%`);
  if (metodo) query = query.eq("metodo", metodo);
  if (gymId) query = query.eq("gym_id", gymId);
  if (desde) query = query.gte("created_at", `${desde}T00:00:00`);
  if (hasta) query = query.lte("created_at", `${hasta}T23:59:59`);

  // Stats: hoy / semana / mes + por método (sobre todos los pagos, no solo la página actual)
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
  const inicioSemana = new Date(hoy.getTime() - 7 * 86400000).toISOString();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

  const [result, hoyRes, semanaRes, mesRes, gymsRes] = await Promise.all([
    paginate<PagoLogRow>(query, page, PAGE_SIZE),
    admin.from("pagos").select("monto").gte("created_at", inicioHoy),
    admin.from("pagos").select("monto").gte("created_at", inicioSemana),
    admin.from("pagos").select("monto, metodo").gte("created_at", inicioMes),
    admin.from("gyms").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const sum = (rows: { monto: number }[] | null) => (rows ?? []).reduce((acc, p) => acc + Number(p.monto), 0);
  const porMetodo = new Map<string, number>();
  for (const p of mesRes.data ?? []) porMetodo.set(p.metodo, (porMetodo.get(p.metodo) ?? 0) + Number(p.monto));

  return (
    <PagosLogClient
      pagos={result.data}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ metodo, gym_id: gymId, desde, hasta, search }}
      gyms={gymsRes.data ?? []}
      stats={{
        hoy: sum(hoyRes.data),
        semana: sum(semanaRes.data),
        mes: sum(mesRes.data),
        porMetodo: Object.fromEntries(porMetodo),
      }}
    />
  );
}
