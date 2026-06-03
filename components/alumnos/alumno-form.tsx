"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Alumno } from "@/lib/alumnos";

interface Sucursal {
  id: string;
  nombre: string;
}

interface AlumnoFormProps {
  sucursales: Sucursal[];
  mode: "create" | "edit";
  alumno?: Partial<Alumno>;
}

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
      nombre: form.nombre,
      apellido: form.apellido,
      dni: form.dni,
      email: form.email || null,
      telefono: form.telefono || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sucursal_id: form.sucursal_id || null,
      monto_cuota_personalizado: form.monto_cuota_personalizado
        ? parseFloat(form.monto_cuota_personalizado)
        : null,
      notas: form.notas || null,
    };

    const url = mode === "create" ? "/api/alumnos" : `/api/alumnos/${alumno?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
      setLoading(false);
      return;
    }

    router.push(
      mode === "create" ? `/dashboard/alumnos/${data.id}` : `/dashboard/alumnos/${alumno?.id}`
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos personales */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-zinc-800 text-sm uppercase tracking-wide">
          Datos personales
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              name="nombre"
              required
              value={form.nombre}
              onChange={handleChange}
              placeholder="Juan"
              className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">
              Apellido <span className="text-red-500">*</span>
            </Label>
            <Input
              name="apellido"
              required
              value={form.apellido}
              onChange={handleChange}
              placeholder="Pérez"
              className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">
              DNI <span className="text-red-500">*</span>
            </Label>
            <Input
              name="dni"
              required
              value={form.dni}
              onChange={handleChange}
              placeholder="30123456"
              className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">Fecha de nacimiento</Label>
            <Input
              name="fecha_nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={handleChange}
              className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">Email</Label>
            <Input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="juan@email.com"
              className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">Teléfono</Label>
            <Input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="+54 11 1234-5678"
              className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Configuración */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-zinc-800 text-sm uppercase tracking-wide">
          Configuración
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {sucursales.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-zinc-700 text-sm">Sucursal</Label>
              <Select
                value={form.sucursal_id}
                onValueChange={(v) => setForm((p) => ({ ...p, sucursal_id: v ?? "" }))}
              >
                <SelectTrigger className="bg-zinc-50 border-zinc-200">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-zinc-700 text-sm">
              Monto de cuota personalizado
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <Input
                name="monto_cuota_personalizado"
                type="number"
                min="0"
                step="0.01"
                value={form.monto_cuota_personalizado}
                onChange={handleChange}
                placeholder="Dejar vacío para usar el default"
                className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white pl-7"
              />
            </div>
            <p className="text-xs text-zinc-400">Dejá vacío para usar el monto base del gym</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-zinc-700 text-sm">Notas internas</Label>
          <Textarea
            name="notas"
            value={form.notas}
            onChange={handleChange}
            placeholder="Observaciones, condición médica, etc."
            rows={3}
            className="bg-zinc-50 border-zinc-200 focus:border-indigo-400 focus:bg-white resize-none"
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
          ) : mode === "create" ? (
            "Crear alumno"
          ) : (
            "Guardar cambios"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-zinc-500"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
