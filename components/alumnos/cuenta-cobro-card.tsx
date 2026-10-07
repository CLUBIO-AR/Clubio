"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Pencil } from "lucide-react";
import { T } from "@/lib/theme";
import { guardarCuentaCobroAction, simularTransferenciaAction } from "@/app/actions/transferencias";

// Alias/CVU propio del alumno: lo que transfiera ahí se imputa solo a sus cuotas.
// Cuando el proveedor esté integrado se va a generar solo; mientras tanto se carga a mano.
export function CuentaCobroCard({ alumnoId, cuenta }: { alumnoId: string; cuenta: { alias: string | null; cvu: string | null } | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [alias, setAlias] = useState(cuenta?.alias ?? "");
  const [cvu, setCvu] = useState(cuenta?.cvu ?? "");
  const [error, setError] = useState<string | null>(null);
  const [montoSim, setMontoSim] = useState("");
  const [resultadoSim, setResultadoSim] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await guardarCuentaCobroAction(alumnoId, { alias: alias.trim(), cvu: cvu.trim() });
      if (!r.ok) { setError(r.error); return; }
      setEditando(false);
      router.refresh();
    });
  }

  function simular() {
    setError(null);
    setResultadoSim(null);
    startTransition(async () => {
      const r = await simularTransferenciaAction(alumnoId, Number(montoSim));
      if (!r.ok) { setError(r.error); return; }
      const textos: Record<string, string> = {
        imputada: "Listo: se imputó a sus cuotas y se le confirmó el pago.",
        saldo_a_favor: "Se imputó y sobró plata: quedó como saldo a favor.",
        sin_asignar: "No se pudo identificar al alumno.",
        duplicada: "Ya estaba registrada.",
      };
      setResultadoSim(textos[r.data.estado] ?? r.data.estado);
      setMontoSim("");
      router.refresh();
    });
  }

  const input = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text } as const;

  return (
    <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
          <Landmark className="w-4 h-4" style={{ color: T.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}>Alias de cobro del alumno</p>
          {cuenta && !editando ? (
            <p className="text-sm font-mono truncate" style={{ color: T.text }}>
              {cuenta.alias}{cuenta.alias && cuenta.cvu && " · "}{cuenta.cvu}
            </p>
          ) : !editando ? (
            <p className="text-sm" style={{ color: T.textDim }}>Sin alias propio todavía</p>
          ) : null}
        </div>
        {!editando && (
          <button type="button" onClick={() => setEditando(true)} className="p-1.5 rounded-lg hover:opacity-75" style={{ color: T.textDim }} aria-label="Editar alias de cobro">
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {cuenta && !editando && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={montoSim} onChange={(e) => setMontoSim(e.target.value.replace(/[^\d]/g, ""))} placeholder="Monto" inputMode="numeric"
            className="w-28 px-3 py-1.5 rounded-lg text-sm font-mono outline-none" style={input} />
          <button type="button" disabled={isPending || !montoSim} onClick={simular}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>
            Simular transferencia
          </button>
          <span className="text-[11px]" style={{ color: T.textDim }}>Prueba el circuito sin plata real</span>
          {resultadoSim && <p className="w-full text-xs" style={{ color: T.accent }}>{resultadoSim}</p>}
          {error && <p className="w-full text-xs" style={{ color: T.danger }}>{error}</p>}
        </div>
      )}

      {editando && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Alias (ej: boxclub.juan.perez)" className="px-3 py-2 rounded-lg text-sm font-mono outline-none" style={input} />
          <input value={cvu} onChange={(e) => setCvu(e.target.value.replace(/\D/g, ""))} placeholder="CVU (22 números)" inputMode="numeric" className="px-3 py-2 rounded-lg text-sm font-mono outline-none" style={input} />
          {error && <p className="text-xs sm:col-span-2" style={{ color: T.danger }}>{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={isPending} onClick={guardar} className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              style={{ fontFamily: "var(--font-fredoka)", background: T.accent, color: T.accentText }}>Guardar</button>
            <button type="button" onClick={() => setEditando(false)} className="px-3 py-1.5 text-xs" style={{ color: T.textDim }}>Cancelar</button>
          </div>
          <p className="text-[11px] sm:col-span-2" style={{ color: T.textDim }}>
            Las transferencias que entren a este alias o CVU se imputan solas a las cuotas del alumno.
          </p>
        </div>
      )}
    </div>
  );
}
