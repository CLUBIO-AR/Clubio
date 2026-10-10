"use server";

import { SignJWT } from "jose";
import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { aliasCobroDeAlumno } from "@/lib/transferencias/alias";
import { sendNotification, motivosCanalesInactivos } from "@/lib/notifications";
import type { GymNotificationConfig, EmailTemplates } from "@/lib/notifications";
import { registrarAvisoEnInbox } from "@/lib/notifications/inbox";
import { enviarAvisoWhatsAppManual } from "@/lib/notifications/avisos-whatsapp";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CanalAviso = "email" | "whatsapp";

// Reenvío manual del aviso de vencimiento de una cuota puntual — útil cuando un alumno
// pide que se lo reenvíen. No depende de las ventanas de fecha del cron (enviar-avisos-gym).
// Con `canal` manda SOLO por ese canal (botones "Enviar por email/WhatsApp", así no se
// duplica el aviso); sin `canal` respeta los canales configurados para avisos del gym.
export async function reenviarAvisoAction(
  cuotaId: string,
  opciones?: { canal?: CanalAviso }
): Promise<ActionResult<{ canales: string[] }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };

  const admin = createAdminClient();

  const [{ data: cuota }, { data: gym }, { data: gymConfig }] = await Promise.all([
    admin.from("cuotas")
      .select("id, alumno_id, mes, anio, monto_total, monto_base, estado, fecha_vencimiento, alumnos!inner(nombre, email, telefono), actividades(nombre, recargo_1_porcentaje)")
      .eq("id", cuotaId)
      .eq("gym_id", ctx.gymId)
      .single(),
    admin.from("gyms").select("nombre, logo_url").eq("id", ctx.gymId).single(),
    admin.from("gym_config")
      .select("email_activo, email_remitente_nombre, email_remitente_address, email_templates, email_color_acento, avisos_email_activo, whatsapp_activo, avisos_whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_aviso, whatsapp_template_confirmacion, whatsapp_template_transferencia, email_modo, transferencia_alias, transferencia_titular, transferencia_cbu, recargo_1_porcentaje")
      .eq("gym_id", ctx.gymId)
      .single(),
  ]);

  if (!cuota) return { ok: false, error: "Cuota no encontrada" };
  if (!gym || !gymConfig) return { ok: false, error: "Gym no encontrado" };

  const alumno = cuota.alumnos as unknown as { nombre: string; email: string | null; telefono: string | null };
  const actividad = cuota.actividades as unknown as { nombre: string | null; recargo_1_porcentaje: number | null } | null;
  if (!alumno?.email && !alumno?.telefono) return { ok: false, error: "El alumno no tiene email ni teléfono cargado" };

  const canal = opciones?.canal;
  if (canal === "email" && !alumno.email) return { ok: false, error: "El alumno no tiene email cargado" };
  if (canal === "whatsapp" && !alumno.telefono) return { ok: false, error: "El alumno no tiene teléfono cargado" };
  if (canal === "whatsapp" && !gymConfig.whatsapp_activo) return { ok: false, error: "WhatsApp no está conectado. Configuralo en Configuración → WhatsApp." };

  // Pedido explícito de un canal: va solo por ese, aunque los avisos automáticos usen otro.
  const emailActivo = canal === "email" ? true
    : canal === "whatsapp" ? false
    : (gymConfig.email_activo ?? true) && (gymConfig.avisos_email_activo ?? true);
  const whatsappActivo = canal === "whatsapp" ? true
    : canal === "email" ? false
    : (gymConfig.whatsapp_activo ?? false) && (gymConfig.avisos_whatsapp_activo ?? true);

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
    email_activo:              emailActivo,
    email_remitente_nombre:    gymConfig.email_remitente_nombre,
    email_remitente_address:   gymConfig.email_remitente_address,
    email_templates:           (gymConfig.email_templates as EmailTemplates | null) ?? null,
    // WhatsApp no va por sendNotification: se arma igual que el cron (ver más abajo).
    whatsapp_activo:           false,
    whatsapp_phone_number_id:  gymConfig.whatsapp_phone_number_id,
    whatsapp_access_token:     gymConfig.whatsapp_access_token,
    whatsapp_template_aviso:         gymConfig.whatsapp_template_aviso,
    whatsapp_template_confirmacion:  gymConfig.whatsapp_template_confirmacion,
    whatsapp_template_transferencia: gymConfig.whatsapp_template_transferencia,
    modo_pago:            (gymConfig.email_modo as "link" | "transferencia" | null) ?? "link",
    transferencia_alias:  gymConfig.transferencia_alias,
  };

  const tipo = cuota.estado === "vencida" ? "recordatorio_vencido" : "aviso_vencimiento";

  const payload = {
    type: tipo,
    alumno: {
      nombre: alumno.nombre, email: alumno.email, telefono: alumno.telefono,
      alias_cobro: await aliasCobroDeAlumno(admin, ctx.gymId, cuota.alumno_id),
    },
    cuota: {
      mes: cuota.mes, anio: cuota.anio, monto_total: cuota.monto_total ?? 0,
      pago_url: `${appUrl}/pagar/${token}`, pago_token: token,
      fecha_vencimiento: cuota.fecha_vencimiento, actividad_nombre: actividad?.nombre,
    },
    gym: { nombre: gym.nombre, logo_url: gym.logo_url, color_acento: gymConfig.email_color_acento },
  } as const;

  const resultados = emailActivo && alumno.email ? await sendNotification(notifConfig, payload) : [];

  if (whatsappActivo && alumno.telefono) {
    const envio = await enviarAvisoWhatsAppManual(admin, {
      gymId: ctx.gymId,
      config: {
        ...notifConfig,
        whatsapp_activo: true,
        gymNombre: gym.nombre,
        gymLogoUrl: gym.logo_url,
        colorAcento: gymConfig.email_color_acento,
        recargoPctGym: Number(gymConfig.recargo_1_porcentaje ?? 0),
        transferencia_titular: gymConfig.transferencia_titular,
        transferencia_cbu: gymConfig.transferencia_cbu,
      },
      alumno: { id: cuota.alumno_id, nombre: alumno.nombre, telefono: alumno.telefono },
      cuota: {
        id: cuota.id, mes: cuota.mes, anio: cuota.anio,
        monto_total: cuota.monto_total, monto_base: cuota.monto_base,
        fecha_vencimiento: cuota.fecha_vencimiento,
        actividad: actividad?.nombre ?? null,
        recargoPct: actividad?.recargo_1_porcentaje ?? null,
      },
    });
    resultados.push({ canal: "whatsapp", ok: envio.ok, provider_id: envio.waMessageId, error: envio.error });
  }

  // Ningún canal se intentó siquiera (config incompleta) — pasa antes de llegar a
  // Meta/Resend, así que no hay nada que loguear, pero sí podemos decir por qué.
  if (resultados.length === 0) {
    const motivos = motivosCanalesInactivos({ ...notifConfig, whatsapp_activo: whatsappActivo }, payload);
    return { ok: false, error: `No hay ningún canal configurado para enviar. ${motivos.join(" · ")}` };
  }

  for (const r of resultados) {
    const destino = r.canal === "email" ? (alumno.email ?? "") : (alumno.telefono ?? "");
    await admin.from("notificaciones_log").insert({
      gym_id: ctx.gymId, alumno_id: cuota.alumno_id, cuota_id: cuota.id,
      tipo, enviado_a: destino || r.canal, canal: r.canal,
      estado: r.ok ? "enviado" : "error",
      provider_id: r.provider_id ?? null,
      error_detail: r.error ?? null,
    });
    if (!r.ok) console.error(`[reenviarAviso] canal=${r.canal} cuota=${cuotaId} error:`, r.error);
    if (r.ok && r.canal === "whatsapp") {
      await registrarAvisoEnInbox(admin, {
        gymId: ctx.gymId, alumnoId: cuota.alumno_id, telefono: alumno.telefono,
        waMessageId: r.provider_id, tipo, cuota,
      });
    }
  }

  const exitosos = resultados.filter((r) => r.ok);
  if (exitosos.length === 0) {
    const detalle = resultados.map((r) => `${r.canal}: ${r.error ?? "error desconocido"}`).join(" · ");
    return { ok: false, error: `No se pudo enviar. ${detalle}` };
  }
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

  // Varios alumnos pueden compartir teléfono (hermanos, padre/madre que paga por sus hijos):
  // buscamos todos y avisamos la cuota pendiente más antigua entre ellos.
  const { data: alumnos } = await admin
    .from("alumnos")
    .select("id")
    .eq("gym_id", ctx.gymId)
    .is("deleted_at", null)
    .ilike("telefono", `%${ultimos10}`)
    .limit(20);

  if (!alumnos?.length) return { ok: false, error: "No encontramos un alumno con este teléfono" };

  const { data: cuota } = await admin
    .from("cuotas")
    .select("id")
    .eq("gym_id", ctx.gymId)
    .in("alumno_id", alumnos.map((a) => a.id))
    .in("estado", ["pendiente", "vencida"])
    .order("fecha_vencimiento", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!cuota) return { ok: false, error: alumnos.length > 1 ? "Ninguno de los alumnos con este teléfono tiene cuotas pendientes" : "Este alumno no tiene cuotas pendientes" };

  // Disparado desde el chat de WhatsApp — no tiene sentido mandar también el email acá.
  return reenviarAvisoAction(cuota.id, { canal: "whatsapp" });
}
