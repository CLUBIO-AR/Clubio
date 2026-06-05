"use client";

import { useState } from "react";
import { ConfigSection, Field, Input } from "./config-section";

interface Props {
  nombre: string;
  emailContacto: string;
  telefono: string;
  direccion: string;
}

export function ConfigGym({ nombre, emailContacto, telefono, direccion }: Props) {
  const [form, setForm] = useState({ nombre, emailContacto, telefono, direccion });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gym_nombre: form.nombre,
        gym_email_contacto: form.emailContacto,
        gym_telefono: form.telefono || null,
        gym_direccion: form.direccion || null,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  return (
    <ConfigSection title="Datos del gimnasio" onSave={save}>
      <Field label="Nombre">
        <Input value={form.nombre} onChange={set("nombre")} placeholder="Nombre del gimnasio" />
      </Field>
      <Field label="Email de contacto">
        <Input type="email" value={form.emailContacto} onChange={set("emailContacto")} placeholder="contacto@migym.com" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Teléfono">
          <Input value={form.telefono} onChange={set("telefono")} placeholder="+54 11..." />
        </Field>
        <Field label="Dirección">
          <Input value={form.direccion} onChange={set("direccion")} placeholder="Av. Ejemplo 123" />
        </Field>
      </div>
    </ConfigSection>
  );
}
