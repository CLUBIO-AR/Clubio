import { requireSuperadmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSuperadmin();

  return (
    <AdminShell nombre={ctx.nombre} email={ctx.email}>
      {children}
    </AdminShell>
  );
}
