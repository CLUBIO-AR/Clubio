"use client";

import { useState } from "react";
import { ConfigSection, Field, NumberInput } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  montoBaseDefecto: number | null;
  diaVencimientoMensual: number;
  diasGracia: number;
  generarCuotaAlAlta: boolean;
  cuotaAltaProporcional: boolean;
  diasMinimosCuotaAlta: number;
}

export function ConfigCuotas({
  montoBaseDefecto, diaVencimientoMensual, diasGracia,
  generarCuotaAlAlta, cuotaAltaProporcional, diasMinimosCuotaAlta,
}: Props) {
  const [form, setForm] = useState({
    monto: montoBaseDefecto?.toString() ?? "",
    dia: diaVencimientoMensual.toString(),
    gracia: diasGracia.toString(),
    generarAlAlta: generarCuotaAlAlta,
    proporcional: cuotaAltaProporcional,
    diasMinimos: diasMinimosCuotaAlta.toString(),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monto_base_defecto:            form.monto ? parseFloat(form.monto) : null,
        dia_vencimiento_mensual:       parseInt(form.dia),
        dias_gracia:                   parseInt(form.gracia),
        generar_cuota_al_alta:         form.generarAlAlta,
        cuota_alta_proporcional:       form.proporcional,
        dias_minimos_para_cuota_alta:  parseInt(form.diasMinimos) || 15,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", width: 40, height: 22,
    borderRadius: 999, transition: "background 0.2s",
    background: on ? T.accent : T.borderSub, cursor: "pointer", position: "relative",
    border: `1px solid ${on ? T.accentBorder : T.border}`,
  });

  return (
    <ConfigSection title="Cuotas" onSave={save}>
      <Field label="Monto base por defecto ($)">
        <NumberInput value={form.monto} onChange={set("monto")} placeholder="ej: 15000" min={0} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día de vencimiento mensual">
          <NumberInput value={form.dia} onChange={set("dia")} min={1} max={28} />
        </Field>
        <Field label="Días de gracia post-vencimiento">
          <NumberInput value={form.gracia} onChange={set("gracia")} min={0} />
        </Field>
      </div>

      {/* Cuota al alta */}
      <div className="rounded-xl p-4 space-y-4" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: T.text }}>Generar cuota al dar de alta</p>
            <p className="text-xs mt-0.5" style={{ color: T.textDim }}>Crea automáticamente una cuota cuando se registra un alumno nuevo</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, generarAlAlta: !f.generarAlAlta }))}
            style={toggleStyle(form.generarAlAlta)}
            aria-checked={form.generarAlAlta}
            role="switch"
          >
            <span style={{
              position: "absolute", top: 2, left: form.generarAlAlta ? 20 : 2,
              width: 16, height: 16, borderRadius: 999, background: "white",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            }} />
          </button>
        </div>

        {form.generarAlAlta && (
          <div className="space-y-3 pt-1 border-t" style={{ borderColor: T.borderSub }}>
            {/* Tipo de cuota al alta */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Tipo de cuota al alta</p>
              <div className="space-y-2">
                {[
                  { val: false, label: "Cuota completa siempre", desc: "Se cobra el monto base completo independientemente del día" },
                  { val: true,  label: "Proporcional a días restantes", desc: "Se calcula el monto según cuántos días quedan en el mes" },
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
                      {form.proporcional === val && (
                        <div className="w-2 h-2 rounded-full" style={{ background: T.accent }} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: T.text }}>{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Días mínimos */}
            <Field label="No generar si quedan menos de N días en el mes">
              <div className="flex items-center gap-2">
                <NumberInput value={form.diasMinimos} onChange={set("diasMinimos")} min={0} max={31} />
                <span className="text-sm whitespace-nowrap" style={{ color: T.textDim }}>días (default: 15)</span>
              </div>
            </Field>
          </div>
        )}
      </div>
    </ConfigSection>
  );
}
