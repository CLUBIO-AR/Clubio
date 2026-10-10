"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";
import { ConfigSection, Field, Input, NumberInput, Toggle, SubBlock, Hint } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  emailActivo: boolean;
  avisosWhatsappActivo: boolean;
  avisosEmailActivo: boolean;
  emailRemitenteNombre: string;
  emailRemitenteAddress: string;
  diasAvisoAntes: number[];
  diasAvisoFijos: number[] | null;
  avisoPostVencimientoDias: number;
  maxAvisosPost: number;
  diaUltimoAviso: number | null;
  modoCobro: "link" | "transferencia";
  whatsappConectado: boolean;
}

const parseDias = (s: string, min: number, max: number) =>
  s.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d) && d >= min && d <= max);

type Canal = "email" | "whatsapp" | "ambos";

function canalInicial(p: Props): Canal {
  if (!p.whatsappConectado) return "email";
  const email = p.emailActivo && p.avisosEmailActivo;
  if (email && p.avisosWhatsappActivo) return "ambos";
  if (!email && p.avisosWhatsappActivo) return "whatsapp";
  return "email";
}

// Avisos a alumnos: un único calendario (vale para email y WhatsApp) + por dónde salen.
// Antes el calendario vivía dentro de "Notificaciones por email" y desaparecía al apagar el email.
export function ConfigAvisos(props: Props) {
  const [form, setForm] = useState({
    modoCalendario: props.diasAvisoFijos?.length ? "fijos" : "relativo",
    diasAntes: props.diasAvisoAntes.join(", "),
    diasFijos: (props.diasAvisoFijos ?? []).join(", "),
    postDias: props.avisoPostVencimientoDias.toString(),
    maxPost: props.maxAvisosPost.toString(),
    ultimoAvisoActivo: props.diaUltimoAviso != null,
    diaUltimoAviso: props.diaUltimoAviso?.toString() ?? "",
    canal: canalInicial(props),
    remNombre: props.emailRemitenteNombre,
    remEmail: props.emailRemitenteAddress,
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const ultimoAvisoDisponible = form.modoCalendario === "fijos" && props.modoCobro === "transferencia";

  async function save() {
    const fijos = form.modoCalendario === "fijos";
    const diasFijos = fijos ? parseDias(form.diasFijos, 1, 28) : null;
    if (fijos && !diasFijos?.length) throw new Error("Cargá al menos un día del mes para avisar");

    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dias_aviso_fijos: diasFijos,
        dias_aviso_antes: parseDias(form.diasAntes, 0, 60),
        aviso_post_vencimiento_dias: parseInt(form.postDias) || 0,
        max_avisos_post: parseInt(form.maxPost) || 0,
        dia_ultimo_aviso: ultimoAvisoDisponible && form.ultimoAvisoActivo && form.diaUltimoAviso
          ? parseInt(form.diaUltimoAviso) : null,
        // El email queda prendido siempre: la confirmación de pago sale por email aunque
        // los avisos de cuota vayan solo por WhatsApp. Sin WhatsApp, los avisos van por email.
        email_activo: true,
        avisos_email_activo: !props.whatsappConectado || form.canal !== "whatsapp",
        ...(props.whatsappConectado ? { avisos_whatsapp_activo: form.canal !== "email" } : {}),
        email_remitente_nombre: form.remNombre || null,
        email_remitente_address: form.remEmail || null,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  const CANALES: { val: Canal; label: string; desc: string; icon: typeof Mail }[] = [
    { val: "email", label: "Email", desc: "A los alumnos con email cargado." },
    { val: "whatsapp", label: "WhatsApp", desc: "A los alumnos con teléfono cargado." },
    { val: "ambos", label: "Ambos", desc: "Por email y por WhatsApp." },
  ].map((c) => ({ ...c, val: c.val as Canal, icon: c.val === "email" ? Mail : c.val === "whatsapp" ? MessageCircle : Send }));

  const calendarios = [
    { val: "relativo", label: "Días antes del vencimiento", desc: "Ej: 7, 3 y 1 día antes, y después cada tantos días si sigue impaga." },
    { val: "fijos", label: "Fechas fijas del mes", desc: "Ej: los días 1, 5 y 10. El último día se toma como “vence hoy”." },
  ];

  return (
    <ConfigSection title="Avisos a alumnos" onSave={save}>
      <SubBlock title="Cuándo avisar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {calendarios.map(({ val, label, desc }) => (
            <button
              key={val}
              type="button"
              onClick={() => setForm((f) => ({ ...f, modoCalendario: val }))}
              className="text-left p-3 rounded-lg transition-colors"
              style={{
                background: form.modoCalendario === val ? T.accentBg : T.card,
                border: `1px solid ${form.modoCalendario === val ? T.accentBorder : T.border}`,
              }}
            >
              <p className="text-sm font-semibold" style={{ color: form.modoCalendario === val ? T.accent : T.text }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{desc}</p>
            </button>
          ))}
        </div>

        {form.modoCalendario === "relativo" ? (
          <>
            <Field label="Avisar estos días antes (separados por coma)">
              <Input value={form.diasAntes} onChange={set("diasAntes")} placeholder="7, 3, 1" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Si vence, recordar cada (días)">
                <NumberInput value={form.postDias} onChange={set("postDias")} min={1} />
              </Field>
              <Field label="Máximo de recordatorios">
                <NumberInput value={form.maxPost} onChange={set("maxPost")} min={0} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Días del mes (separados por coma)">
              <Input value={form.diasFijos} onChange={set("diasFijos")} placeholder="1, 5, 10" />
            </Field>
            <Hint>El último día de la lista debería coincidir con el día de vencimiento de las cuotas.</Hint>
            {ultimoAvisoDisponible ? (
              <div className="pt-3 border-t space-y-3" style={{ borderColor: T.borderSub }}>
                <Toggle
                  checked={form.ultimoAvisoActivo}
                  onChange={(v) => setForm((f) => ({ ...f, ultimoAvisoActivo: v }))}
                  label="Último aviso antes de la baja"
                  description="Un día fijo después del vencimiento, se avisa a quienes siguen debiendo (con el recargo aplicado) que si no pagan quedan dados de baja."
                />
                {form.ultimoAvisoActivo && (
                  <Field label="Día del mes">
                    <NumberInput value={form.diaUltimoAviso} onChange={set("diaUltimoAviso")} min={1} max={28} style={{ maxWidth: 120 }} />
                  </Field>
                )}
              </div>
            ) : (
              <Hint>El “último aviso antes de la baja” está disponible cuando cobrás por transferencia.</Hint>
            )}
          </>
        )}
      </SubBlock>

      <SubBlock title="Por dónde">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CANALES.map(({ val, label, desc, icon: Icon }) => {
            const disponible = val === "email" || props.whatsappConectado;
            const activo = form.canal === val;
            return (
              <button
                key={val}
                type="button"
                disabled={!disponible}
                onClick={() => setForm((f) => ({ ...f, canal: val }))}
                className="text-left p-3 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: activo ? T.accentBg : T.card,
                  border: `1px solid ${activo ? T.accentBorder : T.border}`,
                }}
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: activo ? T.accent : T.text }}>
                  <Icon className="w-4 h-4" /> {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{desc}</p>
              </button>
            );
          })}
        </div>
        <Hint>
          {props.whatsappConectado
            ? "Vale para los avisos automáticos de cuota. La confirmación de pago siempre sale por email. Desde cada cuota igual podés mandar el aviso a mano por el canal que quieras."
            : <>WhatsApp no está conectado, así que los avisos salen por email.{" "}
                <Link href="/dashboard/configuracion?tab=whatsapp" className="font-semibold hover:opacity-70" style={{ color: T.accent }}>
                  Configurar WhatsApp
                </Link></>}
        </Hint>
        <div className="pt-3 border-t space-y-3" style={{ borderColor: T.borderSub }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del remitente">
              <Input value={form.remNombre} onChange={set("remNombre")} placeholder="Mi Gym" />
            </Field>
            <Field label="Email remitente (opcional)">
              <Input type="email" value={form.remEmail} onChange={set("remEmail")} placeholder="avisos@clubio.com.ar" />
            </Field>
          </div>
          <Hint>
            Dejá el email vacío para enviar desde CLUBIO. Usar uno propio requiere que tu dominio esté verificado
            con nosotros; si no, los mails no salen.
          </Hint>
        </div>
      </SubBlock>
    </ConfigSection>
  );
}
