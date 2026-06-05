import { createClient } from "@/lib/supabase/server";
import { getGymContext } from "@/lib/supabase/auth";
import { getAlumnosConCuotaMes } from "@/lib/alumnos";
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

  const now = new Date();
  const mes = now.getMonth() + 1;
  const anio = now.getFullYear();

  const { data: alumnos = [] } = await getAlumnosConCuotaMes(
    supabase, ctx.gymId, mes, anio,
    { search: sp.search, activo: activoFilter }
  );

  return (
    <AlumnosClient
      alumnos={alumnos ?? []}
      searchDefault={sp.search ?? ""}
      activoDefault={sp.activo ?? "todos"}
      mesActual={mes}
      anioActual={anio}
    />
  );
}
