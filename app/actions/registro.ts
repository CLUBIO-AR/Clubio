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

  const adminEmail = process.env.CLUBIO_ADMIN_EMAIL ?? "hola@clubio.com.ar";

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`,
    to: adminEmail,
    subject: `Nueva solicitud: ${nombre_gym}`,
    html: `
      <h2>Nueva solicitud de registro — CLUBIO</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Gimnasio</td><td style="padding:8px 0;font-weight:600">${nombre_gym}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Contacto</td><td style="padding:8px 0">${nombre_contacto}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
        ${telefono ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Teléfono</td><td style="padding:8px 0">${telefono}</td></tr>` : ""}
        ${ciudad ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Ciudad</td><td style="padding:8px 0">${ciudad}</td></tr>` : ""}
        ${mensaje ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top">Mensaje</td><td style="padding:8px 0">${mensaje}</td></tr>` : ""}
      </table>
    `,
    replyTo: email,
  });

  if (error) return { ok: false, error: "Error al enviar. Por favor escribinos directamente." };
  return { ok: true };
}
