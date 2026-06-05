"use client";

import { useState } from "react";
import { ConfigSection, Field, Input, NumberInput } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  emailActivo: boolean;
  diasAvisoAntes: number[];
  avisoPostVencimientoDias: number;
  maxAvisosPost: number;
  emailRemitenteNombre: string;
  emailRemitenteAddress: string;
}

export function ConfigNotificaciones({
  emailActivo,
  diasAvisoAntes,
  avisoPostVencimientoDias,
  maxAvisosPost,
  emailRemitenteNombre,
  emailRemitenteAddress,
}: Props) {
  const [form, setForm] = useState({
    activo: emailActivo,
    diasAntes: diasAvisoAntes.join(", "),
    postDias: avisoPostVencimientoDias.toString(),
    maxPost: maxAvisosPost.toString(),
    remNombre: emailRemitenteNombre,
    remEmail: emailRemitenteAddress,
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const dias = form.diasAntes
      .split(",")
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d) && d >= 0);

    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email_activo: form.activo,
        dias_aviso_antes: dias,
        aviso_post_vencimiento_dias: parseInt(form.postDias),
        max_avisos_post: parseInt(form.maxPost),
        email_remitente_nombre: form.remNombre || null,
        email_remitente_address: form.remEmail || null,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  return (
    <ConfigSection title="Notificaciones por email" onSave={save}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="emailActivo"
          checked={form.activo}
          onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
          style={{ accentColor: T.accent }}
        />
        <label htmlFor="emailActivo" className="text-sm font-medium" style={{ color: T.text }}>
          Enviar avisos por email
        </label>
      </div>

      {form.activo && (
        <>
          <Field label="Días de aviso antes del vencimiento (separados por coma)">
            <Input
              value={form.diasAntes}
              onChange={set("diasAntes")}
              placeholder="ej: 7, 3, 1"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Días entre avisos post-vencimiento">
              <NumberInput value={form.postDias} onChange={set("postDias")} min={1} />
            </Field>
            <Field label="Máximo de avisos post-vencimiento">
              <NumberInput value={form.maxPost} onChange={set("maxPost")} min={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre remitente">
              <Input value={form.remNombre} onChange={set("remNombre")} placeholder="Mi Gym" />
            </Field>
            <Field label="Email remitente">
              <Input type="email" value={form.remEmail} onChange={set("remEmail")} placeholder="avisos@migym.com" />
            </Field>
          </div>
        </>
      )}
    </ConfigSection>
  );
}
