// Envío de notificaciones push (Web Push) a los dispositivos de los usuarios de un gym.
// Requiere las variables de entorno NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y
// VAPID_SUBJECT (mailto:…). Sin ellas no hace nada (el panel sigue avisando con la
// pestaña abierta, como antes).
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

export type PushPayload = {
  title: string;
  body: string;
  /** Ruta del panel a abrir al tocar la notificación. */
  url: string;
  /** Notificaciones con el mismo tag se reemplazan (una por conversación). */
  tag?: string;
};

let configurado: boolean | null = null;

export function pushHabilitado(): boolean {
  if (configurado !== null) return configurado;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return (configurado = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:clubio.ar@gmail.com", publica, privada);
  return (configurado = true);
}

/** Nunca tira: un push que falla no puede romper el webhook. */
export async function enviarPushAlGym(admin: Admin, gymId: string, payload: PushPayload): Promise<void> {
  if (!pushHabilitado()) return;
  try {
    const { data: subs } = await admin
      .from("push_suscripciones")
      .select("id, endpoint, p256dh, auth")
      .eq("gym_id", gymId);
    if (!subs?.length) return;

    const cuerpo = JSON.stringify({ ...payload, body: payload.body.slice(0, 180) });
    const vencidas: string[] = [];
    await Promise.allSettled(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          cuerpo,
          { TTL: 60 * 60 * 6, urgency: "high" },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: el navegador dio de baja la suscripción (se desinstaló, se borraron datos).
        if (status === 404 || status === 410) vencidas.push(s.id);
        else console.error("[push] error enviando a un dispositivo:", status ?? (err as Error).message);
      }
    }));

    if (vencidas.length) {
      // Registro técnico del navegador, no dato de cliente: se borra (no soft delete).
      await admin.from("push_suscripciones").delete().in("id", vencidas);
    }
  } catch (err) {
    console.error("[push] error — gym:", gymId, err instanceof Error ? err.message : err);
  }
}
