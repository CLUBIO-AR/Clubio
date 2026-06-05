import { NextResponse } from "next/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? undefined;

  const admin = createAdminClient();

  // Última ejecución por tipo (dispatchers)
  const ultimasQuery = admin
    .from("cron_logs")
    .select("tipo, created_at, gyms_total, gyms_ok, gyms_error, items_creados, duracion_ms, error_detalle")
    .eq("es_dispatcher", true)
    .order("created_at", { ascending: false });

  // Historial (últimas 50 — dispatcher + workers del gym actual)
  let historialQuery = admin
    .from("cron_logs")
    .select("id, gym_id, tipo, es_dispatcher, gyms_total, gyms_ok, gyms_error, items_creados, items_error, duracion_ms, error_detalle, created_at")
    .or(`gym_id.eq.${ctx.gymId},gym_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (tipo) {
    historialQuery = historialQuery.eq("tipo", tipo);
  }

  const [ultimasRes, historialRes] = await Promise.all([ultimasQuery, historialQuery]);

  type UltimaRow = NonNullable<typeof ultimasRes.data>[number];
  // Deduplicar última ejecución por tipo (tomar la más reciente de cada tipo)
  const ultimas: Record<string, UltimaRow> = {};
  for (const log of (ultimasRes.data ?? [])) {
    if (!ultimas[log.tipo]) ultimas[log.tipo] = log;
  }

  return NextResponse.json({
    ultimas: Object.values(ultimas),
    historial: historialRes.data ?? [],
  });
}
