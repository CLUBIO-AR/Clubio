import { requireGymContext } from "@/lib/supabase/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireGymContext();

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav
        gymNombre={ctx.gymNombre}
        usuarioNombre={ctx.nombre}
        usuarioRol={ctx.rol}
      />
      <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
