import { NextResponse } from "next/server";
import { z } from "zod";
import { aplicarRecargosGym } from "@/lib/cuotas";
import { createAdminClient } from "@/lib/supabase/admin";

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

  try {
    const supabase = createAdminClient();
    await aplicarRecargosGym(supabase, gym_id);
    console.log(`[worker:aplicar-recargos] gym=${gym_id} ok`);
    return NextResponse.json({ gym_id, ok: true });
  } catch (err) {
    console.error(`[worker:aplicar-recargos] gym=${gym_id} exception:`, err);
    return NextResponse.json({ error: "worker_error" }, { status: 500 });
  }
}
