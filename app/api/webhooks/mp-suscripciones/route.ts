import { NextResponse } from "next/server";
import { updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment } from "@/lib/mercadopago";
import { getAdminSettings } from "@/lib/admin/settings";

async function validateMpSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | undefined,
): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook:mp-suscripciones] MP_WEBHOOK_SECRET no configurado — rechazando");
    return false;
  }
  if (!xSignature) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const idx = part.indexOf("=");
    if (idx !== -1) parts[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId ?? ""};request-id:${xRequestId ?? ""};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === v1;
}

export async function POST(request: Request) {
  let body: { type?: string; data?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const valid = await validateMpSignature(
    request.headers.get("x-signature"),
    request.headers.get("x-request-id"),
    body.data?.id ? String(body.data.id) : undefined,
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  // MP manda múltiples tipos de notificación — solo nos interesan pagos
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const paymentId = String(body.data.id);
  const admin = createAdminClient();

  // Deduplicar — MP puede enviar el mismo evento más de una vez
  const { data: existing } = await admin
    .from("cobros_suscripcion")
    .select("id")
    .eq("mp_payment_id", paymentId)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already_processed: true });

  const settings = await getAdminSettings();
  const accessToken = settings.clubio_mp_access_token;
  if (!accessToken) {
    console.error("[mp-suscripciones] clubio_mp_access_token no configurado");
    return NextResponse.json({ error: "MP no configurado" }, { status: 500 });
  }

  // Verificar el pago directamente con la API de MP (no confiar solo en el webhook)
  let payment: Awaited<ReturnType<typeof getMpPayment>>;
  try {
    payment = await getMpPayment(accessToken, paymentId);
  } catch (e) {
    console.error("[mp-suscripciones] getMpPayment error:", e);
    return NextResponse.json({ error: "Error al verificar pago" }, { status: 500 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true, status: payment.status });
  }

  // Parsear external_reference → cobro-suscripcion-{uuid}
  const extRef = payment.external_reference ?? "";
  const cobroId = extRef.replace("cobro-suscripcion-", "");
  if (!cobroId || cobroId === extRef) {
    console.error("[mp-suscripciones] external_reference inesperado:", extRef);
    return NextResponse.json({ error: "external_reference inválido" }, { status: 400 });
  }

  const { data: cobro } = await admin
    .from("cobros_suscripcion")
    .select("id, gym_id, licencia_id, monto_usd, estado")
    .eq("id", cobroId)
    .maybeSingle();

  if (!cobro) {
    console.error("[mp-suscripciones] cobro no encontrado:", cobroId);
    return NextResponse.json({ error: "Cobro no encontrado" }, { status: 404 });
  }

  if (cobro.estado === "pagado") {
    return NextResponse.json({ ok: true, already_paid: true });
  }

  // Marcar cobro como pagado
  await admin.from("cobros_suscripcion").update({
    estado: "pagado",
    mp_payment_id: paymentId,
    paid_at: new Date().toISOString(),
  }).eq("id", cobroId);

  // Auto-renovar licencia: max(fecha_vencimiento, hoy) + 1 mes
  const { data: licencia } = await admin
    .from("licencias")
    .select("fecha_vencimiento")
    .eq("id", cobro.licencia_id)
    .single();

  if (licencia) {
    // Renovación en cascada: aplicar +1 mes por cada cobro pagado pendiente de renovación
    // (cubre el caso en que el gym paga múltiples períodos atrasados)
    const { data: cobrosAplicar } = await admin
      .from("cobros_suscripcion")
      .select("id, periodo")
      .eq("licencia_id", cobro.licencia_id)
      .eq("estado", "pagado")
      .eq("renovacion_aplicada", false)
      .order("periodo", { ascending: true });

    const pendientes = cobrosAplicar ?? [];
    const totalMeses = Math.max(1, pendientes.length);

    let base = new Date(licencia.fecha_vencimiento) > new Date()
      ? new Date(licencia.fecha_vencimiento)
      : new Date();
    const nuevoVencimiento = new Date(base);
    nuevoVencimiento.setMonth(nuevoVencimiento.getMonth() + totalMeses);
    const nuevoVencimientoStr = nuevoVencimiento.toISOString().split("T")[0];

    await admin.from("licencias").update({
      fecha_vencimiento: nuevoVencimientoStr,
      activa: true,
      precio_pagado: cobro.monto_usd,
    }).eq("id", cobro.licencia_id);

    // Marcar todos los cobros aplicados
    const idsAplicar = pendientes.map((c) => c.id);
    if (idsAplicar.length > 0) {
      await admin.from("cobros_suscripcion").update({ renovacion_aplicada: true }).in("id", idsAplicar);
    } else {
      await admin.from("cobros_suscripcion").update({ renovacion_aplicada: true }).eq("id", cobroId);
    }
  }

  // Reactivar gym si estaba suspendido
  await admin.from("gyms").update({ activo: true }).eq("id", cobro.gym_id);

  // Invalidar cache de sesión de todos los usuarios del gym
  const { data: usuarios } = await admin
    .from("gym_usuarios")
    .select("id")
    .eq("gym_id", cobro.gym_id);

  (usuarios ?? []).forEach((u) => updateTag(`gym-ctx-${u.id}`));

  return NextResponse.json({ ok: true, cobro_id: cobroId });
}
