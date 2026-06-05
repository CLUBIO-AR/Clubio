"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { T } from "@/lib/theme";

type Actividad = {
  id: string;
  nombre: string;
  monto_base: number;
  recargo_1_dias: number | null;
  recargo_1_porcentaje: number | null;
  recargo_2_dias: number | null;
  recargo_2_porcentaje: number | null;
  color: string;
  activa: boolean;
};

const COLORS = ["#00ff88", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

const inputBase: React.CSSProperties = {
  padding: "0.4rem 0.6rem", borderRadius: 7, background: T.bg,
  border: `1px solid ${T.border}`, color: T.text, fontSize: "0.8rem", outline: "none", width: "100%",
};

function ActividadForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Actividad>;
  onSave: (data: Omit<Actividad, "id" | "activa">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    monto_base: initial?.monto_base?.toString() ?? "",
    r1dias: initial?.recargo_1_dias?.toString() ?? "",
    r1pct: initial?.recargo_1_porcentaje?.toString() ?? "",
    r2activo: initial?.recargo_2_dias != null,
    r2dias: initial?.recargo_2_dias?.toString() ?? "",
    r2pct: initial?.recargo_2_porcentaje?.toString() ?? "",
    color: initial?.color ?? "#00ff88",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        nombre: form.nombre,
        monto_base: parseFloat(form.monto_base) || 0,
        recargo_1_dias: form.r1dias ? parseInt(form.r1dias) : null,
        recargo_1_porcentaje: form.r1pct ? parseFloat(form.r1pct) : null,
        recargo_2_dias: form.r2activo && form.r2dias ? parseInt(form.r2dias) : null,
        recargo_2_porcentaje: form.r2activo && form.r2pct ? parseFloat(form.r2pct) : null,
        color: form.color,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-4 rounded-xl" style={{ background: T.bgDeep, border: `1px solid ${T.accentBorder}` }}>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Nombre</label>
          <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej: Funcional" style={inputBase} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Precio mensual ($)</label>
          <input required type="number" min={0} value={form.monto_base} onChange={e => setForm(f => ({ ...f, monto_base: e.target.value }))} placeholder="ej: 18000" style={inputBase} />
        </div>
      </div>

      {/* Recargo propio */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Mora: días</label>
          <input type="number" min={0} value={form.r1dias} onChange={e => setForm(f => ({ ...f, r1dias: e.target.value }))} placeholder="(gym por defecto)" style={inputBase} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Mora: % recargo</label>
          <input type="number" min={0} step={0.1} value={form.r1pct} onChange={e => setForm(f => ({ ...f, r1pct: e.target.value }))} placeholder="(gym por defecto)" style={inputBase} />
        </div>
      </div>

      {/* Mora 2 */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="r2a" checked={form.r2activo} onChange={e => setForm(f => ({ ...f, r2activo: e.target.checked }))} style={{ accentColor: T.accent }} />
        <label htmlFor="r2a" className="text-xs" style={{ color: T.textDim }}>Segunda mora</label>
      </div>
      {form.r2activo && (
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={0} value={form.r2dias} onChange={e => setForm(f => ({ ...f, r2dias: e.target.value }))} placeholder="días" style={inputBase} />
          <input type="number" min={0} step={0.1} value={form.r2pct} onChange={e => setForm(f => ({ ...f, r2pct: e.target.value }))} placeholder="% recargo" style={inputBase} />
        </div>
      )}

      {/* Color */}
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{ background: c, border: form.color === c ? `2px solid white` : `2px solid transparent`, outline: form.color === c ? `2px solid ${c}` : "none" }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: T.danger }}>{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Guardar
        </button>
      </div>
    </form>
  );
}

interface Props { actividades: Actividad[] }

export function ConfigActividades({ actividades: inicial }: Props) {
  const [actividades, setActividades] = useState(inicial);
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function handleCreate(data: Omit<Actividad, "id" | "activa">) {
    const res = await fetch("/api/actividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
    const nueva = await res.json();
    setActividades(prev => [...prev, { ...nueva, activa: true }]);
    setCreando(false);
  }

  async function handleUpdate(id: string, data: Omit<Actividad, "id" | "activa">) {
    const res = await fetch(`/api/actividades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
    const actualizada = await res.json();
    setActividades(prev => prev.map(a => a.id === id ? { ...a, ...actualizada } : a));
    setEditandoId(null);
  }

  async function handleToggle(id: string, activa: boolean) {
    await fetch(`/api/actividades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa }),
    });
    setActividades(prev => prev.map(a => a.id === id ? { ...a, activa } : a));
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar actividad? Las cuotas existentes no se verán afectadas.")) return;
    await fetch(`/api/actividades/${id}`, { method: "DELETE" });
    setActividades(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
          — Actividades / Clases
        </h2>
        {!creando && (
          <button onClick={() => setCreando(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
          >
            <Plus className="w-3 h-3" /> Nueva
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {creando && (
          <ActividadForm onSave={handleCreate} onCancel={() => setCreando(false)} />
        )}

        {actividades.length === 0 && !creando && (
          <p className="text-sm text-center py-4" style={{ color: T.textDim }}>
            Sin actividades. Creá una para asignar clases a los alumnos.
          </p>
        )}

        {actividades.map(a => (
          editandoId === a.id ? (
            <ActividadForm
              key={a.id}
              initial={a}
              onSave={(data) => handleUpdate(a.id, data)}
              onCancel={() => setEditandoId(null)}
            />
          ) : (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: T.bg, border: `1px solid ${T.border}`, opacity: a.activa ? 1 : 0.5 }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: a.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>{a.nombre.toUpperCase()}</p>
                <p className="text-xs font-mono" style={{ color: T.textDim }}>
                  ${a.monto_base.toLocaleString("es-AR")}
                  {a.recargo_1_dias != null && ` · mora ${a.recargo_1_dias}d / ${a.recargo_1_porcentaje}%`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggle(a.id, !a.activa)}
                  className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: a.activa ? T.accentBg : `${T.textDim}15`, color: a.activa ? T.accent : T.textDim }}
                >
                  {a.activa ? "Activa" : "Inactiva"}
                </button>
                <button onClick={() => setEditandoId(a.id)} className="p-1.5 rounded-lg hover:opacity-75" style={{ color: T.textDim }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:opacity-75" style={{ color: T.danger }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
