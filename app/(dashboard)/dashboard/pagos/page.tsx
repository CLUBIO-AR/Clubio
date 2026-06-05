import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { DollarSign, CreditCard, TrendingUp } from "lucide-react";
import { T } from "@/lib/theme";

const METODO_LABEL: Record<string, string> = {
  mercadopago:   "MercadoPago",
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
};
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function PagosPage() {
  const ctx = await requireGymContext();
  const supabase = await createClient();
  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [pagosRes, pagosMesRes] = await Promise.all([
    supabase
      .from("pagos")
      .select("id, monto, metodo, created_at, alumnos(nombre, apellido), cuotas(mes, anio, tipo, descripcion)")
      .eq("gym_id", ctx.gymId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("pagos")
      .select("monto")
      .eq("gym_id", ctx.gymId)
      .gte("created_at", mesInicio),
  ]);

  const pagos = pagosRes.data ?? [];
  const pagosMes = pagosMesRes.data ?? [];
  const totalMes = pagosMes.reduce((s, p) => s + p.monto, 0);
  const totalHistorico = pagos.reduce((s, p) => s + p.monto, 0);
  const mes = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const stats = [
    { label: "Cobrado este mes",  value: `$${totalMes.toLocaleString("es-AR")}`,      icon: TrendingUp,  color: T.accent,  bg: T.accentBg },
    { label: "Pagos este mes",    value: pagosMes.length,                              icon: CreditCard,  color: T.lime,    bg: `${T.lime}15` },
    { label: "Total histórico",   value: `$${totalHistorico.toLocaleString("es-AR")}`, icon: DollarSign,  color: T.blue,    bg: `${T.blue}15` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          PAGOS
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Historial de cobros — {mes}</p>
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

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="px-5 py-3 grid gap-4 border-b"
          style={{ background: T.bgDeep, borderColor: T.borderSub, gridTemplateColumns: "minmax(0,2fr) minmax(0,1.5fr) 130px 110px" }}>
          {[
            { label: "Alumno",  cls: "" },
            { label: "Período", cls: "" },
            { label: "Método",  cls: "" },
            { label: "Monto",   cls: "text-right" },
          ].map(({ label, cls }) => (
            <p key={label} className={`text-xs font-bold uppercase tracking-[0.12em] ${cls}`}
              style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
              {label}
            </p>
          ))}
        </div>

        {pagos.length === 0 && (
          <div className="px-5 py-10 text-center" style={{ color: T.textDim }}>
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin pagos registrados</p>
          </div>
        )}

        {pagos.map((p) => {
          const alumno = p.alumnos as { nombre: string; apellido: string } | null;
          const cuota = p.cuotas as { mes: number; anio: number; tipo: string; descripcion: string | null } | null;
          const metodoColor = p.metodo === "mercadopago" ? T.accent : p.metodo === "efectivo" ? T.lime : T.blue;

          // Período: para mensual mostrar mes/año, para especiales mostrar descripción
          const periodo = !cuota
            ? "—"
            : cuota.tipo !== "mensual" && cuota.descripcion
            ? cuota.descripcion.length > 28 ? cuota.descripcion.slice(0, 28) + "…" : cuota.descripcion
            : `${MESES[cuota.mes]} ${cuota.anio}`;

          const periodoSub = cuota?.tipo !== "mensual" && cuota?.tipo
            ? cuota.tipo.replace("_", " ")
            : null;

          return (
            <div
              key={p.id}
              className="px-5 py-3 grid gap-4 items-center border-b last:border-b-0"
              style={{ borderColor: T.borderSub, background: T.card, gridTemplateColumns: "minmax(0,2fr) minmax(0,1.5fr) 130px 110px" }}
            >
              {/* Alumno */}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                  {alumno ? `${alumno.apellido}, ${alumno.nombre}` : "—"}
                </p>
                <p className="text-xs" style={{ color: T.textDim }}>
                  {new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </p>
              </div>

              {/* Período */}
              <div className="min-w-0">
                <p className="text-sm truncate" style={{ color: T.text }}>{periodo}</p>
                {periodoSub && (
                  <p className="text-xs capitalize" style={{ color: T.textDim }}>{periodoSub}</p>
                )}
              </div>

              {/* Método badge */}
              <div>
                <span
                  className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: `${metodoColor}15`, color: metodoColor, border: `1px solid ${metodoColor}30` }}
                >
                  {METODO_LABEL[p.metodo] ?? p.metodo}
                </span>
              </div>

              {/* Monto */}
              <p className="text-sm font-bold font-mono text-right" style={{ color: T.text }}>
                ${p.monto.toLocaleString("es-AR")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
