import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment } from "@/lib/mercadopago";
import { z } from "zod";

const Schema = z.object({
  payment_id: z.string().min(1),
  cuota_id: z.string().uuid(),
});

// Llamado desde /pagar/success cuando MP redirige con payment_id en la URL.
// Registra el pago sin requerir auth de admin (el payment_id ya fue verificado con MP).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { payment_id, cuota_id } = parsed.data;
  const admin = createAdminClient();

  // Idempotente: si ya existe este pago, no hacer nada
  const { data: existente } = await admin
    .from("pagos").select("id").eq("mp_payment_id", payment_id).maybeSingle();
  if (existente) return NextResponse.json({ ok: true, duplicate: true });

  // Obtener cuota → gym_id → credenciales MP
  const { data: cuota } = await admin
    .from("cuotas").select("id, gym_id, alumno_id, monto_total, estado")
    .eq("id", cuota_id).single();
  if (!cuota || cuota.estado === "pagada") return NextResponse.json({ ok: true });

  const { data: gymConfig } = await admin
    .from("gym_config").select("mp_access_token").eq("gym_id", cuota.gym_id).single();
  const accessToken = gymConfig?.mp_access_token ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ ok: false }, { status: 503 });

  // Verificar con MP que el pago está aprobado
  let payment;
  try {
    payment = await getMpPayment(accessToken, payment_id);
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  if (payment.status !== "approved") return NextResponse.json({ ok: false, status: payment.status });

  const monto = payment.transaction_amount ?? cuota.monto_total ?? 0;

  await admin.from("pagos").insert({
    gym_id: cuota.gym_id,
    cuota_id,
    alumno_id: cuota.alumno_id,
    monto,
    metodo: "mercadopago",
    mp_payment_id: payment_id,
  });

  await admin.from("cuotas").update({
    estado: "pagada",
    fecha_pago: new Date().toISOString(),
    metodo_pago: "mercadopago",
  }).eq("id", cuota_id);

  return NextResponse.json({ ok: true, monto });
}
