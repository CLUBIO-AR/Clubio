import { NextResponse } from "next/server";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { z } from "zod";

const Schema = z.object({
  tipo: z.enum(["enviar_avisos", "generar_cuotas"]),
});

// Trigger manual de crons — solo owner/admin.
// Llama directamente al worker del gym autenticado.
export async function POST(request: Request) {
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { tipo } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });

  const workerMap: Record<string, string> = {
    enviar_avisos:  `${appUrl}/api/cron/workers/enviar-avisos-gym`,
    generar_cuotas: `${appUrl}/api/cron/workers/generar-cuotas-gym`,
  };

  const workerUrl = workerMap[tipo];

  const res = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ gym_id: ctx.gymId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? "Worker error", status: res.status }, { status: 502 });
  }

  return NextResponse.json({ ok: true, tipo, resultado: data });
}
