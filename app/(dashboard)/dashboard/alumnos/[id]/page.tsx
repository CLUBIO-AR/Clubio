import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAlumnoById } from "@/lib/alumnos";
import { AlumnoForm } from "@/components/alumnos/alumno-form";
import { ChevronLeft, Calendar, Phone, Mail, FileText } from "lucide-react";
import Link from "next/link";

const NEON = "oklch(0.88 0.22 158)";
const CARD = "oklch(0.13 0.018 245)";
const BORDER = "oklch(0.2 0.018 245)";

const ESTADO_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente: { bg: "oklch(0.85 0.18 85 / 0.15)", color: "oklch(0.85 0.18 85)" },
  vencida:   { bg: "oklch(0.7 0.22 27 / 0.15)",  color: "oklch(0.75 0.2 27)"   },
  pagada:    { bg: `${NEON}15`,                   color: NEON                    },
  condonada: { bg: "oklch(0.3 0.015 245 / 0.3)",  color: "oklch(0.45 0.015 245)" },
  pagada_parcial: { bg: "oklch(0.65 0.18 220 / 0.15)", color: "oklch(0.7 0.18 220)" },
};

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default async function AlumnoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: gymUsuario } = await supabase.from("gym_usuarios").select("gym_id").eq("id", user.id).single();
  if (!gymUsuario) return null;

  const { data: alumno } = await getAlumnoById(supabase, gymUsuario.gym_id, id);
  if (!alumno) notFound();

  const [sucursalesRes, cuotasRes] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").eq("gym_id", gymUsuario.gym_id).eq("activa", true).order("nombre"),
    supabase.from("cuotas").select("id, mes, anio, monto_total, estado, fecha_vencimiento").eq("alumno_id", id).order("anio", { ascending: false }).order("mes", { ascending: false }).limit(6),
  ]);

  const INFO_ITEMS = [
    alumno.email && { icon: Mail, label: "Email", value: alumno.email },
    alumno.telefono && { icon: Phone, label: "Teléfono", value: alumno.telefono },
    { icon: Calendar, label: "Alta", value: new Date(alumno.fecha_alta).toLocaleDateString("es-AR") },
    alumno.notas && { icon: FileText, label: "Notas", value: alumno.notas },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/alumnos" className="transition-colors p-1.5 rounded-lg" style={{ color: "oklch(0.4 0.015 245)" }}>
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl text-white leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900 }}>
              {alumno.apellido?.toUpperCase()}, {alumno.nombre?.toUpperCase()}
            </h1>
            <span
              className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                background: alumno.activo ? `${NEON}15` : "oklch(0.25 0.015 245)",
                color: alumno.activo ? NEON : "oklch(0.45 0.015 245)",
                border: `1px solid ${alumno.activo ? `${NEON}30` : "oklch(0.22 0.015 245)"}`,
              }}
            >
              {alumno.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-sm font-mono mt-1" style={{ color: "oklch(0.5 0.015 245)" }}>DNI {alumno.dni}</p>
        </div>
      </div>

      {/* Info cards */}
      {INFO_ITEMS.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {INFO_ITEMS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${NEON}15`, border: `1px solid ${NEON}25` }}>
                <Icon className="w-4 h-4" style={{ color: NEON }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider" style={{ color: "oklch(0.45 0.015 245)", fontFamily: "var(--font-barlow-condensed)" }}>{label}</p>
                <p className="text-sm font-medium text-white truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Últimas cuotas */}
      {cuotasRes.data && cuotasRes.data.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NEON, fontFamily: "var(--font-barlow-condensed)" }}>
              — Últimas cuotas
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {cuotasRes.data.map((c) => {
              const style = ESTADO_STYLES[c.estado] ?? ESTADO_STYLES.pendiente;
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: "oklch(0.1 0.018 245)", border: `1px solid ${BORDER}` }}>
                      <span className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{MESES[c.mes]}</span>
                      <span className="text-xs" style={{ color: "oklch(0.45 0.015 245)" }}>{c.anio}</span>
                    </div>
                    <p className="font-bold text-white font-mono">${c.monto_total?.toLocaleString("es-AR")}</p>
                  </div>
                  <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)", background: style.bg, color: style.color, border: `1px solid ${style.color}30` }}>
                    {c.estado.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t" style={{ borderColor: BORDER }}>
            <Link href={`/dashboard/cuotas?alumno=${id}`} className="text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ color: NEON, fontFamily: "var(--font-barlow-condensed)" }}>
              Ver todas →
            </Link>
          </div>
        </div>
      )}

      {/* Editar */}
      <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: NEON, fontFamily: "var(--font-barlow-condensed)" }}>
            — Editar datos
          </h2>
        </div>
        <div className="p-5">
          <AlumnoForm sucursales={sucursalesRes.data ?? []} mode="edit" alumno={alumno} />
        </div>
      </div>
    </div>
  );
}
