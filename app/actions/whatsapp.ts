"use server";

import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";
import { revalidatePath } from "next/cache";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Manda un mensaje de texto libre a un alumno (respuesta manual desde el inbox del
// dashboard). Solo funciona dentro de la ventana de 24hs desde el último mensaje del
// alumno — fuera de esa ventana Meta rechaza el envío y hay que usar una plantilla.
export async function enviarMensajeWhatsappAction(
  telefono: string,
  cuerpo: string
): Promise<ActionResult<{ wa_message_id: string }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (!cuerpo.trim()) return { ok: false, error: "El mensaje no puede estar vacío" };

  const admin = createAdminClient();

  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("whatsapp_phone_number_id, whatsapp_access_token")
    .eq("gym_id", ctx.gymId)
    .single();

  if (!gymConfig?.whatsapp_phone_number_id || !gymConfig?.whatsapp_access_token) {
    return { ok: false, error: "WhatsApp no configurado para este gym" };
  }

  const { data: alumno } = await admin
    .from("alumnos")
    .select("id")
    .eq("gym_id", ctx.gymId)
    .ilike("telefono", `%${telefono.slice(-10)}`)
    .maybeSingle();

  let waMessageId: string;
  try {
    waMessageId = await sendWhatsAppText(gymConfig, { to: telefono, body: cuerpo });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error enviando mensaje" };
  }

  await admin.from("mensajes_whatsapp").insert({
    gym_id: ctx.gymId,
    alumno_id: alumno?.id ?? null,
    telefono,
    direccion: "saliente",
    cuerpo,
    wa_message_id: waMessageId,
    estado: "enviado",
  });

  revalidatePath(`/dashboard/whatsapp/${encodeURIComponent(telefono)}`);
  return { ok: true, data: { wa_message_id: waMessageId } };
}

// Marca como leídos todos los mensajes entrantes de una conversación — se llama al
// abrir el hilo desde el inbox (durante el render de la página, por eso NO usa
// revalidatePath acá: Next no permite revalidar dentro de un render. El layout ya
// lee el estado fresco en cada navegación, así que no hace falta).
export async function marcarConversacionLeidaAction(telefono: string): Promise<ActionResult> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const admin = createAdminClient();
  await admin
    .from("mensajes_whatsapp")
    .update({ leido: true })
    .eq("gym_id", ctx.gymId)
    .eq("telefono", telefono)
    .eq("direccion", "entrante")
    .eq("leido", false);

  return { ok: true, data: undefined };
}
