import { createClient } from "@/lib/supabase/server";
import { getAlumnos } from "@/lib/alumnos";
import { AlumnosClient } from "@/components/alumnos/alumnos-client";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; activo?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  if (!gymUsuario) return null;

  const activoFilter =
    sp.activo === "true" ? true : sp.activo === "false" ? false : undefined;

  const { data: alumnos = [] } = await getAlumnos(supabase, gymUsuario.gym_id, {
    search: sp.search,
    activo: activoFilter,
  });

  return (
    <AlumnosClient
      alumnos={alumnos ?? []}
      searchDefault={sp.search ?? ""}
      activoDefault={sp.activo ?? "todos"}
    />
  );
}
