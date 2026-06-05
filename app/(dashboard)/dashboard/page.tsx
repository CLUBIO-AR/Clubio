import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { Users, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/theme";

export default async function DashboardPage() {
  const ctx = await requireGymContext();
  const gymId = ctx.gymId;
  const supabase = await createClient();
  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [alumnosRes, cuotasVencidasRes, cobrosRes, pendientesRes] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("activo", true).is("deleted_at", null),
    supabase.from("cuotas").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("estado", "vencida"),
    supabase.from("cuotas").select("monto_total").eq("gym_id", gymId).eq("estado", "pagada").gte("fecha_pago", mesInicio),
    supabase.from("cuotas").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("estado", "pendiente"),
  ]);

  const totalCobros = cobrosRes.data?.reduce((acc, c) => acc + (c.monto_total ?? 0), 0) ?? 0;
  const mes = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const stats = [
    { label: "Socios activos",  value: alumnosRes.count ?? 0,                         icon: Users,          href: "/dashboard/alumnos?activo=true",      color: T.accent,   glow: T.accentBg },
    { label: "Deudores",        value: cuotasVencidasRes.count ?? 0,                   icon: AlertTriangle,  href: "/dashboard/cuotas?estado=vencida",    color: T.danger,   glow: `${T.danger}15` },
    { label: "Pendientes",      value: pendientesRes.count ?? 0,                       icon: Clock,          href: "/dashboard/cuotas?estado=pendiente",  color: T.warning,  glow: `${T.warning}15` },
    { label: "Caja del mes",    value: `$${totalCobros.toLocaleString("es-AR")}`,      icon: TrendingUp,     href: "/dashboard/pagos",                    color: T.lime,     glow: `${T.lime}15` },
  ];

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-10" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: `${T.accent}10` }} />
        <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
          ▶ CLUBIO / GESTIÓN
        </p>
        <h1 className="text-5xl leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          ¡HOLA,
        </h1>
        <h1 className="text-5xl leading-none mb-4" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.accent }}>
          {ctx.gymNombre.toUpperCase()}
        </h1>
        <p className="text-sm uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
          Centro de gestión Clubio — {mes}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative rounded-xl p-5 transition-all duration-200 overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <stat.icon className="absolute -bottom-2 -right-2 w-20 h-20 opacity-[0.04]" style={{ color: stat.color }} />
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: stat.glow, border: `1px solid ${stat.color}25` }}>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-3xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
              {stat.value}
            </p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
              {stat.label}
            </p>
            <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${stat.color}60, transparent)` }} />
          </Link>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/alumnos/nuevo"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-90"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}
        >
          + Nuevo alumno
        </Link>
        <Link href="/dashboard/cuotas"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-80"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: "transparent", color: T.accent, border: `1px solid ${T.accentBorder}` }}
        >
          Ver cuotas
        </Link>
      </div>
    </div>
  );
}
