"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlumnoForm } from "./alumno-form";
import { AlumnoActividades } from "./alumno-actividades";
import { Check, ArrowRight } from "lucide-react";
import { T } from "@/lib/theme";

type Sucursal = { id: string; nombre: string };
type Actividad = { id: string; nombre: string; monto_base: number; color: string };

interface Props {
  sucursales: Sucursal[];
  actividadesDisponibles: Actividad[];
}

export function NuevoAlumnoFlow({ sucursales, actividadesDisponibles }: Props) {
  const router = useRouter();
  const [alumnoId, setAlumnoId] = useState<string | null>(null);

  if (!alumnoId) {
    return (
      <AlumnoForm
        sucursales={sucursales}
        mode="create"
        onCreated={setAlumnoId}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Banner éxito */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: T.accent }}>
          <Check className="w-4 h-4" style={{ color: T.bgDeep }} />
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.accent }}>
            Alumno creado
          </p>
          <p className="text-xs" style={{ color: T.textDim }}>
            Asigná actividades ahora o hacelo más tarde desde la ficha
          </p>
        </div>
      </div>

      <AlumnoActividades
        alumnoId={alumnoId}
        inscripciones={[]}
        actividadesDisponibles={actividadesDisponibles}
      />

      <div className="flex gap-3">
        <button
          onClick={() => router.push(`/dashboard/alumnos/${alumnoId}`)}
          className="flex items-center gap-2 h-10 px-6 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-90"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}
        >
          Ver ficha completa <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => router.push("/dashboard/alumnos")}
          className="h-10 px-4 rounded-lg font-medium text-sm transition-all hover:opacity-75"
          style={{ color: T.textMuted }}
        >
          Volver al listado
        </button>
      </div>
    </div>
  );
}
