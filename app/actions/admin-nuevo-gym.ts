"use server";

import crypto from "crypto";
import { z } from "zod";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGymWelcomeEmail } from "@/lib/notifications/channels/email";

const NuevoGymSchema = z.object({
  nombre: z.string().min(2),
  email_contacto: z.string().email(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  owner_nombre: z.string().min(2),
  owner_email: z.string().email(),
  plan: z.enum(["basic", "multi"]),
  meses_licencia: z.union([z.literal(1), z.literal(6), z.literal(12)]),
  precio_acordado_usd: z.number().positive(),
  lead_id: z.string().uuid().optional(),
  monto_cuota_defecto: z.number().positive().optional(),
  dia_vencimiento: z.number().int().min(1).max(28),
  dias_aviso_antes: z.array(z.number().int().positive()).min(1),
  recargo_porcentaje: z.number().min(0),
  recargo_dias: z.number().int().min(0),
});

export type NuevoGymForm = z.infer<typeof NuevoGymSchema>;

type CrearTenantResult =
  | { ok: true; data: { gymId: string; ownerEmail: string; password: string; loginUrl: string; emailEnviado: boolean } }
  | { ok: false; error: string };

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generarPasswordSeguro() {
  return crypto.randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

export async function crearTenantAction(input: NuevoGymForm): Promise<CrearTenantResult> {
  const ctx = await requireSuperadmin();
  const parsed = NuevoGymSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const form = parsed.data;

  const admin = createAdminClient();

  // Slug único derivado del nombre
  const baseSlug = slugify(form.nombre) || "gym";
  let slug = baseSlug;
  for (let i = 1; i <= 50; i++) {
    const { data: existing } = await admin.from("gyms").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  // 1. Crear gym
  const { data: gym, error: gymError } = await admin
    .from("gyms")
    .insert({
      nombre: form.nombre,
      slug,
      email_contacto: form.email_contacto,
      telefono: form.telefono ?? null,
      direccion: form.direccion ?? null,
    })
    .select("id")
    .single();
  if (gymError || !gym) return { ok: false, error: gymError?.message ?? "Error al crear el gym" };

  let ownerId: string | null = null;

  try {
    // 2. gym_config con valores del form
    const { error: configError } = await admin.from("gym_config").insert({
      gym_id: gym.id,
      email_activo: true,
      whatsapp_activo: false,
      monto_base_defecto: form.monto_cuota_defecto ?? null,
      dia_vencimiento_mensual: form.dia_vencimiento,
      dias_aviso_antes: form.dias_aviso_antes,
      recargo_1_porcentaje: form.recargo_porcentaje,
      recargo_1_dias: form.recargo_dias,
    });
    if (configError) throw new Error(configError.message);

    // 3. Sucursal principal
    const { error: sucursalError } = await admin.from("sucursales").insert({
      gym_id: gym.id,
      nombre: `${form.nombre} - Principal`,
      es_principal: true,
    });
    if (sucursalError) throw new Error(sucursalError.message);

    // 4. Usuario owner en Supabase Auth + perfil
    const password = generarPasswordSeguro();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: form.owner_email,
      password,
      email_confirm: true,
    });
    if (authError || !authData.user) throw new Error(authError?.message ?? "Error al crear el usuario owner");
    ownerId = authData.user.id;

    const { error: ownerError } = await admin.from("gym_usuarios").insert({
      id: ownerId,
      gym_id: gym.id,
      nombre: form.owner_nombre,
      rol: "owner",
    });
    if (ownerError) throw new Error(ownerError.message);

    // 5. Licencia
    const fechaInicio = new Date();
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + form.meses_licencia);
    const { error: licenciaError } = await admin.from("licencias").insert({
      gym_id: gym.id,
      plan: form.plan,
      fecha_inicio: fechaInicio.toISOString().split("T")[0],
      fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0],
      es_trial: false,
      precio_pagado: form.precio_acordado_usd,
      moneda: "USD",
    });
    if (licenciaError) throw new Error(licenciaError.message);

    // 6. Email de bienvenida al owner — no bloquea el alta si falla
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://app.clubio.com.ar";
    const loginUrl = `${appUrl}/login`;
    let emailEnviado = false;
    try {
      await sendGymWelcomeEmail({
        to: form.owner_email,
        ownerNombre: form.owner_nombre,
        gymNombre: form.nombre,
        loginUrl,
        passwordTemporal: password,
      });
      emailEnviado = true;
    } catch {
      emailEnviado = false;
    }

    // 7. Si viene de un lead, marcarlo como convertido
    if (form.lead_id) {
      await admin
        .from("leads")
        .update({ estado: "convertido", gym_id: gym.id, updated_at: new Date().toISOString() })
        .eq("id", form.lead_id);
    }

    // 8. Audit trail
    await logAdminAction(ctx.adminId, "tenant_created", gym.id, {
      plan: form.plan,
      meses_licencia: form.meses_licencia,
      precio_acordado_usd: form.precio_acordado_usd,
      lead_id: form.lead_id ?? null,
    });

    return {
      ok: true,
      data: { gymId: gym.id, ownerEmail: form.owner_email, password, loginUrl, emailEnviado },
    };
  } catch (e) {
    // Rollback explícito — limpiar todo lo que llegó a crearse para este gym
    if (ownerId) {
      await admin.from("gym_usuarios").delete().eq("id", ownerId);
      await admin.auth.admin.deleteUser(ownerId);
    }
    await admin.from("licencias").delete().eq("gym_id", gym.id);
    await admin.from("sucursales").delete().eq("gym_id", gym.id);
    await admin.from("gym_config").delete().eq("gym_id", gym.id);
    await admin.from("gyms").delete().eq("id", gym.id);
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear el gym" };
  }
}
