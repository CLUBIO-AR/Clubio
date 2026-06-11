"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Clock, Zap, Bell, TrendingDown } from "lucide-react";
import { T } from "@/lib/theme";
import { PaginationControls } from "@/components/ui/pagination-controls";

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  generar_cuotas:   { label: "Generar cuotas",    icon: Zap,          color: T.accent  },
  enviar_avisos:    { label: "Enviar avisos",      icon: Bell,         color: T.blue    },
  aplicar_recargos: { label: "Aplicar recargos",   icon: TrendingDown, color: T.warning },
};

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const PAGE_SIZE = 10;

function formatFecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES_CORTO[d.getMonth() + 1]}/${String(d.getFullYear()).slice(2)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuracion(ms: number | null) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

type LogRow = {
  id: string;
  tipo: string;
  items_creados: number | null;
  items_error: number | null;
  duracion_ms: number | null;
  error_detalle: string | null;
  created_at: string;
};

interface Props {
  logs: LogRow[];
  total: number;
  page: number;
  desde: string;
  hasta: string;
}

const dateInp: React.CSSProperties = {
  padding: "0.35rem 0.6rem", borderRadius: 8, outline: "none",
  background: T.bg, border: `1px solid ${T.border}`, color: T.text,
  fontSize: "0.78rem", height: 32,
};

export function HistorialEjecuciones({ logs, total, page, desde, hasta }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayFiltro = !!(desde || hasta);

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
          — Historial de ejecuciones
        </h2>
        <div className="flex items-center gap-2">
          <input type="date" value={desde} onChange={(e) => update({ hDesde: e.target.value, hPage: "" })} style={dateInp} />
          <span className="text-xs" style={{ color: T.textDim }}>—</span>
          <input type="date" value={hasta} onChange={(e) => update({ hHasta: e.target.value, hPage: "" })} style={dateInp} />
          {hayFiltro && (
            <button
              onClick={() => update({ hDesde: "", hHasta: "", hPage: "" })}
              className="text-xs font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-opacity hover:opacity-75"
              style={{ fontFamily: "var(--font-barlow-condensed)", color: T.textDim, border: `1px solid ${T.border}` }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-2 grid gap-3 border-b" style={{ borderColor: T.borderSub, background: T.bgDeep, gridTemplateColumns: "1fr 130px 60px 60px 60px" }}>
        {["Fecha", "Tipo", "Items", "Errores", "Estado"].map((h) => (
          <p key={h} className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{h}</p>
        ))}
      </div>

      {logs.length === 0 && (
        <div className="px-5 py-10 text-center" style={{ color: T.textDim }}>
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{hayFiltro ? "Sin ejecuciones en el rango seleccionado" : "Sin registros de ejecución"}</p>
        </div>
      )}

      {logs.map((log) => {
        const tipoInfo = TIPO_CONFIG[log.tipo];
        const hayError = (log.items_error ?? 0) > 0 || !!log.error_detalle;
        const TipoIcon = tipoInfo?.icon ?? Zap;
        return (
          <div key={log.id} className="px-5 py-3 grid gap-3 items-center border-b last:border-b-0"
            style={{ borderColor: T.borderSub, gridTemplateColumns: "1fr 130px 60px 60px 60px" }}>
            <div>
              <p className="text-xs font-mono" style={{ color: T.text }}>{formatFecha(log.created_at)}</p>
              <p className="text-xs" style={{ color: T.textDim }}>{formatDuracion(log.duracion_ms)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <TipoIcon className="w-3.5 h-3.5 shrink-0" style={{ color: tipoInfo?.color ?? T.accent }} />
              <span className="text-xs font-medium truncate" style={{ color: T.text }}>{tipoInfo?.label ?? log.tipo}</span>
            </div>
            <p className="text-xs font-mono" style={{ color: T.textMuted }}>{log.items_creados ?? "—"}</p>
            <p className="text-xs font-mono" style={{ color: (log.items_error ?? 0) > 0 ? T.danger : T.textMuted }}>
              {log.items_error ?? "—"}
            </p>
            <div>
              {hayError ? (
                <XCircle className="w-4 h-4" style={{ color: T.danger }} />
              ) : (
                <CheckCircle className="w-4 h-4" style={{ color: T.accent }} />
              )}
            </div>
          </div>
        );
      })}

      {logs.length > 0 && (
        <div className="px-5 py-3 border-t" style={{ borderColor: T.borderSub }}>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => update({ hPage: p > 1 ? String(p) : "" })}
          />
        </div>
      )}
    </div>
  );
}
