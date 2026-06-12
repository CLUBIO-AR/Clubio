"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Send, Ban, Loader2, ArrowLeft } from "lucide-react";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge } from "./AdminBadge";
import { reenviarLinkCobroAction, cancelarCobroAction } from "@/app/actions/admin-suscripciones";
import type { CobroRow } from "@/app/(admin)/admin/suscripciones/page";

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "#fbbf24",
  pagado:    "#34d399",
  vencido:   "#f87171",
  cancelado: "#6b7280",
};
const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado:    "Pagado",
  vencido:   "Vencido",
  cancelado: "Cancelado",
};
const PLAN_LABELS: Record<string, string> = { basic: "Basic", plus: "Plus (legacy)", multi: "Multi" };

function gymNombre(g: CobroRow["gyms"]): string {
  if (!g) return "—";
  if (Array.isArray(g)) return g[0]?.nombre ?? "—";
  return g.nombre;
}

interface Props {
  cobros: CobroRow[];
  total: number;
  page: number;
  totalPages: number;
  filtroEstado: string;
  filtroGymId: string;
  gymNombreFiltro: string | null;
}

export function SuscripcionesClient({ cobros, total, page, totalPages, filtroEstado, filtroGymId, gymNombreFiltro }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setFiltro(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`/admin/suscripciones?${params.toString()}`);
  }

  async function handleReenviar(cobroId: string) {
    setLoadingId(cobroId);
    setError(null);
    const res = await reenviarLinkCobroAction(cobroId);
    setLoadingId(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function handleCancelar(cobroId: string) {
    if (!confirm("¿Cancelar este cobro?")) return;
    setLoadingId(cobroId);
    setError(null);
    const res = await cancelarCobroAction(cobroId);
    setLoadingId(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function copiarLink(cobroId: string, link: string) {
    await navigator.clipboard.writeText(link);
    setCopiado(cobroId);
    setTimeout(() => setCopiado(null), 2000);
  }

  const ESTADOS = ["", "pendiente", "pagado", "vencido", "cancelado"];

  return (
    <div className="space-y-5">
      {filtroGymId && gymNombreFiltro && (
        <Link
          href={`/admin/gyms/${filtroGymId}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold transition-opacity hover:opacity-70"
          style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a {gymNombreFiltro}
        </Link>
      )}
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
          {gymNombreFiltro ? `COBROS — ${gymNombreFiltro.toUpperCase()}` : "SUSCRIPCIONES"}
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>
          {gymNombreFiltro ? `Historial completo de cobros de ${gymNombreFiltro}` : "Cobros de licencia generados a los gyms"} — {total} total
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {ESTADOS.map((e) => (
          <button
            key={e || "todos"}
            onClick={() => setFiltro("estado", e)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              background: filtroEstado === e ? `${ADMIN_ACCENT}20` : T.card,
              border: `1px solid ${filtroEstado === e ? ADMIN_ACCENT + "60" : T.border}`,
              color: filtroEstado === e ? ADMIN_ACCENT : T.textMuted,
            }}
          >
            {e ? ESTADO_LABELS[e] : "Todos"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {cobros.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: T.textDim }}>Sin cobros registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Gym", "Plan", "Período", "USD", "ARS", "Estado", "Enviado", "Pagado", "Acciones"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider"
                    style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cobros.map((c, i) => (
                <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid ${T.borderSub}` : undefined }}>
                  <td className="px-4 py-3 font-medium" style={{ color: T.text }}>{gymNombre(c.gyms)}</td>
                  <td className="px-4 py-3" style={{ color: T.textMuted }}>{PLAN_LABELS[c.plan] ?? c.plan}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: T.textMuted }}>{c.periodo}</td>
                  <td className="px-4 py-3" style={{ color: T.textMuted }}>USD {c.monto_usd}</td>
                  <td className="px-4 py-3" style={{ color: T.textMuted }}>$ {Number(c.monto_ars).toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3">
                    <AdminBadge label={ESTADO_LABELS[c.estado] ?? c.estado} color={ESTADO_COLORS[c.estado] ?? T.textDim} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: T.textDim }}>
                    {c.email_enviado_at ? new Date(c.email_enviado_at).toLocaleDateString("es-AR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: c.paid_at ? T.accent : T.textDim }}>
                    {c.paid_at ? new Date(c.paid_at).toLocaleDateString("es-AR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {c.link_pago && (
                        <button
                          onClick={() => copiarLink(c.id, c.link_pago!)}
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                          title="Copiar link de pago"
                          style={{ background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textDim }}
                        >
                          {copiado === c.id ? <Check className="w-3 h-3" style={{ color: T.accent }} /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                      {(c.estado === "pendiente" || c.estado === "vencido") && (
                        <button
                          onClick={() => handleReenviar(c.id)}
                          disabled={loadingId === c.id}
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-70 inline-flex items-center"
                          title="Reenviar email con link"
                          style={{ background: `${ADMIN_ACCENT}15`, border: `1px solid ${ADMIN_ACCENT}40`, color: ADMIN_ACCENT }}
                        >
                          {loadingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </button>
                      )}
                      {c.estado === "pendiente" && (
                        <button
                          onClick={() => handleCancelar(c.id)}
                          disabled={loadingId === c.id}
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
                          title="Cancelar cobro"
                          style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: T.textDim }}>
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <button onClick={() => setFiltro("page", String(page - 1))}
                className="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, border: `1px solid ${T.border}`, color: T.textMuted }}>
                Anterior
              </button>
            )}
            {page < totalPages && (
              <button onClick={() => setFiltro("page", String(page + 1))}
                className="px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, border: `1px solid ${T.border}`, color: T.textMuted }}>
                Siguiente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
