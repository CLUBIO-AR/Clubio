// Comprobantes de transferencia que llegan por WhatsApp: se guardan en el bucket privado
// "comprobantes" (receipts/{gym_id}/{alumno_id}/…) y quedan "pendiente" hasta que alguien
// del gym los confirma o rechaza desde Pagos. Nunca marcan una cuota como pagada solos.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { descargarMediaWhatsApp, sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";
import { sendNotification } from "@/lib/notifications";
import { registrarAvisoEnInbox } from "@/lib/notifications/inbox";

type Admin = SupabaseClient<Database>;

export const BUCKET_COMPROBANTES = "comprobantes";

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export function extensionComprobante(mimeType: string): string | null {
  return EXTENSIONES[mimeType.split(";")[0].trim().toLowerCase()] ?? null;
}

export function rutaComprobante(gymId: string, alumnoId: string, id: string, ext: string): string {
  return `receipts/${gymId}/${alumnoId}/${id}.${ext}`;
}

/**
 * Baja el archivo de Meta, lo sube al bucket y crea el registro "pendiente".
 * Tira si el formato no es imagen/PDF o si falla la descarga/subida: el que llama decide
 * qué responderle al alumno.
 */
export async function guardarComprobante(
  admin: Admin,
  args: {
    gymId: string;
    alumnoId: string;
    telefono: string;
    cuotaIds: string[];
    mediaId: string;
    waMessageId: string | null;
    accessToken: string | null;
  },
): Promise<{ id: string }> {
  const { bytes, mimeType } = await descargarMediaWhatsApp({ whatsapp_access_token: args.accessToken }, args.mediaId);
  const ext = extensionComprobante(mimeType);
  if (!ext) throw new Error(`Formato de comprobante no admitido: ${mimeType}`);

  const id = crypto.randomUUID();
  const path = rutaComprobante(args.gymId, args.alumnoId, id, ext);
  const { error: uploadError } = await admin.storage
    .from(BUCKET_COMPROBANTES)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(`No se pudo guardar el comprobante: ${uploadError.message}`);

  const { error } = await admin.from("comprobantes_pago").insert({
    id,
    gym_id: args.gymId,
    alumno_id: args.alumnoId,
    telefono: args.telefono,
    cuota_ids: args.cuotaIds,
    storage_path: path,
    mime_type: mimeType,
    wa_message_id: args.waMessageId,
  });
  if (error) throw new Error(`No se pudo registrar el comprobante: ${error.message}`);
  return { id };
}

/** Cuotas (de esta lista) que tienen un comprobante esperando revisión. */
export async function cuotasConComprobantePendiente(admin: Admin, gymId: string, cuotaIds: string[]): Promise<Set<string>> {
  if (cuotaIds.length === 0) return new Set();
  const { data } = await admin
    .from("comprobantes_pago")
    .select("cuota_ids")
    .eq("gym_id", gymId)
    .eq("estado", "pendiente")
    .is("deleted_at", null)
    .overlaps("cuota_ids", cuotaIds);
  const pendientes = new Set<string>();
  for (const fila of data ?? []) for (const id of fila.cuota_ids) if (cuotaIds.includes(id)) pendientes.add(id);
  return pendientes;
}

// ── Revisión desde el panel ─────────────────────────────────────────────────

const VENTANA_24H_MS = 24 * 60 * 60 * 1000;

/** ¿El alumno nos escribió en las últimas 24 h? (Meta solo deja mandar texto libre ahí). */
export async function ventanaAbierta(admin: Admin, gymId: string, telefono: string, ahora = new Date()): Promise<boolean> {
  const { count } = await admin
    .from("mensajes_whatsapp")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", gymId)
    .eq("telefono", telefono)
    .eq("direccion", "entrante")
    .gte("created_at", new Date(ahora.getTime() - VENTANA_24H_MS).toISOString());
  return (count ?? 0) > 0;
}

/**
 * Le avisa al alumno el resultado de la revisión. Dentro de la ventana de 24 h va como texto;
 * fuera de la ventana, la confirmación usa la plantilla de confirmación de pago (si el gym la
 * tiene) y el rechazo no se manda (queda logueado). Nunca tira.
 */
export async function avisarResultadoComprobante(
  admin: Admin,
  args: { gymId: string; alumnoId: string; telefono: string; resultado: "confirmado" | "rechazado"; motivo?: string | null },
): Promise<"texto" | "plantilla" | "sin_aviso"> {
  try {
    const [{ data: config }, { data: alumno }, { data: gym }] = await Promise.all([
      admin.from("gym_config")
        .select("whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_confirmacion")
        .eq("gym_id", args.gymId).maybeSingle(),
      admin.from("alumnos").select("nombre").eq("id", args.alumnoId).maybeSingle(),
      admin.from("gyms").select("nombre").eq("id", args.gymId).maybeSingle(),
    ]);
    if (!config?.whatsapp_activo || !config.whatsapp_phone_number_id || !config.whatsapp_access_token) return "sin_aviso";
    const nombre = alumno?.nombre?.trim() || "";

    if (await ventanaAbierta(admin, args.gymId, args.telefono)) {
      const texto = args.resultado === "confirmado"
        ? `¡Gracias${nombre ? ` ${nombre}` : ""}! Confirmamos tu pago ✅`
        : `No pudimos confirmar tu comprobante 😕${args.motivo?.trim() ? ` ${args.motivo.trim()}.` : ""} Escribinos por acá y lo vemos.`;
      const waMessageId = await sendWhatsAppText(config, { to: args.telefono, body: texto });
      await admin.from("mensajes_whatsapp").insert({
        gym_id: args.gymId, alumno_id: args.alumnoId, telefono: args.telefono,
        direccion: "saliente", cuerpo: texto, wa_message_id: waMessageId, estado: "enviado",
      });
      return "texto";
    }

    if (args.resultado === "confirmado" && config.whatsapp_template_confirmacion) {
      const [r] = await sendNotification(
        { ...config, email_activo: false, whatsapp_activo: true },
        { type: "confirmacion_pago", alumno: { nombre: nombre || "alumno", telefono: args.telefono }, gym: { nombre: gym?.nombre ?? "" } },
      );
      if (r?.ok) {
        await registrarAvisoEnInbox(admin, { gymId: args.gymId, alumnoId: args.alumnoId, telefono: args.telefono, waMessageId: r.provider_id, tipo: "confirmacion_pago" });
        return "plantilla";
      }
      console.error("[comprobantes] no salió la plantilla de confirmación:", args.gymId, r?.error);
      return "sin_aviso";
    }

    console.log("[comprobantes] fuera de la ventana de 24 h, no se avisa al alumno —", args.resultado, "gym:", args.gymId);
    return "sin_aviso";
  } catch (err) {
    console.error("[comprobantes] error avisando al alumno:", args.gymId, err instanceof Error ? err.message : err);
    return "sin_aviso";
  }
}
