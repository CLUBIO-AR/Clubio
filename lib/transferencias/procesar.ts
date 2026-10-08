// Procesa una transferencia avisada por el proveedor:
//  1. la identifica con el alumno por el CVU/alias de destino,
//  2. la guarda (idempotente: si el proveedor reintenta el aviso no se duplica),
//  3. la imputa a las cuotas abiertas (función imputar_transferencia, atómica),
//  4. le confirma el pago al alumno y lo reactiva si estaba dado de baja por mora.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { TransferenciaEntrante } from "./proveedores";
import { reactivarAlumnoSiCorresponde } from "@/lib/cuotas";
import { obtenerEstadoCuenta } from "@/lib/estado-cuenta";
import { sendNotification } from "@/lib/notifications";
import { sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";
import { registrarAvisoEnInbox } from "@/lib/notifications/inbox";
import { normalizarTelefonoAR } from "@/lib/telefono";

type Admin = SupabaseClient<Database>;

export type ResultadoImputacion = {
  estado: "imputada" | "saldo_a_favor" | "sin_asignar";
  monto_imputado?: number;
  saldo_a_favor?: number;
  ya_imputada?: boolean;
  cuotas?: Array<{ cuota_id: string; monto: number; completa: boolean }>;
};

export type ResultadoProceso =
  | { ok: true; duplicada: true }
  | { ok: true; duplicada: false; transferenciaId: string; resultado: ResultadoImputacion };

export async function procesarTransferencia(admin: Admin, proveedor: string, t: TransferenciaEntrante): Promise<ResultadoProceso> {
  // 1. ¿De qué alumno es? Por CVU o por alias de destino.
  let cuenta: { id: string; gym_id: string; alumno_id: string } | null = null;
  if (t.cvuDestino) {
    // El CVU es único en todo el sistema bancario: no hace falta filtrar por proveedor.
    const { data } = await admin.from("cuentas_cobro_alumno").select("id, gym_id, alumno_id")
      .eq("cvu", t.cvuDestino).is("deleted_at", null).maybeSingle();
    cuenta = data;
  }
  if (!cuenta && t.aliasDestino) {
    const { data } = await admin.from("cuentas_cobro_alumno").select("id, gym_id, alumno_id")
      .ilike("alias", t.aliasDestino).is("deleted_at", null).maybeSingle();
    cuenta = data;
  }

  // 2. Guardar. El índice único (proveedor, external_id) frena los reintentos del proveedor.
  const { data: fila, error } = await admin.from("transferencias").insert({
    gym_id: cuenta?.gym_id ?? null,
    proveedor,
    external_id: t.externalId,
    cuenta_cobro_id: cuenta?.id ?? null,
    alumno_id: cuenta?.alumno_id ?? null,
    cvu_destino: t.cvuDestino,
    alias_destino: t.aliasDestino,
    monto: t.monto,
    fecha: t.fecha.toISOString(),
    pagador_nombre: t.pagadorNombre,
    pagador_cuit: t.pagadorCuit,
    concepto: t.concepto,
    estado: cuenta ? "pendiente" : "sin_asignar",
    raw: t.raw as Json,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") return { ok: true, duplicada: true };
    throw new Error(`No se pudo guardar la transferencia: ${error.message}`);
  }

  const resultado = await imputar(admin, fila.id);
  if (cuenta && resultado.estado !== "sin_asignar" && !resultado.ya_imputada) {
    await despuesDeImputar(admin, cuenta.gym_id, cuenta.alumno_id, t.monto, resultado);
  }
  return { ok: true, duplicada: false, transferenciaId: fila.id, resultado };
}

export async function imputar(admin: Admin, transferenciaId: string): Promise<ResultadoImputacion> {
  const { data, error } = await admin.rpc("imputar_transferencia", { p_transferencia_id: transferenciaId });
  if (error) throw new Error(`No se pudo imputar la transferencia: ${error.message}`);
  return data as unknown as ResultadoImputacion;
}

/** Reactivar al alumno (si correspondía) y confirmarle el pago. Nunca tira. */
export async function despuesDeImputar(admin: Admin, gymId: string, alumnoId: string, monto: number, r: ResultadoImputacion): Promise<void> {
  try {
    if (r.cuotas?.some((c) => c.completa)) await reactivarAlumnoSiCorresponde(admin, alumnoId);
  } catch (err) {
    console.error("[transferencias] no se pudo reactivar al alumno:", err instanceof Error ? err.message : err);
  }
  try {
    await confirmarPago(admin, gymId, alumnoId, monto);
  } catch (err) {
    console.error("[transferencias] no se pudo confirmar el pago al alumno:", err instanceof Error ? err.message : err);
  }
}

const pesos = (n: number) => `$${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

async function confirmarPago(admin: Admin, gymId: string, alumnoId: string, monto: number): Promise<void> {
  const [{ data: alumno }, { data: gym }, { data: config }, estado] = await Promise.all([
    admin.from("alumnos").select("nombre, email, telefono").eq("id", alumnoId).maybeSingle(),
    admin.from("gyms").select("nombre, logo_url").eq("id", gymId).maybeSingle(),
    admin.from("gym_config").select("email_activo, email_remitente_nombre, email_remitente_address, email_color_acento, whatsapp_activo, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_confirmacion").eq("gym_id", gymId).maybeSingle(),
    obtenerEstadoCuenta(admin, gymId, alumnoId),
  ]);
  if (!alumno || !gym || !config) return;

  const detalle = estado && estado.pendientes.length > 0
    ? `Te queda pendiente ${pesos(estado.totalAdeudado)}.`
    : "¡Quedaste al día! 🙌";
  const texto = `✅ ¡Recibimos tu transferencia de ${pesos(monto)}, ${alumno.nombre}! ${detalle}\n${gym.nombre}`;

  // WhatsApp: si el alumno escribió en las últimas 24 hs, va un texto con el detalle (gratis);
  // si no, la plantilla de confirmación aprobada (si el gym la configuró).
  const telefono = normalizarTelefonoAR(alumno.telefono);
  let whatsappEnviado = false;
  if (telefono && config.whatsapp_activo && config.whatsapp_phone_number_id && config.whatsapp_access_token) {
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin.from("mensajes_whatsapp").select("id", { count: "exact", head: true })
      .eq("gym_id", gymId).eq("telefono", telefono).eq("direccion", "entrante").gte("created_at", desde);
    if ((count ?? 0) > 0) {
      const waMessageId = await sendWhatsAppText(config, { to: telefono, body: texto });
      await admin.from("mensajes_whatsapp").insert({
        gym_id: gymId, alumno_id: alumnoId, telefono, direccion: "saliente", cuerpo: texto, wa_message_id: waMessageId, estado: "enviado",
      });
      whatsappEnviado = true;
    }
  }

  const resultados = await sendNotification({
    email_activo: config.email_activo,
    email_remitente_nombre: config.email_remitente_nombre,
    email_remitente_address: config.email_remitente_address,
    whatsapp_activo: !whatsappEnviado && config.whatsapp_activo && !!config.whatsapp_template_confirmacion,
    whatsapp_phone_number_id: config.whatsapp_phone_number_id,
    whatsapp_access_token: config.whatsapp_access_token,
    whatsapp_template_confirmacion: config.whatsapp_template_confirmacion,
  }, {
    type: "confirmacion_pago",
    alumno: { nombre: alumno.nombre, email: alumno.email, telefono: alumno.telefono },
    gym: { nombre: gym.nombre, logo_url: gym.logo_url, color_acento: config.email_color_acento },
  });

  const wa = resultados.find((r) => r.canal === "whatsapp" && r.ok);
  if (wa) {
    await registrarAvisoEnInbox(admin, { gymId, alumnoId, telefono: alumno.telefono, waMessageId: wa.provider_id, tipo: "confirmacion_pago" });
  }
}
