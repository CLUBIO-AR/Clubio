// Canal email — ÚNICO lugar donde se importa Resend.
// Nunca importar Resend fuera de este archivo.
import type { NotificationPayload, GymNotificationConfig } from "../index";

export async function sendEmail(
  config: GymNotificationConfig & { gym_nombre?: string },
  payload: NotificationPayload
): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const gymNombre = payload.gym.nombre;
  const from = config.email_remitente_address
    ? `${config.email_remitente_nombre ?? gymNombre} <${config.email_remitente_address}>`
    : `${gymNombre} <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`;

  const subject = buildSubject(payload);
  const html    = buildHtml(payload);

  const { data, error } = await resend.emails.send({
    from,
    to: payload.alumno.email!,
    subject,
    html,
  });

  if (error || !data?.id) {
    throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  }

  return data.id;
}

function buildSubject(payload: NotificationPayload): string {
  const { type, cuota, gym } = payload;

  if (type === "aviso_vencimiento" && cuota) {
    return `${gym.nombre} · Tu cuota de ${mesNombre(cuota.mes)}/${cuota.anio} vence pronto · $${cuota.monto_total.toLocaleString("es-AR")}`;
  }
  if (type === "recordatorio_vencido" && cuota) {
    return `${gym.nombre} · Tu cuota de ${mesNombre(cuota.mes)}/${cuota.anio} está vencida`;
  }
  if (type === "confirmacion_pago") {
    return `✓ Pago recibido. Gracias ${payload.alumno.nombre}.`;
  }
  if (type === "bienvenida") {
    return `Bienvenido a ${gym.nombre}`;
  }
  return `Notificación de ${gym.nombre}`;
}

function buildHtml(payload: NotificationPayload): string {
  const { type, alumno, cuota, gym } = payload;

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido") && cuota) {
    return `
      <p>Hola ${alumno.nombre},</p>
      <p>Tu cuota de <strong>${mesNombre(cuota.mes)} ${cuota.anio}</strong> en <strong>${gym.nombre}</strong>
         por <strong>$${cuota.monto_total.toLocaleString("es-AR")}</strong>
         ${type === "aviso_vencimiento" ? "está por vencer" : "está vencida"}.</p>
      <p><a href="${cuota.pago_url}" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Pagar ahora</a></p>
      <p style="color:#666;font-size:12px;">${gym.nombre}</p>
    `;
  }

  if (type === "confirmacion_pago") {
    return `<p>✓ Pago recibido. Gracias ${alumno.nombre}.</p><p>${gym.nombre}</p>`;
  }

  return `<p>Notificación de ${gym.nombre}.</p>`;
}

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mesNombre(n: number) { return MESES[n] ?? String(n); }
