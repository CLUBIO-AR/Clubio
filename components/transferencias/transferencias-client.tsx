"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { T } from "@/lib/theme";
import { aplicarSaldoAction, asignarTransferenciaAction } from "@/app/actions/transferencias";

export type FilaTransferencia = {
  id: string;
  fecha: string;
  monto: number;
  montoImputado: number;
  estado: "pendiente" | "imputada" | "saldo_a_favor" | "sin_asignar";
  pagador: string | null;
  destino: string | null;
  concepto: string | null;
  alumnoId: string | null;
  alumnoNombre: string | null;
};

const ESTADOS: Record<FilaTransferencia["estado"], { label: string; color: string }> = {
  imputada: { label: "Imputada", color: T.accent },
  saldo_a_favor: { label: "Saldo a favor", color: T.blue },
  sin_asignar: { label: "Sin asignar", color: T.danger },
  pendiente: { label: "Procesando", color: T.textDim },
};

const pesos = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

export function TransferenciasClient({ filas, filtro, alumnos }: {
  filas: FilaTransferencia[];
  filtro: "todas" | "sin_asignar" | "saldo_a_favor";
  alumnos: Array<{ id: string; nombre: string; dni: string | null }>;
}) {
  const router = useRouter();
  const [asignando, setAsignando] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const candidatos = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    if (t.length < 2) return [];
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(t) || (a.dni ?? "").includes(t)).slice(0, 8);
  }, [alumnos, busqueda]);

  function asignar(transferenciaId: string, alumnoId: string) {
    setError(null);
    startTransition(async () => {
      const r = await asignarTransferenciaAction(transferenciaId, alumnoId);
      if (!r.ok) { setError(r.error); return; }
      setAsignando(null);
      setBusqueda("");
      router.refresh();
    });
  }

  function aplicarSaldo(transferenciaId: string) {
    setError(null);
    startTransition(async () => {
      const r = await aplicarSaldoAction(transferenciaId);
      if (!r.ok) { setError(r.error); return; }
      if (r.data.aplicado === 0) setError("No hay cuotas pendientes nuevas para aplicar el saldo.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {([["todas", "Todas"], ["sin_asignar", "Sin asignar"], ["saldo_a_favor", "Saldo a favor"]] as const).map(([v, label]) => (
          <Link
            key={v}
            href={v === "todas" ? "/dashboard/transferencias" : `/dashboard/transferencias?filtro=${v}`}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide"
            style={{
              fontFamily: "var(--font-fredoka)",
              background: filtro === v ? T.accentBg : "transparent",
              color: filtro === v ? T.accent : T.textDim,
              border: `1px solid ${filtro === v ? T.accentBorder : T.border}`,
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {error && <p className="text-sm" style={{ color: T.danger }}>{error}</p>}

      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {filas.length === 0 && (
          <p className="text-sm text-center py-10 px-4" style={{ color: T.textDim }}>
            {filtro === "todas"
              ? "Todavía no entró ninguna transferencia. Cuando el proveedor avise de un pago al alias de un alumno, aparece acá."
              : "No hay transferencias en este estado."}
          </p>
        )}
        {filas.map((t) => {
          const e = ESTADOS[t.estado];
          return (
            <div key={t.id} className="px-4 py-3 border-b last:border-b-0" style={{ borderColor: T.borderSub }}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="font-bold font-mono text-base min-w-[110px]" style={{ color: T.text }}>{pesos(t.monto)}</p>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold" style={{ color: T.text }}>
                    {t.alumnoId && t.alumnoNombre
                      ? <Link href={`/dashboard/alumnos/${t.alumnoId}`} className="hover:underline">{t.alumnoNombre}</Link>
                      : <span style={{ color: T.danger }}>Sin alumno</span>}
                  </p>
                  <p className="text-xs" style={{ color: T.textDim }}>
                    {new Date(t.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {t.pagador && ` · de ${t.pagador}`}
                    {t.destino && ` · a ${t.destino}`}
                    {t.concepto && ` · "${t.concepto}"`}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-fredoka)", color: e.color, border: `1px solid ${e.color}` }}>
                  {e.label}
                </span>
                {t.estado === "saldo_a_favor" && (
                  <span className="text-xs" style={{ color: T.textDim }}>Sobran {pesos(t.monto - t.montoImputado)}</span>
                )}
                {t.estado === "saldo_a_favor" && (
                  <button type="button" disabled={isPending} onClick={() => aplicarSaldo(t.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold disabled:opacity-50"
                    style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>
                    Aplicar a cuotas nuevas
                  </button>
                )}
                {t.estado === "sin_asignar" && asignando !== t.id && (
                  <button type="button" onClick={() => { setAsignando(t.id); setBusqueda(""); }}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>
                    Asignar a un alumno
                  </button>
                )}
              </div>

              {asignando === t.id && (
                <div className="mt-2 space-y-1.5 max-w-md">
                  <input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por apellido, nombre o DNI…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
                  {candidatos.map((a) => (
                    <button key={a.id} type="button" disabled={isPending} onClick={() => asignar(t.id, a.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:opacity-80 disabled:opacity-50"
                      style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.text }}>
                      <span>{a.nombre}</span>
                      <span className="text-xs font-mono" style={{ color: T.textDim }}>{a.dni}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setAsignando(null)} className="text-xs" style={{ color: T.textDim }}>Cancelar</button>
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: T.accent }} />}
                  </div>
                  <p className="text-[11px]" style={{ color: T.textDim }}>Al asignarla se imputa a sus cuotas y se le confirma el pago.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
