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
    <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-fredoka)" }}>
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
          style={{ fontFamily: "var(--font-fredoka)", background: saved ? T.lime : T.accentBg, color: saved ? T.limeText : T.accent, border: `1px solid ${saved ? T.lime : T.accentBorder}` }}
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
      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>
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

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputBase, resize: "vertical", ...props.style }} />;
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: React.ReactNode;
}

// Interruptor con título y descripción — reemplaza los checkboxes sueltos para que
// todas las opciones on/off de Configuración se vean y se usen igual.
export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold" style={{ color: T.text }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="shrink-0 mt-0.5"
        style={{
          display: "inline-flex", alignItems: "center", width: 40, height: 22,
          borderRadius: 999, transition: "background 0.2s", position: "relative", cursor: "pointer",
          background: checked ? T.accent : T.borderSub,
          border: `1px solid ${checked ? T.accentBorder : T.border}`,
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 20 : 2, width: 16, height: 16,
          borderRadius: 999, background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        }} />
      </button>
    </div>
  );
}

// Bloque interno de una sección (fondo gris claro) para agrupar opciones relacionadas.
export function SubBlock({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      {title && (
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// Texto de ayuda bajo un campo o bloque.
export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs" style={{ color: T.textDim }}>{children}</p>;
}

// Campo para credenciales: nunca recibe el valor guardado (no viaja al navegador).
// Muestra si ya hay uno cargado y solo manda el nuevo si el usuario escribe algo.
export function SecretInput({
  value, onChange, configurado, placeholder,
}: { value: string; onChange: (v: string) => void; configurado: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={configurado ? "•••••••••••• (guardado — escribí uno nuevo para reemplazarlo)" : placeholder}
        style={{ ...inputBase, fontFamily: "monospace" }}
      />
    </div>
  );
}
