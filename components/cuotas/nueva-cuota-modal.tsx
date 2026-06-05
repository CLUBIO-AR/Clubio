"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { T } from "@/lib/theme";

const TIPOS = [
  { value: "mensual",      label: "Mensual" },
  { value: "clase_suelta", label: "Clase suelta" },
  { value: "evento",       label: "Evento" },
  { value: "inscripcion",  label: "Inscripción" },
  { value: "personalizada",label: "Personalizada" },
] as const;

const MESES_LARGO = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const inp: React.CSSProperties = {
  padding: "0.4rem 0.6rem", borderRadius: 7, outline: "none", width: "100%",
  background: T.bg, border: `1px solid ${T.border}`, color: T.text, fontSize: "0.85rem",
};
const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 4, fontSize: "0.7rem", fontWeight: 700,
  letterSpacing: "0.12em", textTransform: "uppercase",
  fontFamily: "var(--font-barlow-condensed)", color: T.textDim,
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se pasa alumnoId + alumnoNombre, el selector de alumno queda fijo */
  alumnoId?: string;
  alumnoNombre?: string;
  mesDefault?: number;
  anioDefault?: number;
  onCreated?: () => void;
}

export function NuevaCuotaModal({ open, onClose, alumnoId, alumnoNombre, mesDefault, anioDefault, onCreated }: Props) {
  const hoy = new Date();
  const [form, setForm] = useState({
    tipo: "mensual" as string,
    descripcion: "",
    mes: mesDefault ?? hoy.getMonth() + 1,
    anio: anioDefault ?? hoy.getFullYear(),
    monto: "",
    vencimiento: "",
    notas: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alumnoId) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/cuotas/especial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alumno_id: alumnoId,
        tipo: form.tipo,
        descripcion: form.descripcion || null,
        mes: form.mes,
        anio: form.anio,
        monto_base: parseFloat(form.monto),
        fecha_vencimiento: form.vencimiento,
        notas: form.notas || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Error al crear cuota");
      setLoading(false);
      return;
    }

    setLoading(false);
    onCreated?.();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ background: T.card, border: `1px solid ${T.border}`, maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)", fontSize: "1.4rem", fontWeight: 900 }}>
            NUEVA CUOTA
            {alumnoNombre && <span className="ml-2 text-sm font-normal" style={{ color: T.textDim }}>— {alumnoNombre}</span>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)} style={inp}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Descripción (obligatoria si no es mensual) */}
          <div>
            <label style={labelStyle}>
              Descripción {form.tipo !== "mensual" && <span style={{ color: T.danger }}>*</span>}
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              required={form.tipo !== "mensual"}
              placeholder={form.tipo === "mensual" ? "Opcional" : "Ej: Clase spinning 10/06, Torneo julio…"}
              style={inp}
            />
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Mes</label>
              <select value={form.mes} onChange={(e) => set("mes", parseInt(e.target.value))} style={inp}>
                {MESES_LARGO.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Año</label>
              <input type="number" min={2024} max={2099} value={form.anio}
                onChange={(e) => set("anio", parseInt(e.target.value))} style={inp} />
            </div>
          </div>

          {/* Monto + Vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Monto ($) *</label>
              <input type="number" min={0.01} step={0.01} required value={form.monto}
                onChange={(e) => set("monto", e.target.value)}
                placeholder="ej: 15000" style={inp} />
            </div>
            <div>
              <label style={labelStyle}>Vencimiento *</label>
              <input type="date" required value={form.vencimiento}
                onChange={(e) => set("vencimiento", e.target.value)} style={inp} />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label style={labelStyle}>Notas internas</label>
            <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)}
              rows={2} placeholder="Opcional"
              style={{ ...inp, resize: "none" }} />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: `${T.danger}12`, color: T.danger, border: `1px solid ${T.danger}30` }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm font-medium" style={{ color: T.textMuted }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading || !alumnoId}
              className="h-9 px-5 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear cuota
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
