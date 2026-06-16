"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSettings } from "@/lib/admin/settings";
import { sendRegistroSolicitudEmails } from "@/lib/notifications/channels/email";

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

  const { notification_email } = await getAdminSettings();

  try {
    await sendRegistroSolicitudEmails({
      notificationTo: notification_email,
      nombreGym:      nombre_gym,
      nombreContacto: nombre_contacto,
      email,
      telefono,
      ciudad,
      mensaje,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Error al enviar. Por favor escribinos directamente." };
  }

  return { ok: true };
}
