// Canal email — ÚNICO punto de importación de Resend en todo el proyecto.
// Nunca importar Resend fuera de este archivo.
import type { NotificationPayload, GymNotificationConfig } from "../index";
import { clubioEmailHtml, clubioEmailTable, emailAccentColor, type EmailBrand } from "@/lib/email/template";
import { METODO_LABEL } from "@/lib/constants";

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
const DEFAULT_TEMPLATES: Record<"aviso_vencimiento" | "recordatorio_vencido" | "aviso_vence_hoy_aumento", { subject: string; body: string }> = {
  aviso_vencimiento: {
    subject: "{gym} · Tu cuota de {mes}/{anio} vence pronto · ${monto}",
    body: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} está por vencer.",
  },
  recordatorio_vencido: {
    subject: "{gym} · Tu cuota de {mes}/{anio} está vencida",
    body: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} está vencida.",
  },
  aviso_vence_hoy_aumento: {
    subject: "{gym} · Tu cuota vence HOY · ${monto}",
    body: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} vence hoy. A partir de mañana el valor pasa a ${monto_aumentado}.",
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

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido" || type === "aviso_vence_hoy_aumento") && cuota) {
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

  if ((type === "aviso_vencimiento" || type === "recordatorio_vencido" || type === "aviso_vence_hoy_aumento") && cuota) {
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
    monto_aumentado: (cuota.monto_incrementado ?? cuota.monto_total).toLocaleString("es-AR"),
    mes: mesNombre(cuota.mes),
    anio: String(cuota.anio),
  };
}

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mesNombre(n: number) { return MESES[n] ?? String(n); }

// Email consolidado para alumnos con múltiples cuotas pendientes.
// Usado cuando el worker de avisos detecta más de 1 cuota por alumno.
export async function sendEmailAvisosLote(params: {
  to: string;
  alumnoNombre: string;
  gymNombre: string;
  logoUrl?: string | null;
  colorAccento?: string | null;
  emailRemitenteNombre?: string | null;
  emailRemitenteAddress?: string | null;
  tieneVencidas: boolean;
  cuotas: Array<{ mes: number; anio: number; monto_total: number | null; estado: string; pagoUrl: string }>;
  pagarTodoUrl: string;
  montoTotal: number;
}): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const brand: EmailBrand = { logoUrl: params.logoUrl, colorAccent: params.colorAccento };
  const accent = emailAccentColor(brand);

  const from = params.emailRemitenteAddress
    ? `${params.emailRemitenteNombre ?? params.gymNombre} <${params.emailRemitenteAddress}>`
    : `${params.gymNombre} <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`;

  const subject = params.tieneVencidas
    ? `${params.gymNombre} · Cuotas vencidas — total $${params.montoTotal.toLocaleString("es-AR")}`
    : `${params.gymNombre} · Cuotas próximas a vencer — total $${params.montoTotal.toLocaleString("es-AR")}`;

  const cuotaListHtml = params.cuotas.map(({ mes, anio, monto_total, estado, pagoUrl }) => `
    <tr style="border-bottom:1px solid #1e293b">
      <td style="padding:10px 0;color:#f9fafb">
        ${mesNombre(mes)} ${anio}
        ${estado === "vencida" ? '<span style="color:#f87171;font-size:11px;margin-left:8px">VENCIDA</span>' : ""}
      </td>
      <td style="padding:10px 0;color:#f9fafb;font-family:monospace">$${(monto_total ?? 0).toLocaleString("es-AR")}</td>
      <td style="padding:10px 0;text-align:right">
        <a href="${pagoUrl}" style="color:${accent};font-size:12px;text-decoration:none;font-weight:bold">Pagar →</a>
      </td>
    </tr>
  `).join("");

  const html = clubioEmailHtml(`
    <p style="color:#f9fafb;margin:0 0 16px">
      Hola ${escapeHtml(params.alumnoNombre)}, tenés <strong>${params.cuotas.length} cuotas</strong> pendientes en <strong>${escapeHtml(params.gymNombre)}</strong>:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      ${cuotaListHtml}
      <tr>
        <td style="padding:12px 0;color:#9ca3af;font-size:13px">Total</td>
        <td style="padding:12px 0;color:#f9fafb;font-family:monospace;font-weight:bold">$${params.montoTotal.toLocaleString("es-AR")}</td>
        <td></td>
      </tr>
    </table>
    <p style="margin:0 0 20px;text-align:center">
      <a href="${params.pagarTodoUrl}" style="background:${accent};color:#030712;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block">
        Pagar todo — $${params.montoTotal.toLocaleString("es-AR")}
      </a>
    </p>
    <p style="color:#4b5563;font-size:12px;margin:0">${escapeHtml(params.gymNombre)}</p>
  `, brand);

  const { data, error } = await resend.emails.send({ from, to: params.to, subject, html });
  if (error || !data?.id) throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  return data.id;
}

