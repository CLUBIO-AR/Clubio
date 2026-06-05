import { NextResponse } from "next/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Schema = z.object({
  to: z.string().email().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const toEmail = parsed.data.to ?? ctx.user.email;
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

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: `[TEST] Configuración de email — ${gymNombre}`,
    html: `
      <p>Este es un email de prueba enviado desde <strong>${gymNombre}</strong> en CLUBIO.</p>
      <p>Si recibiste este mensaje, la configuración de email está funcionando correctamente.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="color:#9ca3af;font-size:12px;">Gym ID: ${ctx.gymId}<br/>Enviado a: ${toEmail}</p>
    `,
  });

  if (error || !data?.id) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Error desconocido de Resend" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, message_id: data.id, to: toEmail, from });
}
