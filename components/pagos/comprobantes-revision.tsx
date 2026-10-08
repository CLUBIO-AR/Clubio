"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, FileText, Loader2, ExternalLink } from "lucide-react";
import { T } from "@/lib/theme";

export type ComprobanteRevision = {
  id: string;
  alumno: string;
  telefono: string;
  createdAt: string;
  url: string | null;
  esPdf: boolean;
  cuotas: Array<{ concepto: string; monto: number; estado: string }>;
};

const AVISO_TEXTO: Record<string, string> = {
  texto: "Le avisamos por WhatsApp.",
  plantilla: "Le avisamos por WhatsApp con la plantilla de confirmación.",
  sin_aviso: "No se le pudo avisar por WhatsApp (pasaron más de 24 h desde su último mensaje).",
};

const pesos = (n: number) => `$${n.toLocaleString("es-AR")}`;

// "Comprobantes por revisar" en Pagos: lo que mandaron los alumnos con "Ya transferí".
export function ComprobantesRevision({ comprobantes }: { comprobantes: ComprobanteRevision[] }) {
  if (comprobantes.length === 0) return null;
  return (
    <section className="rounded-xl p-5 space-y-4" style={{ background: T.card, border: `1px solid ${T.accentBorder}` }}>
      <div>
        <h2 className="text-lg font-black" style={{ fontFamily: "var(--font-fredoka)", color: T.text }}>
          Comprobantes por revisar ({comprobantes.length})
        </h2>
        <p className="text-sm" style={{ color: T.textMuted }}>
          Llegaron por WhatsApp. Al confirmar se registra el pago de esas cuotas como transferencia y se le avisa al alumno.
        </p>
      </div>
      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {comprobantes.map((c) => <Item key={c.id} c={c} />)}
      </ul>
    </section>
  );
}

function Item({ c }: { c: ComprobanteRevision }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "enviando" | "rechazando">("idle");
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = c.cuotas.reduce((acc, q) => acc + q.monto, 0);

  async function revisar(body: { accion: "confirmar" } | { accion: "rechazar"; motivo?: string }) {
    setEstado("enviando");
    setError(null);
    try {
      const res = await fetch(`/api/comprobantes/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setMensaje(`${body.accion === "confirmar" ? "Pago registrado." : "Comprobante rechazado."} ${AVISO_TEXTO[data.aviso] ?? ""}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setEstado("idle");
    }
  }

  return (
    <li className="flex gap-4 rounded-lg p-3" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
      <a
        href={c.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 w-24 h-32 rounded-md overflow-hidden flex items-center justify-center"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
        aria-label={`Ver comprobante de ${c.alumno}`}
      >
        {c.url && !c.esPdf ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada y temporal de Storage
          <img src={c.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <FileText className="w-8 h-8" style={{ color: T.textDim }} />
        )}
      </a>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="font-bold" style={{ color: T.text }}>{c.alumno}</p>
          <p className="text-xs" style={{ color: T.textDim }}>
            {new Date(c.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · +{c.telefono}
          </p>
        </div>

        {c.cuotas.length > 0 ? (
          <ul className="text-sm space-y-0.5" style={{ color: T.textMuted }}>
            {c.cuotas.map((q) => (
              <li key={q.concepto} className={q.estado === "pagada" ? "line-through" : ""}>
                {q.concepto} — {pesos(q.monto)}
              </li>
            ))}
            <li className="font-bold" style={{ color: T.text }}>Total: {pesos(total)}</li>
          </ul>
        ) : (
          <p className="text-sm" style={{ color: T.textMuted }}>No tenía cuotas pendientes al mandarlo.</p>
        )}

        {c.url && (
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: T.accent }}>
            Abrir comprobante <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {mensaje ? (
          <p className="text-sm font-semibold" style={{ color: T.accent }}>{mensaje}</p>
        ) : estado === "rechazando" ? (
          <div className="space-y-2">
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              placeholder="Motivo (opcional): ej. el monto no coincide"
              className="w-full text-sm rounded-md px-2 py-1.5 outline-none"
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
            />
            <div className="flex gap-2">
              <button onClick={() => revisar({ accion: "rechazar", motivo: motivo || undefined })} className="text-sm font-semibold px-3 py-1.5 rounded-md" style={{ background: T.danger, color: "#fff" }}>
                Rechazar comprobante
              </button>
              <button onClick={() => setEstado("idle")} className="text-sm px-3 py-1.5" style={{ color: T.textMuted }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => revisar({ accion: "confirmar" })}
              disabled={estado === "enviando"}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
              style={{ background: T.accent, color: T.accentText }}
            >
              {estado === "enviando" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar pago
            </button>
            <button
              onClick={() => setEstado("rechazando")}
              disabled={estado === "enviando"}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md disabled:opacity-60"
              style={{ border: `1px solid ${T.border}`, color: T.text }}
            >
              <X className="w-4 h-4" /> Rechazar
            </button>
          </div>
        )}
        {error && <p className="text-sm" style={{ color: T.danger }}>{error}</p>}
      </div>
    </li>
  );
}
