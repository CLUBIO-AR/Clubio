"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { T } from "@/lib/theme";

interface ConfigSectionProps {
  title: string;
  children: React.ReactNode;
  onSave: () => Promise<void>;
}

export function ConfigSection({ title, children, onSave }: ConfigSectionProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
          — {title}
        </h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
        {error && (
          <p className="text-xs" style={{ color: T.danger }}>{error}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-sm transition-all hover:opacity-90 disabled:opacity-50"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: saved ? `${T.lime}20` : T.accentBg, color: saved ? T.lime : T.accent, border: `1px solid ${saved ? T.lime : T.accentBorder}` }}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : null}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: 8,
  background: T.bg,
  border: `1px solid ${T.border}`,
  color: T.text,
  fontSize: "0.875rem",
  outline: "none",
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputBase, ...props.style }} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" {...props} style={{ ...inputBase, ...props.style }} />;
}
