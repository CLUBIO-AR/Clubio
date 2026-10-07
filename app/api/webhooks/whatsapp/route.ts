import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText } from "@/lib/notifications/channels/whatsapp";
import { ejecutarPlan, planificarBot, resuelveSinPersona } from "@/lib/bot-consultas";
import { enviarPushAlGym } from "@/lib/push";

// Webhook único para TODOS los gyms (Meta no permite un callback distinto por número
// dentro de la misma app). Cada evento trae metadata.phone_number_id, que se cruza
// contra gym_config.whatsapp_phone_number_id para saber a qué gym pertenece.
//
// Todos los console.log/error de acá aparecen en Vercel → tu proyecto → Logs,
// filtrando por la ruta /api/webhooks/whatsapp. Son la forma más rápida de ver
// por qué algo no llegó.

// GET: handshake de verificación que Meta hace una sola vez al guardar la Callback URL.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const tokenConfigurado = !!process.env.WHATSAPP_VERIFY_TOKEN;
  const tokenCoincide = token === process.env.WHATSAPP_VERIFY_TOKEN;

  console.log("[webhook:whatsapp] GET verify — mode:", mode, "| token env configurado:", tokenConfigurado, "| token coincide:", tokenCoincide, "| challenge presente:", !!challenge);

  if (mode === "subscribe" && tokenCoincide && challenge) {
    console.log("[webhook:whatsapp] GET verify OK");
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("[webhook:whatsapp] GET verify RECHAZADO — revisar WHATSAPP_VERIFY_TOKEN en Vercel vs el valor cargado en Meta");
  return NextResponse.json({ error: "Verificación inválida" }, { status: 403 });
}

