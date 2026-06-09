import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { data: cuota } = await supabase
    .from("cuotas")
    .select("id, gym_id, alumno_id, mes, anio, monto_total, estado, alumnos!alumno_id(nombre, apellido)")
    .eq("id", id)
    .eq("gym_id", ctx.gymId)
    .single();

  if (!cuota) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (cuota.estado === "pagada" || cuota.estado === "condonada") {
    return NextResponse.json({ error: "La cuota ya está pagada o condonada" }, { status: 409 });
  }

  const alumno = cuota.alumnos as { nombre: string; apellido: string } | null;
  const alumnoNombre = alumno ? `${alumno.nombre} ${alumno.apellido}` : "Alumno";

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL!;

  const token = await new SignJWT({
    cuota_id:      cuota.id,
    gym_id:        ctx.gymId,
    alumno_id:     cuota.alumno_id,
    alumno_nombre: alumnoNombre,
    mes:           cuota.mes,
    anio:          cuota.anio,
    monto:         cuota.monto_total,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  return NextResponse.json({ url: `${appUrl}/pagar/${token}` });
}
