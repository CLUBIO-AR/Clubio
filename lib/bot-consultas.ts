// Bot de WhatsApp para consultas de números que no son alumnos (interesados en el gym).
// Se llama desde el webhook de WhatsApp después de guardar el mensaje entrante.
//
// - Número que no es alumno y escribe por primera vez (o después de 24hs sin que el gym
//   le haya escrito): responde la bienvenida con 3 botones.
// - "Horarios y precios": responde el texto que el gym cargó en Configuración.
// - "Clase de prueba" / "Hablar con alguien": confirma y deja el chat sin leer para que
//   lo atienda una persona.
//
// Todo va dentro de la ventana de 24hs que abre el propio mensaje del interesado, así que
// no usa plantillas ni tiene costo de Meta. Nunca tira: si algo falla solo se loguea.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendWhatsAppButtons, sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";

type Admin = SupabaseClient<Database>;

export const BOTONES_CONSULTA = [
  { id: "bot_info", title: "Horarios y precios" },
  { id: "bot_prueba", title: "Clase de prueba" },
  { id: "bot_humano", title: "Hablar con alguien" },
] as const;

const RESPUESTA_PRUEBA =
  "¡Buenísimo! 💪 Contanos qué actividad te interesa y qué días y horarios te quedan cómodos, y te confirmamos la clase de prueba.";
const RESPUESTA_HUMANO = "Listo, ya le avisamos al equipo. En un rato te escribe alguien 🙌";
const RESPUESTA_INFO_VACIA = "Ya le avisamos al equipo, en un rato te pasan horarios y precios 🙌";

export type MensajeBot = {
  id: string;
  type?: string;
  interactive?: { button_reply?: { id?: string; title?: string } };
};

export async function responderConBot(
  admin: Admin,
  args: { gymId: string; telefono: string; alumnoId: string | null; message: MensajeBot },
): Promise<void> {
  const { gymId, telefono, alumnoId, message } = args;
  const botonId = message.interactive?.button_reply?.id;
  const esBotonDelBot = !!botonId && BOTONES_CONSULTA.some((b) => b.id === botonId);

  // Alumnos: el bot de consultas no les responde (eso es "Mi cuenta", más adelante).
  if (alumnoId && !esBotonDelBot) return;
  // Solo texto o botones del bot; audios, fotos, stickers, etc. quedan para una persona.
  if (!esBotonDelBot && message.type !== "text") return;

  try {
    const { data: config } = await admin
      .from("gym_config")
      .select("whatsapp_phone_number_id, whatsapp_access_token, whatsapp_bot_activo, whatsapp_bot_bienvenida, whatsapp_bot_info")
      .eq("gym_id", gymId)
      .maybeSingle();
    if (!config?.whatsapp_bot_activo) return;

    if (esBotonDelBot) {
      if (botonId === "bot_info") {
        const info = config.whatsapp_bot_info?.trim();
        await enviarYRegistrar(admin, config, { gymId, telefono, alumnoId, cuerpo: info || RESPUESTA_INFO_VACIA });
        // Con la info cargada, la consulta quedó respondida: no hace falta que el gym la vea como pendiente.
        if (info) {
          await admin.from("mensajes_whatsapp").update({ leido: true }).eq("wa_message_id", message.id);
        }
      } else if (botonId === "bot_prueba") {
        await enviarYRegistrar(admin, config, { gymId, telefono, alumnoId, cuerpo: RESPUESTA_PRUEBA });
      } else if (botonId === "bot_humano") {
        await enviarYRegistrar(admin, config, { gymId, telefono, alumnoId, cuerpo: RESPUESTA_HUMANO });
      }
      return;
    }

    // Bienvenida: solo si en las últimas 24hs no le escribimos nada (ni el bot ni el gym),
    // para no interrumpir una conversación que ya está atendiendo una persona.
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("mensajes_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("telefono", telefono)
      .eq("direccion", "saliente")
      .gte("created_at", desde);
    if ((count ?? 0) > 0) return;

    const { data: gym } = await admin.from("gyms").select("nombre").eq("id", gymId).maybeSingle();
    const bienvenida = config.whatsapp_bot_bienvenida?.trim()
      || `¡Hola! 👋 Gracias por escribir a ${gym?.nombre ?? "nuestro gimnasio"}. ¿En qué te podemos ayudar?`;

    const waMessageId = await sendWhatsAppButtons(config, {
      to: telefono,
      body: bienvenida,
      buttons: [...BOTONES_CONSULTA],
    });
    await registrar(admin, {
      gymId, telefono, alumnoId, waMessageId,
      cuerpo: `${bienvenida}\n${BOTONES_CONSULTA.map((b) => `[${b.title}]`).join(" ")}`,
    });
    console.log("[bot-consultas] bienvenida enviada — gym:", gymId, "a:", telefono);
  } catch (err) {
    console.error("[bot-consultas] error — gym:", gymId, "telefono:", telefono, err instanceof Error ? err.message : err);
  }
}

async function enviarYRegistrar(
  admin: Admin,
  config: { whatsapp_phone_number_id: string | null; whatsapp_access_token: string | null },
  args: { gymId: string; telefono: string; alumnoId: string | null; cuerpo: string },
): Promise<void> {
  const waMessageId = await sendWhatsAppText(config, { to: args.telefono, body: args.cuerpo });
  await registrar(admin, { ...args, waMessageId });
}

async function registrar(
  admin: Admin,
  args: { gymId: string; telefono: string; alumnoId: string | null; cuerpo: string; waMessageId: string },
): Promise<void> {
  const { error } = await admin.from("mensajes_whatsapp").insert({
    gym_id: args.gymId,
    alumno_id: args.alumnoId,
    telefono: args.telefono,
    direccion: "saliente",
    cuerpo: args.cuerpo,
    wa_message_id: args.waMessageId,
    estado: "enviado",
  });
  if (error) console.error("[bot-consultas] respuesta enviada pero no se guardó en el inbox:", error.message);
}
