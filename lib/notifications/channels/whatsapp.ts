// Canal WhatsApp — Meta Cloud API (futuro MVP 2.5).
// Placeholder — se implementa en Semana 5 / post-MVP 1.
import type { NotificationPayload, GymNotificationConfig } from "../index";

export async function sendWhatsApp(
  _config: GymNotificationConfig,
  _payload: NotificationPayload
): Promise<string> {
  // TODO: implementar en MVP 2.5
  // El gym conecta su propio número Meta (CLUBIO no paga por mensajes).
  // Costo: ~USD 0.007/mensaje, lo paga el gym a Meta directamente.
  throw new Error("WhatsApp no implementado aún. Disponible en plan Plus/Multi.");
}
