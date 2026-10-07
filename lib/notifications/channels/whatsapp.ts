// Canal WhatsApp — Meta Cloud API. Cada gym conecta su propio número (CLUBIO no paga
// por mensajes, el gym lo paga directo a Meta). Credenciales en gym_config
// (whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_*).
//
// Solo se pueden mandar mensajes de tipo "template" fuera de la ventana de 24hs de
// conversación — por eso las plantillas (whatsapp_template_aviso / _confirmacion) tienen
// que estar previamente aprobadas por Meta en WhatsApp Manager.
//
// La plantilla "aviso_cuota" tiene 5 variables de texto en el body
// ({{1}} nombre, {{2}} actividad, {{3}} mes/año, {{4}} monto, {{5}} fecha límite) +
// un botón "Pagar ahora" con URL dinámica (base fija configurada en la plantilla + {{1}} = token).
import type { NotificationPayload, GymNotificationConfig } from "../index";
import { normalizarTelefonoAR } from "@/lib/telefono";

const GRAPH_VERSION = "v21.0";
// Las plantillas pueden estar aprobadas en "Español (ARG)" (es_AR) o en "Español" (es).
// Probamos en este orden: si Meta responde #132001 (no existe en ese idioma), seguimos con el próximo.
const TEMPLATE_LANGUAGES = ["es_AR", "es"] as const;
const ERROR_TEMPLATE_NO_EXISTE = 132001;

export async function sendWhatsApp(
  config: GymNotificationConfig,
  payload: NotificationPayload
): Promise<string> {
  const to = normalizePhone(payload.alumno.telefono);
  if (!to) throw new Error("Teléfono de alumno inválido o ausente");
  if (!config.whatsapp_phone_number_id || !config.whatsapp_access_token) {
    throw new Error("WhatsApp no configurado para este gym");
  }

  const { templateName, bodyParams, buttonParam } = buildTemplate(config, payload);
  if (!templateName) {
    throw new Error(`No hay plantilla de WhatsApp configurada para el tipo "${payload.type}"`);
  }

  const components: Record<string, unknown>[] = [
    { type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) },
  ];

  if (buttonParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonParam }],
    });
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.whatsapp_phone_number_id}/messages`;

  let data: { messages?: { id?: string }[]; error?: { message?: string; code?: number } } = {};
  for (const [i, language] of TEMPLATE_LANGUAGES.entries()) {
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
          language: { code: language },
          components,
        },
      }),
    });

    data = await res.json();
    if (res.ok) break;

    const ultimoIdioma = i === TEMPLATE_LANGUAGES.length - 1;
    if (data?.error?.code === ERROR_TEMPLATE_NO_EXISTE && !ultimoIdioma) continue;
    throw new Error(`WhatsApp API error: ${data?.error?.message ?? res.statusText}`);
  }

  const messageId = data?.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API no devolvió message id");
  return messageId;
}

// Mensaje de texto libre — solo válido dentro de la ventana de 24hs desde el último
// mensaje del alumno (fuera de esa ventana, Meta rechaza el envío). Se usa para el
// inbox del dashboard (respuestas manuales), no para los avisos automáticos.
export async function sendWhatsAppText(
  config: Pick<GymNotificationConfig, "whatsapp_phone_number_id" | "whatsapp_access_token">,
  params: { to: string; body: string }
): Promise<string> {
  const to = normalizePhone(params.to);
  if (!to) throw new Error("Teléfono inválido o ausente");
  if (!config.whatsapp_phone_number_id || !config.whatsapp_access_token) {
    throw new Error("WhatsApp no configurado para este gym");
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
      type: "text",
      text: { body: params.body },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp API error: ${data?.error?.message ?? res.statusText}`);

  const messageId = data?.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API no devolvió message id");
  return messageId;
}

