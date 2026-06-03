import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NuevoAlumnoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  if (!gymUsuario) return null;

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("gym_id", gymUsuario.gym_id)
    .eq("activa", true)
    .order("nombre");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/alumnos"
          className="text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Nuevo alumno</h1>
          <p className="text-zinc-500 text-sm">Completá los datos del nuevo alumno</p>
        </div>
      </div>

      <AlumnoForm
        sucursales={sucursales ?? []}
        mode="create"
      />
    </div>
  );
}
