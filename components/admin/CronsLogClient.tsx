"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, XCircle, Zap, Bell, TrendingDown, Loader2, Play, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge } from "./AdminBadge";
import { AdminPagination } from "./AdminPagination";
import { ejecutarCronManualAction } from "@/app/actions/admin-crons";

type GymRef = { id: string; nombre: string } | null;
type GymOption = { id: string; nombre: string };

export interface CronLogRow {
  id: string;
  gym_id: string | null;
  tipo: string;
  es_dispatcher: boolean;
  gyms_total: number | null;
  gyms_ok: number | null;
  gyms_error: number | null;
  items_creados: number | null;
  items_saltados: number | null;
  items_error: number | null;
  duracion_ms: number | null;
  error_detalle: string | null;
  triggered_by: string | null;
  created_at: string;
  gyms: GymRef[] | GymRef;
}

interface CronsLogClientProps {
  logs: CronLogRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: { tipo: string; alcance: string; con_errores: boolean; gym_id: string; desde: string; hasta: string };
  gyms: GymOption[];
}

const TIPO_OPTS = [
  { value: "", label: "Todos los tipos" },
  { value: "generar_cuotas", label: "Generar cuotas" },
  { value: "enviar_avisos", label: "Enviar avisos" },
  { value: "aplicar_recargos", label: "Aplicar recargos" },
];

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  generar_cuotas: { label: "Generar cuotas", icon: Zap, color: T.accent },
  enviar_avisos: { label: "Enviar avisos", icon: Bell, color: T.blue },
  aplicar_recargos: { label: "Aplicar recargos", icon: TrendingDown, color: T.warning },
};

const ALCANCE_OPTS = [
  { value: "", label: "Dispatcher + workers" },
  { value: "dispatcher", label: "Solo dispatchers" },
  { value: "worker", label: "Solo workers" },
];

const sel: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" };

function formatDuracion(ms: number | null) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function gymDe(g: GymRef[] | GymRef) {
  return Array.isArray(g) ? (g[0] ?? null) : g;
}

const ES_DEV = process.env.NODE_ENV !== "production";

