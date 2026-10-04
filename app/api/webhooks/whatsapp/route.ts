import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook único para TODOS los gyms (Meta no permite un callback distinto por número
// dentro de la misma app). Cada evento trae metadata.phone_number_id, que se cruza
// contra gym_config.whatsapp_phone_number_id para saber a qué gym pertenece.

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
// de los mensajes que mandamos nosotros. Se guardan en mensajes_whatsapp para el
// inbox del dashboard (ver app/(dashboard)/dashboard/whatsapp).
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

  const admin = createAdminClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const { data: gymConfig } = await admin
        .from("gym_config")
        .select("gym_id")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();

      if (!gymConfig) {
        console.error("[webhook:whatsapp] ningún gym configurado con phone_number_id:", phoneNumberId);
        continue;
      }
      const gymId = gymConfig.gym_id;

      for (const statusUpdate of value.statuses ?? []) {
        await admin
          .from("mensajes_whatsapp")
          .update({ estado: mapStatus(statusUpdate.status) })
          .eq("wa_message_id", statusUpdate.id);
      }

      for (const message of value.messages ?? []) {
        const telefono = message.from;
        const cuerpo = message.text?.body ?? "[mensaje sin texto]";

        const { data: alumno } = await admin
          .from("alumnos")
          .select("id")
          .eq("gym_id", gymId)
          .ilike("telefono", `%${telefono.slice(-10)}`)
          .maybeSingle();

        await admin.from("mensajes_whatsapp").insert({
          gym_id: gymId,
          alumno_id: alumno?.id ?? null,
          telefono,
          direccion: "entrante",
          cuerpo,
          wa_message_id: message.id,
          estado: "recibido",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
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
        metadata?: { phone_number_id?: string };
        statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
        messages?: Array<{ from: string; id: string; text?: { body: string } }>;
      };
    }>;
  }>;
};
