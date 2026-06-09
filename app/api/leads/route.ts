import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clubioEmailHtml, clubioEmailTable } from "@/lib/email/template";
import { getAdminSettings } from "@/lib/admin/settings";

const LeadSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  telefono: z.string().min(2).optional(),
  gym_nombre: z.string().min(1).optional(),
  cantidad_alumnos: z.enum(["<50", "50-100", "100-200", "200+"]).optional(),
  como_nos_conocio: z.string().min(1).optional(),
});

// La landing vive en otro dominio — habilitamos CORS para que pueda postear directo desde el browser.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Endpoint público — recibe el formulario de "Solicitar demo" de la landing.
// La tabla leads tiene RLS deny-by-default, así que insertamos con service_role.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400, headers: CORS_HEADERS });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("leads").insert({
    nombre: parsed.data.nombre,
    email: parsed.data.email,
    telefono: parsed.data.telefono ?? null,
    gym_nombre: parsed.data.gym_nombre ?? null,
    cantidad_alumnos: parsed.data.cantidad_alumnos ?? null,
    como_nos_conocio: parsed.data.como_nos_conocio ?? null,
  });

  if (error) {
    return NextResponse.json({ error: "No pudimos registrar tu solicitud, intentá de nuevo" }, { status: 500, headers: CORS_HEADERS });
  }

  // El lead ya está guardado — un fallo de email no debe devolver error al usuario.
  await enviarNotificacionesLead(parsed.data).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201, headers: CORS_HEADERS });
}

// Reemplaza las notificaciones por email que antes mandaba Formspree (admin.tsx).
async function enviarNotificacionesLead(lead: z.infer<typeof LeadSchema>) {
  const from = `CLUBIO <${process.env.RESEND_FROM_DEFAULT ?? "noreply@clubio.com.ar"}>`;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { notification_email } = await getAdminSettings();

  await resend.emails.send({
    from,
    to: notification_email,
    subject: `Nuevo lead: ${lead.gym_nombre ?? lead.nombre}`,
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 16px;color:#f9fafb;font-size:20px">Nueva solicitud de demo — Landing</h2>
      ${clubioEmailTable([
        ["Nombre", lead.nombre],
        ["Email", `<a href="mailto:${lead.email}" style="color:#34d399">${lead.email}</a>`],
        ["Teléfono", lead.telefono],
        ["Gimnasio", lead.gym_nombre],
        ["Alumnos", lead.cantidad_alumnos],
        ["Cómo nos conoció", lead.como_nos_conocio],
      ])}
    `),
    replyTo: lead.email,
  });

  await resend.emails.send({
    from,
    to: lead.email,
    subject: "Recibimos tu solicitud de demo — CLUBIO",
    html: clubioEmailHtml(`
      <h2 style="margin:0 0 12px;color:#f9fafb;font-size:20px">¡Listo, ${lead.nombre}!</h2>
      <p style="color:#9ca3af;line-height:1.6;margin:0 0 16px">
        Recibimos tu solicitud de demo${lead.gym_nombre ? ` para <strong style="color:#f9fafb">${lead.gym_nombre}</strong>` : ""}.
        Te contactamos a tu WhatsApp dentro de las próximas <strong style="color:#f9fafb">24 horas</strong>.
      </p>
    `),
  });
}
