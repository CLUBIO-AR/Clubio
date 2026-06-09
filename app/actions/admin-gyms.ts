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
  plan: "basic" | "plus" | "multi",
  motivo?: string
): Promise<ActionResult> {
  const ctx = await requireSuperadmin();
  const admin = createAdminClient();

  const [updateRes, gymRes] = await Promise.all([
    admin.from("licencias").update({ plan }).eq("id", licenciaId).eq("gym_id", gymId),
    admin.from("gyms").select("nombre, email_contacto").eq("id", gymId).single(),
  ]);

  if (updateRes.error) return { ok: false, error: updateRes.error.message };

  await logAdminAction(ctx.adminId, "plan_cambiado", gymId, { plan, motivo: motivo || undefined });

  // Notificar al gym por email
  if (gymRes.data?.email_contacto) {
    const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus", multi: "Multi" };
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;
    const { clubioEmailHtml, clubioEmailTable } = await import("@/lib/email/template");

    await resend.emails.send({
      from,
      to: gymRes.data.email_contacto,
      subject: `Tu plan CLUBIO fue actualizado — ${gymRes.data.nombre}`,
      html: clubioEmailHtml(`
        <h2 style="margin:0 0 8px;color:#f9fafb;font-size:20px">Actualización de plan</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
          Hola <strong style="color:#f9fafb">${gymRes.data.nombre}</strong>, tu plan de suscripción a CLUBIO fue actualizado.
        </p>
        ${clubioEmailTable([
          ["Nuevo plan", PLAN_LABELS[plan] ?? plan],
          ...(motivo ? [["Motivo", motivo] as [string, string]] : []),
        ])}
        <p style="color:#6b7280;font-size:12px;margin:16px 0 0">
          Si tenés alguna duda, respondé este email o contactate con soporte.
        </p>
      `),
    }).catch((e) => console.error("[admin-gyms] email cambio-plan error:", e));
  }

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
