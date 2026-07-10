import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSettings, getPlanPrecio } from "@/lib/admin/settings";
import { createSuscripcionPreference } from "@/lib/mercadopago-suscripcion";
import { logCron } from "@/lib/cron-logger";
import { sendCobroSuscripcionEmail } from "@/lib/notifications/channels/email";

const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus (legacy)", multi: "Multi" };

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  const settings = await getAdminSettings();

  // Fecha objetivo: vencimientos dentro de N días
  const fechaObjetivo = new Date();
  fechaObjetivo.setDate(fechaObjetivo.getDate() + settings.dias_cobro_antes_vencimiento);
  const fechaObjetivoStr = fechaObjetivo.toISOString().split("T")[0];

  // Licencias activas no-trial que vencen exactamente en la fecha objetivo
  const { data: licencias, error: fetchError } = await admin
    .from("licencias")
    .select("id, gym_id, plan, fecha_vencimiento, gyms(nombre, email_contacto)")
    .eq("activa", true)
    .eq("es_trial", false)
    .eq("fecha_vencimiento", fechaObjetivoStr);

  if (!settings.clubio_mp_access_token) {
    await logCron({ tipo: "generar_cobros_suscripcion", esDispatcher: false, errorDetalle: "CLUBIO_MP_ACCESS_TOKEN no configurado", duracionMs: Date.now() - startTime });
    return NextResponse.json({ error: "Token de MP no configurado" }, { status: 500 });
  }

  if (fetchError) {
    await logCron({ tipo: "generar_cobros_suscripcion", esDispatcher: false, errorDetalle: fetchError.message, duracionMs: Date.now() - startTime });
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const lista = licencias ?? [];
  if (lista.length === 0) {
    await logCron({ tipo: "generar_cobros_suscripcion", esDispatcher: false, itemsCreados: 0, itemsSaltados: 0, duracionMs: Date.now() - startTime });
    return NextResponse.json({ ok: true, generados: 0, saltados: 0 });
  }

  // Verificar cuáles ya tienen cobro para ese período
  const periodoStr = fechaObjetivoStr.slice(0, 7); // 'YYYY-MM'
  const licenciaIds = lista.map((l) => l.id);
  const { data: cobrosExistentes } = await admin
    .from("cobros_suscripcion")
    .select("licencia_id")
    .in("licencia_id", licenciaIds)
    .eq("periodo", periodoStr)
    .neq("estado", "cancelado");

  const yaFacturadas = new Set((cobrosExistentes ?? []).map((c) => c.licencia_id));

  let generados = 0;
  let saltados = 0;
  const errores: string[] = [];

  for (const lic of lista) {
    if (yaFacturadas.has(lic.id)) { saltados++; continue; }

    const gym = Array.isArray(lic.gyms) ? lic.gyms[0] : lic.gyms;
    if (!gym?.email_contacto) { saltados++; continue; }

    const montoBase = getPlanPrecio(settings, lic.plan);
    if (!montoBase) { saltados++; continue; }

    const montoArs = settings.moneda_suscripcion === "ARS"
      ? Math.round(montoBase)
      : Math.round(montoBase * settings.tipo_cambio_usd);
    const planLabel = PLAN_LABELS[lic.plan] ?? lic.plan;

    try {
      // Crear cobro
      const { data: cobro, error: insertError } = await admin
        .from("cobros_suscripcion")
        .insert({
          gym_id: lic.gym_id,
          licencia_id: lic.id,
          periodo: periodoStr,
          plan: lic.plan,
          monto_usd: montoBase,
          tipo_cambio: settings.moneda_suscripcion === "ARS" ? 1 : settings.tipo_cambio_usd,
          monto_ars: montoArs,
          triggered_by: "cron",
        })
        .select("id")
        .single();

      if (insertError) {
        // Puede ser UNIQUE conflict si corrió dos veces — no es error crítico
        if (insertError.code === "23505") { saltados++; continue; }
        errores.push(`${gym.nombre}: ${insertError.message}`);
        continue;
      }

      // Crear preferencia de MP
      const pref = await createSuscripcionPreference({
        accessToken: settings.clubio_mp_access_token!,
        cobroId: cobro.id,
        gymNombre: gym.nombre,
        plan: planLabel,
        montoArs,
      });

      await admin.from("cobros_suscripcion").update({
        mp_preference_id: pref.id,
        link_pago: pref.init_point,
        email_enviado_at: new Date().toISOString(),
      }).eq("id", cobro.id);

      // Enviar email al gym
      await sendCobroSuscripcionEmail({
        gymNombre:     gym.nombre,
        emailContacto: gym.email_contacto,
        plan:          planLabel,
        montoBase,
        moneda:        settings.moneda_suscripcion,
        montoArs,
        periodo:       periodoStr,
        linkPago:      pref.init_point,
      });

      generados++;
    } catch (e) {
      errores.push(`${gym.nombre}: ${(e as Error).message}`);
    }
  }

  await logCron({
    tipo: "generar_cobros_suscripcion",
    esDispatcher: false,
    itemsCreados: generados,
    itemsSaltados: saltados,
    itemsError: errores.length,
    errorDetalle: errores.length ? errores.slice(0, 3).join(" | ") : undefined,
    duracionMs: Date.now() - startTime,
  });

  return NextResponse.json({ ok: true, generados, saltados, errores: errores.length });
}
