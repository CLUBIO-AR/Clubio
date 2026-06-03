import { createClient } from "@/lib/supabase/server";
import { Users, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase.from("gym_usuarios").select("gym_id").eq("id", user.id).single();
  if (!gymUsuario) return null;

  const gymId = gymUsuario.gym_id;
  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: gym } = await supabase.from("gyms").select("nombre").eq("id", gymId).single();

  const [alumnosRes, cuotasVencidasRes, cobrosRes, pendientesRes] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("activo", true).is("deleted_at", null),
    supabase.from("cuotas").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("estado", "vencida"),
    supabase.from("cuotas").select("monto_total").eq("gym_id", gymId).eq("estado", "pagada").gte("fecha_pago", mesInicio),
    supabase.from("cuotas").select("id", { count: "exact", head: true }).eq("gym_id", gymId).eq("estado", "pendiente"),
  ]);

  const totalCobros = cobrosRes.data?.reduce((acc, c) => acc + (c.monto_total ?? 0), 0) ?? 0;

  const mes = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const stats = [
    {
      label: "Socios activos",
      value: alumnosRes.count ?? 0,
      icon: Users,
      href: "/dashboard/alumnos?activo=true",
      neon: "oklch(0.88 0.22 158)",      // verde agua
      glow: "oklch(0.88 0.22 158 / 0.15)",
    },
    {
      label: "Deudores",
      value: cuotasVencidasRes.count ?? 0,
      icon: AlertTriangle,
      href: "/dashboard/cuotas?estado=vencida",
      neon: "oklch(0.7 0.22 27)",         // rojo
      glow: "oklch(0.7 0.22 27 / 0.15)",
    },
    {
      label: "Pendientes",
      value: pendientesRes.count ?? 0,
      icon: Clock,
      href: "/dashboard/cuotas?estado=pendiente",
      neon: "oklch(0.85 0.18 85)",        // amarillo
      glow: "oklch(0.85 0.18 85 / 0.15)",
    },
    {
      label: "Caja del mes",
      value: `$${totalCobros.toLocaleString("es-AR")}`,
      icon: TrendingUp,
      href: "/dashboard/pagos",
      neon: "oklch(0.82 0.26 135)",       // lime neon
      glow: "oklch(0.82 0.26 135 / 0.15)",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div
        className="relative rounded-2xl overflow-hidden px-8 py-10"
        style={{ background: "oklch(0.1 0.018 245)", border: "1px solid oklch(0.18 0.018 245)" }}
      >
        {/* subtle neon glow top-right */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "oklch(0.88 0.22 158)" }}
        />
        {/* Clubio badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "oklch(0.88 0.22 158)", fontFamily: "var(--font-barlow-condensed)" }}
          >
            ▶ CLUBIO / GESTIÓN
          </span>
        </div>
        <h1
          className="text-5xl leading-none text-white mb-1"
          style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900 }}
        >
          ¡HOLA,
        </h1>
        <h1
          className="text-5xl leading-none mb-4"
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            fontWeight: 900,
            color: "oklch(0.88 0.22 158)",
            textShadow: "0 0 30px oklch(0.88 0.22 158 / 0.5)",
          }}
        >
          {gym?.nombre?.toUpperCase() ?? "GIMNASIO"}
        </h1>
        <p
          className="text-sm uppercase tracking-widest"
          style={{ color: "oklch(0.5 0.015 245)", fontFamily: "var(--font-barlow-condensed)" }}
        >
          Centro de gestión Clubio — {mes}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group relative rounded-xl p-5 transition-all duration-200 overflow-hidden"
            style={{
              background: "oklch(0.1 0.018 245)",
              border: `1px solid ${stat.neon}40`,
              boxShadow: `0 0 0 1px ${stat.neon}20`,
            }}
          >
            {/* Background icon watermark */}
            <stat.icon
              className="absolute -bottom-2 -right-2 w-20 h-20 opacity-5"
              style={{ color: stat.neon }}
            />
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
              style={{ background: stat.glow, border: `1px solid ${stat.neon}30` }}
            >
              <stat.icon className="w-4 h-4" style={{ color: stat.neon }} />
            </div>
            <p
              className="text-3xl font-black text-white leading-none mb-1"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              {stat.value}
            </p>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: "oklch(0.5 0.015 245)", fontFamily: "var(--font-barlow-condensed)" }}
            >
              {stat.label}
            </p>
            {/* neon bottom border */}
            <div
              className="absolute bottom-0 left-0 h-0.5 w-full"
              style={{ background: `linear-gradient(90deg, ${stat.neon}, transparent)` }}
            />
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/alumnos/nuevo"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all"
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            background: "oklch(0.88 0.22 158)",
            color: "oklch(0.07 0.018 245)",
            boxShadow: "0 0 20px oklch(0.88 0.22 158 / 0.3)",
          }}
        >
          + Nuevo alumno
        </Link>
        <Link
          href="/dashboard/cuotas"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-sm transition-all"
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            background: "oklch(0.1 0.018 245)",
            color: "oklch(0.88 0.22 158)",
            border: "1px solid oklch(0.88 0.22 158 / 0.3)",
          }}
        >
          Ver cuotas
        </Link>
      </div>
    </div>
  );
}
