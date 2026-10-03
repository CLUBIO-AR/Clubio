// Canal WhatsApp — Meta Cloud API. Cada gym conecta su propio número (CLUBIO no paga
// por mensajes, el gym lo paga directo a Meta). Credenciales en gym_config
// (whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_*).
//
// Solo se pueden mandar mensajes de tipo "template" fuera de la ventana de 24hs de
// conversación — por eso las plantillas (whatsapp_template_aviso / _confirmacion) tienen
// que estar previamente aprobadas por Meta en WhatsApp Manager.
import type { NotificationPayload, GymNotificationConfig } from "../index";

const GRAPH_VERSION = "v21.0";
const DEFAULT_LANGUAGE = "es_AR";

export async function sendWhatsApp(
  config: GymNotificationConfig,
  payload: NotificationPayload
): Promise<string> {
  const to = normalizePhone(payload.alumno.telefono);
  if (!to) throw new Error("Teléfono de alumno inválido o ausente");
  if (!config.whatsapp_phone_number_id || !config.whatsapp_access_token) {
    throw new Error("WhatsApp no configurado para este gym");
  }

  const { templateName, bodyParams } = buildTemplate(config, payload);
  if (!templateName) {
    throw new Error(`No hay plantilla de WhatsApp configurada para el tipo "${payload.type}"`);
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.whatsapp_phone_number_id}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsapp_access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: DEFAULT_LANGUAGE },
        components: [
          {
            type: "body",
            parameters: bodyParams.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`WhatsApp API error: ${data?.error?.message ?? res.statusText}`);
  }

  const messageId = data?.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API no devolvió message id");
  return messageId;
}

function buildTemplate(
  config: GymNotificationConfig,
  payload: NotificationPayload
): { templateName?: string | null; bodyParams: string[] } {
  const { type, alumno, cuota, gym } = payload;

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido" || type === "aviso_vence_hoy_aumento") && cuota) {
    const monto = type === "aviso_vence_hoy_aumento"
      ? (cuota.monto_incrementado ?? cuota.monto_total)
      : cuota.monto_total;

    return {
      templateName: config.whatsapp_template_aviso,
      bodyParams: [
        alumno.nombre,
        gym.nombre,
        `${mesNombre(cuota.mes)} ${cuota.anio}`,
        monto.toLocaleString("es-AR"),
      ],
    };
  }

  if (type === "confirmacion_pago") {
    return {
      templateName: config.whatsapp_template_confirmacion,
      bodyParams: [alumno.nombre, gym.nombre],
    };
  }

  // "bienvenida" no tiene plantilla de WhatsApp propia todavía.
  return { templateName: undefined, bodyParams: [] };
}

// Meta exige el número en formato E.164 sin "+" (ej: 5493625335586).
// Los alumnos pueden tener el teléfono guardado con espacios, guiones o el "+" inicial.
function normalizePhone(telefono?: string | null): string | null {
  if (!telefono) return null;
  const digits = telefono.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mesNombre(n: number) { return MESES[n] ?? String(n); }
