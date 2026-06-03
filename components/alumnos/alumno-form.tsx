"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Alumno } from "@/lib/alumnos";
import { T } from "@/lib/theme";

const labelStyle: React.CSSProperties = {
  color: T.textMuted, fontFamily: "var(--font-barlow-condensed)",
  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
};
const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text };

interface Sucursal { id: string; nombre: string; }
interface AlumnoFormProps { sucursales: Sucursal[]; mode: "create" | "edit"; alumno?: Partial<Alumno>; }

export function AlumnoForm({ sucursales, mode, alumno }: AlumnoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: alumno?.nombre ?? "", apellido: alumno?.apellido ?? "", dni: alumno?.dni ?? "",
    email: alumno?.email ?? "", telefono: alumno?.telefono ?? "",
    fecha_nacimiento: alumno?.fecha_nacimiento ?? "", sucursal_id: alumno?.sucursal_id ?? "",
    monto_cuota_personalizado: alumno?.monto_cuota_personalizado?.toString() ?? "", notas: alumno?.notas ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      nombre: form.nombre, apellido: form.apellido, dni: form.dni,
      email: form.email || null, telefono: form.telefono || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sucursal_id: form.sucursal_id || null,
      monto_cuota_personalizado: form.monto_cuota_personalizado ? parseFloat(form.monto_cuota_personalizado) : null,
      notas: form.notas || null,
    };
    const url = mode === "create" ? "/api/alumnos" : `/api/alumnos/${alumno?.id}`;
    const res = await fetch(url, { method: mode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al guardar"); setLoading(false); return; }
    router.push(mode === "create" ? `/dashboard/alumnos/${data.id}` : `/dashboard/alumnos/${alumno?.id}`);
    router.refresh();
  }

  const SectionTitle = ({ children }: { children: string }) => (
    <h2 className="text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
      — {children}
    </h2>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl p-5" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <SectionTitle>Datos personales</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label style={labelStyle}>Nombre *</Label><Input name="nombre" required value={form.nombre} onChange={handleChange} placeholder="Juan" style={inp} className="placeholder:opacity-20" /></div>
          <div className="space-y-1.5"><Label style={labelStyle}>Apellido *</Label><Input name="apellido" required value={form.apellido} onChange={handleChange} placeholder="Pérez" style={inp} className="placeholder:opacity-20" /></div>
          <div className="space-y-1.5"><Label style={labelStyle}>DNI *</Label><Input name="dni" required value={form.dni} onChange={handleChange} placeholder="30123456" style={inp} className="placeholder:opacity-20 font-mono" /></div>
          <div className="space-y-1.5"><Label style={labelStyle}>Fecha de nacimiento</Label><Input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} style={inp} /></div>
          <div className="space-y-1.5"><Label style={labelStyle}>Email</Label><Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="juan@email.com" style={inp} className="placeholder:opacity-20" /></div>
          <div className="space-y-1.5"><Label style={labelStyle}>Teléfono</Label><Input name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 11 1234-5678" style={inp} className="placeholder:opacity-20" /></div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <SectionTitle>Configuración</SectionTitle>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {sucursales.length > 1 && (
            <div className="space-y-1.5">
              <Label style={labelStyle}>Sucursal</Label>
              <Select value={form.sucursal_id} onValueChange={(v) => setForm((p) => ({ ...p, sucursal_id: v ?? "" }))}>
                <SelectTrigger style={inp}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label style={labelStyle}>Cuota personalizada ($)</Label>
            <Input name="monto_cuota_personalizado" type="number" min="0" step="0.01" value={form.monto_cuota_personalizado} onChange={handleChange} placeholder="Default del gym" style={inp} className="placeholder:opacity-20 font-mono" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label style={labelStyle}>Notas internas</Label>
          <Textarea name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones, condición médica, etc." rows={3} style={{ ...inp, resize: "none" }} className="placeholder:opacity-20" />
        </div>
      </div>

      {error && <div className="px-4 py-3 rounded-lg text-sm" style={{ background: `${T.danger}12`, border: `1px solid ${T.danger}30`, color: T.danger }}>{error}</div>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading}
          className="h-10 px-6 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-2 disabled:opacity-50 hover:opacity-90"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : mode === "create" ? "Crear alumno" : "Guardar cambios"}
        </button>
        <button type="button" onClick={() => router.back()} className="h-10 px-4 rounded-lg font-medium text-sm transition-all hover:opacity-75" style={{ color: T.textMuted }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
