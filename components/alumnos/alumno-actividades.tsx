"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { T } from "@/lib/theme";

type Actividad = { id: string; nombre: string; monto_base: number; color: string };
type Inscripcion = {
  id: string;
  actividad_id: string;
  monto_personalizado: number | null;
  activa: boolean;
  actividades: Actividad | null;
};

interface Props {
  alumnoId: string;
  inscripciones: Inscripcion[];
  actividadesDisponibles: Actividad[];
}

export function AlumnoActividades({ alumnoId, inscripciones: inicial, actividadesDisponibles }: Props) {
  const [inscs, setInscs] = useState(inicial);
  const [agregando, setAgregando] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [montoCustom, setMontoCustom] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inscritasIds = new Set(inscs.map(i => i.actividad_id));
  const disponibles = actividadesDisponibles.filter(a => !inscritasIds.has(a.id));

  async function handleAgregar() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/alumnos/${alumnoId}/actividades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actividad_id: selectedId,
        monto_personalizado: montoCustom ? parseFloat(montoCustom) : null,
        activa: true,
        fecha_inicio: fechaInicio,
      }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error");
      setLoading(false);
      return;
    }
    const nueva = await res.json();
    const actividad = actividadesDisponibles.find(a => a.id === selectedId);
    setInscs(prev => [...prev, { ...nueva, actividades: actividad ?? null }]);
    setSelectedId("");
    setMontoCustom("");
    setFechaInicio(new Date().toISOString().split("T")[0]);
    setAgregando(false);
    setLoading(false);
  }

  async function handleToggle(inscripcion: Inscripcion) {
    await fetch(`/api/alumnos/${alumnoId}/actividades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actividad_id: inscripcion.actividad_id, activa: !inscripcion.activa }),
    });
    setInscs(prev => prev.map(i => i.id === inscripcion.id ? { ...i, activa: !i.activa } : i));
  }

  async function handleQuitar(inscripcion: Inscripcion) {
    await fetch(`/api/alumnos/${alumnoId}/actividades`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actividad_id: inscripcion.actividad_id }),
    });
    setInscs(prev => prev.filter(i => i.id !== inscripcion.id));
  }

  const actividad = selectedId ? actividadesDisponibles.find(a => a.id === selectedId) : null;

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
          — Actividades inscriptas
        </h2>
        {!agregando && disponibles.length > 0 && (
          <button onClick={() => setAgregando(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
          >
            <Plus className="w-3 h-3" /> Agregar
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {/* Formulario agregar */}
        {agregando && (
          <div className="p-3 rounded-xl space-y-3" style={{ background: T.bgDeep, border: `1px solid ${T.accentBorder}` }}>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Actividad</label>
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: 7, background: T.bg, border: `1px solid ${T.border}`, color: T.text, fontSize: "0.8rem" }}
                >
                  <option value="">Seleccionar...</option>
                  {disponibles.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre} — ${a.monto_base.toLocaleString("es-AR")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                  Precio personalizado ($)
                </label>
                <input
                  type="number" min={0} value={montoCustom}
                  onChange={e => setMontoCustom(e.target.value)}
                  placeholder={actividad ? `$${actividad.monto_base.toLocaleString("es-AR")} (defecto)` : "Defecto de actividad"}
                  style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: 7, background: T.bg, border: `1px solid ${T.border}`, color: T.text, fontSize: "0.8rem" }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                Fecha de inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: 7, background: T.bg, border: `1px solid ${T.border}`, color: T.text, fontSize: "0.8rem" }}
              />
            </div>
            {error && <p className="text-xs" style={{ color: T.danger }}>{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAgregando(false); setError(null); }} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                Cancelar
              </button>
              <button onClick={handleAgregar} disabled={!selectedId || loading}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep }}
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Agregar
              </button>
            </div>
          </div>
        )}

        {inscs.length === 0 && !agregando && (
          <p className="text-sm text-center py-3" style={{ color: T.textDim }}>
            Sin actividades asignadas. Las cuotas se generan con el monto base del gym.
          </p>
        )}

        {inscs.map(ins => {
          const act = ins.actividades;
          const monto = ins.monto_personalizado ?? act?.monto_base ?? 0;
          return (
            <div key={ins.id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.border}`, opacity: ins.activa ? 1 : 0.5 }}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: act?.color ?? T.accent }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                  {act?.nombre.toUpperCase() ?? "—"}
                </p>
                <p className="text-xs font-mono" style={{ color: T.textDim }}>
                  ${monto.toLocaleString("es-AR")}/mes
                  {ins.monto_personalizado != null && <span style={{ color: T.accent }}> (personalizado)</span>}
                </p>
              </div>
              <button
                onClick={() => handleToggle(ins)}
                className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: ins.activa ? T.accentBg : `${T.textDim}15`, color: ins.activa ? T.accent : T.textDim }}
              >
                {ins.activa ? "Activa" : "Inactiva"}
              </button>
              <button onClick={() => handleQuitar(ins)} className="p-1.5 rounded-lg hover:opacity-75" style={{ color: T.textDim }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
