import { cache } from "react";
import { createClient } from "./server";
import { redirect } from "next/navigation";

// cache() deduplica llamadas idénticas dentro del mismo render tree.
// getUser() y getGymContext() se ejecutan UNA sola vez por request,
// sin importar cuántos componentes las llamen.

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getGymContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("gym_usuarios")
    .select("gym_id, nombre, rol")
    .eq("id", user.id)
    .single();

  return data ? { user, gymId: data.gym_id, nombre: data.nombre, rol: data.rol } : null;
});

export async function requireGymContext() {
  const ctx = await getGymContext();
  if (!ctx) redirect("/login");
  return ctx;
}