// Mensaje con botones de respuesta (hasta 3). Solo se puede mandar dentro de la ventana
// de 24hs desde el último mensaje del alumno, igual que el texto libre. Meta limita el
// título de cada botón a 20 caracteres y el id a 256.
export async function sendWhatsAppButtons(
  config: Pick<GymNotificationConfig, "whatsapp_phone_number_id" | "whatsapp_access_token">,
  params: { to: string; body: string; buttons: Array<{ id: string; title: string }> }
): Promise<string> {
  const to = normalizePhone(params.to);
  if (!to) throw new Error("Teléfono inválido o ausente");
  if (!config.whatsapp_phone_number_id || !config.whatsapp_access_token) {
    throw new Error("WhatsApp no configurado para este gym");
  }
  if (params.buttons.length === 0 || params.buttons.length > 3) {
    throw new Error("Un mensaje con botones lleva entre 1 y 3 botones");
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
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: params.body.slice(0, 1024) },
        action: {
          buttons: params.buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
          })),
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp API error: ${data?.error?.message ?? res.statusText}`);

  const messageId = data?.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API no devolvió message id");
  return messageId;
}

// Mensaje con lista desplegable (hasta 10 opciones). Igual que los botones, solo dentro de
// la ventana de 24hs. Límites de Meta: texto del botón 20, título de fila 24, descripción 72.
export async function sendWhatsAppList(
  config: Pick<GymNotificationConfig, "whatsapp_phone_number_id" | "whatsapp_access_token">,
  params: { to: string; body: string; button: string; rows: Array<{ id: string; title: string; description?: string }> }
): Promise<string> {
  const to = normalizePhone(params.to);
  if (!to) throw new Error("Teléfono inválido o ausente");
  if (!config.whatsapp_phone_number_id || !config.whatsapp_access_token) {
    throw new Error("WhatsApp no configurado para este gym");
  }
  if (params.rows.length === 0) throw new Error("La lista necesita al menos una opción");

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
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: params.body.slice(0, 1024) },
        action: {
          button: params.button.slice(0, 20),
          sections: [{
            title: "Opciones",
            rows: params.rows.slice(0, 10).map((r) => ({
              id: r.id.slice(0, 200),
              title: r.title.slice(0, 24),
              ...(r.description ? { description: r.description.slice(0, 72) } : {}),
            })),
          }],
        },
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp API error: ${data?.error?.message ?? res.statusText}`);

  const messageId = data?.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp API no devolvió message id");
  return messageId;
}

function buildTemplate(
  config: GymNotificationConfig,
  payload: NotificationPayload
): { templateName?: string | null; bodyParams: string[]; buttonParam?: string } {
  const { type, alumno, cuota, gym } = payload;

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido" || type === "aviso_vence_hoy_aumento") && cuota) {
    const monto = type === "aviso_vence_hoy_aumento"
      ? (cuota.monto_incrementado ?? cuota.monto_total)
      : cuota.monto_total;

    const bodyBase = [
      alumno.nombre,
      // Sin actividad asignada: "Cuota mensual" (antes decía "Tu cuota de Cuota").
      cuota.actividad_nombre ?? "Cuota mensual",
      `${mesNombre(cuota.mes)}/${cuota.anio}`,
      monto.toLocaleString("es-AR"),
      formatFecha(cuota.fecha_vencimiento),
    ];

    // Modo transferencia: no hay link de pago, se pide transferir al alias del gym —
    // plantilla sin botón dinámico (ver gym_config.email_modo).
    if (config.modo_pago === "transferencia" && config.transferencia_alias) {
      return {
        templateName: config.whatsapp_template_transferencia,
        bodyParams: [...bodyBase, config.transferencia_alias],
      };
    }

    if (!cuota.pago_token) {
      throw new Error("Falta pago_token en el payload — requerido por el botón de la plantilla de WhatsApp");
    }

    return {
      templateName: config.whatsapp_template_aviso,
      bodyParams: bodyBase,
      buttonParam: cuota.pago_token,
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
// Convierte lo que haya cargado el gym (con o sin 54/9/0/15) al formato que espera Meta.
function normalizePhone(telefono?: string | null): string | null {
  return normalizarTelefonoAR(telefono);
}

function formatFecha(fechaIso?: string): string {
  if (!fechaIso) return "-";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mesNombre(n: number) { return MESES[n] ?? String(n); }
