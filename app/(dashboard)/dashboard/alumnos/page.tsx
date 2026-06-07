import { createClient } from "@/lib/supabase/server";
import { getGymContext } from "@/lib/supabase/auth";
import { getAlumnosConCuotaMes } from "@/lib/alumnos";
import { AlumnosClient } from "@/components/alumnos/alumnos-client";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; activo?: string; actividad?: string }>;
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

  const [{ data: alumnos = [] }, { data: actividades }] = await Promise.all([
    getAlumnosConCuotaMes(
      supabase, ctx.gymId, mes, anio,
      { search: sp.search, activo: activoFilter, actividadId: sp.actividad }
    ),
    supabase.from("actividades").select("id, nombre, color").eq("gym_id", ctx.gymId).is("deleted_at", null).order("nombre"),
  ]);

  return (
    <AlumnosClient
      alumnos={alumnos ?? []}
      searchDefault={sp.search ?? ""}
      activoDefault={sp.activo ?? "todos"}
      actividadDefault={sp.actividad ?? ""}
      actividades={actividades ?? []}
      mesActual={mes}
      anioActual={anio}
    />
  );
}
