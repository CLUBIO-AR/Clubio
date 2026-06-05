"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ConfigSection, Field } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  mpAccessToken: string;
  mpPublicKey: string;
}

export function ConfigMercadoPago({ mpAccessToken, mpPublicKey }: Props) {
  const [form, setForm] = useState({ token: mpAccessToken, pubKey: mpPublicKey });
  const [showToken, setShowToken] = useState(false);
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
        Credenciales de tu cuenta de MercadoPago. Los alumnos pagan directamente a esta cuenta.
      </p>

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
