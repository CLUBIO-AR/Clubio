"use client";

import { useState } from "react";
import { Zap, Bell, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { T } from "@/lib/theme";

type TriggerResult = {
  ok: boolean;
  tipo: string;
  resultado?: {
    enviados?: number;
    creadas?: number;
    ok?: boolean;
  };
  error?: string;
};

const TIPOS = [
  {
    key: "enviar_avisos",
    label: "Enviar avisos",
    desc: "Manda emails a alumnos con cuotas próximas a vencer o vencidas",
    icon: Bell,
    color: T.blue,
  },
  {
    key: "generar_cuotas",
    label: "Generar cuotas",
    desc: "Genera cuotas del mes actual para todos los alumnos activos",
    icon: Zap,
    color: T.accent,
  },
] as const;

export function CronsActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TriggerResult>>({});
  const [expanded, setExpanded] = useState(false);

  async function trigger(tipo: string) {
    setLoading(tipo);
    try {
      const res = await fetch("/api/cron/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json();
      setResults((prev) => ({ ...prev, [tipo]: { ok: res.ok, tipo, ...data } }));
    } catch {
      setResults((prev) => ({ ...prev, [tipo]: { ok: false, tipo, error: "Error de red" } }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-center justify-between transition-colors hover:opacity-80"
        style={{ borderBottom: expanded ? `1px solid ${T.borderSub}` : "none" }}
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]"
          style={{ color: T.warning, fontFamily: "var(--font-barlow-condensed)" }}>
          — Ejecución manual (testing)
        </h2>
        {expanded
          ? <ChevronUp className="w-4 h-4" style={{ color: T.textDim }} />
          : <ChevronDown className="w-4 h-4" style={{ color: T.textDim }} />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          <p className="text-xs" style={{ color: T.textDim }}>
            Ejecuta el worker para este gym ahora mismo, sin esperar el cron automático.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TIPOS.map(({ key, label, desc, icon: Icon, color }) => {
              const result = results[key];
              const isLoading = loading === key;
              return (
                <div key={key} className="rounded-lg p-4 space-y-3"
                  style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold uppercase tracking-wide"
                        style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                        {label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => trigger(key)}
                    disabled={!!loading}
                    className="w-full h-9 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-40"
                    style={{
                      fontFamily: "var(--font-barlow-condensed)",
                      background: `${color}15`,
                      color,
                      border: `1px solid ${color}30`,
                    }}
                  >
                    {isLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ejecutando...</>
                      : <><Icon className="w-3.5 h-3.5" /> Ejecutar ahora</>}
                  </button>

                  {result && (
                    <div className="flex items-start gap-2 p-2 rounded-lg"
                      style={{ background: result.ok ? `${T.accent}10` : `${T.danger}10`, border: `1px solid ${result.ok ? T.accentBorder : T.danger}30` }}>
                      {result.ok
                        ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: T.accent }} />
                        : <XCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: T.danger }} />}
                      <div>
                        {result.ok ? (
                          <p className="text-xs font-bold" style={{ color: T.accent }}>
                            {key === "enviar_avisos"
                              ? `${result.resultado?.enviados ?? 0} avisos enviados`
                              : `${result.resultado?.creadas ?? 0} cuotas creadas`}
                          </p>
                        ) : (
                          <p className="text-xs font-bold" style={{ color: T.danger }}>
                            {result.error ?? "Error al ejecutar"}
                          </p>
                        )}
                        <p className="text-xs" style={{ color: T.textDim }}>
                          {new Date().toLocaleTimeString("es-AR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
