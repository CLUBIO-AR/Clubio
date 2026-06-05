import { createClient } from "@/lib/supabase/server";
import { getGymContext } from "@/lib/supabase/auth";
import { getCuotas } from "@/lib/cuotas";
import type { CuotaEstado } from "@/lib/cuotas";
import { CuotasClient } from "@/components/cuotas/cuotas-client";

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string; estado?: string; search?: string; alumno?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getGymContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const now = new Date();
  const mes    = sp.mes  ? Number(sp.mes)  : now.getMonth() + 1;
  const anio   = sp.anio ? Number(sp.anio) : now.getFullYear();
  const estado = (sp.estado as CuotaEstado | undefined) ?? undefined;
  const search = sp.search ?? "";

  const { data: cuotas = [] } = await getCuotas(supabase, ctx.gymId, {
    mes, anio, estado, search, alumnoId: sp.alumno,
  });

  type Row = NonNullable<typeof cuotas>[0] & { alumnos?: { nombre: string; apellido: string; dni: string } | null };
  let rows = (cuotas ?? []) as Row[];
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
      stats={{ total, pagadas, vencidas, pendientes, totalCobrado }}
    />
  );
}
