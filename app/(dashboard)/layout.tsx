import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireGymContext();

  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gyms")
    .select("nombre, slug")
    .eq("id", ctx.gymId)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav
        gymNombre={gym?.nombre ?? "GYM"}
        usuarioNombre={ctx.nombre}
        usuarioRol={ctx.rol}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
