import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";
import { mandarRecordatoriosPrueba } from "@/lib/recordatorio-prueba";

const Schema = z.object({ gym_id: z.string().uuid() });

// Worker por gym: idempotente (cada reserva se recuerda una sola vez, ver recordatorio_at).
export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const startTime = Date.now();
  const r = await mandarRecordatoriosPrueba(createAdminClient(), parsed.data.gym_id);
  await logCron({ tipo: "recordatorio_prueba", gymId: parsed.data.gym_id, itemsCreados: r.enviados, itemsSaltados: r.sinPlantilla, duracionMs: Date.now() - startTime });
  return NextResponse.json({ ok: true, ...r });
}
