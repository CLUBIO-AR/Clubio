import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { getCuotas, createCuotaManual, CuotaManualSchema } from "@/lib/cuotas";
import type { CuotaEstado } from "@/lib/cuotas";

export async function GET(request: Request) {
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const mes    = searchParams.get("mes")    ? Number(searchParams.get("mes"))    : undefined;
  const anio   = searchParams.get("anio")   ? Number(searchParams.get("anio"))   : undefined;
  const estado = searchParams.get("estado") as CuotaEstado | null ?? undefined;
  const search   = searchParams.get("search") ?? undefined;
  const alumnoId = searchParams.get("alumno") ?? undefined;

  const { data, error } = await getCuotas(supabase, ctx.gymId, { mes, anio, estado, alumnoId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtrar por búsqueda de alumno en memoria (join result)
  let result = (data ?? []) as Array<typeof data[0] & { alumnos?: { nombre: string; apellido: string; dni: string | null } | null }>;
  if (search?.trim()) {
    const term = search.toLowerCase();
    result = result.filter((c) => {
      const a = c.alumnos as { nombre: string; apellido: string; dni: string | null } | null;
      return (
        a?.nombre.toLowerCase().includes(term) ||
        a?.apellido.toLowerCase().includes(term) ||
        a?.dni?.toLowerCase().includes(term)
      );
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const body = await request.json();
  const parsed = CuotaManualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Verificar que el alumno pertenece al gym
  const { data: alumno } = await supabase
    .from("alumnos").select("id").eq("id", parsed.data.alumno_id).eq("gym_id", ctx.gymId).single();
  if (!alumno) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  const { data, error } = await createCuotaManual(supabase, ctx.gymId, parsed.data);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ya existe una cuota para ese alumno en ese mes" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
