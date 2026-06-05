import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlumnoById } from "@/lib/alumnos";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { ChevronLeft, Calendar, Phone, Mail, FileText } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/theme";

const ESTADO_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente:    { bg: `${T.warning}15`, color: T.warning },
  vencida:      { bg: `${T.danger}15`,  color: T.danger  },
  pagada:       { bg: T.accentBg,       color: T.accent  },
  condonada:    { bg: `${T.textDim}15`, color: T.textDim },
  pagada_parcial: { bg: `${T.blue}15`, color: T.blue     },
};
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function AlumnoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await (await import("@/lib/supabase/auth")).getGymContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const { data: alumno } = await getAlumnoById(supabase, ctx.gymId, id);
  if (!alumno) notFound();

  const [sucursalesRes, cuotasRes] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").eq("gym_id", ctx.gymId).eq("activa", true).order("nombre"),
    supabase.from("cuotas").select("id, mes, anio, monto_total, estado, fecha_vencimiento").eq("alumno_id", id).order("anio", { ascending: false }).order("mes", { ascending: false }).limit(6),
  ]);

  const INFO_ITEMS = [
    alumno.email    && { icon: Mail,     label: "Email",    value: alumno.email },
    alumno.telefono && { icon: Phone,    label: "Teléfono", value: alumno.telefono },
    { icon: Calendar, label: "Alta", value: new Date(alumno.fecha_alta).toLocaleDateString("es-AR") },
    alumno.notas    && { icon: FileText, label: "Notas",    value: alumno.notas },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/alumnos" className="p-1.5 rounded-lg transition-colors hover:opacity-75" style={{ color: T.textDim }}>
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
              {alumno.apellido?.toUpperCase()}, {alumno.nombre?.toUpperCase()}
            </h1>
            <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: alumno.activo ? T.accentBg : `${T.textDim}15`, color: alumno.activo ? T.accent : T.textDim, border: `1px solid ${alumno.activo ? T.accentBorder : T.borderSub}` }}>
              {alumno.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-sm font-mono mt-1" style={{ color: T.textDim }}>DNI {alumno.dni}</p>
        </div>
      </div>

      {/* Info cards */}
      {INFO_ITEMS.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {INFO_ITEMS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
                <Icon className="w-4 h-4" style={{ color: T.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{label}</p>
                <p className="text-sm font-medium truncate" style={{ color: T.text }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cuotas */}
      {cuotasRes.data && cuotasRes.data.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
            <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>— Últimas cuotas</h2>
          </div>
          <div>
            {cuotasRes.data.map((c) => {
              const s = ESTADO_STYLES[c.estado] ?? ESTADO_STYLES.pendiente;
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: T.borderSub }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                      <span className="text-xs font-bold" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>{MESES[c.mes]}</span>
                      <span className="text-xs" style={{ color: T.textDim }}>{c.anio}</span>
                    </div>
                    <p className="font-bold font-mono" style={{ color: T.text }}>${c.monto_total?.toLocaleString("es-AR")}</p>
                  </div>
                  <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)", background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                    {c.estado.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t" style={{ borderColor: T.borderSub }}>
            <Link href={`/dashboard/cuotas?alumno=${id}`} className="text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
              Ver todas →
            </Link>
          </div>
        </div>
      )}

      {/* Editar */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
          <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>— Editar datos</h2>
        </div>
        <div className="p-5">
          <AlumnoForm sucursales={sucursalesRes.data ?? []} mode="edit" alumno={alumno} />
        </div>
      </div>
    </div>
  );
}
