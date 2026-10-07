import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { T } from "@/lib/theme";
import { TransferenciasClient, type FilaTransferencia } from "@/components/transferencias/transferencias-client";

type Filtro = "todas" | "sin_asignar" | "saldo_a_favor";

export default async function TransferenciasPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro: f } = await searchParams;
  const filtro: Filtro = f === "sin_asignar" || f === "saldo_a_favor" ? f : "todas";
  const ctx = await requireGymContext();
  const supabase = await createClient();

  let query = supabase
    .from("transferencias")
    .select("id, fecha, monto, monto_imputado, estado, pagador_nombre, pagador_cuit, cvu_destino, alias_destino, concepto, alumno_id, alumnos(nombre, apellido)")
    .eq("gym_id", ctx.gymId)
    .order("fecha", { ascending: false })
    .limit(200);
  if (filtro !== "todas") query = query.eq("estado", filtro);

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data }, { data: delMes }, { count: sinAsignar }, { data: alumnos }] = await Promise.all([
    query,
    supabase.from("transferencias").select("monto").eq("gym_id", ctx.gymId).gte("fecha", inicioMes),
    supabase.from("transferencias").select("id", { count: "exact", head: true }).eq("gym_id", ctx.gymId).eq("estado", "sin_asignar"),
    supabase.from("alumnos").select("id, nombre, apellido, dni").eq("gym_id", ctx.gymId).is("deleted_at", null).order("apellido"),
  ]);

  const filas: FilaTransferencia[] = (data ?? []).map((t) => {
    const a = t.alumnos as unknown as { nombre: string; apellido: string } | null;
    return {
      id: t.id,
      fecha: t.fecha,
      monto: Number(t.monto),
      montoImputado: Number(t.monto_imputado),
      estado: t.estado,
      pagador: [t.pagador_nombre, t.pagador_cuit].filter(Boolean).join(" · ") || null,
      destino: t.alias_destino ?? t.cvu_destino,
      concepto: t.concepto,
      alumnoId: t.alumno_id,
      alumnoNombre: a ? `${a.apellido}, ${a.nombre}` : null,
    };
  });
  const totalMes = (delMes ?? []).reduce((acc, t) => acc + Number(t.monto), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/pagos" className="p-1.5 rounded-lg hover:opacity-75" style={{ color: T.textDim }} aria-label="Volver a Pagos">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
            TRANSFERENCIAS
          </h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>
            Las que entran al alias de cada alumno se imputan solas a sus cuotas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <div className="p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>Recibido este mes</p>
          <p className="text-2xl font-bold font-mono" style={{ color: T.text }}>${totalMes.toLocaleString("es-AR")}</p>
        </div>
        <div className="p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${(sinAsignar ?? 0) > 0 ? T.danger : T.border}` }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>Sin asignar</p>
          <p className="text-2xl font-bold font-mono" style={{ color: (sinAsignar ?? 0) > 0 ? T.danger : T.text }}>{sinAsignar ?? 0}</p>
        </div>
      </div>

      <TransferenciasClient
        filas={filas}
        filtro={filtro}
        alumnos={(alumnos ?? []).map((a) => ({ id: a.id, nombre: `${a.apellido}, ${a.nombre}`, dni: a.dni }))}
      />
    </div>
  );
}
