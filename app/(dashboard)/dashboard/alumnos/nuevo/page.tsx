import { NuevoAlumnoFlow } from "@/components/alumnos/nuevo-alumno-flow";
import { requireGymContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NuevoAlumnoPage({
  searchParams,
}: {
  // ?telefono=… cuando se da de alta desde una consulta de WhatsApp.
  searchParams: Promise<{ telefono?: string; nombre?: string }>;
}) {
  const { telefono, nombre } = await searchParams;
  // Nombre del perfil de WhatsApp: primera palabra → nombre, el resto → apellido.
  // Se limpia de emojis y símbolos; el gym lo revisa antes de guardar.
  const nombreLimpio = (nombre ?? "").replace(/[^\p{L}\p{M}\s'.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 80);
  const [nombreInicial, ...resto] = nombreLimpio ? nombreLimpio.split(" ") : [];
  const apellidoInicial = resto.join(" ");
  const telefonoInicial = telefono && /^\+?\d{8,15}$/.test(telefono)
    ? (telefono.startsWith("+") ? telefono : `+${telefono}`)
    : undefined;
  const ctx = await requireGymContext();
  const supabase = await createClient();

  const [sucursalesRes, actividadesRes] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").eq("gym_id", ctx.gymId).eq("activa", true).order("nombre"),
    supabase.from("actividades").select("id, nombre, monto_base, color").eq("gym_id", ctx.gymId).eq("activa", true).is("deleted_at", null).order("nombre"),
  ]);

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

      <NuevoAlumnoFlow
        sucursales={sucursalesRes.data ?? []}
        actividadesDisponibles={actividadesRes.data ?? []}
        telefonoInicial={telefonoInicial}
        nombreInicial={nombreInicial}
        apellidoInicial={apellidoInicial || undefined}
      />
    </div>
  );
}
