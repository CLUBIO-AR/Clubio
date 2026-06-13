// Notificaciones internas al owner del gym — pagos recibidos, vencimientos, resumen semanal.
// Usa createAdminClient porque se llama desde crons y webhooks (sin contexto de usuario).
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendGymOwnerPagoRecibido,
  sendGymOwnerCuotasVencidas,
  sendGymOwnerResumenSemanal,
} from "./channels/email";

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Notifica al owner cuando se registra un pago (MP o manual).
// Fire-and-forget: el llamador debe `.catch(console.error)` si no quiere bloquear.
export async function notifyGymOwnerPago(params: {
  gymId: string;
  alumnoId: string;
  cuotaId?: string;
  monto: number;
  metodo: string;
  mes?: number;
  anio?: number;
  cantidadCuotas?: number;
}): Promise<void> {
  const admin = createAdminClient();

  const [gymResult, alumnoResult] = await Promise.all([
    admin.from("gyms").select("nombre, email_contacto").eq("id", params.gymId).single(),
    admin.from("alumnos").select("nombre, apellido").eq("id", params.alumnoId).single(),
  ]);

  const gym    = gymResult.data;
  const alumno = alumnoResult.data;

  if (!gym?.email_contacto) return;

  const descripcion = params.cantidadCuotas
    ? `Lote de ${params.cantidadCuotas} cuota${params.cantidadCuotas > 1 ? "s" : ""}`
    : params.mes && params.anio
      ? `Cuota ${MESES[params.mes] ?? params.mes} ${params.anio}`
      : "Cuota";

  let providerId: string | undefined;
  let estado: "enviado" | "error" = "enviado";

  try {
    providerId = await sendGymOwnerPagoRecibido({
      to:              gym.email_contacto,
      gymNombre:       gym.nombre,
      alumnoNombre:    alumno?.nombre ?? "",
      alumnoApellido:  alumno?.apellido ?? "",
      monto:           params.monto,
      metodo:          params.metodo,
      descripcion,
    });
  } catch (err) {
    console.error("[gym-owner] notifyGymOwnerPago error:", err);
    estado = "error";
  }

  await admin.from("notificaciones_log").insert({
    gym_id:      params.gymId,
    cuota_id:    params.cuotaId ?? null,
    tipo:        "gym_pago_recibido",
    enviado_a:   gym.email_contacto,
    estado,
    provider_id: providerId ?? null,
  });
}

// Notifica al owner con la lista de cuotas que vencieron exactamente hoy.
// Incluye dedup: no envía si ya se mandó una notificación del mismo tipo hoy.
export async function notifyGymOwnerCuotasVencidas(gymId: string): Promise<void> {
  const admin = createAdminClient();
  const hoy = new Date().toISOString().split("T")[0];

  const { data: yaEnviado } = await admin
    .from("notificaciones_log")
    .select("id")
    .eq("gym_id", gymId)
    .eq("tipo", "gym_cuotas_vencidas")
    .gte("created_at", `${hoy}T00:00:00.000Z`)
    .maybeSingle();

  if (yaEnviado) return;

  const [gymResult, cuotasResult] = await Promise.all([
    admin.from("gyms").select("nombre, email_contacto").eq("id", gymId).single(),
    admin
      .from("cuotas")
      .select("id, mes, anio, monto_total, alumnos!alumno_id(nombre, apellido)")
      .eq("gym_id", gymId)
      .eq("estado", "vencida")
      .eq("fecha_vencimiento", hoy),
  ]);

  const gym    = gymResult.data;
  const cuotas = cuotasResult.data ?? [];

  if (!gym?.email_contacto || cuotas.length === 0) return;

  const cuotasParams = cuotas.map((c) => {
    const alumno = c.alumnos as { nombre: string; apellido: string } | null;
    return {
      nombre:      alumno?.nombre   ?? "",
      apellido:    alumno?.apellido ?? "",
      monto_total: c.monto_total ?? 0,
      mes:         c.mes,
      anio:        c.anio,
    };
  });

  let providerId: string | undefined;
  let estado: "enviado" | "error" = "enviado";

  try {
    providerId = await sendGymOwnerCuotasVencidas({
      to:        gym.email_contacto,
      gymNombre: gym.nombre,
      cuotas:    cuotasParams,
    });
  } catch (err) {
    console.error("[gym-owner] notifyGymOwnerCuotasVencidas error:", err);
    estado = "error";
  }

  await admin.from("notificaciones_log").insert({
    gym_id:      gymId,
    tipo:        "gym_cuotas_vencidas",
    enviado_a:   gym.email_contacto,
    estado,
    provider_id: providerId ?? null,
  });
}

// Resumen semanal: total de cuotas vencidas acumuladas + monto.
// Incluye dedup: no envía si ya se mandó en los últimos 6 días.
export async function sendResumenSemanalGym(gymId: string): Promise<void> {
  const admin = createAdminClient();

  const seisAtras = new Date(Date.now() - 6 * 86_400_000).toISOString();
  const { data: yaEnviado } = await admin
    .from("notificaciones_log")
    .select("id")
    .eq("gym_id", gymId)
    .eq("tipo", "gym_resumen_semanal")
    .gte("created_at", seisAtras)
    .maybeSingle();

  if (yaEnviado) return;

  const [gymResult, cuotasResult] = await Promise.all([
    admin.from("gyms").select("nombre, email_contacto").eq("id", gymId).single(),
    admin.from("cuotas").select("monto_total").eq("gym_id", gymId).eq("estado", "vencida"),
  ]);

  const gym    = gymResult.data;
  const cuotas = cuotasResult.data ?? [];

  if (!gym?.email_contacto || cuotas.length === 0) return;

  const montoTotal    = cuotas.reduce((s, c) => s + (c.monto_total ?? 0), 0);
  const dashboardUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "";

  let providerId: string | undefined;
  let estado: "enviado" | "error" = "enviado";

  try {
    providerId = await sendGymOwnerResumenSemanal({
      to:            gym.email_contacto,
      gymNombre:     gym.nombre,
      totalVencidas: cuotas.length,
      montoTotal,
      dashboardUrl,
    });
  } catch (err) {
    console.error("[gym-owner] sendResumenSemanalGym error:", err);
    estado = "error";
  }

  await admin.from("notificaciones_log").insert({
    gym_id:      gymId,
    tipo:        "gym_resumen_semanal",
    enviado_a:   gym.email_contacto,
    estado,
    provider_id: providerId ?? null,
  });
}
