// Canal email — ÚNICO lugar donde se importa Resend.
// Nunca importar Resend fuera de este archivo.
import type { NotificationPayload, GymNotificationConfig } from "../index";
import { clubioEmailHtml, emailAccentColor, type EmailBrand } from "@/lib/email/template";

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

  const subject = buildSubject(payload, config);
  const html    = buildHtml(payload, config);

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

// Email de bienvenida para el owner de un gym recién dado de alta desde el panel admin.
// No usa NotificationPayload (no es una notificación a un alumno) — credenciales de acceso del owner.
export async function sendGymWelcomeEmail(params: {
  to: string;
  ownerNombre: string;
  gymNombre: string;
  loginUrl: string;
  passwordTemporal: string;
}): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`;

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: `Bienvenido a CLUBIO — accesos de ${params.gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 12px;color:#f9fafb;font-size:20px">Hola ${params.ownerNombre},</h2>
      <p style="color:#9ca3af;line-height:1.6;margin:0 0 16px">
        Ya creamos tu cuenta de <strong style="color:#f9fafb">${params.gymNombre}</strong> en CLUBIO. Estos son tus datos de acceso:
      </p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 16px">
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;width:120px">URL</td><td style="padding:8px 0;color:#f9fafb"><a href="${params.loginUrl}" style="color:#34d399">${params.loginUrl}</a></td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Email</td><td style="padding:8px 0;color:#f9fafb">${params.to}</td></tr>
        <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Contraseña temporal</td><td style="padding:8px 0;color:#f9fafb">${params.passwordTemporal}</td></tr>
      </table>
      <p style="color:#9ca3af;line-height:1.6;margin:0">
        Por seguridad, te recomendamos cambiar la contraseña apenas inicies sesión.
      </p>
    `),
  });

  if (error || !data?.id) {
    throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  }

  return data.id;
}

// Plantillas por defecto (texto plano, con variables {nombre}/{gym}/{monto}/{mes}/{anio})
// para los 2 únicos tipos de notificación que realmente se disparan — ver
// app/api/cron/workers/enviar-avisos-gym/route.ts. Los gyms pueden personalizarlas
// desde Configuración (gym_config.email_templates), guardando subject/body propios.
const DEFAULT_TEMPLATES: Record<"aviso_vencimiento" | "recordatorio_vencido", { subject: string; body: string }> = {
  aviso_vencimiento: {
    subject: "{gym} · Tu cuota de {mes}/{anio} vence pronto · ${monto}",
    body: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} está por vencer.",
  },
  recordatorio_vencido: {
    subject: "{gym} · Tu cuota de {mes}/{anio} está vencida",
    body: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} está vencida.",
  },
};

// Sustitución segura de variables {var} en texto plano. No interpreta HTML —
// el resultado se escapa por separado antes de insertarlo en el email (ver buildHtml).
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (full, key: string) => (key in vars ? vars[key] : full));
}

// El gym escribe sus plantillas como texto plano — nunca debe poder inyectar
// markup en un email que termina en la bandeja de entrada de sus alumnos.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSubject(payload: NotificationPayload, config: GymNotificationConfig): string {
  const { type, cuota, gym } = payload;

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido") && cuota) {
    const tpl = config.email_templates?.[type]?.subject ?? DEFAULT_TEMPLATES[type].subject;
    return renderTemplate(tpl, cuotaVars(payload, cuota));
  }
  if (type === "confirmacion_pago") {
    return `✓ Pago recibido. Gracias ${payload.alumno.nombre}.`;
  }
  if (type === "bienvenida") {
    return `Bienvenido a ${gym.nombre}`;
  }
  return `Notificación de ${gym.nombre}`;
}

function buildHtml(payload: NotificationPayload, config: GymNotificationConfig): string {
  const { type, alumno, cuota, gym } = payload;
  const brand: EmailBrand = { logoUrl: gym.logo_url, colorAccent: gym.color_acento };
  const accent = emailAccentColor(brand);

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido") && cuota) {
    const tpl = config.email_templates?.[type]?.body ?? DEFAULT_TEMPLATES[type].body;
    const message = escapeHtml(renderTemplate(tpl, cuotaVars(payload, cuota))).replace(/\n/g, "<br/>");

    return clubioEmailHtml(`
      <p style="color:#f9fafb;line-height:1.6;margin:0 0 20px">${message}</p>
      <p style="margin:0 0 20px">
        <a href="${cuota.pago_url}" style="background:${accent};color:#030712;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">Pagar ahora</a>
      </p>
      <p style="color:#4b5563;font-size:12px;margin:0">${escapeHtml(gym.nombre)}</p>
    `, brand);
  }

  if (type === "confirmacion_pago") {
    return clubioEmailHtml(`
      <p style="color:#f9fafb;margin:0 0 8px">✓ Pago recibido. Gracias ${escapeHtml(alumno.nombre)}.</p>
      <p style="color:#4b5563;font-size:12px;margin:0">${escapeHtml(gym.nombre)}</p>
    `, brand);
  }

  return clubioEmailHtml(`<p style="color:#f9fafb;margin:0">Notificación de ${escapeHtml(gym.nombre)}.</p>`, brand);
}

// Variables disponibles en las plantillas de cuota: {nombre} {gym} {monto} {mes} {anio}.
// El link de pago no es una variable de texto — siempre se muestra como botón CTA aparte.
function cuotaVars(payload: NotificationPayload, cuota: NonNullable<NotificationPayload["cuota"]>): Record<string, string> {
  return {
    nombre: payload.alumno.nombre,
    gym: payload.gym.nombre,
    monto: cuota.monto_total.toLocaleString("es-AR"),
    mes: mesNombre(cuota.mes),
    anio: String(cuota.anio),
  };
}

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mesNombre(n: number) { return MESES[n] ?? String(n); }
