"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, CreditCard, ChevronLeft, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { T } from "@/lib/theme";

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGO = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_STYLES: Record<string, { bg: string; color: string }> = {
  pendiente:      { bg: `${T.warning}15`, color: T.warning },
  vencida:        { bg: `${T.danger}15`,  color: T.danger  },
  pagada:         { bg: T.accentBg,       color: T.accent  },
  condonada:      { bg: `${T.textDim}15`, color: T.textDim },
  pagada_parcial: { bg: `${T.blue}15`,   color: T.blue     },
};

type CuotaRow = {
  id: string;
  mes: number;
  anio: number;
  monto_total: number | null;
  estado: string;
  fecha_vencimiento: string | null;
  descripcion: string | null;
  actividades: { nombre: string; color: string } | null;
};

interface Props {
  cuotas: CuotaRow[];
  total: number;
  page: number;
  totalPages: number;
  alumnoId: string;
  alumnoNombre: string;
  nonPaidIds: string[];
  filtros: { estado: string; mes: string; anio: string };
}

export function AlumnoCuotasClient({ cuotas, total, page, totalPages, alumnoId, alumnoNombre, nonPaidIds, filtros }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [linkModal, setLinkModal] = useState<{ url: string; cuotaLabel: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingLote, setLoadingLote] = useState(false);
  const [copied, setCopied] = useState(false);

  function setFiltro(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`/dashboard/alumnos/${alumnoId}/cuotas?${params.toString()}`));
  }

  function hrefPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    if (p > 1) params.set("page", String(p)); else params.delete("page");
    return `/dashboard/alumnos/${alumnoId}/cuotas?${params.toString()}`;
  }

  async function generarLink(cuotaId: string, label: string) {
    setLoadingId(cuotaId);
    try {
      const res = await fetch(`/api/cuotas/${cuotaId}/generar-link-pago`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setLinkModal({ url: data.url, cuotaLabel: label });
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setLoadingId(null);
    }
  }

  async function pagarTodo() {
    if (nonPaidIds.length < 2) return;
    setLoadingLote(true);
    try {
      const res = await fetch("/api/cuotas/pagar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuota_ids: nonPaidIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      window.open(data.url, "_blank");
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setLoadingLote(false);
    }
  }

  function copiar(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const anioActual = new Date().getFullYear();
  const años = Array.from({ length: 4 }, (_, i) => anioActual - i);
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filtros.estado}
          onChange={(e) => setFiltro("estado", e.target.value)}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todos los estados</option>
          {["pendiente", "vencida", "pagada", "condonada", "pagada_parcial"].map((e) => (
            <option key={e} value={e}>{e.replace("_", " ")}</option>
          ))}
        </select>

        <select
          value={filtros.mes}
          onChange={(e) => setFiltro("mes", e.target.value)}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>{MESES_LARGO[m]}</option>
          ))}
        </select>

        <select
          value={filtros.anio}
          onChange={(e) => setFiltro("anio", e.target.value)}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todos los años</option>
          {años.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <span className="text-xs ml-auto" style={{ color: T.textDim }}>{total} cuota{total !== 1 ? "s" : ""}</span>

        {nonPaidIds.length >= 2 && (
          <button
            onClick={pagarTodo}
            disabled={loadingLote}
            className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {loadingLote ? "Generando..." : `Cobrar todo a ${alumnoNombre} (${nonPaidIds.length})`}
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {cuotas.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: T.textDim }}>Sin cuotas para los filtros aplicados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Período", "Actividad", "Monto", "Vencimiento", "Estado", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider"
                    style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuotas.map((c, i) => {
                const s = ESTADO_STYLES[c.estado] ?? ESTADO_STYLES.pendiente;
                const actividad = c.actividades;
                const label = `${MESES_LARGO[c.mes]} ${c.anio}`;
                const unpaid = c.estado !== "pagada" && c.estado !== "condonada";
                return (
                  <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid ${T.borderSub}` : undefined }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
                          <span className="text-xs font-bold leading-none" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>{MESES_CORTO[c.mes]}</span>
                          <span className="text-xs leading-none mt-0.5" style={{ color: T.textDim }}>{c.anio}</span>
                        </div>
                        {c.descripcion && (
                          <span className="text-xs" style={{ color: T.textDim }}>{c.descripcion}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {actividad ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: actividad.color ?? T.textDim }} />
                          <span className="text-xs" style={{ color: T.textMuted }}>{actividad.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: T.textDim }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold font-mono" style={{ color: T.text }}>
                      ${c.monto_total?.toLocaleString("es-AR") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: T.textDim }}>
                      {c.fecha_vencimiento
                        ? new Date(`${c.fecha_vencimiento}T00:00:00`).toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider"
                        style={{ fontFamily: "var(--font-barlow-condensed)", background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                        {c.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {unpaid && (
                        <button
                          onClick={() => generarLink(c.id, label)}
                          disabled={loadingId === c.id}
                          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-70 disabled:opacity-40"
                          style={{ fontFamily: "var(--font-barlow-condensed)", color: T.accent }}
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          {loadingId === c.id ? "..." : "Link pago"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: T.textDim }}>
            {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <a
              href={hrefPage(Math.max(1, page - 1))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-opacity ${page === 1 ? "opacity-30 pointer-events-none" : "hover:opacity-70"}`}
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
            >
              <ChevronLeft className="w-4 h-4" />
            </a>
            <span className="text-xs px-3 font-mono" style={{ color: T.textDim }}>{page} / {totalPages}</span>
            <a
              href={hrefPage(Math.min(totalPages, page + 1))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-opacity ${page === totalPages ? "opacity-30 pointer-events-none" : "hover:opacity-70"}`}
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
            >
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Modal link de pago */}
      {linkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setLinkModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
              Link de pago — {linkModal.cuotaLabel}
            </h3>
            <p className="text-xs break-all rounded-lg px-3 py-2.5" style={{ background: T.bg, color: T.textMuted, border: `1px solid ${T.borderSub}`, fontFamily: "monospace" }}>
              {linkModal.url}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => copiar(linkModal.url)}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copiado!" : "Copiar"}
              </button>
              <a
                href={linkModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, color: T.textMuted, border: `1px solid ${T.border}` }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir
              </a>
              <button
                onClick={() => setLinkModal(null)}
                className="h-9 px-3 rounded-lg text-sm transition-opacity hover:opacity-70"
                style={{ color: T.textDim }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
