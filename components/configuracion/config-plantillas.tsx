"use client";

import { useState } from "react";
import { ConfigSection, Field, Input, Textarea } from "./config-section";
import { T } from "@/lib/theme";

type Plantilla = { subject?: string; body?: string };
type EmailTemplates = { aviso_vencimiento?: Plantilla; recordatorio_vencido?: Plantilla };

interface Props {
  templates: EmailTemplates | null;
}

const TIPOS: { key: keyof EmailTemplates; label: string; defaultSubject: string; defaultBody: string }[] = [
  {
    key: "aviso_vencimiento",
    label: "Aviso de vencimiento próximo",
    defaultSubject: "{gym} · Tu cuota de {mes}/{anio} vence pronto · ${monto}",
    defaultBody: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} está por vencer.",
  },
  {
    key: "recordatorio_vencido",
    label: "Recordatorio de cuota vencida",
    defaultSubject: "{gym} · Tu cuota de {mes}/{anio} está vencida",
    defaultBody: "Hola {nombre}, tu cuota de {mes} {anio} en {gym} por ${monto} está vencida.",
  },
];

// Personalización del asunto/cuerpo de los emails que reciben los alumnos por
// cuota próxima a vencer / vencida — los únicos 2 tipos que el sistema dispara hoy.
// El texto se guarda plano (sin HTML); el botón "Pagar ahora" y el resto del diseño
// del email se arman aparte (ver lib/notifications/channels/email.ts).
export function ConfigPlantillas({ templates }: Props) {
  const [form, setForm] = useState<EmailTemplates>({
    aviso_vencimiento: { subject: templates?.aviso_vencimiento?.subject ?? "", body: templates?.aviso_vencimiento?.body ?? "" },
    recordatorio_vencido: { subject: templates?.recordatorio_vencido?.subject ?? "", body: templates?.recordatorio_vencido?.body ?? "" },
  });

  function set(tipo: keyof EmailTemplates, field: keyof Plantilla) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [tipo]: { ...f[tipo], [field]: e.target.value } }));
  }

  function reset(tipo: keyof EmailTemplates) {
    setForm((f) => ({ ...f, [tipo]: { subject: "", body: "" } }));
  }

  async function save() {
    const payload: EmailTemplates = {};
    for (const { key } of TIPOS) {
      const subject = form[key]?.subject?.trim() || undefined;
      const body = form[key]?.body?.trim() || undefined;
      if (subject || body) payload[key] = { subject, body };
    }

    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_templates: Object.keys(payload).length > 0 ? payload : null }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar las plantillas");
  }

  return (
    <ConfigSection title="Plantillas de email a alumnos" onSave={save}>
      <p className="text-xs" style={{ color: T.textDim }}>
        Variables disponibles: <code>{"{nombre}"}</code> <code>{"{gym}"}</code> <code>{"{monto}"}</code> <code>{"{mes}"}</code> <code>{"{anio}"}</code>.
        Si dejás un campo vacío, usamos el texto por defecto de CLUBIO.
      </p>
      {TIPOS.map(({ key, label, defaultSubject, defaultBody }) => (
        <div key={key} className="space-y-3 pt-2 border-t" style={{ borderColor: T.borderSub }}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
              {label}
            </h3>
            <button
              type="button"
              onClick={() => reset(key)}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-80"
              style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}
            >
              Restablecer
            </button>
          </div>
          <Field label="Asunto">
            <Input value={form[key]?.subject ?? ""} onChange={set(key, "subject")} placeholder={defaultSubject} />
          </Field>
          <Field label="Cuerpo">
            <Textarea rows={3} value={form[key]?.body ?? ""} onChange={set(key, "body")} placeholder={defaultBody} />
          </Field>
        </div>
      ))}
    </ConfigSection>
  );
}
