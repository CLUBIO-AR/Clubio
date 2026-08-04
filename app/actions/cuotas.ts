"use server";

import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarCuotaQr } from "@/lib/cuota-qr";
import { getMpCollectorId, createQrOrder, getPosQrImage } from "@/lib/mercadopago-qr";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function reenviarQrCuotaAction(cuotaId: string): Promise<ActionResult<{ message_id: string }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (ctx.rol !== "owner" && ctx.rol !== "admin") return { ok: false, error: "Forbidden" };

  const admin = createAdminClient();

  const [{ data: gymConfig }, { data: gym }, { data: cuota }] = await Promise.all([
    admin.from("gym_config")
      .select("mp_access_token, mp_external_pos_id, email_color_acento, email_remitente_nombre, email_remitente_address")
      .eq("gym_id", ctx.gymId)
      .single(),
    admin.from("gyms").select("nombre, logo_url").eq("id", ctx.gymId).single(),
    admin.from("cuotas")
      .select("id, gym_id, alumno_id, mes, anio, monto_total, estado, alumnos!inner(nombre, email)")
      .eq("id", cuotaId)
      .eq("gym_id", ctx.gymId)
      .single(),
  ]);

  if (!gym) return { ok: false, error: "Gym no encontrado" };
  if (!cuota) return { ok: false, error: "Cuota no encontrada" };
  if (!gymConfig?.mp_access_token || !gymConfig?.mp_external_pos_id) {
    return { ok: false, error: "QR de Mercado Pago no configurado para este gym" };
  }

  const alumno = cuota.alumnos as unknown as { nombre: string; email: string | null };
  if (!alumno?.email) return { ok: false, error: "El alumno no tiene email cargado" };

  let messageId: string;
  try {
    messageId = await enviarCuotaQr({
      accessToken:            gymConfig.mp_access_token,
      externalPosId:          gymConfig.mp_external_pos_id,
      gymId:                  ctx.gymId,
      gymNombre:              gym.nombre,
      logoUrl:                gym.logo_url,
      colorAccento:           gymConfig.email_color_acento,
      emailRemitenteNombre:   gymConfig.email_remitente_nombre,
      emailRemitenteAddress:  gymConfig.email_remitente_address,
      cuotaId:                cuota.id,
      mes:                    cuota.mes,
      anio:                   cuota.anio,
      montoTotal:             cuota.monto_total ?? 0,
      vencida:                cuota.estado === "vencida",
      alumnoNombre:           alumno.nombre,
      alumnoEmail:            alumno.email,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Error al generar/enviar el QR" };
  }

  const tipo = cuota.estado === "vencida" ? "recordatorio_vencido" : "aviso_vencimiento";
  await admin.from("notificaciones_log").insert({
    gym_id: ctx.gymId,
    alumno_id: cuota.alumno_id,
    cuota_id: cuota.id,
    tipo,
    enviado_a: alumno.email,
    estado: "enviado",
    provider_id: messageId,
  });

  return { ok: true, data: { message_id: messageId } };
}

// Genera el QR a demanda para mostrarlo en pantalla en la recepción del gym
// (no manda mail — el alumno lo escanea ahí mismo). Ver enviarCuotaQr para el
// flujo equivalente por mail.
export async function generarQrCuotaAction(cuotaId: string): Promise<ActionResult<{ qr_png_base64: string }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (ctx.rol !== "owner" && ctx.rol !== "admin") return { ok: false, error: "Forbidden" };

  const admin = createAdminClient();

  const [{ data: gymConfig }, { data: cuota }] = await Promise.all([
    admin.from("gym_config")
      .select("mp_access_token, mp_external_pos_id")
      .eq("gym_id", ctx.gymId)
      .single(),
    admin.from("cuotas")
      .select("id, gym_id, mes, anio, monto_total, alumnos!inner(nombre)")
      .eq("id", cuotaId)
      .eq("gym_id", ctx.gymId)
      .single(),
  ]);

  if (!cuota) return { ok: false, error: "Cuota no encontrada" };
  if (!gymConfig?.mp_access_token || !gymConfig?.mp_external_pos_id) {
    return { ok: false, error: "QR de Mercado Pago no configurado para este gym" };
  }

  const alumno = cuota.alumnos as unknown as { nombre: string };

  try {
    const collectorId = await getMpCollectorId(gymConfig.mp_access_token);
    await createQrOrder({
      accessToken:      gymConfig.mp_access_token,
      collectorId,
      externalPosId:    gymConfig.mp_external_pos_id,
      cuotaId:          cuota.id,
      monto:            cuota.monto_total ?? 0,
      descripcion:      `Cuota ${cuota.mes}/${cuota.anio} - ${alumno.nombre}`,
      notificationUrl:  `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago?gym_id=${ctx.gymId}`,
    });
    const qrPngBase64 = await getPosQrImage({
      accessToken: gymConfig.mp_access_token,
      collectorId,
      externalPosId: gymConfig.mp_external_pos_id,
    });
    return { ok: true, data: { qr_png_base64: qrPngBase64 } };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? "Error al generar el QR" };
  }
}
