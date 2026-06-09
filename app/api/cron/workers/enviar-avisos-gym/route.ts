import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { logCron } from "@/lib/cron-logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import type { GymNotificationConfig, EmailTemplates } from "@/lib/notifications";
import { z } from "zod";

const Schema = z.object({ gym_id: z.string().uuid() });

const DIAS_PREVIOS = 3; // avisar 3 días antes del vencimiento

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { gym_id } = parsed.data;
  const startTime = Date.now();
  const admin = createAdminClient();

  // Config del gym
  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("email_activo, whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, email_color_acento, email_templates")
    .eq("gym_id", gym_id)
    .single();

  const { data: gym } = await admin
    .from("gyms")
    .select("nombre, logo_url")
    .eq("id", gym_id)
    .single();

  if (!gymConfig || !gym) return NextResponse.json({ error: "Gym no encontrado" }, { status: 404 });

  const hoy = new Date();
  const limite = new Date(hoy);
  limite.setDate(hoy.getDate() + DIAS_PREVIOS);
  const hoyStr = hoy.toISOString().split("T")[0];
  const limiteStr = limite.toISOString().split("T")[0];

  // Cuotas próximas a vencer (pendientes en los próximos N días) + vencidas recientes
  const { data: cuotas } = await admin
    .from("cuotas")
    .select(`
      id, alumno_id, mes, anio, monto_total, estado, fecha_vencimiento, avisos_enviados,
      alumnos!alumno_id(nombre, email, telefono)
    `)
    .eq("gym_id", gym_id)
    .in("estado", ["pendiente", "vencida"])
    .or(
      `and(estado.eq.pendiente,fecha_vencimiento.lte.${limiteStr}),` +
      `and(estado.eq.vencida,fecha_vencimiento.gte.${new Date(hoy.getTime() - 7 * 86400000).toISOString().split("T")[0]})`
    );

  if (!cuotas?.length) {
    await logCron({ tipo: "enviar_avisos", gymId: gym_id, itemsCreados: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const notifConfig: GymNotificationConfig = {
    email_activo: gymConfig.email_activo ?? true,
    email_templates: (gymConfig.email_templates as EmailTemplates | null) ?? null,
    whatsapp_activo: gymConfig.whatsapp_activo ?? false,
    whatsapp_phone_number_id: gymConfig.whatsapp_phone_number_id,
    whatsapp_access_token: gymConfig.whatsapp_access_token,
  };

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  let enviados = 0;

  for (const cuota of cuotas) {
    const alumno = cuota.alumnos as { nombre: string; email: string | null; telefono: string | null } | null;
    if (!alumno?.email && !alumno?.telefono) continue;

    // Generar token de pago
    const token = await new SignJWT({
      cuota_id: cuota.id,
      gym_id,
      alumno_nombre: alumno.nombre,
      mes: cuota.mes,
      anio: cuota.anio,
      monto: cuota.monto_total,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    const pagoUrl = `${appUrl}/pagar/${token}`;
    const tipo = cuota.estado === "vencida" ? "recordatorio_vencido" : "aviso_vencimiento";

    const resultados = await sendNotification(notifConfig, {
      type: tipo,
      alumno: { nombre: alumno.nombre, email: alumno.email, telefono: alumno.telefono },
      cuota: { mes: cuota.mes, anio: cuota.anio, monto_total: cuota.monto_total ?? 0, pago_url: pagoUrl },
      gym: { nombre: gym.nombre, logo_url: gym.logo_url, color_acento: gymConfig.email_color_acento },
    });

    // Registrar en notificaciones_log
    for (const r of resultados) {
      const destino = r.canal === "email" ? (alumno.email ?? "") : (alumno.telefono ?? "");
      const { error: logError } = await admin.from("notificaciones_log").insert({
        gym_id,
        alumno_id: cuota.alumno_id,
        cuota_id: cuota.id,
        tipo,
        enviado_a: destino || r.canal,
        estado: r.ok ? "enviado" : "error",
        provider_id: r.provider_id ?? null,
      });
      if (logError) console.error(`[worker:enviar-avisos] notificaciones_log insert error:`, logError.message);
    }

    if (resultados.some((r) => r.ok)) {
      await admin.from("cuotas")
        .update({ avisos_enviados: (cuota.avisos_enviados ?? 0) + 1 })
        .eq("id", cuota.id);
      enviados++;
    }
  }

  await logCron({ tipo: "enviar_avisos", gymId: gym_id, itemsCreados: enviados, duracionMs: Date.now() - startTime });
  return NextResponse.json({ ok: true, enviados });
}
