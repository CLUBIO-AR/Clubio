"use client";

import { useState } from "react";
import { ConfigSection, Field, NumberInput, Toggle, SubBlock, Hint } from "./config-section";
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
  const set = (k: "r1dias" | "r1pct" | "r2dias" | "r2pct" | "diasDesactivar") => (e: React.ChangeEvent<HTMLInputElement>) =>
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
    <ConfigSection title="Recargos y mora" onSave={save}>
      <SubBlock title="Recargo por pago fuera de término">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Días después del vencimiento">
            <NumberInput value={form.r1dias} onChange={set("r1dias")} min={0} />
          </Field>
          <Field label="Recargo (%)">
            <NumberInput value={form.r1pct} onChange={set("r1pct")} min={0} step={0.1} />
          </Field>
        </div>
        <Hint>Si una actividad tiene su propio recargo (en Actividades), se usa ese en lugar de este.</Hint>

        <div className="pt-3 border-t" style={{ borderColor: T.borderSub }}>
          <Toggle
            checked={form.r2activo}
            onChange={(v) => setForm((f) => ({ ...f, r2activo: v }))}
            label="Segundo recargo"
            description="Un recargo adicional si la cuota sigue impaga más tiempo."
          />
          {form.r2activo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Field label="Días después del vencimiento">
                <NumberInput value={form.r2dias} onChange={set("r2dias")} min={0} />
              </Field>
              <Field label="Recargo (%)">
                <NumberInput value={form.r2pct} onChange={set("r2pct")} min={0} step={0.1} />
              </Field>
            </div>
          )}
        </div>
      </SubBlock>

      <SubBlock>
        <Toggle
          checked={form.desactivarActivo}
          onChange={(v) => setForm((f) => ({ ...f, desactivarActivo: v }))}
          label="Dar de baja automáticamente por mora"
          description="El alumno se desactiva y deja de recibir avisos. Se reactiva solo al pagar, o a mano desde su ficha."
        />
        {form.desactivarActivo && (
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: T.borderSub }}>
            <div className="flex flex-wrap gap-4">
              {[
                { val: "dias_fijos", label: "Después de N días de vencida" },
                { val: "mes_siguiente", label: "Al empezar el mes siguiente" },
              ].map(({ val, label }) => (
                <label key={val} className="flex items-center gap-2 text-sm" style={{ color: T.text }}>
                  <input
                    type="radio"
                    name="modoDesactivar"
                    checked={form.modoDesactivar === val}
                    onChange={() => setForm((f) => ({ ...f, modoDesactivar: val }))}
                    style={{ accentColor: T.accent }}
                  />
                  {label}
                </label>
              ))}
            </div>
            {form.modoDesactivar === "dias_fijos" && (
              <Field label="Días de vencida">
                <NumberInput value={form.diasDesactivar} onChange={set("diasDesactivar")} min={1} style={{ maxWidth: 120 }} />
              </Field>
            )}
          </div>
        )}
      </SubBlock>
    </ConfigSection>
  );
}
