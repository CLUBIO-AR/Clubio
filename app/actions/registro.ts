"use server";

import { z } from "zod";

const Schema = z.object({
  nombre_gym:    z.string().min(2, "Nombre del gym requerido"),
  nombre_contacto: z.string().min(2, "Nombre de contacto requerido"),
  email:         z.string().email("Email inválido"),
  telefono:      z.string().optional(),
  ciudad:        z.string().optional(),
  mensaje:       z.string().optional(),
});

export type RegistroResult =
  | { ok: true }
  | { ok: false; error: string };

export async function enviarSolicitudRegistro(
  formData: unknown
): Promise<RegistroResult> {
  const parsed = Schema.safeParse(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { nombre_gym, nombre_contacto, email, telefono, ciudad, mensaje } = parsed.data;

  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Notificación interna a valensosa157@gmail.com
  const { error: errAdmin } = await resend.emails.send({
    from,
    to: "valensosa157@gmail.com",
    subject: `Nueva solicitud: ${nombre_gym}`,
    html: `
      <h2 style="margin:0 0 16px">Nueva solicitud de registro — CLUBIO</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:110px">Gimnasio</td><td style="padding:8px 0;font-weight:600">${nombre_gym}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Contacto</td><td style="padding:8px 0">${nombre_contacto}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
        ${telefono ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Teléfono</td><td style="padding:8px 0">${telefono}</td></tr>` : ""}
        ${ciudad ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Ciudad</td><td style="padding:8px 0">${ciudad}</td></tr>` : ""}
        ${mensaje ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top">Mensaje</td><td style="padding:8px 0">${mensaje}</td></tr>` : ""}
      </table>
    `,
    replyTo: email,
  });

  if (errAdmin) return { ok: false, error: "Error al enviar. Por favor escribinos directamente." };

  // 2. Confirmación automática al interesado
  await resend.emails.send({
    from,
    to: email,
    subject: "Recibimos tu solicitud — CLUBIO",
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#111827">
        <div style="background:#030712;padding:20px 24px;border-radius:10px 10px 0 0;border-bottom:1px solid #1e293b">
          <span style="font-family:monospace;font-weight:800;font-size:18px;letter-spacing:0.1em;color:#34d399">CLUBIO</span>
        </div>
        <div style="background:#0f172a;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #1e293b;border-top:none">
          <h2 style="margin:0 0 12px;color:#f9fafb;font-size:20px">Hola ${nombre_contacto},</h2>
          <p style="color:#9ca3af;line-height:1.6;margin:0 0 16px">
            Recibimos la solicitud de <strong style="color:#f9fafb">${nombre_gym}</strong> para sumarse a CLUBIO.
            Vamos a revisarla y nos ponemos en contacto con vos en las próximas <strong style="color:#f9fafb">24–48hs</strong>.
          </p>
          <p style="color:#9ca3af;line-height:1.6;margin:0">
            Si tenés alguna pregunta mientras tanto, respondé este email y te ayudamos.
          </p>
          <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0"/>
          <p style="color:#4b5563;font-size:12px;margin:0">CLUBIO · Plataforma de gestión para gimnasios</p>
        </div>
      </div>
    `,
  }).catch(() => {}); // best-effort, no bloquea el flujo

  return { ok: true };
}