// ─── Notificaciones al owner del gym (no al alumno) ──────────────────────────

export async function sendGymOwnerPagoRecibido(params: {
  to: string;
  gymNombre: string;
  alumnoNombre: string;
  alumnoApellido: string;
  monto: number;
  metodo: string;
  descripcion: string;
}): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`,
    to:   params.to,
    subject: `✓ Pago recibido — ${params.alumnoNombre} ${params.alumnoApellido} · $${params.monto.toLocaleString("es-AR")}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#34d399;font-size:16px">✓ Pago recibido</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:13px">${escapeHtml(params.gymNombre)}</p>
      ${clubioEmailTable([
        ["Alumno",  `${escapeHtml(params.alumnoNombre)} ${escapeHtml(params.alumnoApellido)}`],
        ["Cuota",   escapeHtml(params.descripcion)],
        ["Monto",   `$${params.monto.toLocaleString("es-AR")}`],
        ["Método",  METODO_LABEL[params.metodo] ?? escapeHtml(params.metodo)],
      ])}
    `),
  });

  if (error || !data?.id) throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  return data.id;
}

export async function sendGymOwnerCuotasVencidas(params: {
  to: string;
  gymNombre: string;
  cuotas: Array<{ nombre: string; apellido: string; monto_total: number; mes: number; anio: number }>;
}): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const total = params.cuotas.reduce((s, c) => s + c.monto_total, 0);
  const filas = params.cuotas.map((c) => `
    <tr style="border-bottom:1px solid #1e293b">
      <td style="padding:8px 0;color:#f9fafb">${escapeHtml(c.nombre)} ${escapeHtml(c.apellido)}</td>
      <td style="padding:8px 0;color:#9ca3af;font-size:13px">${mesNombre(c.mes)} ${c.anio}</td>
      <td style="padding:8px 0;color:#f87171;font-family:monospace">$${c.monto_total.toLocaleString("es-AR")}</td>
    </tr>`).join("");

  const { data, error } = await resend.emails.send({
    from: `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`,
    to:   params.to,
    subject: `${params.cuotas.length} cuota${params.cuotas.length > 1 ? "s" : ""} vencida${params.cuotas.length > 1 ? "s" : ""} hoy — ${params.gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#f87171;font-size:16px">Cuotas vencidas hoy</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:13px">${escapeHtml(params.gymNombre)}</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 0;color:#6b7280;font-size:12px;font-weight:normal;border-bottom:1px solid #374151">Alumno</th>
            <th style="text-align:left;padding:6px 0;color:#6b7280;font-size:12px;font-weight:normal;border-bottom:1px solid #374151">Cuota</th>
            <th style="text-align:left;padding:6px 0;color:#6b7280;font-size:12px;font-weight:normal;border-bottom:1px solid #374151">Monto</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:10px 0;color:#9ca3af;font-size:13px">Total vencido hoy</td>
            <td style="padding:10px 0;color:#f87171;font-family:monospace;font-weight:bold">$${total.toLocaleString("es-AR")}</td>
          </tr>
        </tfoot>
      </table>
    `),
  });

  if (error || !data?.id) throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  return data.id;
}

export async function sendGymOwnerResumenSemanal(params: {
  to: string;
  gymNombre: string;
  totalVencidas: number;
  montoTotal: number;
  dashboardUrl: string;
}): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`,
    to:   params.to,
    subject: `Resumen semanal — ${params.totalVencidas} cuota${params.totalVencidas !== 1 ? "s" : ""} vencida${params.totalVencidas !== 1 ? "s" : ""} · ${params.gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#f9fafb;font-size:16px">Resumen semanal</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:13px">${escapeHtml(params.gymNombre)}</p>
      ${clubioEmailTable([
        ["Cuotas vencidas", String(params.totalVencidas)],
        ["Monto total",     `$${params.montoTotal.toLocaleString("es-AR")}`],
      ])}
      <p style="margin:24px 0 0">
        <a href="${params.dashboardUrl}/dashboard/cuotas?estado=vencida"
           style="background:#34d399;color:#030712;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;font-size:14px">
          Ver cuotas vencidas →
        </a>
      </p>
    `),
  });

  if (error || !data?.id) throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  return data.id;
}

// ─── Emails administrativos CLUBIO (no notificaciones de alumnos) ─────────────

export async function sendGymTestEmail(params: {
  to: string;
  gymNombre: string;
  from: string;
}): Promise<string> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: params.from,
    to:   params.to,
    subject: `[TEST] Configuración de email — ${escapeHtml(params.gymNombre)}`,
    html: `
      <p>Este es un email de prueba enviado desde <strong>${escapeHtml(params.gymNombre)}</strong> en CLUBIO.</p>
      <p>Si recibiste este mensaje, la configuración de email está funcionando correctamente.</p>
    `,
  });

  if (error || !data?.id) throw new Error(`Resend error: ${error?.message ?? "sin id"}`);
  return data.id;
}

