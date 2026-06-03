"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Alumno } from "@/lib/alumnos";

const NEON = "oklch(0.88 0.22 158)";
const CARD = "oklch(0.13 0.018 245)";
const BORDER = "oklch(0.2 0.018 245)";
const INPUT_BG = "oklch(0.1 0.018 245)";

const labelStyle: React.CSSProperties = {
  color: "oklch(0.55 0.015 245)",
  fontFamily: "var(--font-barlow-condensed)",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  color: "white",
};

interface Sucursal { id: string; nombre: string; }
interface AlumnoFormProps { sucursales: Sucursal[]; mode: "create" | "edit"; alumno?: Partial<Alumno>; }

export function AlumnoForm({ sucursales, mode, alumno }: AlumnoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: alumno?.nombre ?? "",
    apellido: alumno?.apellido ?? "",
    dni: alumno?.dni ?? "",
    email: alumno?.email ?? "",
    telefono: alumno?.telefono ?? "",
    fecha_nacimiento: alumno?.fecha_nacimiento ?? "",
    sucursal_id: alumno?.sucursal_id ?? "",
    monto_cuota_personalizado: alumno?.monto_cuota_personalizado?.toString() ?? "",
    notas: alumno?.notas ?? "",
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
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al guardar"); setLoading(false); return; }
    router.push(mode === "create" ? `/dashboard/alumnos/${data.id}` : `/dashboard/alumnos/${alumno?.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Datos personales */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm uppercase tracking-[0.15em] font-bold" style={{ color: NEON, fontFamily: "var(--font-barlow-condensed)" }}>
          — Datos personales
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label style={labelStyle}>Nombre *</Label>
            <Input name="nombre" required value={form.nombre} onChange={handleChange} placeholder="Juan" style={inputStyle} className="placeholder:opacity-20" />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Apellido *</Label>
            <Input name="apellido" required value={form.apellido} onChange={handleChange} placeholder="Pérez" style={inputStyle} className="placeholder:opacity-20" />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>DNI *</Label>
            <Input name="dni" required value={form.dni} onChange={handleChange} placeholder="30123456" style={inputStyle} className="placeholder:opacity-20 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Fecha de nacimiento</Label>
            <Input name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Email</Label>
            <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="juan@email.com" style={inputStyle} className="placeholder:opacity-20" />
          </div>
          <div className="space-y-1.5">
            <Label style={labelStyle}>Teléfono</Label>
            <Input name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 11 1234-5678" style={inputStyle} className="placeholder:opacity-20" />
          </div>
        </div>
      </div>

      {/* Config */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm uppercase tracking-[0.15em] font-bold" style={{ color: NEON, fontFamily: "var(--font-barlow-condensed)" }}>
          — Configuración
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {sucursales.length > 1 && (
            <div className="space-y-1.5">
              <Label style={labelStyle}>Sucursal</Label>
              <Select value={form.sucursal_id} onValueChange={(v) => setForm((p) => ({ ...p, sucursal_id: v ?? "" }))}>
                <SelectTrigger style={inputStyle}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent style={{ background: "oklch(0.14 0.018 245)", border: `1px solid ${BORDER}` }}>
                  {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label style={labelStyle}>Cuota personalizada ($)</Label>
            <Input name="monto_cuota_personalizado" type="number" min="0" step="0.01" value={form.monto_cuota_personalizado} onChange={handleChange} placeholder="Default del gym" style={inputStyle} className="placeholder:opacity-20 font-mono" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label style={labelStyle}>Notas internas</Label>
          <Textarea name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones, condición médica, etc." rows={3} style={{ ...inputStyle, resize: "none" }} className="placeholder:opacity-20" />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "oklch(0.65 0.22 27 / 0.1)", border: "1px solid oklch(0.65 0.22 27 / 0.3)", color: "oklch(0.75 0.2 27)" }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-6 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center gap-2 disabled:opacity-60"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: NEON, color: "oklch(0.07 0.018 245)", boxShadow: `0 0 20px ${NEON}30` }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : mode === "create" ? "Crear alumno" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-10 px-4 rounded-lg font-medium text-sm transition-all"
          style={{ color: "oklch(0.5 0.015 245)", background: "transparent" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
