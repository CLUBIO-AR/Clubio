"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { despuesDeImputar, imputar, procesarTransferencia } from "@/lib/transferencias/procesar";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/** Asigna a un alumno una transferencia que llegó sin poder identificarse, y la imputa. */
export async function asignarTransferenciaAction(transferenciaId: string, alumnoId: string): Promise<ActionResult> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const ids = z.object({ t: z.string().uuid(), a: z.string().uuid() }).safeParse({ t: transferenciaId, a: alumnoId });
  if (!ids.success) return { ok: false, error: "Datos inválidos" };

  const admin = createAdminClient();
  const { data: alumno } = await admin.from("alumnos").select("id").eq("id", alumnoId).eq("gym_id", ctx.gymId).is("deleted_at", null).maybeSingle();
  if (!alumno) return { ok: false, error: "Alumno no encontrado" };

  const { data: t, error } = await admin.from("transferencias")
    .update({ alumno_id: alumnoId, estado: "pendiente", asignada_por: ctx.user.id })
    .eq("id", transferenciaId).eq("gym_id", ctx.gymId).eq("estado", "sin_asignar")
    .select("id, monto").maybeSingle();
  if (error || !t) return { ok: false, error: "La transferencia ya no está sin asignar" };

  try {
    const r = await imputar(admin, t.id);
    await despuesDeImputar(admin, ctx.gymId, alumnoId, Number(t.monto), r);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al imputar" };
  }
  revalidatePath("/dashboard/transferencias");
  return { ok: true, data: undefined };
}

/** Aplica el saldo a favor de una transferencia a las cuotas que se generaron después. */
export async function aplicarSaldoAction(transferenciaId: string): Promise<ActionResult<{ aplicado: number }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (!z.string().uuid().safeParse(transferenciaId).success) return { ok: false, error: "Datos inválidos" };

  const admin = createAdminClient();
  const { data: t } = await admin.from("transferencias").select("id, monto_imputado").eq("id", transferenciaId)
    .eq("gym_id", ctx.gymId).eq("estado", "saldo_a_favor").maybeSingle();
  if (!t) return { ok: false, error: "No hay saldo a favor para aplicar" };

  const r = await imputar(admin, t.id);
  revalidatePath("/dashboard/transferencias");
  return { ok: true, data: { aplicado: Number(r.monto_imputado ?? 0) - Number(t.monto_imputado) } };
}

const CuentaSchema = z.object({
  alias: z.string().trim().max(60).regex(/^[a-zA-Z0-9.\-]{6,20}$/, "Alias inválido (6 a 20 caracteres: letras, números, punto o guion)").optional().or(z.literal("")),
  cvu: z.string().trim().regex(/^\d{22}$/, "El CVU tiene 22 números").optional().or(z.literal("")),
});

/**
 * Carga a mano el alias/CVU de cobro de un alumno. Cuando el proveedor esté integrado se
 * va a crear solo al dar de alta al alumno; esto sirve para probar y para cargar los que
 * se generaron por fuera.
 */
export async function guardarCuentaCobroAction(alumnoId: string, datos: { alias?: string; cvu?: string }): Promise<ActionResult> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  const parsed = CuentaSchema.safeParse(datos);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const alias = parsed.data.alias || null;
  const cvu = parsed.data.cvu || null;
  if (!alias && !cvu) return { ok: false, error: "Cargá el alias o el CVU" };

  const admin = createAdminClient();
  const { data: alumno } = await admin.from("alumnos").select("id").eq("id", alumnoId).eq("gym_id", ctx.gymId).is("deleted_at", null).maybeSingle();
  if (!alumno) return { ok: false, error: "Alumno no encontrado" };

  // Una cuenta activa por alumno: la anterior se da de baja (soft delete).
  await admin.from("cuentas_cobro_alumno").update({ deleted_at: new Date().toISOString(), activa: false })
    .eq("gym_id", ctx.gymId).eq("alumno_id", alumnoId).is("deleted_at", null);
  const { error } = await admin.from("cuentas_cobro_alumno").insert({
    gym_id: ctx.gymId, alumno_id: alumnoId, proveedor: "generico", alias, cvu,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Ese alias o CVU ya está asignado a otro alumno" : error.message };
  }
  revalidatePath(`/dashboard/alumnos/${alumnoId}`);
  return { ok: true, data: undefined };
}

/**
 * Simula que el proveedor avisó una transferencia al alias del alumno. Recorre el circuito
 * real (guardar → imputar → confirmar por WhatsApp/mail) para probarlo o mostrarlo sin
 * proveedor. Queda registrada con proveedor "simulacion" y el concepto lo aclara.
 */
export async function simularTransferenciaAction(alumnoId: string, monto: number): Promise<ActionResult<{ estado: string }>> {
  const ctx = await getGymContext();
  if (!ctx) return { ok: false, error: "Unauthorized" };
  if (ctx.rol !== "owner" && ctx.rol !== "admin") return { ok: false, error: "Solo dueños o administradores" };
  if (!Number.isFinite(monto) || monto <= 0 || monto > 10_000_000) return { ok: false, error: "Monto inválido" };

  const admin = createAdminClient();
  const { data: cuenta } = await admin.from("cuentas_cobro_alumno").select("alias, cvu")
    .eq("gym_id", ctx.gymId).eq("alumno_id", alumnoId).is("deleted_at", null).maybeSingle();
  if (!cuenta) return { ok: false, error: "El alumno no tiene alias de cobro" };

  try {
    const r = await procesarTransferencia(admin, "simulacion", {
      externalId: `sim-${crypto.randomUUID()}`,
      cvuDestino: cuenta.cvu,
      aliasDestino: cuenta.alias,
      monto,
      fecha: new Date(),
      pagadorNombre: "Simulación desde el panel",
      pagadorCuit: null,
      concepto: "Simulación (no es plata real)",
      raw: { simulada_por: ctx.user.id },
    });
    revalidatePath(`/dashboard/alumnos/${alumnoId}`);
    return { ok: true, data: { estado: r.duplicada ? "duplicada" : r.resultado.estado } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}
