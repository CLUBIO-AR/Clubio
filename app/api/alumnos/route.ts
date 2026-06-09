import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApiGymId } from "@/lib/supabase/api-auth";
import { getAlumnos, createAlumno, AlumnoInsertSchema } from "@/lib/alumnos";
import { generarCuotaAlta } from "@/lib/cuotas";
import { enviarAvisoCuotaInmediato } from "@/lib/email/aviso-cuota-inmediato";

export async function GET(request: Request) {
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const activoParam = searchParams.get("activo");
  const activo = activoParam === "true" ? true : activoParam === "false" ? false : undefined;

  const { data, error } = await getAlumnos(supabase, gymId, { search, activo });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const gymId = await getApiGymId();
  if (!gymId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
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

  // Generar cuota inicial si la config del gym lo permite; si se genera, enviar aviso inmediato
  if (data?.id) {
    const email = parsed.data.email ?? null;
    const nombre = `${parsed.data.nombre} ${parsed.data.apellido}`;

    generarCuotaAlta(data.id, gymId)
      .then((resultado) => {
        if (resultado.generada && resultado.cuotaId && email) {
          enviarAvisoCuotaInmediato({
            alumnoId:     data.id,
            alumnoNombre: nombre,
            alumnoEmail:  email,
            gymId,
            cuotaId:      resultado.cuotaId,
            mes:          resultado.mes!,
            anio:         resultado.anio!,
            monto:        resultado.monto!,
          }).catch((err) =>
            console.error(`[api:alumnos:post] aviso inmediato alumno=${data.id} error:`, err)
          );
        }
      })
      .catch((err) =>
        console.error(`[api:alumnos:post] generarCuotaAlta alumno=${data.id} error:`, err)
      );
  }

  return NextResponse.json(data, { status: 201 });
}
