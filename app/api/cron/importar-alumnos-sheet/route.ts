import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";

// Dispatcher: llama al worker una vez por gym que tenga google_sheet_id configurado.
export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();

  const { data: configs } = await admin
    .from("gym_config")
    .select("gym_id, google_sheet_id")
    .not("google_sheet_id", "is", null);

  const gymIds = (configs ?? []).map((c) => c.gym_id);
  if (!gymIds.length) {
    await logCron({ tipo: "importar_alumnos_sheet", esDispatcher: true, gymsTotal: 0, gymsOk: 0, gymsError: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ ok: true, gyms: 0 });
  }

  const { data: licencias } = await admin
    .from("licencias")
    .select("gym_id")
    .eq("activa", true)
    .in("gym_id", gymIds);

  const gymIdsActivos = new Set((licencias ?? []).map((l) => l.gym_id));
  const gymsAImportar = gymIds.filter((id) => gymIdsActivos.has(id));

  if (!gymsAImportar.length) {
    await logCron({ tipo: "importar_alumnos_sheet", esDispatcher: true, gymsTotal: 0, gymsOk: 0, gymsError: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ ok: true, gyms: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const workerUrl = `${appUrl}/api/cron/workers/importar-alumnos-sheet-gym`;

  const results = await Promise.allSettled(
    gymsAImportar.map((gym_id) =>
      fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ gym_id }),
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - succeeded;

  await logCron({ tipo: "importar_alumnos_sheet", esDispatcher: true, gymsTotal: gymsAImportar.length, gymsOk: succeeded, gymsError: failed, duracionMs: Date.now() - startTime });
  return NextResponse.json({ ok: true, gyms: gymsAImportar.length, succeeded, failed });
}
