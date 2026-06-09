"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function crearSuperAdminAction(
  nombre: string,
  email: string
): Promise<ActionResult<{ email: string; password: string }>> {
  const ctx = await requireSuperadmin();

  nombre = nombre.trim();
  email = email.trim().toLowerCase();
  if (nombre.length < 2) return { ok: false, error: "El nombre es muy corto" };
  if (!email.includes("@")) return { ok: false, error: "Email inválido" };

  const admin = createAdminClient();

  const { data: existing } = await admin.from("admin_users").select("id").eq("email", email).maybeSingle();
  if (existing) return { ok: false, error: "Ya existe un superadmin con ese email" };

  const password = crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) return { ok: false, error: authError?.message ?? "Error al crear el usuario" };

  const { error: insertError } = await admin.from("admin_users").insert({
    id: authData.user.id,
    email,
    nombre,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: insertError.message };
  }

  await logAdminAction(ctx.adminId, "superadmin_creado", undefined, { email, nombre });
  revalidatePath("/admin/superadmins");
  return { ok: true, data: { email, password } };
}

export async function toggleSuperAdminActivoAction(
  targetAdminId: string,
  activo: boolean
): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  if (ctx.adminId === targetAdminId) return { ok: false, error: "No podés desactivar tu propio usuario" };

  const admin = createAdminClient();
  const { error } = await admin.from("admin_users").update({ activo }).eq("id", targetAdminId);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(ctx.adminId, activo ? "superadmin_activado" : "superadmin_desactivado", undefined, { target_id: targetAdminId });
  revalidatePath("/admin/superadmins");
  return { ok: true, data: undefined };
}
