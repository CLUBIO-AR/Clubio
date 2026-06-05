"use server";

import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: emailData, error } = await resend.emails.send({
    from,
    to: destination,
    subject: `[TEST] Configuración de email — ${gymNombre}`,
    html: `
      <p>Este es un email de prueba enviado desde <strong>${gymNombre}</strong> en CLUBIO.</p>
      <p>Si recibiste este mensaje, la configuración de email está funcionando correctamente.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="color:#9ca3af;font-size:12px;">Gym ID: ${ctx.gymId}<br/>Enviado a: ${destination}</p>
    `,
  });

  if (error || !emailData?.id) {
    return { ok: false, error: error?.message ?? "Error desconocido de Resend" };
  }

  return { ok: true, data: { message_id: emailData.id, to: destination, from } };
}
