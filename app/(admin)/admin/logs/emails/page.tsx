import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/lib/admin/pagination";
import { EmailsLogClient, type EmailLogRow } from "@/components/admin/EmailsLogClient";

const PAGE_SIZE = 15;

export default async function AdminLogsEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tipo?: string; estado?: string; gym_id?: string; desde?: string; hasta?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const tipo = sp.tipo ?? "";
  const estado = sp.estado ?? "";
  const gymId = sp.gym_id ?? "";
  const desde = sp.desde ?? "";
  const hasta = sp.hasta ?? "";
  const search = sp.search ?? "";

  const admin = createAdminClient();

  let query = admin
    .from("notificaciones_log")
    .select(
      `id, tipo, enviado_a, estado, canal, provider_id, error_detail, subject, preview, created_at,
       gyms!inner(id, nombre)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) query = query.or(`enviado_a.ilike.%${search}%,subject.ilike.%${search}%,gyms.nombre.ilike.%${search}%`);
  if (tipo) query = query.eq("tipo", tipo);
  if (estado) query = query.eq("estado", estado);
  if (gymId) query = query.eq("gym_id", gymId);
  if (desde) query = query.gte("created_at", `${desde}T00:00:00`);
  if (hasta) query = query.lte("created_at", `${hasta}T23:59:59`);

  const [result, gymsRes] = await Promise.all([
    paginate<EmailLogRow>(query, page, PAGE_SIZE),
    admin.from("gyms").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <EmailsLogClient
      logs={result.data}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ tipo, estado, gym_id: gymId, desde, hasta, search }}
      gyms={gymsRes.data ?? []}
    />
  );
}
