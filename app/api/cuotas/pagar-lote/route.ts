import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpClient } from "@/lib/mercadopago";
import { Preference } from "mercadopago";

const Schema = z.object({
  cuota_ids: z.array(z.string().uuid()).min(2, "Se requieren al menos 2 cuotas"),
});

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function isLocalhost(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export async function POST(request: Request) {
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { cuota_ids } = parsed.data;
  const supabase = await createClient();
  const admin = createAdminClient();

  // Verificar que todas las cuotas pertenecen al gym y no están pagadas
  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, alumno_id, mes, anio, monto_total, estado, alumnos!alumno_id(nombre, apellido)")
    .in("id", cuota_ids)
    .eq("gym_id", ctx.gymId);

  if (!cuotas || cuotas.length !== cuota_ids.length) {
    return NextResponse.json({ error: "Cuotas no encontradas o no pertenecen al gym" }, { status: 404 });
  }

  const yaPagadas = cuotas.filter((c) => c.estado === "pagada" || c.estado === "condonada");
  if (yaPagadas.length > 0) {
    return NextResponse.json({ error: "Una o más cuotas ya están pagadas" }, { status: 409 });
  }

  const alumnoIds = [...new Set(cuotas.map((c) => c.alumno_id))];
  if (alumnoIds.length > 1) {
    return NextResponse.json({ error: "Todas las cuotas deben pertenecer al mismo alumno" }, { status: 400 });
  }

  const primeraAlumno = cuotas[0].alumnos as { nombre: string; apellido: string } | null;
  const alumnoNombre = primeraAlumno ? `${primeraAlumno.nombre} ${primeraAlumno.apellido}` : "Alumno";
  const montoTotal = cuotas.reduce((acc, c) => acc + (c.monto_total ?? 0), 0);

  // Obtener token MP del gym
  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("mp_access_token")
    .eq("gym_id", ctx.gymId)
    .single();

  const accessToken = gymConfig?.mp_access_token ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 422 });
  }

  // Crear registro del lote
  const { data: lote, error: loteError } = await admin
    .from("cuota_lotes")
    .insert({
      gym_id:      ctx.gymId,
      alumno_id:   cuotas[0].alumno_id,
      cuota_ids:   cuota_ids,
      monto_total: montoTotal,
    })
    .select("id")
    .single();

  if (loteError || !lote) {
    return NextResponse.json({ error: "Error al crear el lote de pago" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const local  = isLocalhost(appUrl);
  const client = getMpClient(accessToken);
  const pref   = new Preference(client);

  const result = await pref.create({
    body: {
      items: cuotas.map((c) => ({
        id:         c.id,
        title:      `Cuota ${MESES[c.mes]} ${c.anio} - ${alumnoNombre}`,
        quantity:   1,
        unit_price: c.monto_total ?? 0,
        currency_id: "ARS",
      })),
      external_reference: `lote-${lote.id}`,
      statement_descriptor: "CLUBIO",
      ...(local ? {} : {
        notification_url: `${appUrl}/api/webhooks/mercadopago?gym_id=${ctx.gymId}`,
        back_urls: {
          success: `${appUrl}/pagar/success?nombre=${encodeURIComponent(alumnoNombre)}`,
          failure: `${appUrl}/pagar/failure?nombre=${encodeURIComponent(alumnoNombre)}`,
          pending: `${appUrl}/pagar/success?nombre=${encodeURIComponent(alumnoNombre)}&pendiente=1`,
        },
        auto_return: "approved" as const,
      }),
    },
  });

  await admin.from("cuota_lotes").update({ mp_preference_id: result.id }).eq("id", lote.id);

  return NextResponse.json({ url: result.init_point, lote_id: lote.id });
}
