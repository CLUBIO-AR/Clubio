import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApiGymId } from "@/lib/supabase/api-auth";
import { z } from "zod";

const ActividadSchema = z.object({
  nombre: z.string().min(1).max(60),
  monto_base: z.number().min(0),
  recargo_1_dias: z.number().int().min(0).nullable().optional(),
  recargo_1_porcentaje: z.number().min(0).nullable().optional(),
  recargo_2_dias: z.number().int().min(0).nullable().optional(),
  recargo_2_porcentaje: z.number().min(0).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET() {
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .order("nombre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = ActividadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actividades")
    .insert({ ...parsed.data, gym_id: gymId })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ya existe una actividad con ese nombre" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
