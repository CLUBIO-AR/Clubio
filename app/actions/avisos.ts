"use server";

import { SignJWT } from "jose";
import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import type { GymNotificationConfig, EmailTemplates } from "@/lib/notifications";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Reenvío manual del aviso de vencimiento de una cuota puntual (email + WhatsApp según
// lo que tenga activo el gym) — útil para pruebas o cuando un alumno pide que se lo
// reenvíen. No depende de las ventanas de fecha del cron (enviar-avisos-gym).
export async function reenviarAvisoAction(cuotaId: string): Promise<ActionResult<{ canales: string[] }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const admin = createAdminClient();

  const [{ data: cuota }, { data: gym }, { data: gymConfig }] = await Promise.all([
    admin.from("cuotas")
      .select("id, alumno_id, mes, anio, monto_total, estado, fecha_vencimiento, alumnos!inner(nombre, email, telefono), actividades(nombre)")
      .eq("id", cuotaId)
      .eq("gym_id", ctx.gymId)
      .single(),
    admin.from("gyms").select("nombre, logo_url").eq("id", ctx.gymId).single(),
    admin.from("gym_config")
      .select("email_activo, email_remitente_nombre, email_remitente_address, email_templates, email_color_acento, whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_aviso, whatsapp_template_confirmacion, whatsapp_template_transferencia, email_modo, transferencia_alias")
      .eq("gym_id", ctx.gymId)
      .single(),
  ]);

  if (!cuota) return { ok: false, error: "Cuota no encontrada" };
  if (!gym || !gymConfig) return { ok: false, error: "Gym no encontrado" };

  const alumno = cuota.alumnos as unknown as { nombre: string; email: string | null; telefono: string | null };
  const actividad = cuota.actividades as unknown as { nombre: string | null } | null;
  if (!alumno?.email && !alumno?.telefono) return { ok: false, error: "El alumno no tiene email ni teléfono cargado" };

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const token = await new SignJWT({
    cuota_id: cuota.id, gym_id: ctx.gymId, alumno_nombre: alumno.nombre,
    mes: cuota.mes, anio: cuota.anio, monto: cuota.monto_total,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const notifConfig: GymNotificationConfig = {
    email_activo:              gymConfig.email_activo ?? true,
    email_remitente_nombre:    gymConfig.email_remitente_nombre,
    email_remitente_address:   gymConfig.email_remitente_address,
    email_templates:           (gymConfig.email_templates as EmailTemplates | null) ?? null,
    whatsapp_activo:           gymConfig.whatsapp_activo ?? false,
    whatsapp_phone_number_id:  gymConfig.whatsapp_phone_number_id,
    whatsapp_access_token:     gymConfig.whatsapp_access_token,
    whatsapp_template_aviso:         gymConfig.whatsapp_template_aviso,
    whatsapp_template_confirmacion:  gymConfig.whatsapp_template_confirmacion,
    whatsapp_template_transferencia: gymConfig.whatsapp_template_transferencia,
    modo_pago:            (gymConfig.email_modo as "link" | "transferencia" | null) ?? "link",
    transferencia_alias:  gymConfig.transferencia_alias,
  };

  const tipo = cuota.estado === "vencida" ? "recordatorio_vencido" : "aviso_vencimiento";

  const resultados = await sendNotification(notifConfig, {
    type: tipo,
    alumno: { nombre: alumno.nombre, email: alumno.email, telefono: alumno.telefono },
    cuota: {
      mes: cuota.mes, anio: cuota.anio, monto_total: cuota.monto_total ?? 0,
      pago_url: `${appUrl}/pagar/${token}`, pago_token: token,
      fecha_vencimiento: cuota.fecha_vencimiento, actividad_nombre: actividad?.nombre,
    },
    gym: { nombre: gym.nombre, logo_url: gym.logo_url, color_acento: gymConfig.email_color_acento },
  });

  for (const r of resultados) {
    const destino = r.canal === "email" ? (alumno.email ?? "") : (alumno.telefono ?? "");
    await admin.from("notificaciones_log").insert({
      gym_id: ctx.gymId, alumno_id: cuota.alumno_id, cuota_id: cuota.id,
      tipo, enviado_a: destino || r.canal,
      estado: r.ok ? "enviado" : "error",
      provider_id: r.provider_id ?? null,
    });
  }

  const exitosos = resultados.filter((r) => r.ok);
  if (exitosos.length === 0) return { ok: false, error: "No se pudo enviar por ningún canal" };
  return { ok: true, data: { canales: exitosos.map((r) => r.canal) } };
}

// Atajo para el inbox de WhatsApp: escribir "/aviso_cuota" en el chat busca la cuota
// pendiente/vencida más próxima a vencer de ese alumno y le reenvía la plantilla —
// no depende de la ventana de 24hs porque es un mensaje de template, no texto libre.
export async function enviarAvisoCuotaPorTelefonoAction(telefono: string): Promise<ActionResult<{ canales: string[] }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const admin = createAdminClient();
  const ultimos10 = telefono.replace(/\D/g, "").slice(-10);

  const { data: alumno } = await admin
    .from("alumnos")
    .select("id")
    .eq("gym_id", ctx.gymId)
    .ilike("telefono", `%${ultimos10}`)
    .maybeSingle();

  if (!alumno) return { ok: false, error: "No encontramos un alumno con este teléfono" };

  const { data: cuota } = await admin
    .from("cuotas")
    .select("id")
    .eq("gym_id", ctx.gymId)
    .eq("alumno_id", alumno.id)
    .in("estado", ["pendiente", "vencida"])
    .order("fecha_vencimiento", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!cuota) return { ok: false, error: "Este alumno no tiene cuotas pendientes" };

  return reenviarAvisoAction(cuota.id);
}
