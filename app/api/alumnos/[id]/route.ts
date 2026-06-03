import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAlumnoById,
  updateAlumno,
  softDeleteAlumno,
  AlumnoUpdateSchema,
} from "@/lib/alumnos";

async function getGymId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  return data?.gym_id ?? null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const gymId = await getGymId(supabase);
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getAlumnoById(supabase, gymId, id);
  if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const gymId = await getGymId(supabase);
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = AlumnoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await updateAlumno(supabase, gymId, id, parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const gymId = await getGymId(supabase);
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await softDeleteAlumno(supabase, gymId, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
