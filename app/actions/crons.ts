"use server";

import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendGymTestEmail } from "@/lib/notifications/channels/email";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function triggerCronAction(
  tipo: "enviar_avisos" | "generar_cuotas"
): Promise<ActionResult<{ enviados?: number; creadas?: number }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (ctx.rol !== "owner" && ctx.rol !== "admin") return { ok: false, error: "Forbidden" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return { ok: false, error: "CRON_SECRET no configurado" };

  // Verificar que el gym tiene la feature habilitada en su licencia
  const admin = createAdminClient();
  if (tipo === "enviar_avisos") {
    const { data: lic } = await admin
      .from("licencias")
      .select("feature_avisos")
      .eq("gym_id", ctx.gymId)
      .eq("activa", true)
      .single();
    if (!lic?.feature_avisos) return { ok: false, error: "Feature de avisos no habilitada en este plan" };
  }

  const workerMap: Record<string, string> = {
    enviar_avisos:  `${appUrl}/api/cron/workers/enviar-avisos-gym`,
    generar_cuotas: `${appUrl}/api/cron/workers/generar-cuotas-gym`,
  };

  const res = await fetch(workerMap[tipo], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ gym_id: ctx.gymId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error ?? `Worker error ${res.status}` };
  return { ok: true, data };
}

export async function testEmailAction(
  toEmail?: string
): Promise<ActionResult<{ message_id: string; to: string; from: string }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (ctx.rol !== "owner" && ctx.rol !== "admin") return { ok: false, error: "Forbidden" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const destination = toEmail ?? user?.email;
  if (!destination) return { ok: false, error: "No hay email de destino" };

  const admin = createAdminClient();
  const [{ data: gymConfig }, { data: gym }] = await Promise.all([
    admin.from("gym_config").select("email_remitente_nombre, email_remitente_address").eq("gym_id", ctx.gymId).single(),
    admin.from("gyms").select("nombre").eq("id", ctx.gymId).single(),
  ]);

  const gymNombre = gym?.nombre ?? "CLUBIO";
  const from = gymConfig?.email_remitente_address
    ? `${gymConfig.email_remitente_nombre ?? gymNombre} <${gymConfig.email_remitente_address}>`
    : `${gymNombre} <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  let messageId: string;
  try {
    messageId = await sendGymTestEmail({ to: destination, gymNombre, from });
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Error al enviar email de prueba" };
  }

  const { error: logError } = await admin.from("notificaciones_log").insert({
    gym_id: ctx.gymId,
    tipo: "test",
    enviado_a: destination,
    estado: "enviado",
    provider_id: messageId,
  });
  if (logError) console.error("[testEmailAction] notificaciones_log insert error:", logError.message);

  return { ok: true, data: { message_id: messageId, to: destination, from } };
}
