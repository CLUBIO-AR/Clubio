import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
        const cuerpo = message.text?.body ?? "[mensaje sin texto]";

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

        const { error: insertError } = await admin.from("mensajes_whatsapp").insert({
          gym_id: gymId,
          alumno_id: alumno?.id ?? null,
          telefono,
          direccion: "entrante",
          cuerpo,
          wa_message_id: message.id,
          estado: "recibido",
          leido: false,
        });

        if (insertError) {
          console.error("[webhook:whatsapp] error insertando mensaje entrante:", insertError.message);
        } else {
          console.log("[webhook:whatsapp] mensaje entrante guardado — gym:", gymId, "de:", telefono, "alumno match:", alumno?.id ?? "sin match");
        }
      }
    }
  }

  console.log("[webhook:whatsapp] POST procesado — mensajes:", eventosMensaje, "| statuses:", eventosStatus);
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
        statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
        messages?: Array<{ from: string; id: string; text?: { body: string } }>;
      };
    }>;
  }>;
};
