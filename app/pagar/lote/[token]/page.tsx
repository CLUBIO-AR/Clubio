import { jwtVerify } from "jose";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMpClient } from "@/lib/mercadopago";
import { Preference } from "mercadopago";
import { T } from "@/lib/theme";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function isLocalhost(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

type LoteTokenPayload = {
  type: string;
  cuota_ids: string[];
  gym_id: string;
  alumno_id: string;
  alumno_nombre: string;
};

export default async function PagarLotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let payload: LoteTokenPayload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload: p } = await jwtVerify(token, secret);
    payload = p as unknown as LoteTokenPayload;
    if (payload.type !== "lote" || !Array.isArray(payload.cuota_ids) || !payload.cuota_ids.length) {
      notFound();
    }
  } catch {
    notFound();
  }

  const admin = createAdminClient();

  const { data: cuotas } = await admin
    .from("cuotas")
    .select("id, mes, anio, monto_total, estado")
    .in("id", payload.cuota_ids)
    .eq("gym_id", payload.gym_id);

  if (!cuotas?.length) notFound();

  const pendientes = cuotas.filter((c) => c.estado !== "pagada" && c.estado !== "condonada");
  if (pendientes.length === 0) {
    redirect(`/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}&ya_pagada=1`);
  }

  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("mp_access_token")
    .eq("gym_id", payload.gym_id)
    .single();

  const accessToken = gymConfig?.mp_access_token ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return <ErrorPage mensaje="El gym aún no configuró MercadoPago. Contactá al gimnasio." />;
  }

  const montoTotal = pendientes.reduce((acc, c) => acc + (c.monto_total ?? 0), 0);

  const { data: lote, error: loteError } = await admin
    .from("cuota_lotes")
    .insert({
      gym_id:      payload.gym_id,
      alumno_id:   payload.alumno_id,
      cuota_ids:   pendientes.map((c) => c.id),
      monto_total: montoTotal,
    })
    .select("id")
    .single();

  if (loteError || !lote) {
    return <ErrorPage mensaje="Error al procesar el pago. Intentá de nuevo." />;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const local  = isLocalhost(appUrl);
  const client = getMpClient(accessToken);
  const pref   = new Preference(client);

  const result = await pref.create({
    body: {
      items: pendientes.map((c) => ({
        id:          c.id,
        title:       `Cuota ${MESES[c.mes]} ${c.anio} - ${payload.alumno_nombre}`,
        quantity:    1,
        unit_price:  c.monto_total ?? 0,
        currency_id: "ARS",
      })),
      external_reference: `lote-${lote.id}`,
      statement_descriptor: "CLUBIO",
      ...(local ? {} : {
        notification_url: `${appUrl}/api/webhooks/mercadopago?gym_id=${payload.gym_id}`,
        back_urls: {
          success: `${appUrl}/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}`,
          failure: `${appUrl}/pagar/failure?nombre=${encodeURIComponent(payload.alumno_nombre)}`,
          pending: `${appUrl}/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}&pendiente=1`,
        },
        auto_return: "approved" as const,
      }),
    },
  });

  await admin.from("cuota_lotes").update({ mp_preference_id: result.id }).eq("id", lote.id);

  redirect(result.init_point!);
}

function ErrorPage({ mensaje }: { mensaje: string }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.danger, fontFamily: "var(--font-barlow-condensed)", fontSize: "1.1rem", fontWeight: 700, textAlign: "center", padding: "2rem", maxWidth: 400 }}>
        {mensaje}
      </p>
    </div>
  );
}
