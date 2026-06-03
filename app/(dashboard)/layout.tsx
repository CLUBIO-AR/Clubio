import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id, nombre, rol")
    .eq("id", user.id)
    .single();

  if (!gymUsuario) {
    redirect("/login");
  }

  const { data: gym } = await supabase
    .from("gyms")
    .select("nombre, slug")
    .eq("id", gymUsuario.gym_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg">{gym?.nombre ?? "GYM"}</span>
          <div className="flex items-center gap-4 text-sm">
            <a href="/dashboard" className="text-gray-600 hover:text-black">Inicio</a>
            <a href="/dashboard/alumnos" className="text-gray-600 hover:text-black">Alumnos</a>
            <a href="/dashboard/cuotas" className="text-gray-600 hover:text-black">Cuotas</a>
            <a href="/dashboard/pagos" className="text-gray-600 hover:text-black">Pagos</a>
            <a href="/dashboard/configuracion" className="text-gray-600 hover:text-black">Configuración</a>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{gymUsuario.nombre}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-gray-500 hover:text-black">
              Salir
            </button>
          </form>
        </div>
      </nav>
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}
