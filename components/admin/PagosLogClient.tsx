"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, DollarSign, CreditCard, Calendar, Eye, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge } from "./AdminBadge";
import { AdminPagination } from "./AdminPagination";
import type { Json } from "@/types/database";

type GymRef = { id: string; nombre: string };
type AlumnoRef = { id: string; nombre: string; apellido: string } | null;
type GymOption = { id: string; nombre: string };

export interface PagoLogRow {
  id: string;
  monto: number;
  metodo: string;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_detail: Json | null;
  created_at: string;
  gyms: GymRef[] | GymRef;
  alumnos: AlumnoRef[] | AlumnoRef;
}

interface Stats {
  hoy: number;
  semana: number;
  mes: number;
  porMetodo: Record<string, number>;
}

interface PagosLogClientProps {
  pagos: PagoLogRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: { metodo: string; gym_id: string; desde: string; hasta: string; search: string };
  gyms: GymOption[];
  stats: Stats;
}

const METODO_OPTS = [
  { value: "", label: "Todos los métodos" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "otro", label: "Otro" },
];

const METODO_LABELS: Record<string, string> = {
  mercadopago: "Mercado Pago",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
};

const inp: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text };
const sel: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" };

function uno<T>(v: T[] | T | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function PagosLogClient({ pagos, total, page, totalPages, filters, gyms, stats }: PagosLogClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();
  const [detalle, setDetalle] = useState<PagoLogRow | null>(null);

  function applyFilters(next: Partial<{ metodo: string; gym_id: string; desde: string; hasta: string; search: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.metodo) params.set("metodo", merged.metodo);
    if (merged.gym_id) params.set("gym_id", merged.gym_id);
    if (merged.desde) params.set("desde", merged.desde);
    if (merged.hasta) params.set("hasta", merged.hasta);
    if (merged.search) params.set("search", merged.search);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    startTransition(() => router.push(`/admin/logs/pagos?${params.toString()}`));
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (filters.metodo) params.set("metodo", filters.metodo);
    if (filters.gym_id) params.set("gym_id", filters.gym_id);
    if (filters.desde) params.set("desde", filters.desde);
    if (filters.hasta) params.set("hasta", filters.hasta);
    if (filters.search) params.set("search", filters.search);
    if (p > 1) params.set("page", String(p));
    return `/admin/logs/pagos?${params.toString()}`;
  }

  const hayFiltroFecha = !!(filters.desde || filters.hasta);

  const statCards = [
    { label: "Cobrado hoy", value: fmt(stats.hoy), icon: Calendar, color: ADMIN_ACCENT, bg: "#F9731620" },
    { label: "Últimos 7 días", value: fmt(stats.semana), icon: DollarSign, color: T.accent, bg: T.accentBg },
    { label: "Este mes", value: fmt(stats.mes), icon: CreditCard, color: T.blue, bg: `${T.blue}15` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>LOGS · PAGOS</h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>{total.toLocaleString("es-AR")} pago{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg, border: `1px solid ${s.color}25` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>{s.value}</p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</p>
          </div>
        ))}
        <div className="rounded-xl p-5 sm:col-span-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Por método (este mes)</p>
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(stats.porMetodo).length === 0 ? (
              <p className="text-sm" style={{ color: T.textDim }}>Sin pagos este mes.</p>
            ) : Object.entries(stats.porMetodo).map(([metodo, monto]) => (
              <div key={metodo} className="flex items-center gap-2">
                <AdminBadge label={METODO_LABELS[metodo] ?? metodo} color={metodo === "mercadopago" ? T.blue : T.textMuted} />
                <span className="text-sm font-mono" style={{ color: T.text }}>{fmt(monto)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar por payment ID o gym..."
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
        <select value={filters.metodo} onChange={(e) => applyFilters({ metodo: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {METODO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
      {pagos.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: T.textDim }} />
          <p className="text-sm" style={{ color: T.textDim }}>No se encontraron pagos con estos filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Fecha", "Gym", "Alumno", "Monto", "Método", "MP Payment ID", "Estado MP", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((pago) => {
                const gym = uno(pago.gyms);
                const alumno = uno(pago.alumnos);
                return (
                  <TableRow
                    key={pago.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderColor: T.borderSub }}
                    onClick={() => setDetalle(pago)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <TableCell className="text-sm whitespace-nowrap" style={{ color: T.textMuted }}>
                      {new Date(pago.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: T.text }}>{gym?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm" style={{ color: T.textMuted }}>{alumno ? `${alumno.apellido}, ${alumno.nombre}` : "—"}</TableCell>
                    <TableCell className="text-sm font-mono font-semibold" style={{ color: T.text }}>{fmt(Number(pago.monto))}</TableCell>
                    <TableCell><AdminBadge label={METODO_LABELS[pago.metodo] ?? pago.metodo} color={pago.metodo === "mercadopago" ? T.blue : T.textMuted} /></TableCell>
                    <TableCell className="text-sm font-mono truncate max-w-[140px]" style={{ color: T.textDim }}>{pago.mp_payment_id ?? "—"}</TableCell>
                    <TableCell className="text-sm" style={{ color: T.textDim }}>{pago.mp_status ?? "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="w-8 h-8" style={{ color: T.textDim }} onClick={() => setDetalle(pago)}>
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
                <DialogTitle>Pago de {fmt(Number(detalle.monto))}</DialogTitle>
                <DialogDescription>{uno(detalle.gyms)?.nombre} · {new Date(detalle.created_at).toLocaleString("es-AR")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p style={{ color: T.textMuted }}>Alumno: <span style={{ color: T.text }}>{(() => { const a = uno(detalle.alumnos); return a ? `${a.apellido}, ${a.nombre}` : "—"; })()}</span></p>
                <p style={{ color: T.textMuted }}>Método: <AdminBadge label={METODO_LABELS[detalle.metodo] ?? detalle.metodo} color={detalle.metodo === "mercadopago" ? T.blue : T.textMuted} /></p>
                {detalle.mp_payment_id && <p style={{ color: T.textMuted }}>MP Payment ID: <span className="font-mono" style={{ color: T.text }}>{detalle.mp_payment_id}</span></p>}
                {detalle.mp_status && <p style={{ color: T.textMuted }}>Estado MP: <span style={{ color: T.text }}>{detalle.mp_status}</span></p>}
                {detalle.mp_detail !== null && (
                  <div className="pt-1">
                    <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>mp_detail</p>
                    <pre className="rounded-lg p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-64 overflow-y-auto" style={{ background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textMuted }}>
                      {JSON.stringify(detalle.mp_detail, null, 2)}
                    </pre>
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
