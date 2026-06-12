import { getAdminSettings } from "@/lib/admin/settings";
import { AdminSettingsClient } from "@/components/admin/AdminSettingsClient";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  // Solo mandamos los últimos 6 chars del token al cliente — nunca el token completo
  const tokenMask = settings.clubio_mp_access_token
    ? settings.clubio_mp_access_token.slice(-6)
    : null;

  return (
    <AdminSettingsClient
      notificationEmail={settings.notification_email}
      tipoCambioUsd={settings.tipo_cambio_usd}
      diasCobroAntesVencimiento={settings.dias_cobro_antes_vencimiento}
      clubioMpTokenMask={tokenMask}
      planBasicPrecio={settings.plan_basic_precio}
      planMultiPrecio={settings.plan_multi_precio}
      monedaSuscripcion={settings.moneda_suscripcion}
    />
  );
}
