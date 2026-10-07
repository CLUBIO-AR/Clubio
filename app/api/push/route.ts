import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/supabase/auth";
import { getApiGymId } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";

// Alta y baja del dispositivo actual para notificaciones push (ver lib/push.ts).
const SuscripcionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
});

export async function POST(request: Request) {
  const [user, gymId] = await Promise.all([getUser(), getApiGymId()]);
  if (!user || !gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = SuscripcionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("push_suscripciones").upsert({
    gym_id: gymId,
    usuario_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("push_suscripciones").delete().eq("endpoint", parsed.data.endpoint).eq("usuario_id", user.id);
  return NextResponse.json({ ok: true });
}
