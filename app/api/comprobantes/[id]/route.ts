import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApiGymContext } from "@/lib/supabase/api-auth";
import { marcarPagadaManual, reactivarAlumnoSiCorresponde } from "@/lib/cuotas";
import { avisarResultadoComprobante } from "@/lib/comprobantes";

const Schema = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("confirmar") }),
  z.object({ accion: z.literal("rechazar"), motivo: z.string().trim().max(200).optional() }),
]);

const ABIERTAS = ["pendiente", "vencida", "pagada_parcial"];

// Revisión de un comprobante que mandó un alumno por WhatsApp ("Ya transferí").
// Confirmar registra el pago de sus cuotas con el flujo manual existente (método
// transferencia) y le avisa al alumno. Rechazar solo cambia el estado y le avisa.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getApiGymContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const supabase = await createClient();
  const { data: comprobante } = await supabase
    .from("comprobantes_pago")
    .select("id, alumno_id, telefono, cuota_ids, estado")
    .eq("id", id)
    .eq("gym_id", ctx.gymId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!comprobante) return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  if (comprobante.estado !== "pendiente") return NextResponse.json({ error: "Este comprobante ya fue revisado" }, { status: 409 });

  const ahora = new Date().toISOString();

  if (parsed.data.accion === "confirmar") {
    // Solo las cuotas que siguen abiertas (alguna pudo haberse pagado por otro lado).
    const { data: cuotas } = comprobante.cuota_ids.length
      ? await supabase.from("cuotas").select("id, estado").eq("gym_id", ctx.gymId).in("id", comprobante.cuota_ids)
      : { data: [] as Array<{ id: string; estado: string }> };
    const abiertas = (cuotas ?? []).filter((c) => ABIERTAS.includes(c.estado));

    for (const cuota of abiertas) {
      const { error } = await marcarPagadaManual(supabase, ctx.gymId, cuota.id, "transferencia", "Comprobante por WhatsApp", ctx.userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error } = await supabase
      .from("comprobantes_pago")
      .update({ estado: "confirmado", revisado_por: ctx.userId, revisado_at: ahora })
      .eq("id", id)
      .eq("gym_id", ctx.gymId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (abiertas.length) reactivarAlumnoSiCorresponde(supabase, comprobante.alumno_id).catch(console.error);
  } else {
    const { error } = await supabase
      .from("comprobantes_pago")
      .update({ estado: "rechazado", revisado_por: ctx.userId, revisado_at: ahora, motivo_rechazo: parsed.data.motivo || null })
      .eq("id", id)
      .eq("gym_id", ctx.gymId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // El aviso al alumno usa las credenciales de WhatsApp del gym (service_role, igual que el webhook).
  const aviso = await avisarResultadoComprobante(createAdminClient(), {
    gymId: ctx.gymId,
    alumnoId: comprobante.alumno_id,
    telefono: comprobante.telefono,
    resultado: parsed.data.accion === "confirmar" ? "confirmado" : "rechazado",
    motivo: parsed.data.accion === "rechazar" ? parsed.data.motivo : null,
  });

  revalidatePath("/dashboard/pagos");
  revalidatePath("/dashboard/cuotas", "layout");
  revalidatePath("/dashboard/alumnos", "layout");
  return NextResponse.json({ ok: true, aviso });
}
