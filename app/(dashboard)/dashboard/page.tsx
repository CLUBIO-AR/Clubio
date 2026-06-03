import { createClient } from "@/lib/supabase/server";
import { Users, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  if (!gymUsuario) return null;

  const gymId = gymUsuario.gym_id;
  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [alumnosRes, cuotasVencidasRes, cobrosRes, pendientesRes] = await Promise.all([
    supabase
      .from("alumnos")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("activo", true)
      .is("deleted_at", null),
    supabase
      .from("cuotas")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("estado", "vencida"),
    supabase
      .from("cuotas")
      .select("monto_total")
      .eq("gym_id", gymId)
      .eq("estado", "pagada")
      .gte("fecha_pago", mesInicio),
    supabase
      .from("cuotas")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", gymId)
      .eq("estado", "pendiente"),
  ]);

  const totalCobros =
    cobrosRes.data?.reduce((acc, c) => acc + (c.monto_total ?? 0), 0) ?? 0;

  const stats = [
    {
      label: "Alumnos activos",
      value: alumnosRes.count ?? 0,
      icon: Users,
      href: "/dashboard/alumnos?activo=true",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Cuotas vencidas",
      value: cuotasVencidasRes.count ?? 0,
      icon: AlertTriangle,
      href: "/dashboard/cuotas?estado=vencida",
      color: "text-red-600",
      bg: "bg-red-50",
      alert: (cuotasVencidasRes.count ?? 0) > 0,
    },
    {
      label: "Cobrado este mes",
      value: `$${totalCobros.toLocaleString("es-AR")}`,
      icon: TrendingUp,
      href: "/dashboard/pagos",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Cuotas pendientes",
      value: pendientesRes.count ?? 0,
      icon: AlertTriangle,
      href: "/dashboard/cuotas?estado=pendiente",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Resumen</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {now.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`group bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-all duration-200 ${
              stat.alert ? "border-red-200" : "border-zinc-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className={`text-2xl font-bold ${stat.alert ? "text-red-600" : "text-zinc-900"}`}>
              {stat.value}
            </p>
            <p className="text-sm text-zinc-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/alumnos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Nuevo alumno
          </Link>
          <Link
            href="/dashboard/cuotas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium rounded-lg border border-zinc-200 transition-colors"
          >
            Ver cuotas del mes
          </Link>
        </div>
      </div>
    </div>
  );
}
