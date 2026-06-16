import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { logCron } from "@/lib/cron-logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications";
import type { GymNotificationConfig, EmailTemplates } from "@/lib/notifications";
import { sendEmailAvisosLote } from "@/lib/notifications/channels/email";
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
    .select("email_activo, whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, email_color_acento, email_templates, email_remitente_nombre, email_remitente_address")
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
  const hoyStr    = hoy.toISOString().split("T")[0];
  const limiteStr = limite.toISOString().split("T")[0];

  // Cuotas próximas a vencer + vencidas recientes
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
    email_activo:              gymConfig.email_activo ?? true,
    email_remitente_nombre:    gymConfig.email_remitente_nombre ?? null,
    email_remitente_address:   gymConfig.email_remitente_address ?? null,
    email_templates:           (gymConfig.email_templates as EmailTemplates | null) ?? null,
    whatsapp_activo:           gymConfig.whatsapp_activo ?? false,
    whatsapp_phone_number_id:  gymConfig.whatsapp_phone_number_id,
    whatsapp_access_token:     gymConfig.whatsapp_access_token,
  };

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Agrupar cuotas por alumno para email consolidado
  const byAlumno = new Map<string, typeof cuotas>();
  for (const cuota of cuotas) {
    const list = byAlumno.get(cuota.alumno_id) ?? [];
    list.push(cuota);
    byAlumno.set(cuota.alumno_id, list);
  }

  let enviados = 0;

  for (const [alumnoId, cuotasAlumno] of byAlumno) {
    const alumno = cuotasAlumno[0].alumnos as { nombre: string; email: string | null; telefono: string | null } | null;
    if (!alumno?.email && !alumno?.telefono) continue;

    if (cuotasAlumno.length === 1) {
      // Flujo individual — igual que antes
      const cuota = cuotasAlumno[0];
      const token = await new SignJWT({
        cuota_id:      cuota.id,
        gym_id,
        alumno_nombre: alumno.nombre,
        mes:           cuota.mes,
        anio:          cuota.anio,
        monto:         cuota.monto_total,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setJti(crypto.randomUUID())
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);

      const pagoUrl = `${appUrl}/pagar/${token}`;
      const tipo = cuota.estado === "vencida" ? "recordatorio_vencido" : "aviso_vencimiento";

      const resultados = await sendNotification(notifConfig, {
        type: tipo,
        alumno: { nombre: alumno.nombre, email: alumno.email, telefono: alumno.telefono },
        cuota:  { mes: cuota.mes, anio: cuota.anio, monto_total: cuota.monto_total ?? 0, pago_url: pagoUrl },
        gym:    { nombre: gym.nombre, logo_url: gym.logo_url, color_acento: gymConfig.email_color_acento },
      });

      for (const r of resultados) {
        const destino = r.canal === "email" ? (alumno.email ?? "") : (alumno.telefono ?? "");
        await admin.from("notificaciones_log").insert({
          gym_id, alumno_id: alumnoId, cuota_id: cuota.id,
          tipo, enviado_a: destino || r.canal,
          estado: r.ok ? "enviado" : "error",
          provider_id: r.provider_id ?? null,
        });
      }

      if (resultados.some((r) => r.ok)) {
        await admin.from("cuotas")
          .update({ avisos_enviados: (cuota.avisos_enviados ?? 0) + 1 })
          .eq("id", cuota.id);
        enviados++;
      }
    } else if (alumno.email) {
      // Email consolidado — una sola notificación para múltiples cuotas
      const tieneVencidas = cuotasAlumno.some((c) => c.estado === "vencida");
      const tipo = tieneVencidas ? "recordatorio_vencido" : "aviso_vencimiento";

      // Generar JWT para cada cuota (links individuales)
      const cuotasConLink: Array<{ mes: number; anio: number; monto_total: number | null; estado: string; pagoUrl: string }> = [];
      for (const cuota of cuotasAlumno) {
        const token = await new SignJWT({
          cuota_id:      cuota.id,
          gym_id,
          alumno_nombre: alumno.nombre,
          mes:           cuota.mes,
          anio:          cuota.anio,
          monto:         cuota.monto_total,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setJti(crypto.randomUUID())
        .setIssuedAt()
          .setExpirationTime("30d")
          .sign(secret);
        cuotasConLink.push({ mes: cuota.mes, anio: cuota.anio, monto_total: cuota.monto_total, estado: cuota.estado, pagoUrl: `${appUrl}/pagar/${token}` });
      }

      // JWT para "pagar todo" — va a /pagar/lote/[token]
      const loteToken = await new SignJWT({
        type:          "lote",
        cuota_ids:     cuotasAlumno.map((c) => c.id),
        gym_id,
        alumno_id:     alumnoId,
        alumno_nombre: alumno.nombre,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setJti(crypto.randomUUID())
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);
      const pagarTodoUrl = `${appUrl}/pagar/lote/${loteToken}`;

      const montoTotal = cuotasAlumno.reduce((acc, c) => acc + (c.monto_total ?? 0), 0);

      let emailProviderId: string | undefined;
      let emailOk = false;
      try {
        emailProviderId = await sendEmailAvisosLote({
          to:                    alumno.email,
          alumnoNombre:          alumno.nombre,
          gymNombre:             gym.nombre,
          logoUrl:               gym.logo_url,
          colorAccento:          gymConfig.email_color_acento,
          emailRemitenteNombre:  notifConfig.email_remitente_nombre,
          emailRemitenteAddress: notifConfig.email_remitente_address,
          tieneVencidas,
          cuotas:                cuotasConLink,
          pagarTodoUrl,
          montoTotal,
        });
        emailOk = true;
      } catch (err) {
        console.error(`[worker:enviar-avisos] lote gym=${gym_id} alumno=${alumnoId} error:`, err);
      }

      await admin.from("notificaciones_log").insert({
        gym_id,
        alumno_id:   alumnoId,
        cuota_id:    cuotasAlumno[0].id,
        tipo,
        enviado_a:   alumno.email,
        estado:      emailOk ? "enviado" : "error",
        provider_id: emailProviderId ?? null,
      });

      if (emailOk) {
        await Promise.allSettled(
          cuotasAlumno.map((cuota) =>
            admin.from("cuotas")
              .update({ avisos_enviados: (cuota.avisos_enviados ?? 0) + 1 })
              .eq("id", cuota.id)
          )
        );
        enviados++;
      }
    }
  }

  await logCron({ tipo: "enviar_avisos", gymId: gym_id, itemsCreados: enviados, duracionMs: Date.now() - startTime });
  return NextResponse.json({ ok: true, enviados });
}
