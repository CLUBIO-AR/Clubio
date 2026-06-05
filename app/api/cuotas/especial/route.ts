import { NextResponse } from "next/server";
import { getApiGymId } from "@/lib/supabase/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CuotaEspecialSchema } from "@/lib/cuotas";

export async function POST(request: Request) {
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = CuotaEspecialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = createAdminClient();
  const d = parsed.data;

  // Validar que el alumno pertenece al gym del usuario
  const { data: alumno } = await admin
    .from("alumnos")
    .select("id")
    .eq("id", d.alumno_id)
    .eq("gym_id", gymId)
    .is("deleted_at", null)
    .single();

  if (!alumno) {
    return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("cuotas")
    .insert({
      gym_id: gymId,
      alumno_id: d.alumno_id,
      tipo: d.tipo,
      descripcion: d.descripcion ?? null,
      mes: d.mes,
      anio: d.anio,
      monto_base: d.monto_base,
      fecha_vencimiento: d.fecha_vencimiento,
      notas: d.notas ?? null,
      estado: "pendiente",
    })
    .select("id, tipo, descripcion, mes, anio, monto_base, monto_total, estado, fecha_vencimiento")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una cuota mensual para este alumno en ese período" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
