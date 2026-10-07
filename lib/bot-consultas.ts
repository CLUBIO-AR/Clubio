// Bot de WhatsApp para consultas de números que no son alumnos (interesados en el gym).
// Se llama desde el webhook de WhatsApp después de guardar el mensaje entrante.
//
// - Número que no es alumno y escribe por primera vez (o después de 24hs sin que el gym
//   le haya escrito): responde la bienvenida con 3 botones.
// - "Horarios y precios": responde el texto que el gym cargó en Configuración, con botones
//   para pedir clase de prueba o hablar con alguien.
// - "Clase de prueba" / "Hablar con alguien": confirma, deja el chat sin leer para que lo
//   atienda una persona, y ofrece volver a ver horarios y precios o el menú principal.
// - "Menú principal" (o escribir "menú"): vuelve a mandar la bienvenida con los 3 botones.
//
// Todo va dentro de la ventana de 24hs que abre el propio mensaje del interesado, así que
// no usa plantillas ni tiene costo de Meta. Nunca tira: si algo falla solo se loguea.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendWhatsAppButtons, sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";

type Admin = SupabaseClient<Database>;

const BOTON = {
  info: { id: "bot_info", title: "Horarios y precios" },
  prueba: { id: "bot_prueba", title: "Clase de prueba" },
  humano: { id: "bot_humano", title: "Hablar con alguien" },
  menu: { id: "bot_menu", title: "Menú principal" },
} as const;

// Menú principal (la bienvenida).
export const BOTONES_CONSULTA = [BOTON.info, BOTON.prueba, BOTON.humano] as const;
const IDS_BOT: string[] = Object.values(BOTON).map((b) => b.id);

// Palabras que, escritas por alguien que no es alumno, vuelven a mostrar el menú.
const PALABRAS_MENU = ["menu", "menu principal", "inicio", "opciones"];

// Meta limita el cuerpo de un mensaje con botones a 1024 caracteres.
const MAX_CUERPO_BOTONES = 1024;

const RESPUESTA_PRUEBA =
  "¡Buenísimo! 💪 Contanos qué actividad te interesa y qué días y horarios te quedan cómodos, y te confirmamos la clase de prueba.";
const RESPUESTA_HUMANO = "Listo, ya le avisamos al equipo. En un rato te escribe alguien 🙌";
const RESPUESTA_INFO_VACIA = "Ya le avisamos al equipo, en un rato te pasan horarios y precios 🙌";

export type MensajeBot = {
  id: string;
  type?: string;
  text?: { body?: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
};

export async function responderConBot(
  admin: Admin,
  args: { gymId: string; telefono: string; alumnoId: string | null; message: MensajeBot; perfilNombre?: string | null },
): Promise<void> {
  const { gymId, telefono, alumnoId, message } = args;
  const nombre = primerNombre(args.perfilNombre);
  const botonId = message.interactive?.button_reply?.id;
  const esBotonDelBot = !!botonId && IDS_BOT.includes(botonId);
  const pideMenu = !esBotonDelBot && message.type === "text" && PALABRAS_MENU.includes(normalizar(message.text?.body));

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

    const ctx = { admin, config, gymId, telefono, alumnoId, nombre };

    if (botonId === BOTON.info.id) {
      const info = config.whatsapp_bot_info?.trim();
      if (!info) {
        await enviarYRegistrar(ctx, RESPUESTA_INFO_VACIA, [BOTON.prueba, BOTON.menu]);
        return;
      }
      // Después de la info, los próximos pasos naturales: clase de prueba o hablar con alguien.
      if (info.length <= MAX_CUERPO_BOTONES) {
        await enviarYRegistrar(ctx, info, [BOTON.prueba, BOTON.humano]);
      } else {
        await enviarYRegistrar(ctx, info);
        await enviarYRegistrar(ctx, "¿Querés algo más? 👇", [BOTON.prueba, BOTON.humano]);
      }
      // Con la info cargada, la consulta quedó respondida: no hace falta que el gym la vea como pendiente.
      await admin.from("mensajes_whatsapp").update({ leido: true }).eq("wa_message_id", message.id);
      return;
    }
    if (botonId === BOTON.prueba.id) {
      await enviarYRegistrar(ctx, RESPUESTA_PRUEBA, [BOTON.info, BOTON.menu]);
      return;
    }
    if (botonId === BOTON.humano.id) {
      await enviarYRegistrar(ctx, RESPUESTA_HUMANO, [BOTON.info, BOTON.menu]);
      return;
    }
    if (botonId === BOTON.menu.id || pideMenu) {
      await mandarBienvenida(ctx);
      return;
    }

    // Bienvenida: solo si en las últimas 24hs no le escribimos nada (ni el bot ni el gym),
    // para no interrumpir una conversación que ya está atendiendo una persona. Los mensajes
    // de una conversación eliminada desde el inbox no cuentan: el gym la dio por cerrada.
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("mensajes_whatsapp")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("telefono", telefono)
      .eq("direccion", "saliente")
      .is("deleted_at", null)
      .gte("created_at", desde);
    if ((count ?? 0) > 0) return;

    await mandarBienvenida(ctx);
  } catch (err) {
    console.error("[bot-consultas] error — gym:", gymId, "telefono:", telefono, err instanceof Error ? err.message : err);
  }
}

