import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ConfigActividades } from "@/components/configuracion/config-actividades";
import { T } from "@/lib/theme";

export default async function ActividadesPage() {
  const ctx = await requireGymContext();
  const supabase = await createClient();

  const [{ data: actividades }, { data: inscripciones }] = await Promise.all([
    supabase
      .from("actividades")
      .select("*")
      .eq("gym_id", ctx.gymId)
      .is("deleted_at", null)
      .order("nombre"),
    supabase
      .from("alumno_actividades")
      .select("actividad_id, bonificada")
      .eq("gym_id", ctx.gymId)
      .eq("activa", true),
  ]);

  const conteoPorActividad: Record<string, { total: number; bonificados: number }> = {};
  for (const ins of inscripciones ?? []) {
    const actual = conteoPorActividad[ins.actividad_id] ?? { total: 0, bonificados: 0 };
    actual.total++;
    if (ins.bonificada) actual.bonificados++;
    conteoPorActividad[ins.actividad_id] = actual;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1
          className="text-4xl leading-none"
          style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}
        >
          ACTIVIDADES
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>
          Clases y tipos de actividad del gimnasio
        </p>
      </div>

      <div className="text-sm rounded-xl px-4 py-3" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textDim }}>
        Cada actividad genera una cuota mensual independiente por alumno inscripto.
        Si un alumno está en 3 actividades, recibe 3 cuotas por mes.
      </div>

      <ConfigActividades actividades={actividades ?? []} conteoPorActividad={conteoPorActividad} />
    </div>
  );
}
