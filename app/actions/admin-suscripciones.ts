"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSettings, getPlanPrecio } from "@/lib/admin/settings";
import { createSuscripcionPreference } from "@/lib/mercadopago-suscripcion";
import { clubioEmailHtml, clubioEmailTable } from "@/lib/email/template";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus", multi: "Multi" };

function getPeriodo(fechaVencimiento: string): string {
  return fechaVencimiento.slice(0, 7); // 'YYYY-MM'
}

export async function generarCobroAction(gymId: string): Promise<ActionResult<{ cobro_id: string; link_pago: string }>> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const [gymRes, licenciaRes, settings] = await Promise.all([
    admin.from("gyms").select("nombre, email_contacto").eq("id", gymId).single(),
    admin.from("licencias").select("id, plan, fecha_vencimiento").eq("gym_id", gymId).eq("activa", true).single(),
    getAdminSettings(),
  ]);

  if (!gymRes.data) return { ok: false, error: "Gym no encontrado" };
  if (!licenciaRes.data) return { ok: false, error: "No hay licencia activa para este gym" };
  if (!settings.clubio_mp_access_token) return { ok: false, error: "Token de Mercado Pago de CLUBIO no configurado. Configuralo en Ajustes." };

  const licencia = licenciaRes.data;
  const gym = gymRes.data;
  const periodo = getPeriodo(licencia.fecha_vencimiento);
  const montoBase = getPlanPrecio(settings, licencia.plan);
  if (!montoBase) return { ok: false, error: `Plan '${licencia.plan}' sin precio configurado` };

  const montoUsd = montoBase; // puede ser ARS o USD según settings.moneda_suscripcion
  const montoArs = settings.moneda_suscripcion === "ARS"
    ? Math.round(montoBase)
    : Math.round(montoBase * settings.tipo_cambio_usd);

  // Insert cobro — el UNIQUE(licencia_id, periodo) previene duplicados
  const { data: cobro, error: insertError } = await admin
    .from("cobros_suscripcion")
    .insert({
      gym_id: gymId,
      licencia_id: licencia.id,
      periodo,
      plan: licencia.plan,
      monto_usd: montoUsd,
      tipo_cambio: settings.tipo_cambio_usd,
      monto_ars: montoArs,
      triggered_by: "manual",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: `Ya existe un cobro para el período ${periodo}. Buscalo en la lista de suscripciones y usá "Reenviar".` };
    }
    return { ok: false, error: insertError.message };
  }

  // Crear preferencia de MP
  let prefId: string;
  let linkPago: string;
  try {
    const pref = await createSuscripcionPreference({
      accessToken: settings.clubio_mp_access_token,
      cobroId: cobro.id,
      gymNombre: gym.nombre,
      plan: PLAN_LABELS[licencia.plan] ?? licencia.plan,
      montoArs,
    });
    prefId = pref.id;
    linkPago = pref.init_point;
  } catch (e) {
    // Rollback: eliminar el cobro recién creado para no dejar un registro sin link
    await admin.from("cobros_suscripcion").delete().eq("id", cobro.id);
    return { ok: false, error: `Error al crear la preferencia de MP: ${(e as Error).message}` };
  }

  // Actualizar cobro con link y registrar envío de email
  await admin
    .from("cobros_suscripcion")
    .update({
      mp_preference_id: prefId,
      link_pago: linkPago,
      email_enviado_at: new Date().toISOString(),
    })
    .eq("id", cobro.id);

  // Enviar email al gym
  await enviarEmailCobro({
    gymNombre: gym.nombre,
    emailContacto: gym.email_contacto,
    plan: PLAN_LABELS[licencia.plan] ?? licencia.plan,
    montoBase,
    moneda: settings.moneda_suscripcion,
    montoArs,
    periodo,
    linkPago,
  });

  await logAdminAction(ctx.adminId, "cobro_suscripcion_generado", gymId, {
    cobro_id: cobro.id,
    periodo,
    monto_usd: montoUsd,
    plan: licencia.plan,
  });

  revalidatePath("/admin/suscripciones");
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: { cobro_id: cobro.id, link_pago: linkPago } };
}

