"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Loader2, MessageCircle } from "lucide-react";
import { T } from "@/lib/theme";
import { reenviarAvisoAction } from "@/app/actions/avisos";

const ESTADO_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente:      { bg: `${T.warning}15`, color: T.warning },
  vencida:        { bg: `${T.danger}15`,  color: T.danger  },
  pagada:         { bg: T.accentBg,       color: T.accent  },
  condonada:      { bg: `${T.textDim}15`, color: T.textDim },
  pagada_parcial: { bg: `${T.blue}15`,    color: T.blue    },
};
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Cuota = {
  id: string;
  mes: number;
  anio: number;
  monto_total: number | null;
  estado: string;
};

export function AlumnoCuotasList({
  cuotas,
  alumnoId,
  telefono,
}: {
  cuotas: Cuota[];
  alumnoId: string;
  telefono?: string | null;
}) {
  const [enviando, setEnviando] = useState<string | null>(null);

  async function reenviarAviso(cuotaId: string) {
    setEnviando(cuotaId);
    try {
      const result = await reenviarAvisoAction(cuotaId);
      if (!result.ok) alert(result.error);
      else alert(`Aviso enviado por: ${result.data.canales.join(", ")}`);
    } catch {
      alert("Error de red al reenviar el aviso");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-fredoka)" }}>— Últimas cuotas</h2>
        {telefono && (
          <Link
            href={`/dashboard/whatsapp/${encodeURIComponent(telefono)}`}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
            style={{ color: T.accent, fontFamily: "var(--font-fredoka)" }}
          >
            <MessageCircle className="w-3.5 h-3.5" /> Ver chat
          </Link>
        )}
      </div>
      <div>
        {cuotas.map((c) => {
          const s = ESTADO_STYLES[c.estado] ?? ESTADO_STYLES.pendiente;
          const puedeAvisar = c.estado !== "pagada" && c.estado !== "condonada";
          return (
            <div key={c.id} className="px-5 py-3 flex items-center justify-between border-b last:border-b-0" style={{ borderColor: T.borderSub }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                  <span className="text-xs font-bold" style={{ color: T.text, fontFamily: "var(--font-fredoka)" }}>{MESES[c.mes]}</span>
                  <span className="text-xs" style={{ color: T.textDim }}>{c.anio}</span>
                </div>
                <p className="font-bold font-mono" style={{ color: T.text }}>${c.monto_total?.toLocaleString("es-AR")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-fredoka)", background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                  {c.estado.replace("_", " ")}
                </span>
                {puedeAvisar && (
                  <button
                    onClick={() => reenviarAviso(c.id)}
                    disabled={enviando === c.id}
                    title="Reenviar aviso (mail/WhatsApp)"
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-70 disabled:opacity-40"
                    style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent }}
                  >
                    {enviando === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t" style={{ borderColor: T.borderSub }}>
        <Link href={`/dashboard/alumnos/${alumnoId}/cuotas`} className="text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ color: T.accent, fontFamily: "var(--font-fredoka)" }}>
          Ver todas →
        </Link>
      </div>
    </div>
  );
}
