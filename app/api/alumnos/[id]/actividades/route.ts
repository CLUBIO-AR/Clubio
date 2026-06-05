import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApiGymId } from "@/lib/supabase/api-auth";
import { z } from "zod";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: alumnoId } = await params;
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alumno_actividades")
    .select("*, actividades(id, nombre, monto_base, color)")
    .eq("alumno_id", alumnoId)
    .eq("gym_id", gymId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

const UpsertSchema = z.object({
  actividad_id: z.string().uuid(),
  monto_personalizado: z.number().min(0).nullable().optional(),
  activa: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: alumnoId } = await params;
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alumno_actividades")
    .upsert(
      { alumno_id: alumnoId, gym_id: gymId, ...parsed.data },
      { onConflict: "alumno_id,actividad_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: alumnoId } = await params;
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { actividad_id } = await request.json().catch(() => ({}));
  if (!actividad_id) return NextResponse.json({ error: "actividad_id requerido" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("alumno_actividades")
    .delete()
    .eq("alumno_id", alumnoId)
    .eq("actividad_id", actividad_id)
    .eq("gym_id", gymId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
