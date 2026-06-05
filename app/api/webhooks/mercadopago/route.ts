import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment } from "@/lib/mercadopago";

// MercadoPago envía notificaciones tipo "payment" a esta URL.
// La URL se configura en la preference como notification_url.
// gym_id se incluye como query param para identificar las credenciales del gym.

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

  // Verificar que no procesamos este pago antes
  const { data: existente } = await admin
    .from("pagos")
    .select("id")
    .eq("mp_payment_id", paymentId)
    .maybeSingle();

  if (existente) return NextResponse.json({ ok: true, duplicate: true });

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

  const cuotaId = payment.external_reference;
  if (!cuotaId) return NextResponse.json({ error: "external_reference vacío" }, { status: 422 });

  // Verificar que la cuota pertenece al gym
  const { data: cuota } = await admin
    .from("cuotas")
    .select("id, alumno_id, monto_total, estado")
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
    gym_id: gymId,
    cuota_id: cuotaId,
    alumno_id: cuota.alumno_id,
    monto,
    metodo: "mercadopago",
    mp_payment_id: paymentId,
  });

  if (pagoError) return NextResponse.json({ error: pagoError.message }, { status: 500 });

  await admin.from("cuotas").update({
    estado: "pagada",
    fecha_pago: new Date().toISOString(),
    metodo_pago: "mercadopago",
  }).eq("id", cuotaId);

  return NextResponse.json({ ok: true, cuota_id: cuotaId, monto });
}
