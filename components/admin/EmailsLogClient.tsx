"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Mail, CheckCircle2, AlertCircle, Eye, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge } from "./AdminBadge";
import { AdminPagination } from "./AdminPagination";

type GymRef = { id: string; nombre: string };
type GymOption = { id: string; nombre: string };

export interface EmailLogRow {
  id: string;
  tipo: string;
  enviado_a: string | null;
  estado: string | null;
  canal: string;
  provider_id: string | null;
  error_detail: string | null;
  subject: string | null;
  preview: string | null;
  created_at: string;
  gyms: GymRef[] | GymRef;
}

interface EmailsLogClientProps {
  logs: EmailLogRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: { tipo: string; estado: string; gym_id: string; desde: string; hasta: string; search: string };
  gyms: GymOption[];
}

const TIPO_OPTS = [
  { value: "", label: "Todos los tipos" },
  { value: "aviso_vencimiento", label: "Aviso de vencimiento" },
  { value: "recordatorio_vencido", label: "Recordatorio vencido" },
  { value: "confirmacion_pago", label: "Confirmación de pago" },
  { value: "bienvenida", label: "Bienvenida" },
];

const ESTADO_OPTS = [
  { value: "", label: "Todos los estados" },
  { value: "enviado", label: "Enviado" },
  { value: "error", label: "Error" },
];

const inp: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text };
const sel: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" };

function gymDe(g: GymRef[] | GymRef) {
  return Array.isArray(g) ? g[0] : g;
}

export function EmailsLogClient({ logs, total, page, totalPages, filters, gyms }: EmailsLogClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();
  const [detalle, setDetalle] = useState<EmailLogRow | null>(null);

  function applyFilters(next: Partial<{ tipo: string; estado: string; gym_id: string; desde: string; hasta: string; search: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.tipo) params.set("tipo", merged.tipo);
    if (merged.estado) params.set("estado", merged.estado);
    if (merged.gym_id) params.set("gym_id", merged.gym_id);
    if (merged.desde) params.set("desde", merged.desde);
    if (merged.hasta) params.set("hasta", merged.hasta);
    if (merged.search) params.set("search", merged.search);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    startTransition(() => router.push(`/admin/logs/emails?${params.toString()}`));
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (filters.tipo) params.set("tipo", filters.tipo);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.gym_id) params.set("gym_id", filters.gym_id);
    if (filters.desde) params.set("desde", filters.desde);
    if (filters.hasta) params.set("hasta", filters.hasta);
    if (filters.search) params.set("search", filters.search);
    if (p > 1) params.set("page", String(p));
    return `/admin/logs/emails?${params.toString()}`;
  }

  const hayFiltroFecha = !!(filters.desde || filters.hasta);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>LOGS · EMAILS</h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>{total.toLocaleString("es-AR")} envío{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar por destinatario, asunto o gym..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({ search })}
            className="pl-9 placeholder:opacity-25"
            style={inp}
          />
        </div>
        <button
          onClick={() => applyFilters({ search })}
          disabled={isPending}
          className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, border: `1px solid ${T.border}`, color: ADMIN_ACCENT }}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
        </button>
        <select value={filters.tipo} onChange={(e) => applyFilters({ tipo: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {TIPO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.estado} onChange={(e) => applyFilters({ estado: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {ESTADO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.gym_id} onChange={(e) => applyFilters({ gym_id: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          <option value="">Todos los gyms</option>
          {gyms.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
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
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: T.textDim }} />
          <p className="text-sm" style={{ color: T.textDim }}>No se encontraron envíos con estos filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Fecha", "Gym", "Destinatario", "Tipo", "Asunto", "Canal", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const gym = gymDe(log.gyms);
                const ok = log.estado === "enviado";
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
                    <TableCell className="text-sm" style={{ color: T.text }}>{gym?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono truncate max-w-[180px]" style={{ color: T.textMuted }}>{log.enviado_a ?? "—"}</TableCell>
                    <TableCell className="text-sm capitalize" style={{ color: T.textDim }}>{log.tipo.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm truncate max-w-[220px]" style={{ color: T.textMuted }}>{log.subject ?? "—"}</TableCell>
                    <TableCell className="text-sm uppercase" style={{ color: T.textDim }}>{log.canal}</TableCell>
                    <TableCell>
                      {ok ? (
                        <AdminBadge label="Enviado" color={T.accent} />
                      ) : (
                        <AdminBadge label={log.estado ?? "Error"} color={T.danger} />
                      )}
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
                <DialogTitle className="flex items-center gap-2">
                  {detalle.estado === "enviado" ? <CheckCircle2 className="w-4 h-4" style={{ color: T.accent }} /> : <AlertCircle className="w-4 h-4" style={{ color: T.danger }} />}
                  {detalle.subject ?? detalle.tipo.replace(/_/g, " ")}
                </DialogTitle>
                <DialogDescription>{gymDe(detalle.gyms)?.nombre} · {new Date(detalle.created_at).toLocaleString("es-AR")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p style={{ color: T.textMuted }}>Destinatario: <span className="font-mono" style={{ color: T.text }}>{detalle.enviado_a ?? "—"}</span></p>
                <p style={{ color: T.textMuted }}>Tipo: <span className="capitalize" style={{ color: T.text }}>{detalle.tipo.replace(/_/g, " ")}</span></p>
                <p style={{ color: T.textMuted }}>Canal: <span className="uppercase" style={{ color: T.text }}>{detalle.canal}</span></p>
                <p style={{ color: T.textMuted }}>Estado: <AdminBadge label={detalle.estado ?? "—"} color={detalle.estado === "enviado" ? T.accent : T.danger} /></p>
                {detalle.provider_id && <p style={{ color: T.textMuted }}>Provider ID: <span className="font-mono" style={{ color: T.text }}>{detalle.provider_id}</span></p>}
                {detalle.preview && (
                  <div className="pt-1">
                    <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Vista previa</p>
                    <p className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textMuted }}>{detalle.preview}</p>
                  </div>
                )}
                {detalle.error_detail && (
                  <div className="pt-1">
                    <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: T.danger, fontFamily: "var(--font-barlow-condensed)" }}>Error</p>
                    <p className="rounded-lg p-3 text-xs font-mono leading-relaxed" style={{ background: `${T.danger}10`, border: `1px solid ${T.danger}30`, color: T.danger }}>{detalle.error_detail}</p>
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