export async function sendLeadNotifications(params: {
  notificationTo: string;
  lead: {
    nombre: string;
    email: string;
    telefono?: string;
    gym_nombre?: string;
    cantidad_alumnos?: string;
    como_nos_conocio?: string;
  };
}): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;
  const { lead } = params;

  await resend.emails.send({
    from,
    to:      params.notificationTo,
    subject: `Nuevo lead: ${lead.gym_nombre ?? lead.nombre}`,
    replyTo: lead.email,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:20px">Nueva solicitud de demo — Landing</h2>
      ${clubioEmailTable([
        ["Nombre",          lead.nombre],
        ["Email",           `<a href="mailto:${lead.email}" style="color:#34d399">${lead.email}</a>`],
        ["Teléfono",        lead.telefono],
        ["Gimnasio",        lead.gym_nombre],
        ["Alumnos",         lead.cantidad_alumnos],
        ["Cómo nos conoció", lead.como_nos_conocio],
      ])}
    `),
  });

  await resend.emails.send({
    from,
    to:      lead.email,
    subject: "Recibimos tu solicitud de demo — CLUBIO",
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 12px;color:#f9fafb;font-size:20px">¡Listo, ${escapeHtml(lead.nombre)}!</h2>
      <p style="color:#9ca3af;line-height:1.6;margin:0 0 16px">
        Recibimos tu solicitud de demo${lead.gym_nombre ? ` para <strong style="color:#f9fafb">${escapeHtml(lead.gym_nombre)}</strong>` : ""}.
        Te contactamos a tu WhatsApp dentro de las próximas <strong style="color:#f9fafb">24 horas</strong>.
      </p>
    `),
  });
}

