"use server";

import { z } from "zod";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const WORKER_PATHS: Record<string, string> = {
  enviar_avisos: "/api/cron/workers/enviar-avisos-gym",
  generar_cuotas: "/api/cron/workers/generar-cuotas-gym",
  aplicar_recargos: "/api/cron/workers/aplicar-recargos-gym",
};

const Schema = z.object({ gymId: z.string().uuid() });

// Solo disponible fuera de producción — evita disparar workers reales sobre tenants en vivo.
export async function ejecutarCronManualAction(tipo: string, gymId: string): Promise<ActionResult<{ resultado: unknown }>> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "La ejecución manual de crons está deshabilitada en producción" };
  }

  const ctx = await requireSuperadmin();
  const path = WORKER_PATHS[tipo];
  if (!path) return { ok: false, error: "Tipo de cron desconocido" };

  const parsed = Schema.safeParse({ gymId });
  if (!parsed.success) return { ok: false, error: "Tenés que seleccionar un gym" };

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return { ok: false, error: "CRON_SECRET no configurado" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const res = await fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ gym_id: parsed.data.gymId }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error ?? `Worker respondió ${res.status}` };

  await logAdminAction(ctx.adminId, "cron_ejecutado_manual", parsed.data.gymId, { tipo });
  revalidatePath("/admin/logs/crons");
  return { ok: true, data: { resultado: data } };
}
