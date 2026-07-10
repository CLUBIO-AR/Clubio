import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment } from "@/lib/mercadopago";
import { notifyGymOwnerPago } from "@/lib/notifications/gym-owner";

// MercadoPago envía notificaciones tipo "payment" a esta URL.
// La URL se configura en la preference como notification_url.
// gym_id se incluye como query param para identificar las credenciales del gym.

async function validateMpSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | undefined,
): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook:mp] MP_WEBHOOK_SECRET no configurado — rechazando request");
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

  // Rechazar requests con timestamp fuera de ±5 min para evitar replay attacks
  const tsSeconds = parseInt(ts, 10);
  if (isNaN(tsSeconds) || Math.abs(Date.now() / 1000 - tsSeconds) > 300) return false;

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

  // Comparación en tiempo constante para prevenir timing attacks
  if (computed.length !== v1.length) return false;
  return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(v1, "hex"));
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get("gym_id");

  if (!gymId) return NextResponse.json({ error: "gym_id requerido" }, { status: 400 });

  let body: { type?: string; data?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const valid = await validateMpSignature(
    request.headers.get("x-signature"),
    request.headers.get("x-request-id"),
    body.data?.id ? String(body.data.id) : undefined,
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  // Solo procesamos notificaciones de tipo "payment"
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(body.data.id);
  const admin = createAdminClient();

  // Obtener credenciales MP del gym
  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("mp_access_token")
    .eq("gym_id", gymId)
    .single();

  // Si el gym no tiene MP configurado, fallback a credenciales de plataforma
  const accessToken = gymConfig?.mp_access_token ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ error: "MP no configurado" }, { status: 503 });

  // Verificar que no procesamos este pago antes (cuota individual o lote)
  const [pagoExistente, loteExistente] = await Promise.all([
    admin.from("pagos").select("id").eq("mp_payment_id", paymentId).maybeSingle(),
    admin.from("cuota_lotes").select("id").eq("mp_payment_id", paymentId).maybeSingle(),
  ]);

  if (pagoExistente.data || loteExistente.data) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Obtener datos del pago desde MP
  let payment;
  try {
    payment = await getMpPayment(accessToken, paymentId);
  } catch {
    return NextResponse.json({ error: "Error consultando MP" }, { status: 502 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true, status: payment.status });
  }

  const extRef = payment.external_reference ?? "";
  if (!extRef) return NextResponse.json({ error: "external_reference vacío" }, { status: 422 });

  // --- Pago de lote (múltiples cuotas) ---
  if (extRef.startsWith("lote-")) {
    const loteId = extRef.slice(5);

    const { data: lote } = await admin
      .from("cuota_lotes")
      .select("id, estado, gym_id, cuota_ids, alumno_id")
      .eq("id", loteId)
      .maybeSingle();

    if (!lote) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    if (lote.gym_id !== gymId) return NextResponse.json({ error: "Gym mismatch" }, { status: 403 });
    if (lote.estado === "pagado") return NextResponse.json({ ok: true, already_paid: true });

    // RPC atómica: marca el lote + inserta pagos + actualiza cuotas en una transacción
    const { data: rpcResult, error: rpcError } = await admin.rpc("procesar_pago_lote", {
      p_lote_id:    loteId,
      p_payment_id: paymentId,
      p_gym_id:     gymId,
    });

    if (rpcError) {
      console.error("[webhook:mp] procesar_pago_lote error:", rpcError.message);
      return NextResponse.json({ error: "Error procesando pago de lote" }, { status: 500 });
    }

    const result = rpcResult?.[0];
    if (result && result.alumno_id && result.cuotas_pagadas > 0) {
      notifyGymOwnerPago({
        gymId,
        alumnoId:       result.alumno_id,
        monto:          payment.transaction_amount ?? 0,
        metodo:         "mercadopago",
        cantidadCuotas: result.cuotas_pagadas,
      }).catch(console.error);
    }

    return NextResponse.json({ ok: true, lote_id: loteId, cuotas_pagadas: result?.cuotas_pagadas ?? 0 });
  }

  // --- Pago de cuota individual ---
  const cuotaId = extRef;

  // Verificar que la cuota pertenece al gym
  const { data: cuota } = await admin
    .from("cuotas")
    .select("id, alumno_id, monto_total, estado, mes, anio")
    .eq("id", cuotaId)
    .eq("gym_id", gymId)
    .single();

  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });

  if (cuota.estado === "pagada") {
    return NextResponse.json({ ok: true, already_paid: true });
  }

  const monto = payment.transaction_amount ?? cuota.monto_total ?? 0;

  // Marcar cuota como pagada + insertar en pagos (operación atómica via RPC sería ideal,
  // pero usamos dos operaciones: si falla la segunda, el webhook re-intentará y el duplicate
  // check del inicio lo filtrará)
  const { error: pagoError } = await admin.from("pagos").insert({
    gym_id:        gymId,
    cuota_id:      cuotaId,
    alumno_id:     cuota.alumno_id,
    monto,
    metodo:        "mercadopago",
    mp_payment_id: paymentId,
  });

  if (pagoError) {
    if (pagoError.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: pagoError.message }, { status: 500 });
  }

  await admin.from("cuotas").update({
    estado:      "pagada",
    fecha_pago:  new Date().toISOString(),
    metodo_pago: "mercadopago",
  }).eq("id", cuotaId);

  notifyGymOwnerPago({
    gymId,
    alumnoId: cuota.alumno_id,
    cuotaId,
    monto,
    metodo: "mercadopago",
    mes:    cuota.mes,
    anio:   cuota.anio,
  }).catch(console.error);

  return NextResponse.json({ ok: true, cuota_id: cuotaId, monto });
}
