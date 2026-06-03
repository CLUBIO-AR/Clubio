import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();

  if (!gymUsuario) return null;

  const gymId = gymUsuario.gym_id;

  const [alumnosRes, cuotasVencidasRes, cobrosRes] = await Promise.all([
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
      .gte(
        "fecha_pago",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      ),
  ]);

  const totalCobros =
    cobrosRes.data?.reduce((acc, c) => acc + (c.monto_total ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumen</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Alumnos activos"
          value={alumnosRes.count ?? 0}
          href="/dashboard/alumnos"
        />
        <StatCard
          label="Cuotas vencidas"
          value={cuotasVencidasRes.count ?? 0}
          href="/dashboard/cuotas"
          alert={!!cuotasVencidasRes.count}
        />
        <StatCard
          label="Cobrado este mes"
          value={`$${totalCobros.toLocaleString("es-AR")}`}
          href="/dashboard/pagos"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  alert = false,
}: {
  label: string;
  value: string | number;
  href: string;
  alert?: boolean;
}) {
  return (
    <a
      href={href}
      className={`block p-6 bg-white rounded-xl border transition hover:shadow-md ${
        alert ? "border-red-200" : "border-gray-200"
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={`text-3xl font-bold mt-1 ${
          alert ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </a>
  );
}
