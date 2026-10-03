import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Webhook único para TODOS los gyms (Meta no permite un callback distinto por número
// dentro de la misma app). Los eventos no traen gym_id directamente — solo
// phone_number_id, que hay que cruzar contra gym_config si se necesita identificar
// al gym (por ahora solo logueamos; MVP 2.5 cubre únicamente el envío saliente).

// GET: handshake de verificación que Meta hace una sola vez al guardar la Callback URL.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verificación inválida" }, { status: 403 });
}

// POST: eventos de mensajes entrantes y status updates (sent/delivered/read/failed)
// de los mensajes que mandamos nosotros vía sendWhatsApp.
export async function POST(request: Request) {
  const rawBody = await request.text();

  const valid = await validateMetaSignature(request.headers.get("x-hub-signature-256"), rawBody);
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let body: WhatsAppWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;

      for (const statusUpdate of value.statuses ?? []) {
        console.log("[webhook:whatsapp] status:", statusUpdate.id, statusUpdate.status);
        // TODO: cuando haya tabla de tracking de envíos, actualizar estado por statusUpdate.id
      }

      for (const message of value.messages ?? []) {
        console.log("[webhook:whatsapp] mensaje entrante de", message.from, ":", message.text?.body);
        // TODO: si en el futuro se quiere responder automático (ej. confirmar pago por chat),
        // acá es donde se engancha.
      }
    }
  }

  return NextResponse.json({ ok: true });
}

async function validateMetaSignature(signatureHeader: string | null, rawBody: string): Promise<boolean> {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    console.error("[webhook:whatsapp] META_APP_SECRET no configurado — rechazando request");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

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
  return timingSafeEqual(Buffer.from(computedHex, "hex"), Buffer.from(expectedHex, "hex"));
}

type WhatsAppWebhookBody = {
  entry?: Array<{
    changes?: Array<{
      value: {
        statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
        messages?: Array<{ from: string; id: string; text?: { body: string } }>;
      };
    }>;
  }>;
};