export function CronsLogClient({ logs, total, page, totalPages, filters, gyms }: CronsLogClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [detalle, setDetalle] = useState<CronLogRow | null>(null);
  const [ejecutando, setEjecutando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [gymEjecucion, setGymEjecucion] = useState("");

  function applyFilters(next: Partial<{ tipo: string; alcance: string; con_errores: boolean; gym_id: string; desde: string; hasta: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.tipo) params.set("tipo", merged.tipo);
    if (merged.alcance) params.set("alcance", merged.alcance);
    if (merged.con_errores) params.set("con_errores", "1");
    if (merged.gym_id) params.set("gym_id", merged.gym_id);
    if (merged.desde) params.set("desde", merged.desde);
    if (merged.hasta) params.set("hasta", merged.hasta);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    startTransition(() => router.push(`/admin/logs/crons?${params.toString()}`));
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (filters.tipo) params.set("tipo", filters.tipo);
    if (filters.alcance) params.set("alcance", filters.alcance);
    if (filters.con_errores) params.set("con_errores", "1");
    if (filters.gym_id) params.set("gym_id", filters.gym_id);
    if (filters.desde) params.set("desde", filters.desde);
    if (filters.hasta) params.set("hasta", filters.hasta);
    if (p > 1) params.set("page", String(p));
    return `/admin/logs/crons?${params.toString()}`;
  }

  async function ejecutar(tipo: string) {
    if (!gymEjecucion) {
      setMensaje({ ok: false, texto: "Seleccioná un gym antes de ejecutar." });
      return;
    }
    setEjecutando(tipo);
    setMensaje(null);
    const res = await ejecutarCronManualAction(tipo, gymEjecucion);
    setEjecutando(null);
    const gymNombre = gyms.find((g) => g.id === gymEjecucion)?.nombre ?? gymEjecucion;
    setMensaje(res.ok ? { ok: true, texto: `Cron "${tipo}" ejecutado correctamente para ${gymNombre}.` } : { ok: false, texto: res.error });
    if (res.ok) router.refresh();
  }

  const hayFiltroFecha = !!(filters.desde || filters.hasta);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>LOGS · CRONS</h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>{total.toLocaleString("es-AR")} ejecución{total !== 1 ? "es" : ""} registrada{total !== 1 ? "s" : ""}</p>
        </div>
        {ES_DEV && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Ejecutar manualmente para:</span>
            <select value={gymEjecucion} onChange={(e) => setGymEjecucion(e.target.value)} className="h-9 px-3 rounded-lg text-sm" style={sel}>
              <option value="">Seleccionar gym...</option>
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
              <button key={tipo} onClick={() => ejecutar(tipo)} disabled={!!ejecutando || !gymEjecucion}
                className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 inline-flex items-center gap-1.5 disabled:opacity-40"
                style={{ fontFamily: "var(--font-barlow-condensed)", background: `${cfg.color}15`, border: `1px solid ${cfg.color}40`, color: cfg.color }}>
                {ejecutando === tipo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} {cfg.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {mensaje && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: mensaje.ok ? T.accentBg : `${T.danger}15`, border: `1px solid ${mensaje.ok ? T.accentBorder : T.danger}40`, color: mensaje.ok ? T.accent : T.danger }}>
          {mensaje.texto}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filters.tipo} onChange={(e) => applyFilters({ tipo: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {TIPO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.alcance} onChange={(e) => applyFilters({ alcance: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {ALCANCE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.gym_id} onChange={(e) => applyFilters({ gym_id: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          <option value="">Todos los gyms</option>
          {gyms.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <label className="h-9 px-3 rounded-lg text-sm inline-flex items-center gap-2 cursor-pointer" style={sel}>
          <input type="checkbox" checked={filters.con_errores} onChange={(e) => applyFilters({ con_errores: e.target.checked })} />
          Solo con errores
        </label>
        <div className="flex items-center gap-2">
          <input type="date" value={filters.desde} onChange={(e) => applyFilters({ desde: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel} />
          <span className="text-xs" style={{ color: T.textDim }}>—</span>
          <input type="date" value={filters.hasta} onChange={(e) => applyFilters({ hasta: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel} />
          {hayFiltroFecha && (
            <button onClick={() => applyFilters({ desde: "", hasta: "" })} className="text-xs font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-opacity hover:opacity-75"
              style={{ fontFamily: "var(--font-barlow-condensed)", color: T.textDim, border: `1px solid ${T.border}` }}>
              Limpiar
            </button>
          )}
        </div>
        {isPending && <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.textDim }} />}
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: T.textDim }} />
          <p className="text-sm" style={{ color: T.textDim }}>No se encontraron ejecuciones con estos filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Fecha", "Tipo", "Alcance", "Gym", "Items", "Errores", "Duración", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const cfg = TIPO_CONFIG[log.tipo];
                const Icon = cfg?.icon ?? Zap;
                const gym = gymDe(log.gyms);
                const hayError = (log.items_error ?? 0) > 0 || (log.gyms_error ?? 0) > 0 || !!log.error_detalle;
                return (
                  <TableRow
                    key={log.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderColor: T.borderSub }}
                    onClick={() => setDetalle(log)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <TableCell className="text-sm whitespace-nowrap" style={{ color: T.textMuted }}>
                      {new Date(log.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg?.color ?? T.accent }} />
                        <span className="text-sm" style={{ color: T.text }}>{cfg?.label ?? log.tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AdminBadge label={log.es_dispatcher ? "Dispatcher" : "Worker"} color={log.es_dispatcher ? ADMIN_ACCENT : T.blue} />
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: T.textMuted }}>{gym?.nombre ?? (log.es_dispatcher ? "Todos" : "—")}</TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: T.textMuted }}>
                      {log.es_dispatcher ? `${log.gyms_ok ?? 0}/${log.gyms_total ?? 0}` : (log.items_creados ?? "—")}
                    </TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: hayError ? T.danger : T.textMuted }}>
                      {log.es_dispatcher ? (log.gyms_error ?? 0) : (log.items_error ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: T.textMuted }}>{formatDuracion(log.duracion_ms)}</TableCell>
                    <TableCell>
                      {hayError ? <XCircle className="w-4 h-4" style={{ color: T.danger }} /> : <CheckCircle className="w-4 h-4" style={{ color: T.accent }} />}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="w-8 h-8" style={{ color: T.textDim }} onClick={() => setDetalle(log)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} total={total} hrefForPage={hrefForPage} />

      {/* Detalle */}
      <Dialog open={!!detalle} onOpenChange={(open) => !open && setDetalle(null)}>
        <DialogContent>
          {detalle && (
            <>
              <DialogHeader>
                <DialogTitle>{TIPO_CONFIG[detalle.tipo]?.label ?? detalle.tipo} · {detalle.es_dispatcher ? "Dispatcher" : "Worker"}</DialogTitle>
                <DialogDescription>{gymDe(detalle.gyms)?.nombre ?? "Todos los gyms"} · {new Date(detalle.created_at).toLocaleString("es-AR")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {detalle.es_dispatcher ? (
                  <>
                    <p style={{ color: T.textMuted }}>Gyms procesados: <span style={{ color: T.text }}>{detalle.gyms_total ?? 0}</span></p>
                    <p style={{ color: T.textMuted }}>OK: <span style={{ color: T.accent }}>{detalle.gyms_ok ?? 0}</span> · Error: <span style={{ color: T.danger }}>{detalle.gyms_error ?? 0}</span></p>
                  </>
                ) : (
                  <>
                    <p style={{ color: T.textMuted }}>Items creados: <span style={{ color: T.text }}>{detalle.items_creados ?? 0}</span></p>
                    <p style={{ color: T.textMuted }}>Items saltados: <span style={{ color: T.text }}>{detalle.items_saltados ?? 0}</span></p>
                    <p style={{ color: T.textMuted }}>Items con error: <span style={{ color: detalle.items_error ? T.danger : T.text }}>{detalle.items_error ?? 0}</span></p>
                  </>
                )}
                <p style={{ color: T.textMuted }}>Duración: <span style={{ color: T.text }}>{formatDuracion(detalle.duracion_ms)}</span></p>
                {detalle.triggered_by && <p style={{ color: T.textMuted }}>Disparado por: <span style={{ color: T.text }}>{detalle.triggered_by}</span></p>}
                {detalle.error_detalle && (
                  <div className="pt-1">
                    <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: T.danger, fontFamily: "var(--font-barlow-condensed)" }}>Error</p>
                    <p className="rounded-lg p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ background: `${T.danger}10`, border: `1px solid ${T.danger}30`, color: T.danger }}>{detalle.error_detalle}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
