"use server";

import crypto from "crypto";
import { revalidatePath, updateTag } from "next/cache";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function toggleGymActivoAction(gymId: string, activo: boolean): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const { error } = await admin.from("gyms").update({ activo }).eq("id", gymId);
  if (error) return { ok: false, error: error.message };

  // Invalidar el cache de sesión de todos los usuarios del gym para que el
  // bloqueo/desbloqueo sea inmediato (no esperar los 5 min del TTL).
  const { data: usuarios } = await admin.from("gym_usuarios").select("id").eq("gym_id", gymId);
  (usuarios ?? []).forEach((u) => updateTag(`gym-ctx-${u.id}`));

  await logAdminAction(ctx.adminId, activo ? "gym_reactivado" : "gym_suspendido", gymId);
  revalidatePath("/admin/gyms");
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: undefined };
}

export async function cambiarPlanAction(
  gymId: string,
  licenciaId: string,
  plan: "basic" | "plus" | "multi"
): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const { error } = await admin.from("licencias").update({ plan }).eq("id", licenciaId).eq("gym_id", gymId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, "plan_cambiado", gymId, { plan });
  revalidatePath("/admin/gyms");
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: undefined };
}

export async function renovarLicenciaAction(
  gymId: string,
  licenciaId: string,
  meses: number,
  precioUsd: number
): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const { data: licencia } = await admin
    .from("licencias")
    .select("fecha_vencimiento")
    .eq("id", licenciaId)
    .eq("gym_id", gymId)
    .single();
  if (!licencia) return { ok: false, error: "Licencia no encontrada" };

  const base = new Date(licencia.fecha_vencimiento) > new Date() ? new Date(licencia.fecha_vencimiento) : new Date();
  const nuevoVencimiento = new Date(base);
  nuevoVencimiento.setMonth(nuevoVencimiento.getMonth() + meses);

  const { error } = await admin
    .from("licencias")
    .update({
      fecha_vencimiento: nuevoVencimiento.toISOString().split("T")[0],
      activa: true,
      precio_pagado: precioUsd,
    })
    .eq("id", licenciaId)
    .eq("gym_id", gymId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, "licencia_renovada", gymId, { meses, precio_usd: precioUsd, nuevo_vencimiento: nuevoVencimiento.toISOString().split("T")[0] });
  revalidatePath("/admin/gyms");
  revalidatePath("/admin/licencias");
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: undefined };
}

export async function agregarGymUsuarioAction(
  gymId: string,
  nombre: string,
  email: string,
  rol: "owner" | "admin" | "recepcion"
): Promise<ActionResult<{ email: string; password: string }>> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const password = crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) return { ok: false, error: authError?.message ?? "Error al crear el usuario" };

  const { error: usuarioError } = await admin.from("gym_usuarios").insert({
    id: authData.user.id,
    gym_id: gymId,
    nombre,
    email,
    rol,
  });
  if (usuarioError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: usuarioError.message };
  }

  await logAdminAction(ctx.adminId, "gym_usuario_creado", gymId, { email, rol });
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: { email, password } };
}

export async function toggleGymUsuarioActivoAction(
  gymId: string,
  usuarioId: string,
  activo: boolean
): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const { error } = await admin.from("gym_usuarios").update({ activo }).eq("id", usuarioId).eq("gym_id", gymId);
  if (error) return { ok: false, error: error.message };

  // Invalidar cache de sesión del usuario afectado
  updateTag(`gym-ctx-${usuarioId}`);

  await logAdminAction(ctx.adminId, activo ? "gym_usuario_activado" : "gym_usuario_desactivado", gymId, { usuario_id: usuarioId });
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: undefined };
}

export async function cambiarRolGymUsuarioAction(
  gymId: string,
  usuarioId: string,
  rol: "owner" | "admin" | "recepcion"
): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const { error } = await admin.from("gym_usuarios").update({ rol }).eq("id", usuarioId).eq("gym_id", gymId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, "gym_usuario_rol_cambiado", gymId, { usuario_id: usuarioId, rol });
  revalidatePath(`/admin/gyms/${gymId}`);
  return { ok: true, data: undefined };
}
