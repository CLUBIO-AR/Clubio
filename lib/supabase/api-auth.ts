import { createClient } from "./server";
import { createAdminClient } from "./admin";

// Usado en API routes: obtiene gymId vía getUser() (valida con Supabase server).
export async function getApiGymId(): Promise<string | null> {
  const ctx = await getApiGymContext();
  return ctx?.gymId ?? null;
}

// Versión completa con rol — para endpoints que necesitan autorización.
// Incluye JOIN con gyms para verificar que el gym no esté suspendido.
export async function getApiGymContext(): Promise<{ gymId: string; rol: string; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("gym_usuarios")
    .select("gym_id, rol, gyms!inner(activo)")
    .eq("id", user.id)
    .single();
  if (!data) return null;

  const gym = Array.isArray(data.gyms) ? data.gyms[0] : data.gyms;
  if (!gym?.activo) return null;

  return { gymId: data.gym_id, rol: data.rol, userId: user.id };
}
