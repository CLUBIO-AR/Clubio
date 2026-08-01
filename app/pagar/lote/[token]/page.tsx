import { createHash } from "crypto";
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
    return <ErrorPage mensaje="Este link de pago venció o no es válido. Pedile uno nuevo a tu gimnasio." />;
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
    .select("mp_access_token, mp_solo_dinero_cuenta")
    .eq("gym_id", payload.gym_id)
    .single();

  const accessToken = gymConfig?.mp_access_token;
  if (!accessToken) {
    return <ErrorPage mensaje="Estamos teniendo problemas con los pagos. Ya estamos trabajando para resolverlo, probá de nuevo más tarde." />;
  }

  const montoTotal = pendientes.reduce((acc, c) => acc + (c.monto_total ?? 0), 0);
  const pendienteIds = pendientes.map((c) => c.id);

  // Hash determinístico para deduplicar inserts concurrentes del mismo link.
  // Dos renders simultáneos producirían el mismo hash → el segundo falla con 23505
  // y retomamos el lote ya creado por el primero.
  const cuotaHash = createHash("sha256")
    .update(`${payload.alumno_id}:${[...pendienteIds].sort().join(",")}`)
    .digest("hex");

  let loteId: string;

  const { data: loteInsert, error: loteError } = await admin
    .from("cuota_lotes")
    .insert({
      gym_id:      payload.gym_id,
      alumno_id:   payload.alumno_id,
      cuota_ids:   pendienteIds,
      cuota_hash:  cuotaHash,
      monto_total: montoTotal,
    })
    .select("id")
    .single();

  if (loteError) {
    if (loteError.code === "23505") {
      // Render concurrente del mismo link — recuperar el lote ya creado
      const { data: existing } = await admin
        .from("cuota_lotes")
        .select("id")
        .eq("alumno_id", payload.alumno_id)
        .eq("cuota_hash", cuotaHash)
        .eq("estado", "pendiente")
        .single();
      if (!existing) return <ErrorPage mensaje="Error al procesar el pago. Intentá de nuevo." />;
      loteId = existing.id;
    } else {
      return <ErrorPage mensaje="Error al procesar el pago. Intentá de nuevo." />;
    }
  } else if (!loteInsert) {
    return <ErrorPage mensaje="Error al procesar el pago. Intentá de nuevo." />;
  } else {
    loteId = loteInsert.id;
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
      external_reference: `lote-${loteId}`,
      statement_descriptor: "CLUBIO",
      ...(gymConfig?.mp_solo_dinero_cuenta
        ? { payment_methods: { excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }] } }
        : {}),
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

  await admin.from("cuota_lotes").update({ mp_preference_id: result.id }).eq("id", loteId);

  redirect(result.init_point!);
}

function ErrorPage({ mensaje }: { mensaje: string }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.danger, fontFamily: "var(--font-fredoka)", fontSize: "1.1rem", fontWeight: 700, textAlign: "center", padding: "2rem", maxWidth: 400 }}>
        {mensaje}
      </p>
    </div>
  );
}
