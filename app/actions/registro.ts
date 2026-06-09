"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clubioEmailHtml, clubioEmailTable } from "@/lib/email/template";
import { getAdminSettings } from "@/lib/admin/settings";

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

  // Tabla leads tiene RLS deny-by-default — insertamos con service_role.
  // Best-effort: si falla, no bloqueamos el flujo de contacto por email.
  const notas = [ciudad ? `Ciudad: ${ciudad}` : null, mensaje ? `Mensaje: ${mensaje}` : null]
    .filter(Boolean)
    .join(" · ") || null;
  await createAdminClient()
    .from("leads")
    .insert({
      nombre: nombre_contacto,
      email,
      telefono: telefono ?? null,
      gym_nombre: nombre_gym,
      como_nos_conocio: "Formulario de registro (/registro)",
      notas,
    })
    .then(
      () => {},
      () => {}
    );

  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { notification_email } = await getAdminSettings();

  // 1. Notificación interna
  const { error: errAdmin } = await resend.emails.send({
    from,
    to: notification_email,
    subject: `Nueva solicitud: ${nombre_gym}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:20px">Nueva solicitud de registro</h2>
      ${clubioEmailTable([
        ["Gimnasio", nombre_gym],
        ["Contacto", nombre_contacto],
        ["Email", `<a href="mailto:${email}" style="color:#34d399">${email}</a>`],
        ["Teléfono", telefono],
        ["Ciudad", ciudad],
        ["Mensaje", mensaje],
      ])}
    `),
    replyTo: email,
  });

  if (errAdmin) return { ok: false, error: "Error al enviar. Por favor escribinos directamente." };

  // 2. Confirmación automática al interesado
  await resend.emails.send({
    from,
    to: email,
    subject: "Recibimos tu solicitud — CLUBIO",
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 12px;color:#f9fafb;font-size:20px">Hola ${nombre_contacto},</h2>
      <p style="color:#9ca3af;line-height:1.6;margin:0 0 16px">
        Recibimos la solicitud de <strong style="color:#f9fafb">${nombre_gym}</strong> para sumarse a CLUBIO.
        Vamos a revisarla y nos ponemos en contacto con vos en las próximas <strong style="color:#f9fafb">24–48hs</strong>.
      </p>
    `),
  }).catch(() => {}); // best-effort, no bloquea el flujo

  return { ok: true };
}