type Config = {
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_bot_bienvenida: string | null;
};
type Contexto = { admin: Admin; config: Config; gymId: string; telefono: string; alumnoId: string | null; nombre: string | null };
type Boton = { id: string; title: string };

function normalizar(texto: string | undefined): string {
  return (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, "").trim();
}

/** Primer nombre del perfil de WhatsApp, solo letras ("Juan ⚡ Pérez" → "Juan"). */
export function primerNombre(perfil: string | null | undefined): string | null {
  const palabra = (perfil ?? "").replace(/[^\p{L}\p{M}\s'-]/gu, " ").trim().split(/\s+/)[0] ?? "";
  if (palabra.length < 2 || palabra.length > 20) return null;
  return palabra.charAt(0).toLocaleUpperCase("es-AR") + palabra.slice(1);
}

/** Reemplaza {nombre} en el texto del gym; si no sabemos el nombre, lo saca prolijo ("Hola {nombre}!" → "Hola!"). */
export function personalizar(texto: string, nombre: string | null): string {
  return nombre
    ? texto.replace(/\{nombre\}/gi, nombre)
    : texto.replace(/\s*\{nombre\}/gi, "");
}

async function mandarBienvenida(ctx: Contexto): Promise<void> {
  const { data: gym } = await ctx.admin.from("gyms").select("nombre").eq("id", ctx.gymId).maybeSingle();
  const plantilla = ctx.config.whatsapp_bot_bienvenida?.trim()
    || `¡Hola {nombre}! 👋 Gracias por escribir a ${gym?.nombre ?? "nuestro gimnasio"}. ¿En qué te podemos ayudar?`;
  const bienvenida = personalizar(plantilla, ctx.nombre);
  await enviarYRegistrar(ctx, bienvenida, [...BOTONES_CONSULTA]);
  console.log("[bot-consultas] menú enviado — gym:", ctx.gymId, "a:", ctx.telefono);
}

// Manda texto (o texto con botones) y lo deja registrado en el inbox. En el inbox los
// botones se muestran entre corchetes debajo del texto.
async function enviarYRegistrar(ctx: Contexto, cuerpo: string, botones?: Boton[]): Promise<void> {
  const waMessageId = botones?.length
    ? await sendWhatsAppButtons(ctx.config, { to: ctx.telefono, body: cuerpo, buttons: botones })
    : await sendWhatsAppText(ctx.config, { to: ctx.telefono, body: cuerpo });

  const { error } = await ctx.admin.from("mensajes_whatsapp").insert({
    gym_id: ctx.gymId,
    alumno_id: ctx.alumnoId,
    telefono: ctx.telefono,
    direccion: "saliente",
    cuerpo: botones?.length ? `${cuerpo}\n${botones.map((b) => `[${b.title}]`).join(" ")}` : cuerpo,
    wa_message_id: waMessageId,
    estado: "enviado",
  });
  if (error) console.error("[bot-consultas] respuesta enviada pero no se guardó en el inbox:", error.message);
}
