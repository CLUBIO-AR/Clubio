import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlumnoById } from "@/lib/alumnos";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, Phone, Mail, FileText } from "lucide-react";
import Link from "next/link";

export default async function AlumnoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase
    .from("gym_usuarios")
    .select("gym_id")
    .eq("id", user.id)
    .single();
  if (!gymUsuario) return null;

  const { data: alumno } = await getAlumnoById(supabase, gymUsuario.gym_id, id);
  if (!alumno) notFound();

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("gym_id", gymUsuario.gym_id)
    .eq("activa", true)
    .order("nombre");

  // Últimas cuotas
  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, mes, anio, monto_total, estado, fecha_vencimiento, fecha_pago")
    .eq("alumno_id", id)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(6);

  const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const estadoStyles: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700 border-amber-200",
    vencida: "bg-red-100 text-red-700 border-red-200",
    pagada: "bg-emerald-100 text-emerald-700 border-emerald-200",
    condonada: "bg-zinc-100 text-zinc-500 border-zinc-200",
    pagada_parcial: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/alumnos" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">
              {alumno.apellido}, {alumno.nombre}
            </h1>
            <Badge
              className={
                alumno.activo
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }
            >
              {alumno.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-zinc-500 text-sm mt-0.5 font-mono">DNI {alumno.dni}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        {alumno.email && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">Email</p>
              <p className="text-sm font-medium text-zinc-800 truncate">{alumno.email}</p>
            </div>
          </div>
        )}
        {alumno.telefono && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Teléfono</p>
              <p className="text-sm font-medium text-zinc-800">{alumno.telefono}</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Alta</p>
            <p className="text-sm font-medium text-zinc-800">
              {new Date(alumno.fecha_alta).toLocaleDateString("es-AR")}
            </p>
          </div>
        </div>
        {alumno.notas && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-400">Notas</p>
              <p className="text-sm font-medium text-zinc-800 truncate">{alumno.notas}</p>
            </div>
          </div>
        )}
      </div>

      {/* Últimas cuotas */}
      {cuotas && cuotas.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-800">Últimas cuotas</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {cuotas.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-zinc-700">{MESES[c.mes]}</span>
                    <span className="text-xs text-zinc-400">{c.anio}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      ${c.monto_total?.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Vence {new Date(c.fecha_vencimiento).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
                <Badge className={estadoStyles[c.estado] ?? ""}>
                  {c.estado.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-zinc-100">
            <Link
              href={`/dashboard/cuotas?alumno=${id}`}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Ver todas las cuotas →
            </Link>
          </div>
        </div>
      )}

      {/* Editar datos */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-800">Editar datos</h2>
        </div>
        <div className="p-5">
          <AlumnoForm
            sucursales={sucursales ?? []}
            mode="edit"
            alumno={alumno}
          />
        </div>
      </div>
    </div>
  );
}
