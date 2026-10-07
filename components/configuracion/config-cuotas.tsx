"use client";

import { useState } from "react";
import { ConfigSection, Field, NumberInput, Toggle, SubBlock, Hint } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  montoBaseDefecto: number | null;
  diaVencimientoMensual: number;
  generarCuotaAlAlta: boolean;
  cuotaAltaProporcional: boolean;
  diasMinimosCuotaAlta: number;
}

export function ConfigCuotas({
  montoBaseDefecto, diaVencimientoMensual,
  generarCuotaAlAlta, cuotaAltaProporcional, diasMinimosCuotaAlta,
}: Props) {
  const [form, setForm] = useState({
    monto: montoBaseDefecto?.toString() ?? "",
    dia: diaVencimientoMensual.toString(),
    generarAlAlta: generarCuotaAlAlta,
    proporcional: cuotaAltaProporcional,
    diasMinimos: diasMinimosCuotaAlta.toString(),
  });
  const set = (k: "monto" | "dia" | "diasMinimos") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monto_base_defecto:            form.monto ? parseFloat(form.monto) : null,
        dia_vencimiento_mensual:       parseInt(form.dia),
        generar_cuota_al_alta:         form.generarAlAlta,
        cuota_alta_proporcional:       form.proporcional,
        dias_minimos_para_cuota_alta:  parseInt(form.diasMinimos) || 15,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  return (
    <ConfigSection title="Cuotas mensuales" onSave={save}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Monto por defecto ($)">
          <NumberInput value={form.monto} onChange={set("monto")} placeholder="ej: 15000" min={0} />
        </Field>
        <Field label="Día de vencimiento">
          <NumberInput value={form.dia} onChange={set("dia")} min={1} max={28} />
        </Field>
      </div>
      <Hint>
        El monto por defecto se usa cuando la actividad del alumno no tiene precio propio. Las cuotas se generan el
        1° de cada mes y vencen el día indicado.
      </Hint>

      <SubBlock>
        <Toggle
          checked={form.generarAlAlta}
          onChange={(v) => setForm((f) => ({ ...f, generarAlAlta: v }))}
          label="Generar cuota al dar de alta un alumno"
          description="Crea la cuota del mes en curso apenas se registra un alumno nuevo."
        />

        {form.generarAlAlta && (
          <div className="space-y-3 pt-3 border-t" style={{ borderColor: T.borderSub }}>
            <div className="space-y-2">
              {[
                { val: false, label: "Cuota completa", desc: "Se cobra el monto completo, sin importar el día del alta." },
                { val: true,  label: "Proporcional a los días que quedan", desc: "El monto se ajusta según los días que faltan para terminar el mes." },
              ].map(({ val, label, desc }) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, proporcional: val }))}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors"
                  style={{
                    background: form.proporcional === val ? T.accentBg : T.card,
                    border: `1px solid ${form.proporcional === val ? T.accentBorder : T.border}`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ borderColor: form.proporcional === val ? T.accent : T.border }}>
                    {form.proporcional === val && <div className="w-2 h-2 rounded-full" style={{ background: T.accent }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <Field label="No generar si quedan menos de (días del mes)">
              <NumberInput value={form.diasMinimos} onChange={set("diasMinimos")} min={0} max={31} style={{ maxWidth: 120 }} />
            </Field>
          </div>
        )}
      </SubBlock>
    </ConfigSection>
  );
}
