import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const ctx = await requireGymContext().catch(() => null);
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mes = searchParams.get("mes") ? parseInt(searchParams.get("mes")!) : null;
  const anio = searchParams.get("anio") ? parseInt(searchParams.get("anio")!) : null;

  const supabase = await createClient();

  let query = supabase
    .from("pagos")
    .select("id, monto, metodo, mp_payment_id, created_at, alumnos(nombre, apellido), cuotas(mes, anio)")
    .eq("gym_id", ctx.gymId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (mes && anio) {
    const desde = new Date(anio, mes - 1, 1).toISOString();
    const hasta = new Date(anio, mes, 1).toISOString();
    query = query.gte("created_at", desde).lt("created_at", hasta);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pagos: data ?? [] });
}
