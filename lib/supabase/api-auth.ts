import { createClient } from "./server";
import { createAdminClient } from "./admin";

// Usado en API routes: obtiene gymId sin getUser() (lento).
// Usa getSession() + admin client para gym_usuarios.
// El proxy ya verificó la sesión antes de llegar aquí.
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
