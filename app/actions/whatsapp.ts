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
    console.error("[enviarMensajeWhatsapp] falta whatsapp_phone_number_id o whatsapp_access_token en gym_config para gym:", ctx.gymId);
    return { ok: false, error: "WhatsApp no configurado para este gym" };
  }

  const { data: alumno } = await admin
    .from("alumnos")
    .select("id")
    .eq("gym_id", ctx.gymId)
    .ilike("telefono", `%${telefono.slice(-10)}`)
    .is("deleted_at", null)
    // Varios alumnos pueden compartir teléfono (hermanos, padre/madre que paga): tomamos
    // el más reciente en vez de dejar que maybeSingle() devuelva null por múltiples filas.
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let waMessageId: string;
  try {
    waMessageId = await sendWhatsAppText(gymConfig, { to: telefono, body: cuerpo });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error enviando mensaje";
    console.error("[enviarMensajeWhatsapp] gym:", ctx.gymId, "telefono:", telefono, "error:", mensaje);
    return { ok: false, error: mensaje };
  }

  const { error: insertError } = await admin.from("mensajes_whatsapp").insert({
    gym_id: ctx.gymId,
    alumno_id: alumno?.id ?? null,
    telefono,
    direccion: "saliente",
    cuerpo,
    wa_message_id: waMessageId,
    estado: "enviado",
  });
  if (insertError) {
    console.error("[enviarMensajeWhatsapp] mensaje enviado por Meta pero falló al guardarlo en mensajes_whatsapp:", insertError.message);
  }

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
    .eq("leido", false)
    .is("deleted_at", null);

  return { ok: true, data: undefined };
}

// ── Acciones múltiples del inbox (checkbox en la lista de conversaciones) ──────────

const MAX_CONVERSACIONES_POR_ACCION = 200;

function validarTelefonos(telefonos: string[]): string[] | null {
  if (!Array.isArray(telefonos) || telefonos.length === 0) return null;
  if (telefonos.length > MAX_CONVERSACIONES_POR_ACCION) return null;
  const limpios = telefonos.filter((t) => typeof t === "string" && t.length > 0 && t.length <= 30);
  return limpios.length === telefonos.length ? limpios : null;
}

export async function marcarConversacionesLeidasAction(
  telefonos: string[]
): Promise<ActionResult<{ actualizados: number }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const lista = validarTelefonos(telefonos);
  if (!lista) return { ok: false, error: "Selección inválida" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mensajes_whatsapp")
    .update({ leido: true })
    .eq("gym_id", ctx.gymId)
    .in("telefono", lista)
    .eq("direccion", "entrante")
    .eq("leido", false)
    .is("deleted_at", null)
    .select("id");
  if (error) {
    console.error("[marcarConversacionesLeidas] gym:", ctx.gymId, error.message);
    return { ok: false, error: "No se pudieron marcar como leídas" };
  }

  revalidatePath("/dashboard/whatsapp", "layout");
  return { ok: true, data: { actualizados: data?.length ?? 0 } };
}

// Soft delete: los mensajes quedan en la base con deleted_at (regla del proyecto, nunca
// DELETE físico). Si el alumno vuelve a escribir, la conversación reaparece solo con lo nuevo.
export async function eliminarConversacionesAction(
  telefonos: string[]
): Promise<ActionResult<{ eliminados: number }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const lista = validarTelefonos(telefonos);
  if (!lista) return { ok: false, error: "Selección inválida" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mensajes_whatsapp")
    .update({ deleted_at: new Date().toISOString(), leido: true })
    .eq("gym_id", ctx.gymId)
    .in("telefono", lista)
    .is("deleted_at", null)
    .select("id");
  if (error) {
    console.error("[eliminarConversaciones] gym:", ctx.gymId, error.message);
    return { ok: false, error: "No se pudieron eliminar las conversaciones" };
  }

  revalidatePath("/dashboard/whatsapp", "layout");
  return { ok: true, data: { eliminados: data?.length ?? 0 } };
}
