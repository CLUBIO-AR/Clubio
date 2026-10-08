import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";
import { PagosClient } from "@/components/pagos/pagos-client";
import { ComprobantesRevision, type ComprobanteRevision } from "@/components/pagos/comprobantes-revision";
import { BUCKET_COMPROBANTES } from "@/lib/comprobantes";

const MESES_LARGO = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; metodo?: string; actividad?: string }>;
}) {
  const sp  = await searchParams;
  const ctx = await requireGymContext();
  const supabase = await createClient();
  const now = new Date();

  // Defaults: mes actual
  const defaultDesde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultHasta = now.toISOString().split("T")[0];

  const desde     = sp.desde     ?? defaultDesde;
  const hasta     = sp.hasta     ?? defaultHasta;
  const metodo    = sp.metodo    ?? "";
  const actividad = sp.actividad ?? "";

  // Stats: cobrado este mes (siempre mes actual, independiente de filtros)
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [pagosRes, pagosMesRes, actividadesRes, comprobantesRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("pagos")
        .select("id, monto, metodo, created_at, alumnos(nombre, apellido, dni), cuotas(mes, anio, tipo, descripcion, actividades(id, nombre, color))")
        .eq("gym_id", ctx.gymId)
        .gte("created_at", `${desde}T00:00:00`)
        .lte("created_at", `${hasta}T23:59:59`)
        .order("created_at", { ascending: false });
      if (metodo) q = q.eq("metodo", metodo);
      return q;
    })(),
    supabase.from("pagos").select("monto").eq("gym_id", ctx.gymId).gte("created_at", mesInicio),
    supabase.from("actividades").select("id, nombre, color").eq("gym_id", ctx.gymId).is("deleted_at", null).order("nombre"),
    supabase.from("comprobantes_pago")
      .select("id, telefono, cuota_ids, storage_path, mime_type, created_at, alumnos(nombre, apellido)")
      .eq("gym_id", ctx.gymId).eq("estado", "pendiente").is("deleted_at", null)
      .order("created_at", { ascending: true }).limit(30),
  ]);

  const comprobantes = await armarComprobantes(supabase, ctx.gymId, comprobantesRes.data ?? []);

  const pagos      = pagosRes.data      ?? [];
  const actividades = actividadesRes.data ?? [];
  const pagosMes = pagosMesRes.data ?? [];
  const totalMes = pagosMes.reduce((s, p) => s + p.monto, 0);
  const totalPeriodo = pagos.reduce((s, p) => s + p.monto, 0);
  const mesLabel = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const stats = [
    { label: "Cobrado este mes",     value: `$${totalMes.toLocaleString("es-AR")}`,       icon: TrendingUp, color: T.accent, bg: T.accentBg },
    { label: "Pagos este mes",       value: pagosMes.length,                               icon: CreditCard, color: T.limeText, bg: T.lime },
    { label: "Total en el período",  value: `$${totalPeriodo.toLocaleString("es-AR")}`,    icon: DollarSign, color: T.blue,   bg: `${T.blue}15` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
          PAGOS
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Historial de cobros — {mesLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>
              {s.value}
            </p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <ComprobantesRevision comprobantes={comprobantes} />

      <PagosClient
        pagos={pagos as never}
        desde={desde}
        hasta={hasta}
        metodo={metodo}
        actividad={actividad}
        actividades={actividades}
      />
    </div>
  );
}

type FilaComprobante = {
  id: string;
  telefono: string;
  cuota_ids: string[];
  storage_path: string;
  mime_type: string | null;
  created_at: string;
  alumnos: { nombre: string; apellido: string } | null;
};

// Arma los datos para "Comprobantes por revisar": URL firmada (10 min, bucket privado) y
// el detalle de las cuotas que el alumno dijo pagar.
async function armarComprobantes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gymId: string,
  filas: unknown[],
): Promise<ComprobanteRevision[]> {
  const lista = filas as FilaComprobante[];
  if (lista.length === 0) return [];

  const cuotaIds = Array.from(new Set(lista.flatMap((f) => f.cuota_ids)));
  const [{ data: cuotas }, { data: firmadas }] = await Promise.all([
    cuotaIds.length
      ? supabase.from("cuotas").select("id, mes, anio, monto_total, estado, tipo, descripcion, actividades(nombre)").eq("gym_id", gymId).in("id", cuotaIds)
      : Promise.resolve({ data: [] }),
    supabase.storage.from(BUCKET_COMPROBANTES).createSignedUrls(lista.map((f) => f.storage_path), 600),
  ]);

  const porId = new Map((cuotas ?? []).map((c) => {
    const actividad = (c.actividades as unknown as { nombre: string } | null)?.nombre;
    const concepto = c.tipo && c.tipo !== "mensual" && c.descripcion
      ? c.descripcion
      : `${MESES_LARGO[c.mes] ?? c.mes} ${c.anio}${actividad ? ` · ${actividad}` : ""}`;
    return [c.id, { concepto, monto: Number(c.monto_total ?? 0), estado: c.estado as string }];
  }));
  const urls = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));

  return lista.map((f) => ({
    id: f.id,
    alumno: f.alumnos ? `${f.alumnos.nombre} ${f.alumnos.apellido}` : "Alumno",
    telefono: f.telefono,
    createdAt: f.created_at,
    url: urls.get(f.storage_path) ?? null,
    esPdf: (f.mime_type ?? "").includes("pdf"),
    cuotas: f.cuota_ids.map((id) => porId.get(id)).filter((c): c is NonNullable<typeof c> => !!c),
  }));
}
