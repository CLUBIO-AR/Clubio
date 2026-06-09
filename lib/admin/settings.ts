import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSettings = {
  notification_email: string;
  tipo_cambio_usd: number;
  dias_cobro_antes_vencimiento: number;
  clubio_mp_access_token: string | null;
  plan_basic_precio: number;
  plan_plus_precio: number;
  plan_multi_precio: number;
  moneda_suscripcion: "USD" | "ARS";
};

export const SETTINGS_CACHE_TAG = "admin-settings";

const DEFAULT: AdminSettings = {
  notification_email: "contacto@clubio.com.ar",
  tipo_cambio_usd: 1200,
  dias_cobro_antes_vencimiento: 10,
  clubio_mp_access_token: process.env.CLUBIO_MP_ACCESS_TOKEN ?? null,
  plan_basic_precio: 28,
  plan_plus_precio: 45,
  plan_multi_precio: 75,
  moneda_suscripcion: "USD",
};

export const getAdminSettings = unstable_cache(
  async (): Promise<AdminSettings> => {
    const { data } = await createAdminClient()
      .from("admin_settings")
      .select("notification_email, tipo_cambio_usd, dias_cobro_antes_vencimiento, clubio_mp_access_token, plan_basic_precio, plan_plus_precio, plan_multi_precio, moneda_suscripcion")
      .maybeSingle();
    if (!data) return DEFAULT;
    return {
      notification_email: data.notification_email ?? DEFAULT.notification_email,
      tipo_cambio_usd: data.tipo_cambio_usd ?? DEFAULT.tipo_cambio_usd,
      dias_cobro_antes_vencimiento: data.dias_cobro_antes_vencimiento ?? DEFAULT.dias_cobro_antes_vencimiento,
      clubio_mp_access_token: data.clubio_mp_access_token ?? DEFAULT.clubio_mp_access_token,
      plan_basic_precio: data.plan_basic_precio ?? DEFAULT.plan_basic_precio,
      plan_plus_precio: data.plan_plus_precio ?? DEFAULT.plan_plus_precio,
      plan_multi_precio: data.plan_multi_precio ?? DEFAULT.plan_multi_precio,
      moneda_suscripcion: (data.moneda_suscripcion === "ARS" ? "ARS" : "USD"),
    };
  },
  [SETTINGS_CACHE_TAG],
  { revalidate: 300, tags: [SETTINGS_CACHE_TAG] }
);

export function getPlanPrecio(settings: AdminSettings, plan: string): number {
  if (plan === "basic") return settings.plan_basic_precio;
  if (plan === "plus") return settings.plan_plus_precio;
  if (plan === "multi") return settings.plan_multi_precio;
  return 0;
}
