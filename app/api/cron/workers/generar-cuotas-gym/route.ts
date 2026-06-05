import { NextResponse } from "next/server";
import { z } from "zod";
import { generarCuotasMes } from "@/lib/cuotas";
import { createAdminClient } from "@/lib/supabase/admin";
import { logCron } from "@/lib/cron-logger";

const BodySchema = z.object({ gym_id: z.string().uuid() });

// WORKER: procesa la generación de cuotas de UN solo gym.
// Llamado en paralelo por el dispatcher.
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
  const now = new Date();
  const startTime = Date.now();

  try {
    const supabase = createAdminClient();
    const { creadas, error } = await generarCuotasMes(supabase, gym_id, now.getMonth() + 1, now.getFullYear());

    if (error) {
      console.error(`[worker:generar-cuotas] gym=${gym_id} error=${error}`);
      await logCron({ tipo: "generar_cuotas", gymId: gym_id, itemsCreados: 0, itemsError: 1, errorDetalle: error, duracionMs: Date.now() - startTime });
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log(`[worker:generar-cuotas] gym=${gym_id} creadas=${creadas}`);
    await logCron({ tipo: "generar_cuotas", gymId: gym_id, itemsCreados: creadas, duracionMs: Date.now() - startTime });
    return NextResponse.json({ gym_id, creadas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "worker_error";
    console.error(`[worker:generar-cuotas] gym=${gym_id} exception:`, err);
    await logCron({ tipo: "generar_cuotas", gymId: gym_id, itemsError: 1, errorDetalle: msg, duracionMs: Date.now() - startTime });
    return NextResponse.json({ error: "worker_error" }, { status: 500 });
  }
}
