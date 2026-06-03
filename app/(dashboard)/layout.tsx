import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id, nombre, rol")
    .eq("id", user.id)
    .single();

  if (!gymUsuario) redirect("/login");

  const { data: gym } = await supabase
    .from("gyms")
    .select("nombre, slug")
    .eq("id", gymUsuario.gym_id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav
        gymNombre={gym?.nombre ?? "GYM"}
        usuarioNombre={gymUsuario.nombre}
        usuarioRol={gymUsuario.rol}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
