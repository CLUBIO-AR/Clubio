"use client";

import { useState } from "react";
import { ConfigSection, Field, NumberInput } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  recargo1Dias: number;
  recargo1Porcentaje: number;
  recargo2Dias: number | null;
  recargo2Porcentaje: number | null;
  diasMoraDesactivacion: number | null;
  moraDesactivarMesSiguiente: boolean;
}

export function ConfigRecargos({
  recargo1Dias, recargo1Porcentaje, recargo2Dias, recargo2Porcentaje,
  diasMoraDesactivacion, moraDesactivarMesSiguiente,
}: Props) {
  const [form, setForm] = useState({
    r1dias: recargo1Dias.toString(),
    r1pct: recargo1Porcentaje.toString(),
    r2activo: recargo2Dias !== null,
    r2dias: recargo2Dias?.toString() ?? "",
    r2pct: recargo2Porcentaje?.toString() ?? "",
    desactivarActivo: diasMoraDesactivacion !== null || moraDesactivarMesSiguiente,
    modoDesactivar: moraDesactivarMesSiguiente ? "mes_siguiente" : "dias_fijos",
    diasDesactivar: diasMoraDesactivacion?.toString() ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const modoMesSiguiente = form.desactivarActivo && form.modoDesactivar === "mes_siguiente";
    const modoDias = form.desactivarActivo && form.modoDesactivar === "dias_fijos";

    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recargo_1_dias: parseInt(form.r1dias),
        recargo_1_porcentaje: parseFloat(form.r1pct),
        recargo_2_dias: form.r2activo && form.r2dias ? parseInt(form.r2dias) : null,
        recargo_2_porcentaje: form.r2activo && form.r2pct ? parseFloat(form.r2pct) : null,
        dias_mora_desactivacion: modoDias && form.diasDesactivar ? parseInt(form.diasDesactivar) : null,
        mora_desactivar_mes_siguiente: modoMesSiguiente,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  return (
    <ConfigSection title="Recargos por mora" onSave={save}>
      <div>
        <p className="text-xs mb-3" style={{ color: T.textDim }}>
          Recargo 1 — se aplica automáticamente a las cuotas vencidas. Si una actividad tiene su propio recargo
          configurado (en Actividades), ese valor tiene prioridad sobre este; este queda como default general del gym.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Días de mora para aplicar">
            <NumberInput value={form.r1dias} onChange={set("r1dias")} min={0} />
          </Field>
          <Field label="Porcentaje de recargo (%)">
            <NumberInput value={form.r1pct} onChange={set("r1pct")} min={0} step={0.1} />
          </Field>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="r2activo"
            checked={form.r2activo}
            onChange={(e) => setForm((f) => ({ ...f, r2activo: e.target.checked }))}
            style={{ accentColor: T.accent }}
          />
          <label htmlFor="r2activo" className="text-xs" style={{ color: T.textDim }}>
            Activar segundo recargo
          </label>
        </div>
        {form.r2activo && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Días de mora para aplicar">
              <NumberInput value={form.r2dias} onChange={set("r2dias")} min={0} />
            </Field>
            <Field label="Porcentaje de recargo (%)">
              <NumberInput value={form.r2pct} onChange={set("r2pct")} min={0} step={0.1} />
            </Field>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="desactivarActivo"
            checked={form.desactivarActivo}
            onChange={(e) => setForm((f) => ({ ...f, desactivarActivo: e.target.checked }))}
            style={{ accentColor: T.accent }}
          />
          <label htmlFor="desactivarActivo" className="text-xs" style={{ color: T.textDim }}>
            Desactivar alumno automáticamente si acumula mora
          </label>
        </div>
        {form.desactivarActivo && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs" style={{ color: T.textDim }}>
                <input
                  type="radio"
                  name="modoDesactivar"
                  checked={form.modoDesactivar === "dias_fijos"}
                  onChange={() => setForm((f) => ({ ...f, modoDesactivar: "dias_fijos" }))}
                  style={{ accentColor: T.accent }}
                />
                Número fijo de días
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: T.textDim }}>
                <input
                  type="radio"
                  name="modoDesactivar"
                  checked={form.modoDesactivar === "mes_siguiente"}
                  onChange={() => setForm((f) => ({ ...f, modoDesactivar: "mes_siguiente" }))}
                  style={{ accentColor: T.accent }}
                />
                Al arrancar el mes siguiente
              </label>
            </div>
            {form.modoDesactivar === "dias_fijos" ? (
              <Field label="Días de mora para desactivar">
                <div className="flex items-center gap-2">
                  <NumberInput value={form.diasDesactivar} onChange={set("diasDesactivar")} min={1} />
                  <span className="text-sm whitespace-nowrap" style={{ color: T.textDim }}>días vencida la cuota</span>
                </div>
              </Field>
            ) : (
              <p className="text-xs" style={{ color: T.textDim }}>
                Se desactiva apenas empieza el mes siguiente al de la cuota impaga, sin importar cuántos días
                tenga ese mes (útil cuando el corte es &quot;hasta fin de mes&quot; en vez de un N de días fijo).
              </p>
            )}
          </div>
        )}
        <p className="text-xs mt-2" style={{ color: T.textDim }}>
          Se reactiva solo al pagar la cuota pendiente, o manualmente desde la ficha del alumno. No se le vuelven a enviar avisos mientras esté desactivado.
        </p>
      </div>
    </ConfigSection>
  );
}
