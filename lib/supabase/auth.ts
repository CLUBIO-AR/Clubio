import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "./server";
import { createAdminClient } from "./admin";
import { redirect } from "next/navigation";

// getSession() reads from cookie — no network call.
// The proxy already called getUser() to verify the session before reaching here.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
});

// unstable_cache persists across navigations (5-minute TTL).
// Runs outside request context so we use the admin client.
const _getCachedGymCtx = (userId: string) =>
  unstable_cache(
    async (): Promise<{ gym_id: string; nombre: string; rol: string; gymNombre: string } | null> => {
      const admin = createAdminClient();
      const { data: gu } = await admin
        .from("gym_usuarios")
        .select("gym_id, nombre, rol")
        .eq("id", userId)
        .single();
      if (!gu) return null;

      const { data: gym } = await admin
        .from("gyms")
        .select("nombre")
        .eq("id", gu.gym_id)
        .single();

      return {
        gym_id: gu.gym_id,
        nombre: gu.nombre,
        rol: gu.rol,
        gymNombre: gym?.nombre ?? "GYM",
      };
    },
    ["gym-ctx", userId],
    { revalidate: 300, tags: [`gym-ctx-${userId}`] }
  )();

// cache() deduplicates within the same render tree.
// _getCachedGymCtx deduplicates across navigations.
export const getGymContext = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const data = await _getCachedGymCtx(user.id);
  if (!data) return null;

  return {
    user,
    gymId: data.gym_id,
    nombre: data.nombre,
    rol: data.rol,
    gymNombre: data.gymNombre,
  };
});

export async function requireGymContext() {
  const ctx = await getGymContext();
  if (!ctx) redirect("/login");
  return ctx;
}
