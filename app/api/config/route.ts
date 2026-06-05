import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { z } from "zod";

export async function GET() {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [gymRes, configRes] = await Promise.all([
    supabase.from("gyms").select("id, nombre, email_contacto, telefono, direccion").eq("id", ctx.gymId).single(),
    supabase.from("gym_config").select("*").eq("gym_id", ctx.gymId).single(),
  ]);

  return NextResponse.json({
    gym: gymRes.data,
    config: configRes.data,
  });
}

const PatchSchema = z.object({
  // Gym fields
  gym_nombre: z.string().min(1).max(100).optional(),
  gym_email_contacto: z.string().email().optional(),
  gym_telefono: z.string().nullable().optional(),
  gym_direccion: z.string().nullable().optional(),
  // Config: cuotas
  monto_base_defecto: z.number().positive().nullable().optional(),
  dia_vencimiento_mensual: z.number().int().min(1).max(28).optional(),
  dias_gracia: z.number().int().min(0).optional(),
  // Config: recargos
  recargo_1_dias: z.number().int().min(0).optional(),
  recargo_1_porcentaje: z.number().min(0).optional(),
  recargo_2_dias: z.number().int().min(0).nullable().optional(),
  recargo_2_porcentaje: z.number().min(0).nullable().optional(),
  // Config: notificaciones
  email_activo: z.boolean().optional(),
  dias_aviso_antes: z.array(z.number().int().min(0)).optional(),
  aviso_post_vencimiento_dias: z.number().int().min(0).optional(),
  max_avisos_post: z.number().int().min(0).optional(),
  email_remitente_nombre: z.string().nullable().optional(),
  email_remitente_address: z.string().email().nullable().optional(),
  // Config: MercadoPago
  mp_access_token: z.string().nullable().optional(),
  mp_public_key: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const data = parsed.data;
  const supabase = await createClient();
  const errors: string[] = [];

  // Update gyms table if any gym fields present
  const gymUpdate: {
    nombre?: string;
    email_contacto?: string;
    telefono?: string | null;
    direccion?: string | null;
  } = {};
  if (data.gym_nombre !== undefined) gymUpdate.nombre = data.gym_nombre;
  if (data.gym_email_contacto !== undefined) gymUpdate.email_contacto = data.gym_email_contacto;
  if (data.gym_telefono !== undefined) gymUpdate.telefono = data.gym_telefono ?? null;
  if (data.gym_direccion !== undefined) gymUpdate.direccion = data.gym_direccion ?? null;

  if (Object.keys(gymUpdate).length > 0) {
    const { error } = await supabase.from("gyms").update(gymUpdate).eq("id", ctx.gymId);
    if (error) errors.push(`gyms: ${error.message}`);
  }

  // Update gym_config — upsert in case row doesn't exist yet
  type ConfigUpsert = { gym_id: string } & Partial<{
    monto_base_defecto: number | null;
    dia_vencimiento_mensual: number;
    dias_gracia: number;
    recargo_1_dias: number;
    recargo_1_porcentaje: number;
    recargo_2_dias: number | null;
    recargo_2_porcentaje: number | null;
    email_activo: boolean;
    dias_aviso_antes: number[];
    aviso_post_vencimiento_dias: number;
    max_avisos_post: number;
    email_remitente_nombre: string | null;
    email_remitente_address: string | null;
    mp_access_token: string | null;
    mp_public_key: string | null;
  }>;

  const configUpsert: ConfigUpsert = { gym_id: ctx.gymId };
  const configKeys = [
    "monto_base_defecto", "dia_vencimiento_mensual", "dias_gracia",
    "recargo_1_dias", "recargo_1_porcentaje", "recargo_2_dias", "recargo_2_porcentaje",
    "email_activo", "dias_aviso_antes", "aviso_post_vencimiento_dias", "max_avisos_post",
    "email_remitente_nombre", "email_remitente_address",
    "mp_access_token", "mp_public_key",
  ] as const;

  for (const key of configKeys) {
    if (data[key] !== undefined) (configUpsert as Record<string, unknown>)[key] = data[key];
  }

  if (Object.keys(configUpsert).length > 1) {
    const { error } = await supabase
      .from("gym_config")
      .upsert(configUpsert as never, { onConflict: "gym_id" });
    if (error) errors.push(`gym_config: ${error.message}`);
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
