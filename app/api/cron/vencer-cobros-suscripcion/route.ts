import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();

  // Período actual en formato YYYY-MM
  const now = new Date();
  const periodoActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Marcar como 'vencido' todos los cobros pendientes cuyo período ya pasó
  const { data, error } = await admin
    .from("cobros_suscripcion")
    .update({ estado: "vencido", updated_at: new Date().toISOString() })
    .eq("estado", "pendiente")
    .lt("periodo", periodoActual)
    .select("id");

  if (error) {
    await logCron({
      tipo: "vencer_cobros_suscripcion",
      esDispatcher: false,
      errorDetalle: error.message,
      duracionMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const vencidos = data?.length ?? 0;

  await logCron({
    tipo: "vencer_cobros_suscripcion",
    esDispatcher: false,
    itemsCreados: 0,
    itemsSaltados: 0,
    itemsError: 0,
    errorDetalle: vencidos > 0 ? `${vencidos} cobro(s) marcados como vencido` : undefined,
    duracionMs: Date.now() - startTime,
  });

  return NextResponse.json({ ok: true, vencidos });
}
