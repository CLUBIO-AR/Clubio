"use client";

import { useState } from "react";
import { Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { ConfigSection, Field } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  mpAccessToken: string;
  mpPublicKey: string;
}

const PASOS_MP = [
  {
    num: "1",
    titulo: "Creá o iniciá sesión en tu cuenta de MercadoPago",
    desc: "Necesitás una cuenta de MercadoPago a nombre del gym (no personal). Si ya tenés una, ingresá normalmente.",
    link: { label: "Ir a mercadopago.com.ar →", url: "https://www.mercadopago.com.ar" },
  },
  {
    num: "2",
    titulo: "Ingresá al Panel de Desarrolladores",
    desc: 'Desde tu cuenta de MP, andá a "Tu negocio" → "Configuración" → "Credenciales", o accedé directamente al panel de developers.',
    link: { label: "Abrir panel de credenciales →", url: "https://www.mercadopago.com.ar/settings/account/credentials" },
  },
  {
    num: "3",
    titulo: "Copiá las credenciales de Producción",
    desc: 'En la pestaña "Producción" vas a ver tu Access Token (empieza con APP_USR-) y tu Public Key. Copiá cada uno y pegalo en los campos de abajo.',
  },
];

export function ConfigMercadoPago({ mpAccessToken, mpPublicKey }: Props) {
  const [form, setForm] = useState({ token: mpAccessToken, pubKey: mpPublicKey });
  const [showToken, setShowToken] = useState(false);
  const [showGuia, setShowGuia] = useState(!mpAccessToken);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mp_access_token: form.token || null,
        mp_public_key: form.pubKey || null,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    background: T.bg,
    border: `1px solid ${T.border}`,
    color: T.text,
    fontSize: "0.875rem",
    outline: "none",
    fontFamily: "monospace",
  };

  return (
    <ConfigSection title="MercadoPago" onSave={save}>
      <p className="text-xs" style={{ color: T.textDim }}>
        Credenciales de tu cuenta de MercadoPago. Los alumnos pagan directamente a esta cuenta — el dinero te llega a vos.
      </p>

      {/* Guía paso a paso */}
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        <button
          type="button"
          onClick={() => setShowGuia((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left transition-opacity hover:opacity-80"
          style={{ background: T.bg }}
        >
          <span className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.accent }}>
            ¿Cómo obtengo mis credenciales?
          </span>
          {showGuia
            ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: T.textDim }} />
            : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.textDim }} />
          }
        </button>

        {showGuia && (
          <div className="px-4 pb-4 pt-1 space-y-4" style={{ background: T.bg }}>
            {PASOS_MP.map((paso) => (
              <div key={paso.num} className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
                >
                  {paso.num}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold" style={{ color: T.text }}>{paso.titulo}</p>
                  <p className="text-xs leading-relaxed" style={{ color: T.textDim }}>{paso.desc}</p>
                  {paso.link && (
                    <a
                      href={paso.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
                      style={{ color: T.accent }}
                    >
                      {paso.link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Access Token (APP_USR-...)">
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={form.token}
            onChange={set("token")}
            placeholder="APP_USR-..."
            style={{ ...inputStyle, paddingRight: "2.5rem" }}
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: T.textDim }}
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      <Field label="Public Key (APP_USR-...)">
        <input
          type="text"
          value={form.pubKey}
          onChange={set("pubKey")}
          placeholder="APP_USR-..."
          style={inputStyle}
        />
      </Field>
    </ConfigSection>
  );
}
