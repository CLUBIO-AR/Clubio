"use client";

import { useState } from "react";
import { ConfigSection, Field, Input } from "./config-section";
import { T } from "@/lib/theme";

const CLUBIO_ACCENT = "#34d399";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Props {
  logoUrl: string | null;
  colorAcento: string | null;
}

// Identidad visual del gym para los emails que reciben sus alumnos: logo propio
// y color de acento. Si no se configura nada, los emails llevan la identidad de
// CLUBIO (verde #34d399 + wordmark CLUBIO) — ver lib/email/template.ts.
export function ConfigBranding({ logoUrl, colorAcento }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(logoUrl);
  const [color, setColor] = useState(colorAcento ?? "");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  }

  async function save() {
    const tasks: Promise<void>[] = [];

    if (file) {
      tasks.push(
        (async () => {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/config/logo", { method: "POST", body: fd });
          if (!res.ok) throw new Error((await res.json()).error ?? "Error al subir el logo");
          const { url } = await res.json();
          setPreview(url);
          setFile(null);
        })()
      );
    }

    if (color !== (colorAcento ?? "")) {
      if (color && !HEX_RE.test(color)) throw new Error("El color debe tener formato #RRGGBB");
      tasks.push(
        (async () => {
          const res = await fetch("/api/config", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email_color_acento: color || null }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar el color");
        })()
      );
    }

    if (tasks.length === 0) throw new Error("No hay cambios para guardar");
    await Promise.all(tasks);
  }

  return (
    <ConfigSection title="Marca del gimnasio" onSave={save}>
      <Field label="Logo (PNG, JPG o WEBP — máx. 2MB)">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
            style={{ background: T.bg, border: `1px solid ${T.border}` }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Logo del gimnasio" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[10px] uppercase tracking-wider" style={{ color: T.textDim }}>Sin logo</span>
            )}
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            className="text-xs"
            style={{ color: T.textDim }}
          />
        </div>
      </Field>
      <Field label="Color de acento de los emails">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={HEX_RE.test(color) ? color : CLUBIO_ACCENT}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-9 rounded cursor-pointer"
            style={{ background: "transparent", border: `1px solid ${T.border}` }}
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder={CLUBIO_ACCENT}
            className="max-w-[140px]"
          />
          {color && (
            <button
              type="button"
              onClick={() => setColor("")}
              className="text-xs font-bold uppercase tracking-wider hover:opacity-80"
              style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}
            >
              Usar el de CLUBIO
            </button>
          )}
        </div>
      </Field>
      <p className="text-xs" style={{ color: T.textDim }}>
        Se usan en los emails que reciben tus alumnos (avisos de vencimiento, etc). Si no configurás nada, usamos la identidad de CLUBIO.
      </p>
    </ConfigSection>
  );
}
