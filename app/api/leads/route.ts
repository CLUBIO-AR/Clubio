import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSettings } from "@/lib/admin/settings";
import { sendLeadNotifications } from "@/lib/notifications/channels/email";

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

  // Extraer IP del request (Vercel pone x-forwarded-for)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? request.headers.get("x-real-ip")
    ?? null;

  const admin = createAdminClient();
  const hace1hora = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Rate limit por IP: máx 5 solicitudes/hora desde la misma IP
  if (ip) {
    const { count } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", hace1hora);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }
  }

  // Rate limit por email: un mismo email no puede enviar más de una solicitud cada 10 minutos.
  const hace10min = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: reciente } = await admin
    .from("leads")
    .select("id")
    .eq("email", parsed.data.email)
    .gte("created_at", hace10min)
    .maybeSingle();
  if (reciente) {
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  }

  const { error } = await admin.from("leads").insert({
    nombre: parsed.data.nombre,
    email: parsed.data.email,
    telefono: parsed.data.telefono ?? null,
    gym_nombre: parsed.data.gym_nombre ?? null,
    cantidad_alumnos: parsed.data.cantidad_alumnos ?? null,
    como_nos_conocio: parsed.data.como_nos_conocio ?? null,
    ip,
  });

  if (error) {
    return NextResponse.json({ error: "No pudimos registrar tu solicitud, intentá de nuevo" }, { status: 500, headers: CORS_HEADERS });
  }

  // El lead ya está guardado — un fallo de email no debe devolver error al usuario.
  const { notification_email } = await getAdminSettings();
  await sendLeadNotifications({ notificationTo: notification_email, lead: parsed.data }).catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201, headers: CORS_HEADERS });
}
