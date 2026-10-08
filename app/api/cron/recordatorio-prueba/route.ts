import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";

// Dispatcher del recordatorio de clase de prueba (corre a las 9:00 y a las 20:00 de Argentina,
// ver vercel.json). Lanza un worker por gym con licencia activa y el bot de WhatsApp prendido.
export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  const [{ data: licencias }, { data: conBot }] = await Promise.all([
    admin.from("licencias").select("gym_id").eq("activa", true),
    admin.from("gym_config").select("gym_id").eq("whatsapp_bot_activo", true).eq("whatsapp_activo", true),
  ]);
  const activos = new Set((licencias ?? []).map((l) => l.gym_id));
  const gyms = (conBot ?? []).map((c) => c.gym_id).filter((id) => activos.has(id));

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/workers/recordatorio-prueba-gym`;
  const results = await Promise.allSettled(
    gyms.map((gym_id) =>
      fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({ gym_id }),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  await logCron({ tipo: "recordatorio_prueba", esDispatcher: true, gymsTotal: gyms.length, gymsOk: succeeded, gymsError: gyms.length - succeeded, duracionMs: Date.now() - startTime });
  return NextResponse.json({ ok: true, gyms: gyms.length, succeeded });
}
