// Registra en el inbox de WhatsApp (mensajes_whatsapp) los avisos que salen por plantilla
// (crons y "Reenviar aviso"). Sin esto, el panel de WhatsApp solo mostraba los mensajes
// escritos a mano, y los status de Meta (entregado/leído) no tenían fila que actualizar.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { normalizarTelefonoAR } from "@/lib/telefono";

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

type Admin = SupabaseClient<Database>;

export type AvisoInbox = {
  gymId: string;
  alumnoId: string | null;
  telefono: string | null | undefined;
  waMessageId: string | null | undefined;
  tipo: string;
  cuota?: { mes: number; anio: number; monto_total: number | null } | null;
};

const ETIQUETA_TIPO: Record<string, string> = {
  aviso_vencimiento: "Aviso de cuota",
  recordatorio_vencido: "Recordatorio de cuota vencida",
  aviso_vence_hoy_aumento: "Aviso: vence hoy",
  confirmacion_pago: "Confirmación de pago",
  aviso_ultimo_llamado: "Último aviso",
};

export function resumenAviso(tipo: string, cuota?: AvisoInbox["cuota"]): string {
  const etiqueta = ETIQUETA_TIPO[tipo] ?? "Aviso automático";
  if (!cuota) return `📋 ${etiqueta}`;
  const monto = (cuota.monto_total ?? 0).toLocaleString("es-AR");
  return `📋 ${etiqueta} · ${MESES[cuota.mes] ?? cuota.mes}/${cuota.anio} · $${monto}`;
}

/** Nunca tira: si falla el insert solo se loguea, el aviso ya salió por Meta. */
export async function registrarAvisoEnInbox(admin: Admin, aviso: AvisoInbox): Promise<void> {
  // Mismo formato que usa el webhook para los entrantes (dígitos, 549…), así el inbox
  // agrupa en una sola conversación lo que mandamos y lo que responde el alumno.
  const telefono = normalizarTelefonoAR(aviso.telefono);
  if (!telefono) return;

  const { error } = await admin.from("mensajes_whatsapp").insert({
    gym_id: aviso.gymId,
    alumno_id: aviso.alumnoId,
    telefono,
    direccion: "saliente",
    cuerpo: resumenAviso(aviso.tipo, aviso.cuota),
    wa_message_id: aviso.waMessageId ?? null,
    estado: "enviado",
  });
  if (error) console.error("[inbox] no se pudo registrar el aviso en mensajes_whatsapp:", error.message);
}
