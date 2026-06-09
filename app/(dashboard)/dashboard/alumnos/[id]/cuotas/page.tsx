import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { AlumnoCuotasClient } from "@/components/alumnos/alumno-cuotas-client";

const PAGE_SIZE = 50;

export default async function AlumnoCuotasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; estado?: string; mes?: string; anio?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireGymContext();
  const supabase = await createClient();

  // Verificar que el alumno pertenece al gym
  const { data: alumno } = await supabase
    .from("alumnos")
    .select("id, nombre, apellido")
    .eq("id", id)
    .eq("gym_id", ctx.gymId)
    .is("deleted_at", null)
    .single();

  if (!alumno) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const estado = sp.estado ?? "";
  const mes    = sp.mes    ?? "";
  const anio   = sp.anio   ?? "";

  let query = supabase
    .from("cuotas")
    .select(
      "id, mes, anio, monto_total, estado, fecha_vencimiento, descripcion, actividades(nombre, color)",
      { count: "exact" }
    )
    .eq("alumno_id", id)
    .eq("gym_id", ctx.gymId)
    .order("anio",  { ascending: false })
    .order("mes",   { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (estado) query = query.eq("estado", estado as "pendiente" | "vencida" | "pagada" | "pagada_parcial" | "condonada");
  if (mes)    query = query.eq("mes", Number(mes));
  if (anio)   query = query.eq("anio", Number(anio));

  // IDs de cuotas no pagadas (para el botón "Pagar todo") — sin paginación
  const nonPaidQuery = supabase
    .from("cuotas")
    .select("id")
    .eq("alumno_id", id)
    .eq("gym_id", ctx.gymId)
    .neq("estado", "pagada")
    .neq("estado", "condonada");

  const [cuotasRes, nonPaidRes] = await Promise.all([query, nonPaidQuery]);

  const total      = cuotasRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  type CuotaRow = {
    id: string; mes: number; anio: number; monto_total: number | null;
    estado: string; fecha_vencimiento: string | null; descripcion: string | null;
    actividades: { nombre: string; color: string } | { nombre: string; color: string }[] | null;
  };

  const cuotas = (cuotasRes.data ?? []).map((c: CuotaRow) => ({
    ...c,
    actividades: Array.isArray(c.actividades) ? (c.actividades[0] ?? null) : c.actividades,
  }));

  const nonPaidIds = (nonPaidRes.data ?? []).map((c) => c.id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/alumnos/${id}`}
          className="p-1.5 rounded-lg transition-colors hover:opacity-75"
          style={{ color: T.textDim }}
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
            {alumno.apellido?.toUpperCase()}, {alumno.nombre?.toUpperCase()}
          </h1>
          <p className="text-xs uppercase tracking-wider mt-1" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            Historial de cuotas
          </p>
        </div>
      </div>

      <AlumnoCuotasClient
        cuotas={cuotas as Parameters<typeof AlumnoCuotasClient>[0]["cuotas"]}
        total={total}
        page={page}
        totalPages={totalPages}
        alumnoId={id}
        nonPaidIds={nonPaidIds}
        filtros={{ estado, mes, anio }}
      />
    </div>
  );
}
