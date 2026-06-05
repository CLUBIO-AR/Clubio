import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Schema = z.object({ cuota_id: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios").select("gym_id").eq("id", user.id).single();
  if (!gymUsuario) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const admin = createAdminClient();

  // Verificar que la cuota pertenece al gym
  const { data: cuota } = await admin
    .from("cuotas")
    .select("id, mes, anio, monto_total, estado, alumno_id, alumnos!alumno_id(nombre, apellido, email)")
    .eq("id", parsed.data.cuota_id)
    .eq("gym_id", gymUsuario.gym_id)
    .single();

  if (!cuota) return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
  if (cuota.estado === "pagada" || cuota.estado === "condonada") {
    return NextResponse.json({ error: "La cuota ya no requiere pago" }, { status: 409 });
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const alumno = cuota.alumnos as { nombre: string; apellido: string; email: string | null } | null;

  const token = await new SignJWT({
    cuota_id: cuota.id,
    gym_id: gymUsuario.gym_id,
    alumno_id: cuota.alumno_id,
    alumno_nombre: alumno ? `${alumno.nombre} ${alumno.apellido}` : "Alumno",
    mes: cuota.mes,
    anio: cuota.anio,
    monto: cuota.monto_total,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/pagar/${token}`;
  return NextResponse.json({ url, token });
}
