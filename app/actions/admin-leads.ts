"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ESTADOS = ["nuevo", "contactado", "demo_agendada", "convertido", "perdido"] as const;
type LeadEstado = (typeof ESTADOS)[number];

export async function cambiarEstadoLeadAction(leadId: string, estado: LeadEstado): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  if (!ESTADOS.includes(estado)) return { ok: false, error: "Estado inválido" };
  const admin = createAdminClient();

  const { error } = await admin.from("leads").update({ estado, updated_at: new Date().toISOString() }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, "lead_estado_cambiado", undefined, { lead_id: leadId, estado });
  revalidatePath("/admin/leads");
  return { ok: true, data: undefined };
}

export async function agregarNotaLeadAction(leadId: string, nota: string): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const texto = nota.trim();
  if (texto.length < 2) return { ok: false, error: "La nota es muy corta" };
  const admin = createAdminClient();

  const { data: lead } = await admin.from("leads").select("notas").eq("id", leadId).single();
  if (!lead) return { ok: false, error: "Lead no encontrado" };

  const fecha = new Date().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const entrada = `[${fecha}] ${texto}`;
  const notasActualizadas = lead.notas ? `${lead.notas}\n${entrada}` : entrada;

  const { error } = await admin.from("leads").update({ notas: notasActualizadas, updated_at: new Date().toISOString() }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, "lead_nota_agregada", undefined, { lead_id: leadId });
  revalidatePath("/admin/leads");
  return { ok: true, data: undefined };
}
