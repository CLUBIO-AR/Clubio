import { createClient } from "./server";
import { createAdminClient } from "./admin";

// Usado en API routes: obtiene gymId vía getUser() (valida con Supabase server).
export async function getApiGymId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  return data?.gym_id ?? null;
}
