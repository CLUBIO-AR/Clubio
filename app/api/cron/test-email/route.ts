import { NextResponse } from "next/server";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendGymTestEmail } from "@/lib/notifications/channels/email";
import { z } from "zod";

const Schema = z.object({
  to: z.string().email().optional(),
});

export async function POST(request: Request) {
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Obtener email del usuario si no se especificó destino
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const toEmail = parsed.data.to ?? user?.email;
  if (!toEmail) return NextResponse.json({ error: "No hay email de destino" }, { status: 400 });

  const admin = createAdminClient();
  const { data: gymConfig } = await admin
    .from("gym_config")
    .select("email_remitente_nombre, email_remitente_address")
    .eq("gym_id", ctx.gymId)
    .single();

  const { data: gym } = await admin
    .from("gyms")
    .select("nombre")
    .eq("id", ctx.gymId)
    .single();

  const gymNombre = gym?.nombre ?? "CLUBIO";
  const from = gymConfig?.email_remitente_address
    ? `${gymConfig.email_remitente_nombre ?? gymNombre} <${gymConfig.email_remitente_address}>`
    : `${gymNombre} <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.app"}>`;

  let messageId: string;
  try {
    messageId = await sendGymTestEmail({ to: toEmail, gymNombre, from });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message ?? "Error desconocido de Resend" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, message_id: messageId, to: toEmail, from });
}