export async function reenviarLinkCobroAction(cobroId: string): Promise<ActionResult<{ link_pago: string }>> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const [cobroRes, settings] = await Promise.all([
    admin.from("cobros_suscripcion").select("id, gym_id, plan, monto_usd, monto_ars, link_pago, mp_preference_id, estado, created_at, periodo").eq("id", cobroId).single(),
    getAdminSettings(),
  ]);

  const cobro = cobroRes.data;
  if (!cobro) return { ok: false, error: "Cobro no encontrado" };
  if (cobro.estado === "pagado") return { ok: false, error: "El cobro ya fue pagado" };
  if (cobro.estado === "cancelado") return { ok: false, error: "El cobro fue cancelado" };
  if (!settings.clubio_mp_access_token) return { ok: false, error: "Token de Mercado Pago de CLUBIO no configurado." };

  const { data: gym } = await admin.from("gyms").select("nombre, email_contacto").eq("id", cobro.gym_id).single();
  if (!gym) return { ok: false, error: "Gym no encontrado" };

  const diasDesdeCreacion = (Date.now() - new Date(cobro.created_at).getTime()) / 86400000;
  let linkPago = cobro.link_pago;

  if (diasDesdeCreacion >= 15 || !linkPago) {
    try {
      const pref = await createSuscripcionPreference({
        accessToken: settings.clubio_mp_access_token,
        cobroId: cobro.id,
        gymNombre: gym.nombre,
        plan: PLAN_LABELS[cobro.plan] ?? cobro.plan,
        montoArs: cobro.monto_ars,
      });
      linkPago = pref.init_point;
      await admin.from("cobros_suscripcion").update({ mp_preference_id: pref.id, link_pago: linkPago }).eq("id", cobroId);
    } catch (e) {
      return { ok: false, error: `Error al regenerar la preferencia de MP: ${(e as Error).message}` };
    }
  }

  await admin.from("cobros_suscripcion").update({ email_enviado_at: new Date().toISOString() }).eq("id", cobroId);

  await enviarEmailCobro({
    gymNombre: gym.nombre,
    emailContacto: gym.email_contacto,
    plan: PLAN_LABELS[cobro.plan] ?? cobro.plan,
    montoBase: cobro.monto_usd,
    moneda: settings.moneda_suscripcion,
    montoArs: cobro.monto_ars,
    periodo: cobro.periodo,
    linkPago: linkPago!,
  });

  await logAdminAction(ctx.adminId, "cobro_suscripcion_reenviado", cobro.gym_id, { cobro_id: cobroId });
  revalidatePath("/admin/suscripciones");
  revalidatePath(`/admin/gyms/${cobro.gym_id}`);
  return { ok: true, data: { link_pago: linkPago! } };
}

export async function cancelarCobroAction(cobroId: string): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const { data: cobro } = await admin.from("cobros_suscripcion").select("gym_id, estado").eq("id", cobroId).single();
  if (!cobro) return { ok: false, error: "Cobro no encontrado" };
  if (cobro.estado === "pagado") return { ok: false, error: "No se puede cancelar un cobro ya pagado" };

  const { error } = await admin.from("cobros_suscripcion").update({ estado: "cancelado" }).eq("id", cobroId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, "cobro_suscripcion_cancelado", cobro.gym_id, { cobro_id: cobroId });
  revalidatePath("/admin/suscripciones");
  revalidatePath(`/admin/gyms/${cobro.gym_id}`);
  return { ok: true, data: undefined };
}

async function enviarEmailCobro(params: {
  gymNombre: string;
  emailContacto: string;
  plan: string;
  montoBase: number;
  moneda: "USD" | "ARS";
  montoArs: number;
  periodo: string;
  linkPago: string;
}) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;

  const [anio, mes] = params.periodo.split("-");
  const periodoLabel = `${mes}/${anio}`;
  const montoLabel = params.moneda === "ARS"
    ? `$ ${params.montoBase.toLocaleString("es-AR")}`
    : `USD ${params.montoBase}`;

  await resend.emails.send({
    from,
    to: params.emailContacto,
    subject: `Renovación CLUBIO ${periodoLabel} — ${params.gymNombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">Renovación de suscripción</h2>
      <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hola <strong style="color:#f9fafb">${params.gymNombre}</strong>, te enviamos el link para renovar tu suscripción a CLUBIO.</p>
      ${clubioEmailTable([
        ["Plan", params.plan],
        ["Período", periodoLabel],
        ["Monto", montoLabel],
        ...(params.moneda === "USD" ? [["Monto ARS", `$ ${params.montoArs.toLocaleString("es-AR")}`] as [string, string]] : []),
      ])}
      <a href="${params.linkPago}"
        style="display:inline-block;margin-top:8px;padding:12px 28px;background:#34d399;color:#030712;font-weight:800;font-size:15px;text-decoration:none;border-radius:8px;font-family:monospace;letter-spacing:0.05em">
        PAGAR AHORA
      </a>
      <p style="color:#6b7280;font-size:12px;margin:16px 0 0">Si no podés hacer clic en el botón, copiá este link: <span style="color:#9ca3af">${params.linkPago}</span></p>
    `),
  }).catch((e) => console.error("[admin-suscripciones] email error:", e));
}
