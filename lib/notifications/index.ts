// NotificationService — punto de entrada único para todas las notificaciones.
// NUNCA importar Resend o Meta directamente desde crons o API routes.
// Solo importar este archivo y llamar sendNotification().

export type NotificationChannel = "email" | "whatsapp";

export type NotificationPayload = {
  type: "aviso_vencimiento" | "recordatorio_vencido" | "confirmacion_pago" | "bienvenida";
  alumno: {
    nombre: string;
    email?: string | null;
    telefono?: string | null;
  };
  cuota?: {
    mes: number;
    anio: number;
    monto_total: number;
    pago_url: string;
  };
  gym: {
    nombre: string;
    logo_url?: string | null;
    color_primario?: string;
  };
};

export type GymNotificationConfig = {
  email_activo: boolean;
  email_remitente_nombre?: string | null;
  email_remitente_address?: string | null;
  whatsapp_activo: boolean;
  whatsapp_phone_number_id?: string | null;
  whatsapp_access_token?: string | null;
};

export async function sendNotification(
  gymConfig: GymNotificationConfig,
  payload: NotificationPayload
): Promise<{ canal: NotificationChannel; ok: boolean; provider_id?: string }[]> {
  const channels = getActiveChannels(gymConfig, payload);

  const results = await Promise.allSettled(
    channels.map((channel) => sendViaChannel(channel, gymConfig, payload))
  );

  return results.map((result, i) => ({
    canal: channels[i],
    ok: result.status === "fulfilled",
    provider_id: result.status === "fulfilled" ? result.value : undefined,
  }));
}

function getActiveChannels(
  config: GymNotificationConfig,
  payload: NotificationPayload
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  if (config.email_activo && payload.alumno.email) {
    channels.push("email");
  }

  // WhatsApp: se agrega cuando esté implementado (Semana 5 / MVP 2.5)
  // if (config.whatsapp_activo && config.whatsapp_access_token && payload.alumno.telefono) {
  //   channels.push("whatsapp");
  // }

  return channels;
}

async function sendViaChannel(
  channel: NotificationChannel,
  config: GymNotificationConfig,
  payload: NotificationPayload
): Promise<string> {
  if (channel === "email") {
    const { sendEmail } = await import("./channels/email");
    return sendEmail(config, payload);
  }

  if (channel === "whatsapp") {
    const { sendWhatsApp } = await import("./channels/whatsapp");
    return sendWhatsApp(config, payload);
  }

  throw new Error(`Canal desconocido: ${channel}`);
}
