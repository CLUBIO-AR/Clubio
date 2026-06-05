import { NextResponse } from "next/server";
import { z } from "zod";
import { aplicarRecargosGym } from "@/lib/cuotas";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";

const BodySchema = z.object({ gym_id: z.string().uuid() });

// WORKER: aplica recargos y marca vencidas para UN solo gym.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "gym_id inválido" }, { status: 400 });
  }

  const { gym_id } = parsed.data;
  const startTime = Date.now();

  try {
    const supabase = createAdminClient();
    await aplicarRecargosGym(supabase, gym_id);
    console.log(`[worker:aplicar-recargos] gym=${gym_id} ok`);
    await logCron({ tipo: "aplicar_recargos", gymId: gym_id, itemsCreados: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ gym_id, ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "worker_error";
    console.error(`[worker:aplicar-recargos] gym=${gym_id} exception:`, err);
    await logCron({ tipo: "aplicar_recargos", gymId: gym_id, itemsError: 1, errorDetalle: msg, duracionMs: Date.now() - startTime });
    return NextResponse.json({ error: "worker_error" }, { status: 500 });
  }
}
