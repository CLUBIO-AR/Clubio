import { createClient } from "@/lib/supabase/server";
import { getGymContext } from "@/lib/supabase/auth";
import { getCuotas } from "@/lib/cuotas";
import type { CuotaEstado } from "@/lib/cuotas";
import { CuotasClient } from "@/components/cuotas/cuotas-client";

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; estado?: string; search?: string; alumno?: string; actividad?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getGymContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const now = new Date();
  const mes        = sp.mes  ? Number(sp.mes)  : now.getMonth() + 1;
  const anio       = sp.anio ? Number(sp.anio) : now.getFullYear();
  const estado     = (sp.estado as CuotaEstado | undefined) ?? undefined;
  const search     = sp.search ?? "";
  const actividadId = sp.actividad ?? "";

  const [cuotasRes, actividadesRes] = await Promise.all([
    getCuotas(supabase, ctx.gymId, { mes, anio, estado, search, alumnoId: sp.alumno, actividadId: actividadId || undefined }),
    supabase.from("actividades").select("id, nombre, color").eq("gym_id", ctx.gymId).order("nombre"),
  ]);

  const actividades = actividadesRes.data ?? [];

  type Row = NonNullable<typeof cuotasRes.data>[0] & { alumnos?: { nombre: string; apellido: string; dni: string } | null };
  let rows = (cuotasRes.data ?? []) as Row[];
  if (search.trim()) {
    const term = search.toLowerCase();
    rows = rows.filter((c) => {
      const a = c.alumnos as { nombre: string; apellido: string; dni: string } | null;
      return a?.nombre.toLowerCase().includes(term) || a?.apellido.toLowerCase().includes(term) || a?.dni.includes(term);
    });
  }

  const total      = rows.length;
  const pagadas    = rows.filter((c) => c.estado === "pagada").length;
  const vencidas   = rows.filter((c) => c.estado === "vencida").length;
  const pendientes = rows.filter((c) => c.estado === "pendiente").length;
  const totalCobrado = rows.filter((c) => c.estado === "pagada").reduce((acc, c) => acc + (c.monto_total ?? 0), 0);

  return (
    <CuotasClient
      cuotas={rows}
      mes={mes}
      anio={anio}
      estadoDefault={sp.estado ?? "todos"}
      searchDefault={search}
      actividadDefault={actividadId}
      actividades={actividades}
      stats={{ total, pagadas, vencidas, pendientes, totalCobrado }}
    />
  );
}
