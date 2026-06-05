import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";
import { PagosClient } from "@/components/pagos/pagos-client";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; metodo?: string }>;
}) {
  const sp  = await searchParams;
  const ctx = await requireGymContext();
  const supabase = await createClient();
  const now = new Date();

  // Defaults: mes actual
  const defaultDesde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultHasta = now.toISOString().split("T")[0];

  const desde  = sp.desde  ?? defaultDesde;
  const hasta  = sp.hasta  ?? defaultHasta;
  const metodo = sp.metodo ?? "";

  // Stats: cobrado este mes (siempre mes actual, independiente de filtros)
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [pagosRes, pagosMesRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("pagos")
        .select("id, monto, metodo, created_at, alumnos(nombre, apellido, dni), cuotas(mes, anio, tipo, descripcion)")
        .eq("gym_id", ctx.gymId)
        .gte("created_at", `${desde}T00:00:00`)
        .lte("created_at", `${hasta}T23:59:59`)
        .order("created_at", { ascending: false });
      if (metodo) q = q.eq("metodo", metodo);
      return q;
    })(),
    supabase.from("pagos").select("monto").eq("gym_id", ctx.gymId).gte("created_at", mesInicio),
  ]);

  const pagos    = pagosRes.data    ?? [];
  const pagosMes = pagosMesRes.data ?? [];
  const totalMes = pagosMes.reduce((s, p) => s + p.monto, 0);
  const totalPeriodo = pagos.reduce((s, p) => s + p.monto, 0);
  const mesLabel = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const stats = [
    { label: "Cobrado este mes",     value: `$${totalMes.toLocaleString("es-AR")}`,       icon: TrendingUp, color: T.accent, bg: T.accentBg },
    { label: "Pagos este mes",       value: pagosMes.length,                               icon: CreditCard, color: T.lime,   bg: `${T.lime}15` },
    { label: "Total en el período",  value: `$${totalPeriodo.toLocaleString("es-AR")}`,    icon: DollarSign, color: T.blue,   bg: `${T.blue}15` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
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
            <p className="text-2xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
              {s.value}
            </p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <PagosClient pagos={pagos as never} desde={desde} hasta={hasta} metodo={metodo} />
    </div>
  );
}