// POST: eventos de mensajes entrantes y status updates (sent/delivered/read/failed)
// de los mensajes que mandamos nosotros. Se guardan en mensajes_whatsapp para el
// inbox del dashboard (ver app/(dashboard)/dashboard/whatsapp).
export async function POST(request: Request) {
  const rawBody = await request.text();
  console.log("[webhook:whatsapp] POST recibido — bytes:", rawBody.length);

  const valid = await validateMetaSignature(request.headers.get("x-hub-signature-256"), rawBody);
  if (!valid) {
    console.error("[webhook:whatsapp] Firma inválida o META_APP_SECRET mal configurado — request rechazado");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: WhatsAppWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error("[webhook:whatsapp] Body no es JSON válido");
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  let eventosMensaje = 0;
  let eventosStatus = 0;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) {
        console.warn("[webhook:whatsapp] change sin metadata.phone_number_id, se ignora:", JSON.stringify(value).slice(0, 300));
        continue;
      }

      const { data: gymConfig, error: gymConfigError } = await admin
        .from("gym_config")
        .select("gym_id")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();

      if (gymConfigError) {
        console.error("[webhook:whatsapp] error consultando gym_config:", gymConfigError.message);
        continue;
      }
      if (!gymConfig) {
        console.error("[webhook:whatsapp] ningún gym_config.whatsapp_phone_number_id coincide con:", phoneNumberId, "— revisar que el valor cargado sea exactamente este ID");
        continue;
      }
      const gymId = gymConfig.gym_id;

      for (const statusUpdate of value.statuses ?? []) {
        eventosStatus++;
        const { data: actualizados, error } = await admin
          .from("mensajes_whatsapp")
          .update({ estado: mapStatus(statusUpdate.status) })
          .eq("wa_message_id", statusUpdate.id)
          .select("id");

        if (error) {
          console.error("[webhook:whatsapp] error actualizando status:", statusUpdate.id, error.message);
        } else if (!actualizados?.length) {
          console.warn("[webhook:whatsapp] status de un wa_message_id que no tenemos guardado:", statusUpdate.id, statusUpdate.status);
        } else {
          console.log("[webhook:whatsapp] status actualizado:", statusUpdate.id, "→", statusUpdate.status);
        }
      }

      for (const message of value.messages ?? []) {
        eventosMensaje++;
        const telefono = message.from;
        const cuerpo = textoDelMensaje(message);
        // Nombre que la persona tiene en su perfil de WhatsApp (puede venir vacío o con emojis).
        const perfilNombre = value.contacts?.find((c) => c.wa_id === telefono)?.profile?.name?.trim().slice(0, 100) || null;

        const { data: alumno } = await admin
          .from("alumnos")
          .select("id")
          .eq("gym_id", gymId)
          .ilike("telefono", `%${telefono.slice(-10)}`)
          .is("deleted_at", null)
          // Teléfono compartido entre varios alumnos: tomamos el más reciente (ver actions/whatsapp.ts).
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Antes de guardar: ¿lo resuelve el bot solo? Si sí, el mensaje entra ya leído y no
        // suena nada (ni en el panel ni en el celu). Solo avisa cuando hace falta una persona:
        // "Hablar con alguien", reserva de clase de prueba, o algo que el bot no entiende.
        const pideAlias = esPedidoDeAlias(message);
        const plan = pideAlias ? null : await planificarBot(admin, { gymId, telefono, alumnoId: alumno?.id ?? null, message, perfilNombre });
        const resueltoPorBot = pideAlias || (plan !== null && resuelveSinPersona(plan));

        const { error: insertError } = await admin.from("mensajes_whatsapp").insert({
          gym_id: gymId,
          alumno_id: alumno?.id ?? null,
          telefono,
          direccion: "entrante",
          cuerpo,
          wa_message_id: message.id,
          estado: "recibido",
          leido: resueltoPorBot,
          perfil_nombre: perfilNombre,
        });

        if (insertError) {
          console.error("[webhook:whatsapp] error insertando mensaje entrante:", insertError.message);
        } else {
          console.log("[webhook:whatsapp] mensaje entrante guardado — gym:", gymId, "de:", telefono, "alumno match:", alumno?.id ?? "sin match");
          // Solo si el insert salió bien: si Meta reintenta el mismo evento, el índice único
          // de wa_message_id hace fallar el insert y no se responde el alias dos veces.
          let necesitaPersona = !resueltoPorBot;
          if (pideAlias) {
            await responderAlias(admin, gymId, telefono, alumno?.id ?? null);
          } else if (plan) {
            const ok = await ejecutarPlan(plan);
            if (!ok && resueltoPorBot) {
              // El bot no pudo contestar: que lo vea el gym.
              await admin.from("mensajes_whatsapp").update({ leido: false }).eq("wa_message_id", message.id);
              necesitaPersona = true;
            }
          }
          if (necesitaPersona) {
            await avisarPorPush(admin, { gymId, telefono, alumnoId: alumno?.id ?? null, perfilNombre, cuerpo });
          }
        }
      }
    }
  }

  console.log("[webhook:whatsapp] POST procesado — mensajes:", eventosMensaje, "| statuses:", eventosStatus);
  return NextResponse.json({ ok: true });
}

type MensajeEntrante = NonNullable<NonNullable<NonNullable<WhatsAppWebhookBody["entry"]>[number]["changes"]>[number]["value"]["messages"]>[number];

// Texto a guardar en el inbox según el tipo de mensaje. Los botones de respuesta rápida
// de las plantillas llegan como type "button" (sin text.body).
function textoDelMensaje(message: MensajeEntrante): string {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return `🔘 ${message.button.text}`;
  if (message.interactive?.button_reply?.title) return `🔘 ${message.interactive.button_reply.title}`;
  // Opción elegida de una lista del bot (ej. "Hoy 18:00 — Funcional" al reservar clase de prueba).
  if (message.interactive?.list_reply?.title) {
    const { title, description } = message.interactive.list_reply;
    return `🔘 ${title}${description ? ` — ${description}` : ""}`;
  }
  if (message.type && message.type !== "text") return `[${message.type}]`;
  return "[mensaje sin texto]";
}

