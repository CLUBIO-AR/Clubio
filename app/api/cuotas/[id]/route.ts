import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { getCuotaById, marcarPagadaManual, condonarCuota, CuotaUpdateSchema } from "@/lib/cuotas";
import { notifyGymOwnerPago } from "@/lib/notifications/gym-owner";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { data, error } = await getCuotaById(supabase, ctx.gymId, id);
  if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const body = await request.json();
  const parsed = CuotaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const update = parsed.data;

  if (update.accion === "pagar_manual") {
    const { error } = await marcarPagadaManual(
      supabase, ctx.gymId, id,
      update.metodo_pago, update.pagado_por, ctx.userId, update.notas
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void (async () => {
      const { data: c } = await supabase
        .from("cuotas")
        .select("alumno_id, monto_total, mes, anio")
        .eq("id", id)
        .eq("gym_id", ctx.gymId)
        .single();
      if (!c) return;
      notifyGymOwnerPago({
        gymId:    ctx.gymId,
        alumnoId: c.alumno_id,
        cuotaId:  id,
        monto:    c.monto_total ?? 0,
        metodo:   update.metodo_pago,
        mes:      c.mes,
        anio:     c.anio,
      }).catch(console.error);
    })();

    revalidatePath("/dashboard/cuotas", "layout");
    revalidatePath("/dashboard/alumnos", "layout");
    revalidatePath("/dashboard", "page");
    return NextResponse.json({ ok: true });
  }

  if (update.accion === "condonar") {
    const { error } = await condonarCuota(supabase, ctx.gymId, id, update.notas);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/dashboard/cuotas", "layout");
    revalidatePath("/dashboard/alumnos", "layout");
    return NextResponse.json({ ok: true });
  }

  if (update.accion === "actualizar") {
    const { error } = await supabase
      .from("cuotas")
      .update({
        ...(update.monto_base ? { monto_base: update.monto_base } : {}),
        ...(update.fecha_vencimiento ? { fecha_vencimiento: update.fecha_vencimiento } : {}),
        ...(update.notas !== undefined ? { notas: update.notas } : {}),
      })
      .eq("id", id)
      .eq("gym_id", ctx.gymId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/dashboard/cuotas", "layout");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
