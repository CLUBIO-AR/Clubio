import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { sendResumenSemanalGym } from "@/lib/notifications/gym-owner";

// Cron semanal (lunes 9:00 AR): envía a cada gym owner un resumen con el total
// de cuotas vencidas acumuladas y el monto. Solo envía si hay cuotas vencidas.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  const hoy = new Date().toISOString().split("T")[0];

  const { data: licencias, error } = await admin
    .from("licencias")
    .select("gym_id")
    .eq("activa", true)
    .gte("fecha_vencimiento", hoy);

  if (error) {
    console.error("[cron:resumen-semanal] Error:", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!licencias?.length) {
    await logCron({ tipo: "resumen_semanal", esDispatcher: true, gymsTotal: 0, gymsOk: 0, gymsError: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ enviados: 0 });
  }

  const results = await Promise.allSettled(
    licencias.map(({ gym_id }) => sendResumenSemanalGym(gym_id))
  );

  const ok   = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.filter((r) => r.status === "rejected").length;

  console.log(`[cron:resumen-semanal] gyms=${licencias.length} ok=${ok} fail=${fail}`);
  await logCron({ tipo: "resumen_semanal", esDispatcher: true, gymsTotal: licencias.length, gymsOk: ok, gymsError: fail, duracionMs: Date.now() - startTime });

  return NextResponse.json({ gymsTotal: licencias.length, ok, fail });
}
