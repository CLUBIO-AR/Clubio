import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

// unstable_cache persists across navigations (5-minute TTL).
// Runs outside request context so we use the admin client.
const _getCachedAdminCtx = (userId: string) =>
  unstable_cache(
    async (): Promise<{ email: string; nombre: string } | null> => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("admin_users")
        .select("email, nombre")
        .eq("id", userId)
        .eq("activo", true)
        .single();

      return data ?? null;
    },
    ["admin-ctx", userId],
    { revalidate: 300, tags: [`admin-ctx-${userId}`] }
  )();

// cache() deduplicates within the same render tree.
// _getCachedAdminCtx deduplicates across navigations.
export const getAdminContext = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const data = await _getCachedAdminCtx(user.id);
  if (!data) return null;

  return {
    user,
    adminId: user.id,
    email: data.email,
    nombre: data.nombre,
  };
});

export async function requireSuperadmin() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function logAdminAction(
  adminId: string,
  accion: string,
  gymId?: string,
  detalle?: Record<string, unknown>
) {
  const admin = createAdminClient();
  await admin.from("admin_logs").insert({
    admin_id: adminId,
    accion,
    gym_id: gymId ?? null,
    detalle: (detalle as Json) ?? null,
  });
}
