import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpPayment } from "@/lib/mercadopago";
import { z } from "zod";

const Schema = z.object({
  cuota_id: z.string().uuid(),
  mp_payment_id: z.string().min(1),
});

// Endpoint para registrar manualmente un pago MP cuando el webhook no llega
// (desarrollo local, o fallback manual del admin)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios").select("gym_id").eq("id", user.id).single();
  if (!gymUsuario) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { cuota_id, mp_payment_id } = parsed.data;
  const admin = createAdminClient();

  // Verificar que la cuota pertenece al gym
  const { data: cuota } = await admin
    .from("cuotas").select("id, alumno_id, monto_total, estado")
    .eq("id", cuota_id).eq("gym_id", gymUsuario.gym_id).single();
  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
  if (cuota.estado === "pagada") return NextResponse.json({ ok: true, ya_pagada: true });

  // Verificar que no existe ya ese pago
  const { data: existente } = await admin
    .from("pagos").select("id").eq("mp_payment_id", mp_payment_id).maybeSingle();
  if (existente) return NextResponse.json({ ok: true, duplicate: true });

  // Obtener credenciales MP del gym
  const { data: gymConfig } = await admin
    .from("gym_config").select("mp_access_token").eq("gym_id", gymUsuario.gym_id).single();
  const accessToken = gymConfig?.mp_access_token ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ error: "MP no configurado" }, { status: 503 });

  // Consultar el pago en MP para verificar que está aprobado
  let payment;
  try {
    payment = await getMpPayment(accessToken, mp_payment_id);
  } catch {
    return NextResponse.json({ error: "No se pudo consultar el pago en MP" }, { status: 502 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({ error: `Pago no aprobado: ${payment.status}` }, { status: 422 });
  }

  const monto = payment.transaction_amount ?? cuota.monto_total ?? 0;

  await admin.from("pagos").insert({
    gym_id: gymUsuario.gym_id,
    cuota_id,
    alumno_id: cuota.alumno_id,
    monto,
    metodo: "mercadopago",
    mp_payment_id,
  });

  await admin.from("cuotas").update({
    estado: "pagada",
    fecha_pago: new Date().toISOString(),
    metodo_pago: "mercadopago",
  }).eq("id", cuota_id);

  revalidatePath("/dashboard/cuotas", "layout");
  revalidatePath("/dashboard/alumnos", "layout");
  revalidatePath("/dashboard", "page");
  return NextResponse.json({ ok: true, monto });
}
