"use client";

import { useState } from "react";
import { Check, Copy, Wallet } from "lucide-react";
import { T } from "@/lib/theme";

// Resumen del estado de cuenta en la ficha del alumno. "Copiar resumen" copia el mismo
// texto que manda el bot de WhatsApp, para pegarlo en un chat o un mail.
export function EstadoCuentaCard({
  totalAdeudado, pendientes, vencidas, ultimoPago, resumen,
}: {
  totalAdeudado: number;
  pendientes: number;
  vencidas: number;
  ultimoPago: { concepto: string; fecha: string | null } | null;
  resumen: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const alDia = pendientes === 0;
  const color = alDia ? T.accent : vencidas > 0 ? T.danger : T.text;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumen);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin permiso de portapapeles */ }
  }

  return (
    <div className="rounded-xl p-5 flex flex-wrap items-center gap-5" style={{ background: T.card, border: `1px solid ${vencidas > 0 ? T.danger : T.border}` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
        <Wallet className="w-5 h-5" style={{ color: T.accent }} />
      </div>
      <div className="flex-1 min-w-[180px]">
        <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>Estado de cuenta</p>
        <p className="text-2xl font-bold font-mono" style={{ color }}>
          {alDia ? "Al día" : `$${totalAdeudado.toLocaleString("es-AR")}`}
        </p>
        <p className="text-xs" style={{ color: T.textDim }}>
          {alDia
            ? "Sin cuotas pendientes"
            : `${pendientes} pendiente${pendientes === 1 ? "" : "s"}${vencidas > 0 ? ` · ${vencidas} vencida${vencidas === 1 ? "" : "s"}` : ""}`}
          {ultimoPago && ` · Último pago: ${ultimoPago.concepto}${ultimoPago.fecha ? ` (${new Date(ultimoPago.fecha).toLocaleDateString("es-AR")})` : ""}`}
        </p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-opacity hover:opacity-80"
        style={{ fontFamily: "var(--font-fredoka)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
        title="Copia el resumen con lo pendiente, el total y cómo pagar"
      >
        {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copiado ? "Copiado" : "Copiar resumen"}
      </button>
    </div>
  );
}
