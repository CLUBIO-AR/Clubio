import { createClient } from "@/lib/supabase/server";
import { requireGymContext } from "@/lib/supabase/auth";
import { Users, AlertTriangle, TrendingUp, Clock, Zap, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/theme";

export default async function DashboardPage() {
  const ctx = await requireGymContext();
  const gymId = ctx.gymId;
  const supabase = await createClient();
  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const mesActual  = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  const [alumnosRes, cuotasVencidasRes, cobrosRes, pendientesRes, configRes, actividadesRes, cobrosAutoRes] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("activo", true).is("deleted_at", null),
    supabase.from("cuotas").select("id", { count: "exact", head: true })
      .eq("gym_id", gymId).eq("estado", "vencida").eq("mes", mesActual).eq("anio", anioActual),
    supabase.from("pagos").select("monto").eq("gym_id", gymId).gte("created_at", mesInicio),
    supabase.from("cuotas").select("id", { count: "exact", head: true })
      .eq("gym_id", gymId).eq("estado", "pendiente").eq("mes", mesActual).eq("anio", anioActual),
    supabase.from("gym_config").select("mp_access_token").eq("gym_id", gymId).single(),
    supabase.from("actividades").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("activa", true).is("deleted_at", null),
    supabase.from("pagos").select("monto", { count: "exact" }).eq("gym_id", gymId).eq("metodo", "mercadopago").gte("created_at", mesInicio),
  ]);

  const totalCobros = cobrosRes.data?.reduce((acc, p) => acc + p.monto, 0) ?? 0;
  const mes = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const mpConfigurado   = !!(configRes.data?.mp_access_token);
  const tieneActividades = (actividadesRes.count ?? 0) > 0;
  const tieneAlumnos    = (alumnosRes.count ?? 0) > 0;
  const setupCompleto   = mpConfigurado && tieneActividades && tieneAlumnos;

  const cobrosAutoCount = cobrosAutoRes.count ?? 0;
  const cobrosAutoMonto = cobrosAutoRes.data?.reduce((acc, p) => acc + p.monto, 0) ?? 0;

  const stats = [
    { label: "Socios activos",  value: alumnosRes.count ?? 0,                         icon: Users,          href: "/dashboard/alumnos?activo=true",      color: T.accent,   glow: T.accentBg },
    { label: "Deudores",        value: cuotasVencidasRes.count ?? 0,                   icon: AlertTriangle,  href: "/dashboard/cuotas?estado=vencida",    color: T.danger,   glow: `${T.danger}15` },
    { label: "Pendientes",      value: pendientesRes.count ?? 0,                       icon: Clock,          href: "/dashboard/cuotas?estado=pendiente",  color: T.warning,  glow: `${T.warning}15` },
    { label: "Caja del mes",    value: `$${totalCobros.toLocaleString("es-AR")}`,      icon: TrendingUp,     href: "/dashboard/pagos",                    color: T.lime,     glow: `${T.lime}15` },
  ];

  const pasos = [
    { label: "Conectá MercadoPago",  done: mpConfigurado,    href: "/dashboard/configuracion#mercadopago" },
    { label: "Creá una actividad",   done: tieneActividades, href: "/dashboard/configuracion#actividades" },
    { label: "Cargá tu primer alumno", done: tieneAlumnos,   href: "/dashboard/alumnos/nuevo" },
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

      {/* Checklist de activación — solo si el setup está incompleto */}
      {!setupCompleto && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: `${T.accent}08`, border: `1px solid ${T.accentBorder}` }}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: T.accent }} />
            <p className="text-sm font-bold uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.accent }}>
              Completá estos pasos para empezar a cobrar
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {pasos.map((paso, i) => (
              <Link
                key={i}
                href={paso.done ? "#" : paso.href}
                className="flex items-center gap-3 rounded-lg px-4 py-3 transition-opacity"
                style={{
                  background: paso.done ? "transparent" : T.card,
                  border: `1px solid ${paso.done ? "transparent" : T.border}`,
                  opacity: paso.done ? 0.5 : 1,
                  pointerEvents: paso.done ? "none" : "auto",
                }}
              >
                {paso.done
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: T.accent }} />
                  : <Circle className="w-4 h-4 shrink-0" style={{ color: T.textDim }} />
                }
                <span className="text-sm font-semibold flex-1" style={{ color: paso.done ? T.textDim : T.text }}>
                  {i + 1}. {paso.label}
                </span>
                {!paso.done && <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: T.textDim }} />}
              </Link>
            ))}
          </div>
        </div>
      )}

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

      {/* Cobros automáticos del mes — el ROI de CLUBIO */}
      {cobrosAutoCount > 0 && (
        <Link
          href="/dashboard/pagos"
          className="flex items-center gap-5 rounded-xl px-6 py-5 transition-all hover:opacity-90"
          style={{ background: `${T.accent}0a`, border: `1px solid ${T.accentBorder}` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
            <Zap className="w-5 h-5" style={{ color: T.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
              Cobros automáticos este mes
            </p>
            <p className="text-2xl font-black leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
              {cobrosAutoCount} <span className="text-base font-normal" style={{ color: T.textDim }}>cobro{cobrosAutoCount !== 1 ? "s" : ""}</span>
              <span className="ml-3 text-xl" style={{ color: T.accent }}>${cobrosAutoMonto.toLocaleString("es-AR")}</span>
            </p>
          </div>
          <p className="text-xs shrink-0" style={{ color: T.textDim }}>cobrados sin intervención →</p>
        </Link>
      )}

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