export async function sendSuscripcionVerificacionReport(params: {
  to: string;
  hoyStr: string;
  vencidasRows: Array<{ gymNombre: string; plan: string; fechaVencimiento: string }>;
  avisosRows: Array<{ gymNombre: string; plan: string; diasRestantes: number; fechaVencimiento: string }>;
}): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const vencidasHtml = params.vencidasRows.length > 0
    ? `<h3 style="color:#f87171;margin:0 0 8px;font-size:15px">⛔ Licencias vencidas — gyms desactivados (${params.vencidasRows.length})</h3>
       ${clubioEmailTable(params.vencidasRows.map((r) => [r.gymNombre, `Plan ${r.plan} · venció ${r.fechaVencimiento}`]))}` : "";

  const avisosHtml = params.avisosRows.length > 0
    ? `<h3 style="color:#fbbf24;margin:16px 0 8px;font-size:15px">⚠️ Licencias próximas a vencer (${params.avisosRows.length})</h3>
       ${clubioEmailTable(params.avisosRows.map((r) => [r.gymNombre, `Plan ${r.plan} · vence en ${r.diasRestantes} día${r.diasRestantes !== 1 ? "s" : ""} (${r.fechaVencimiento})`]))}` : "";

  await resend.emails.send({
    from,
    to: params.to,
    subject: `Suscripciones CLUBIO — ${new Date().toLocaleDateString("es-AR")}: ${params.vencidasRows.length} vencidas, ${params.avisosRows.length} por vencer`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:20px">Reporte diario de suscripciones</h2>
      <p style="color:#9ca3af;margin:0 0 20px">${params.hoyStr}</p>
      ${vencidasHtml}
      ${avisosHtml}
    `),
  }).catch((e) => console.error("[verificar-suscripciones] email error:", e));
}

export async function sendCobroSuscripcionEmail(params: {
  gymNombre: string;
  emailContacto: string;
  plan: string;
  montoBase: number;
  moneda: "USD" | "ARS";
  montoArs: number;
  periodo: string;
  linkPago: string;
}): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const [anio, mes] = params.periodo.split("-");
  const periodoLabel = `${mes}/${anio}`;
  const montoLabel = params.moneda === "ARS"
    ? `$ ${params.montoBase.toLocaleString("es-AR")}`
    : `USD ${params.montoBase}`;

  await resend.emails.send({
    from,
    to:      params.emailContacto,
    subject: `Renovación CLUBIO ${periodoLabel} — ${params.gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">Renovación de suscripción</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hola <strong style="color:#f9fafb">${escapeHtml(params.gymNombre)}</strong>, te enviamos el link para renovar tu suscripción a CLUBIO.</p>
      ${clubioEmailTable([
        ["Plan",    params.plan],
        ["Período", periodoLabel],
        ["Monto",   montoLabel],
        ...(params.moneda === "USD" ? [["Monto ARS", `$ ${params.montoArs.toLocaleString("es-AR")}`] as [string, string]] : []),
      ])}
      <a href="${params.linkPago}"
        style="display:inline-block;margin-top:8px;padding:12px 28px;background:#34d399;color:#030712;font-weight:800;font-size:15px;text-decoration:none;border-radius:8px;font-family:monospace;letter-spacing:0.05em">
        PAGAR AHORA
      </a>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0">Si no podés hacer clic en el botón, copiá este link: <span style="color:#9ca3af">${params.linkPago}</span></p>
    `),
  }).catch((e) => console.error("[sendCobroSuscripcionEmail] error:", e));
}

export async function sendSuscripcionAvisoGym(params: {
  to: string;
  gymNombre: string;
  planLabel: string;
  diasRestantes: number;
  vencimientoLabel: string;
}): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;
  const { dias: dias, vencimientoLabel, planLabel, gymNombre } = { dias: params.diasRestantes, ...params };

  const urgencia = dias <= 3 ? "muy pronto" : dias <= 7 ? "pronto" : "próximamente";
  const urgenciaColor = dias <= 3 ? "#f87171" : dias <= 7 ? "#f97316" : "#fbbf24";

  await resend.emails.send({
    from,
    to: params.to,
    subject: `Tu suscripción CLUBIO vence en ${dias} día${dias !== 1 ? "s" : ""} — ${gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">Tu suscripción vence ${urgencia}</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
        Hola <strong style="color:#f9fafb">${escapeHtml(gymNombre)}</strong>, te avisamos que tu suscripción a CLUBIO vence
        <strong style="color:${urgenciaColor}"> el ${vencimientoLabel}</strong> (en ${dias} día${dias !== 1 ? "s" : ""}).
      </p>
      <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <p style="margin:0;font-size:13px;color:#9ca3af">Plan: <strong style="color:#f9fafb">${escapeHtml(planLabel)}</strong></p>
        <p style="margin:8px 0 0;font-size:13px;color:#9ca3af">Vencimiento: <strong style="color:${urgenciaColor}">${vencimientoLabel}</strong></p>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:0">
        Recibirás el link de pago en los próximos días. Si ya lo recibiste, podés ignorar este mensaje.
        Ante cualquier duda, respondé este email.
      </p>
    `),
  });
}

export async function sendRegistroSolicitudEmails(params: {
  notificationTo: string;
  nombreGym: string;
  nombreContacto: string;
  email: string;
  telefono?: string;
  ciudad?: string;
  mensaje?: string;
}): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const { error: errAdmin } = await resend.emails.send({
    from,
    to:      params.notificationTo,
    subject: `Nueva solicitud: ${params.nombreGym}`,
    replyTo: params.email,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:20px">Nueva solicitud de registro</h2>
      ${clubioEmailTable([
        ["Gimnasio",  params.nombreGym],
        ["Contacto",  params.nombreContacto],
        ["Email",     `<a href="mailto:${params.email}" style="color:#34d399">${params.email}</a>`],
        ["Teléfono",  params.telefono],
        ["Ciudad",    params.ciudad],
        ["Mensaje",   params.mensaje],
      ])}
    `),
  });

  if (errAdmin) throw new Error("Error al enviar. Por favor escribinos directamente.");

  await resend.emails.send({
    from,
    to:      params.email,
    subject: "Recibimos tu solicitud — CLUBIO",
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 12px;color:#f9fafb;font-size:20px">Hola ${escapeHtml(params.nombreContacto)},</h2>
      <p style="color:#9ca3af;line-height:1.6;margin:0 0 16px">
        Recibimos la solicitud de <strong style="color:#f9fafb">${escapeHtml(params.nombreGym)}</strong> para sumarse a CLUBIO.
        Vamos a revisarla y nos ponemos en contacto con vos en las próximas <strong style="color:#f9fafb">24–48hs</strong>.
      </p>
    `),
  }).catch(() => {});
}

export async function sendPlanCambiadoEmail(params: {
  to: string;
  gymNombre: string;
  plan: string;
  motivo?: string;
}): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  await resend.emails.send({
    from,
    to:      params.to,
    subject: `Tu plan CLUBIO fue actualizado — ${params.gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">Actualización de plan</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
        Hola <strong style="color:#f9fafb">${escapeHtml(params.gymNombre)}</strong>, tu plan de suscripción a CLUBIO fue actualizado.
      </p>
      ${clubioEmailTable([
        ["Nuevo plan", params.plan],
        ...(params.motivo ? [["Motivo", params.motivo] as [string, string]] : []),
      ])}
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0">
        Si tenés alguna duda, respondé este email o contactate con soporte.
      </p>
    `),
  }).catch((e) => console.error("[sendPlanCambiadoEmail] error:", e));
}
