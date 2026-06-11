import { jwtVerify } from "jose";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMpPreference } from "@/lib/mercadopago";
import { T } from "@/lib/theme";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type TokenPayload = {
  cuota_id: string;
  gym_id: string;
  alumno_id: string;
  alumno_nombre: string;
  mes: number;
  anio: number;
  monto: number;
};

export default async function PagarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let payload: TokenPayload;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload: p } = await jwtVerify(token, secret);
    payload = p as unknown as TokenPayload;
  } catch {
    return (
      <ErrorPage mensaje="Este link de pago venció o no es válido. Pedile uno nuevo a tu gimnasio." />
    );
  }

  const admin = createAdminClient();

  // Verificar estado actual de la cuota
  const { data: cuota } = await admin
    .from("cuotas")
    .select("estado, monto_total")
    .eq("id", payload.cuota_id)
    .eq("gym_id", payload.gym_id)
    .single();

  if (!cuota) notFound();

  if (cuota.estado === "pagada") {
    redirect(`/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}&ya_pagada=1`);
  }
  if (cuota.estado === "condonada") {
    redirect(`/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}&condonada=1`);
  }

  // Obtener credenciales MP del gym
  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("mp_access_token")
    .eq("gym_id", payload.gym_id)
    .single();

  const { data: gym } = await admin
    .from("gyms")
    .select("nombre")
    .eq("id", payload.gym_id)
    .single();

  const accessToken = gymConfig?.mp_access_token ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return <ErrorPage mensaje="El gym aún no configuró MercadoPago. Contactá al gimnasio." />;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const { init_point } = await createMpPreference({
    accessToken,
    cuotaId: payload.cuota_id,
    gymId: payload.gym_id,
    alumnoNombre: payload.alumno_nombre,
    mes: payload.mes,
    anio: payload.anio,
    monto: cuota.monto_total ?? payload.monto,
    backUrls: {
      success: `${appUrl}/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}`,
      failure: `${appUrl}/pagar/failure?nombre=${encodeURIComponent(payload.alumno_nombre)}`,
      pending: `${appUrl}/pagar/success?nombre=${encodeURIComponent(payload.alumno_nombre)}&pendiente=1`,
    },
    notificationUrl: `${appUrl}/api/webhooks/mercadopago?gym_id=${payload.gym_id}`,
  });

  redirect(init_point);
}

function ErrorPage({ mensaje }: { mensaje: string }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "2rem", maxWidth: 400 }}>
        <p style={{ color: T.danger, fontFamily: "var(--font-barlow-condensed)", fontSize: "1.1rem", fontWeight: 700 }}>
          {mensaje}
        </p>
      </div>
    </div>
  );
}
