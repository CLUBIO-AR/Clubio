import { createClient } from "@/lib/supabase/server";
import { getGymContext } from "@/lib/supabase/auth";
import { getAlumnos } from "@/lib/alumnos";
import { AlumnosClient } from "@/components/alumnos/alumnos-client";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; activo?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getGymContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const activoFilter =
    sp.activo === "true" ? true : sp.activo === "false" ? false : undefined;

  const { data: alumnos = [] } = await getAlumnos(supabase, ctx.gymId, {
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
