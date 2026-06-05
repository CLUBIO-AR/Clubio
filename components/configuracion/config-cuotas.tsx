"use client";

import { useState } from "react";
import { ConfigSection, Field, NumberInput } from "./config-section";

interface Props {
  montoBaseDefecto: number | null;
  diaVencimientoMensual: number;
  diasGracia: number;
}

export function ConfigCuotas({ montoBaseDefecto, diaVencimientoMensual, diasGracia }: Props) {
  const [form, setForm] = useState({
    monto: montoBaseDefecto?.toString() ?? "",
    dia: diaVencimientoMensual.toString(),
    gracia: diasGracia.toString(),
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monto_base_defecto: form.monto ? parseFloat(form.monto) : null,
        dia_vencimiento_mensual: parseInt(form.dia),
        dias_gracia: parseInt(form.gracia),
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

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
    </ConfigSection>
  );
}
