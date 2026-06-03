import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAlumnos,
  createAlumno,
  AlumnoInsertSchema,
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const gymId = await getGymId(supabase);
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const activoParam = searchParams.get("activo");
  const activo = activoParam === "true" ? true : activoParam === "false" ? false : undefined;

  const { data, error } = await getAlumnos(supabase, gymId, { search, activo });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const gymId = await getGymId(supabase);
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = AlumnoInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await createAlumno(supabase, gymId, parsed.data);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un alumno con ese DNI" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
