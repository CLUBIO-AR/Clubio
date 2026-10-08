// Estado de una conversación del bot de WhatsApp (tabla whatsapp_bot_estado):
// - awaiting_receipt: el alumno tocó "Ya transferí" y esperamos la foto/PDF del comprobante.
// - handoff: el alumno pidió hablar con una persona; mientras dure, el bot no responde.
// Solo lo usan el webhook y el bot (cliente service_role).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

export const ESPERA_COMPROBANTE_MIN = 30;
export const HANDOFF_HORAS = 12;

export type EstadoBot = {
  esperandoComprobante: { alumnoId: string; cuotaIds: string[] } | null;
  handoffActivo: boolean;
};

const SIN_ESTADO: EstadoBot = { esperandoComprobante: null, handoffActivo: false };

/** Lee el estado vigente (lo vencido cuenta como sin estado). Nunca tira. */
export async function leerEstadoBot(admin: Admin, gymId: string, telefono: string, ahora: Date): Promise<EstadoBot> {
  const { data, error } = await admin
    .from("whatsapp_bot_estado")
    .select("estado, datos, expira_at, handoff_hasta")
    .eq("gym_id", gymId)
    .eq("telefono", telefono)
    .maybeSingle();
  if (error || !data) return SIN_ESTADO;
  return interpretarEstado(data, ahora);
}

export function interpretarEstado(
  fila: { estado: string | null; datos: unknown; expira_at: string | null; handoff_hasta: string | null },
  ahora: Date,
): EstadoBot {
  const vigente = (iso: string | null) => !!iso && Date.parse(iso) > ahora.getTime();
  const datos = (fila.datos ?? {}) as { alumnoId?: unknown; cuotaIds?: unknown };
  const esperando = fila.estado === "awaiting_receipt" && vigente(fila.expira_at) && typeof datos.alumnoId === "string"
    ? {
        alumnoId: datos.alumnoId,
        cuotaIds: Array.isArray(datos.cuotaIds) ? datos.cuotaIds.filter((c): c is string => typeof c === "string") : [],
      }
    : null;
  return { esperandoComprobante: esperando, handoffActivo: vigente(fila.handoff_hasta) };
}

async function guardar(admin: Admin, gymId: string, telefono: string, cambios: Database["public"]["Tables"]["whatsapp_bot_estado"]["Update"]) {
  const { error } = await admin
    .from("whatsapp_bot_estado")
    .upsert({ gym_id: gymId, telefono, ...cambios, updated_at: new Date().toISOString() }, { onConflict: "gym_id,telefono" });
  if (error) console.error("[bot-estado] no se pudo guardar el estado:", gymId, telefono, error.message);
}

export function esperarComprobante(admin: Admin, gymId: string, telefono: string, datos: { alumnoId: string; cuotaIds: string[] }, ahora: Date) {
  return guardar(admin, gymId, telefono, {
    estado: "awaiting_receipt",
    datos,
    expira_at: new Date(ahora.getTime() + ESPERA_COMPROBANTE_MIN * 60000).toISOString(),
  });
}

export function dejarDeEsperarComprobante(admin: Admin, gymId: string, telefono: string) {
  return guardar(admin, gymId, telefono, { estado: null, datos: {}, expira_at: null });
}

export function activarHandoff(admin: Admin, gymId: string, telefono: string, ahora: Date) {
  return guardar(admin, gymId, telefono, {
    estado: null, datos: {}, expira_at: null,
    handoff_hasta: new Date(ahora.getTime() + HANDOFF_HORAS * 3600000).toISOString(),
  });
}

export function cortarHandoff(admin: Admin, gymId: string, telefono: string) {
  return guardar(admin, gymId, telefono, { handoff_hasta: null });
}
