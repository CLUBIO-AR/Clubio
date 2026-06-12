"use server";

import { updateTag } from "next/cache";
import { requireSuperadmin, logAdminAction } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTINGS_CACHE_TAG } from "@/lib/admin/settings";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function updateAdminSettingsAction(params: {
  notificationEmail: string;
  tipoCambioUsd: number;
  diasCobroAntesVencimiento: number;
  clubioMpAccessToken: string;
  planBasicPrecio: number;
  planMultiPrecio: number;
  monedaSuscripcion: "USD" | "ARS";
}): Promise<ActionResult> {
  const ctx = await requireSuperadmin();

  const email = params.notificationEmail.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Email inválido" };

  const tipoCambio = Number(params.tipoCambioUsd);
  if (!Number.isFinite(tipoCambio) || tipoCambio <= 0) return { ok: false, error: "Tipo de cambio inválido" };

  const dias = Number(params.diasCobroAntesVencimiento);
  if (!Number.isInteger(dias) || dias < 1 || dias > 60) return { ok: false, error: "Días de anticipación debe ser entre 1 y 60" };

  for (const [label, val] of [["Basic", params.planBasicPrecio], ["Multi", params.planMultiPrecio]] as [string, number][]) {
    if (!Number.isFinite(val) || val <= 0) return { ok: false, error: `Precio de plan ${label} inválido` };
  }

  if (!["USD", "ARS"].includes(params.monedaSuscripcion)) return { ok: false, error: "Moneda inválida" };

  const token = params.clubioMpAccessToken.trim();

  const { error } = await createAdminClient()
    .from("admin_settings")
    .upsert({
      id: true,
      notification_email: email,
      tipo_cambio_usd: tipoCambio,
      dias_cobro_antes_vencimiento: dias,
      ...(token ? { clubio_mp_access_token: token } : {}),
      plan_basic_precio: params.planBasicPrecio,
      plan_multi_precio: params.planMultiPrecio,
      moneda_suscripcion: params.monedaSuscripcion,
      updated_at: new Date().toISOString(),
    });
  if (error) return { ok: false, error: error.message };

  updateTag(SETTINGS_CACHE_TAG);
  await logAdminAction(ctx.adminId, "admin_settings_updated", undefined, {
    notification_email: email,
    tipo_cambio_usd: tipoCambio,
    dias_cobro_antes_vencimiento: dias,
    moneda_suscripcion: params.monedaSuscripcion,
    mp_token_updated: !!token,
  });
  return { ok: true, data: undefined };
}