function normalizar(texto: string | undefined): string {
  return (texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Botón de respuesta rápida "Copiar Alias" de la plantilla de transferencia. Solo botones,
// no texto libre: si el alumno escribe "alias" en una frase lo contesta el gym a mano.
function esPedidoDeAlias(message: MensajeEntrante): boolean {
  const textoBoton = message.button?.text ?? message.button?.payload ?? message.interactive?.button_reply?.title;
  return !!textoBoton && normalizar(textoBoton).includes("alias");
}

// Responde con un mensaje que tiene SOLO el alias: en WhatsApp, mantener apretado copia el
// mensaje entero, así el alumno lo pega directo en la app del banco. Va dentro de la
// ventana de 24hs que abrió el propio botón, así que no necesita plantilla.
async function responderAlias(
  admin: ReturnType<typeof createAdminClient>,
  gymId: string,
  telefono: string,
  alumnoId: string | null,
): Promise<void> {
  const { data: config, error } = await admin
    .from("gym_config")
    .select("whatsapp_phone_number_id, whatsapp_access_token, transferencia_alias")
    .eq("gym_id", gymId)
    .maybeSingle();

  const alias = config?.transferencia_alias?.trim();
  if (error || !config || !alias) {
    console.warn("[webhook:whatsapp] pidieron el alias pero el gym no tiene transferencia_alias cargado — gym:", gymId, error?.message ?? "");
    return;
  }

  try {
    const waMessageId = await sendWhatsAppText(config, { to: telefono, body: alias });
    const { error: insertError } = await admin.from("mensajes_whatsapp").insert({
      gym_id: gymId,
      alumno_id: alumnoId,
      telefono,
      direccion: "saliente",
      cuerpo: alias,
      wa_message_id: waMessageId,
      estado: "enviado",
    });
    if (insertError) console.error("[webhook:whatsapp] alias enviado pero no se guardó en el inbox:", insertError.message);
    else console.log("[webhook:whatsapp] alias enviado — gym:", gymId, "a:", telefono);
  } catch (err) {
    console.error("[webhook:whatsapp] error enviando el alias — gym:", gymId, err instanceof Error ? err.message : err);
  }
}

// Push al celular/compu de los usuarios del gym. Solo se llama cuando el mensaje necesita
// a una persona (lo que resuelve el bot no avisa).
async function avisarPorPush(
  admin: ReturnType<typeof createAdminClient>,
  args: { gymId: string; telefono: string; alumnoId: string | null; perfilNombre: string | null; cuerpo: string },
): Promise<void> {
  let titulo = args.perfilNombre ?? `+${args.telefono}`;
  if (args.alumnoId) {
    const { data: a } = await admin.from("alumnos").select("nombre, apellido").eq("id", args.alumnoId).maybeSingle();
    if (a) titulo = `${a.nombre} ${a.apellido}`;
  }
  await enviarPushAlGym(admin, args.gymId, {
    title: titulo,
    body: args.cuerpo,
    url: `/dashboard/whatsapp/${encodeURIComponent(args.telefono)}`,
    tag: `wa-${args.telefono}`,
  });
}

function mapStatus(waStatus: string): string {
  if (waStatus === "delivered") return "entregado";
  if (waStatus === "read") return "leido";
  if (waStatus === "failed") return "error";
  if (waStatus === "sent") return "enviado";
  return waStatus;
}

async function validateMetaSignature(signatureHeader: string | null, rawBody: string): Promise<boolean> {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error("[webhook:whatsapp] META_APP_SECRET no configurado — rechazando request");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    console.error("[webhook:whatsapp] Falta header x-hub-signature-256 o no empieza con sha256=");
    return false;
  }

  const expectedHex = signatureHeader.slice("sha256=".length);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (computedHex.length !== expectedHex.length) return false;
  const matches = timingSafeEqual(Buffer.from(computedHex, "hex"), Buffer.from(expectedHex, "hex"));
  if (!matches) console.error("[webhook:whatsapp] Firma no coincide — META_APP_SECRET probablemente no es el correcto");
  return matches;
}

type WhatsAppWebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
        messages?: Array<{
          from: string;
          id: string;
          type?: string;
          text?: { body: string };
          // Botón de respuesta rápida de una plantilla.
          button?: { text?: string; payload?: string };
          // Botón de un mensaje interactivo (por si más adelante mandamos botones fuera de plantilla).
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string; description?: string };
          };
        }>;
      };
    }>;
  }>;
};
