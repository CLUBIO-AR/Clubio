import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { SuscripcionesClient } from "@/components/admin/SuscripcionesClient";

const PAGE_SIZE = 30;

export type CobroRow = {
  id: string;
  gym_id: string;
  periodo: string;
  plan: string;
  monto_usd: number;
  monto_ars: number;
  tipo_cambio: number;
  estado: "pendiente" | "pagado" | "vencido" | "cancelado";
  link_pago: string | null;
  email_enviado_at: string | null;
  paid_at: string | null;
  triggered_by: string;
  created_at: string;
  gyms: { nombre: string } | { nombre: string }[] | null;
};

const ESTADOS_VALIDOS = ["pendiente", "pagado", "vencido", "cancelado"] as const;
type EstadoFiltro = typeof ESTADOS_VALIDOS[number];

export default async function AdminSuscripcionesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const estadoParam = sp.estado ?? "";
  const estado = ESTADOS_VALIDOS.includes(estadoParam as EstadoFiltro) ? (estadoParam as EstadoFiltro) : null;

  const admin = createAdminClient();

  let query = admin
    .from("cobros_suscripcion")
    .select("id, gym_id, periodo, plan, monto_usd, monto_ars, tipo_cambio, estado, link_pago, email_enviado_at, paid_at, triggered_by, created_at, gyms(nombre)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const result = await paginate(query, page, PAGE_SIZE);

  return (
    <SuscripcionesClient
      cobros={result.data as unknown as CobroRow[]}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filtroEstado={estadoParam}
    />
  );
}
