import { createAdminClient } from "@/lib/supabase/admin";
import { SuperAdminsClient } from "@/components/admin/SuperAdminsClient";

export default async function SuperAdminsPage() {
  const admin = createAdminClient();
  const { data: admins } = await admin.from("admin_users").select("id, email, nombre, activo, created_at").order("created_at");

  return <SuperAdminsClient admins={admins ?? []} />;
}
