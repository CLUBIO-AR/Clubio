import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSettings, getPlanPrecio } from "@/lib/admin/settings";
import { createSuscripcionPreference } from "@/lib/mercadopago-suscripcion";
import { logCron } from "@/lib/cron-logger";
import { clubioEmailHtml, clubioEmailTable } from "@/lib/email/template";

const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus", multi: "Multi" };

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

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
    const [anio, mes] = periodoStr.split("-");
    const periodoLabel = `${mes}/${anio}`;

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
      await resend.emails.send({
        from,
        to: gym.email_contacto,
        subject: `Renovación CLUBIO ${periodoLabel} — ${gym.nombre}`,
        html: clubioEmailHtml(`
          <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">Renovación de suscripción</h2>
          <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hola <strong style="color:#f9fafb">${gym.nombre}</strong>, te enviamos el link para renovar tu suscripción a CLUBIO.</p>
          ${clubioEmailTable([
            ["Plan", planLabel],
            ["Período", periodoLabel],
            ["Monto", settings.moneda_suscripcion === "ARS" ? `$ ${montoBase.toLocaleString("es-AR")}` : `USD ${montoBase}`],
            ...(settings.moneda_suscripcion === "USD" ? [["Monto ARS", `$ ${montoArs.toLocaleString("es-AR")}`] as [string, string]] : []),
          ])}
          <a href="${pref.init_point}"
            style="display:inline-block;margin-top:8px;padding:12px 28px;background:#34d399;color:#030712;font-weight:800;font-size:15px;text-decoration:none;border-radius:8px;font-family:monospace;letter-spacing:0.05em">
            PAGAR AHORA
          </a>
          <p style="color:#6b7280;font-size:12px;margin:16px 0 0">Si no podés hacer clic en el botón, copiá este link: <span style="color:#9ca3af">${pref.init_point}</span></p>
        `),
      }).catch((e) => console.error(`[generar-cobros] email error ${gym.nombre}:`, e));

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
