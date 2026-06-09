import { createAdminClient } from "@/lib/supabase/admin";
import { NuevoGymWizard } from "@/components/admin/NuevoGymWizard";

export default async function NuevoGymPage({
  searchParams,
}: {
  searchParams: Promise<{ lead_id?: string }>;
}) {
  const sp = await searchParams;
  let lead: { id: string; nombre: string; email: string; telefono: string | null; gym_nombre: string | null } | null = null;

  if (sp.lead_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("leads")
      .select("id, nombre, email, telefono, gym_nombre")
      .eq("id", sp.lead_id)
      .maybeSingle();
    lead = data ?? null;
  }

  return <NuevoGymWizard lead={lead} />;
}
