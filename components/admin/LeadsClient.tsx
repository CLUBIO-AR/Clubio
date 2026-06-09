"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Users, TrendingUp, CheckCircle2, AlertTriangle, Loader2, ArrowRightCircle, MessageSquarePlus, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge } from "./AdminBadge";
import { AdminPagination } from "./AdminPagination";
import { cambiarEstadoLeadAction, agregarNotaLeadAction } from "@/app/actions/admin-leads";

export interface LeadRow {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  gym_nombre: string | null;
  cantidad_alumnos: string | null;
  como_nos_conocio: string | null;
  estado: string;
  notas: string | null;
  gym_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Kpis {
  nuevosSemana: number;
  enProceso: number;
  convertidos: number;
  tasaConversion: number;
  sinContactar48hs: number;
}

interface LeadsClientProps {
  leads: LeadRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: { estado: string; cantidad: string; search: string };
  kpis: Kpis;
}

const ESTADO_OPTS = [
  { value: "", label: "Todos los estados" },
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "demo_agendada", label: "Demo agendada" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

const ESTADO_COLORS: Record<string, string> = {
  nuevo: T.blue,
  contactado: T.warning,
  demo_agendada: ADMIN_ACCENT,
  convertido: T.accent,
  perdido: T.danger,
};

const ESTADO_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  demo_agendada: "Demo agendada",
  convertido: "Convertido",
  perdido: "Perdido",
};

const CANTIDAD_OPTS = [
  { value: "", label: "Cualquier tamaño" },
  { value: "<50", label: "< 50 alumnos" },
  { value: "50-100", label: "50-100 alumnos" },
  { value: "100-200", label: "100-200 alumnos" },
  { value: "200+", label: "200+ alumnos" },
];

const inp: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text };
const sel: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" };

export function LeadsClient({ leads, total, page, totalPages, filters, kpis }: LeadsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estadoTarget, setEstadoTarget] = useState<LeadRow | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<string>("nuevo");
  const [notaTarget, setNotaTarget] = useState<LeadRow | null>(null);
  const [nota, setNota] = useState("");

  function applyFilters(next: Partial<{ estado: string; cantidad: string; search: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.estado) params.set("estado", merged.estado);
    if (merged.cantidad) params.set("cantidad", merged.cantidad);
    if (merged.search) params.set("search", merged.search);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    startTransition(() => router.push(`/admin/leads?${params.toString()}`));
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.cantidad) params.set("cantidad", filters.cantidad);
    if (filters.search) params.set("search", filters.search);
    if (p > 1) params.set("page", String(p));
    return `/admin/leads?${params.toString()}`;
  }

  function abrirCambiarEstado(lead: LeadRow) {
    setError(null);
    setNuevoEstado(lead.estado);
    setEstadoTarget(lead);
  }

  function abrirNota(lead: LeadRow) {
    setError(null);
    setNota("");
    setNotaTarget(lead);
  }

  async function handleCambiarEstado() {
    if (!estadoTarget) return;
    setLoading(true);
    setError(null);
    const res = await cambiarEstadoLeadAction(estadoTarget.id, nuevoEstado as "nuevo" | "contactado" | "demo_agendada" | "convertido" | "perdido");
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setEstadoTarget(null);
    router.refresh();
  }

  async function handleAgregarNota() {
    if (!notaTarget) return;
    setLoading(true);
    setError(null);
    const res = await agregarNotaLeadAction(notaTarget.id, nota);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setNotaTarget(null);
    router.refresh();
  }

  const kpiCards = [
    { label: "Nuevos esta semana", value: kpis.nuevosSemana, icon: Users, color: T.blue, bg: `${T.blue}15` },
    { label: "En proceso", value: kpis.enProceso, icon: TrendingUp, color: T.warning, bg: `${T.warning}15` },
    { label: "Convertidos", value: kpis.convertidos, icon: CheckCircle2, color: T.accent, bg: T.accentBg },
    { label: "Tasa de conversión", value: `${kpis.tasaConversion.toFixed(1)}%`, icon: ArrowRightCircle, color: ADMIN_ACCENT, bg: "#F9731620" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>LEADS</h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>{total} lead{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: k.bg, border: `1px solid ${k.color}25` }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <p className="text-2xl font-black leading-none mb-1" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>{k.value}</p>
            <p className="text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {kpis.sinContactar48hs > 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: `${T.warning}10`, border: `1px solid ${T.warning}35` }}>
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: T.warning }} />
          <p className="text-sm" style={{ color: T.text }}>
            <strong>{kpis.sinContactar48hs}</strong> lead{kpis.sinContactar48hs !== 1 ? "s" : ""} sin contactar hace más de 48hs.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar por nombre, email o gym..."
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
        <select value={filters.estado} onChange={(e) => applyFilters({ estado: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {ESTADO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.cantidad} onChange={(e) => applyFilters({ cantidad: e.target.value })} className="h-9 px-3 rounded-lg text-sm" style={sel}>
          {CANTIDAD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>
      )}

      {/* Table */}
      {leads.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-sm" style={{ color: T.textDim }}>No se encontraron leads con estos filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Lead", "Gym", "Tamaño", "Origen", "Estado", "Fecha", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} style={{ borderColor: T.borderSub }}>
                  <TableCell>
                    <p className="font-semibold text-sm" style={{ color: T.text }}>{lead.nombre}</p>
                    <p className="text-xs" style={{ color: T.textDim }}>{lead.email}{lead.telefono ? ` · ${lead.telefono}` : ""}</p>
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: T.textMuted }}>{lead.gym_nombre ?? "—"}</TableCell>
                  <TableCell className="text-sm" style={{ color: T.textDim }}>{lead.cantidad_alumnos ?? "—"}</TableCell>
                  <TableCell className="text-sm" style={{ color: T.textDim }}>{lead.como_nos_conocio ?? "—"}</TableCell>
                  <TableCell>
                    <button onClick={() => abrirCambiarEstado(lead)} className="cursor-pointer">
                      <AdminBadge label={ESTADO_LABELS[lead.estado] ?? lead.estado} color={ESTADO_COLORS[lead.estado] ?? T.textMuted} />
                    </button>
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: T.textDim }}>{new Date(lead.created_at).toLocaleDateString("es-AR")}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirNota(lead)} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 inline-flex items-center gap-1.5 relative"
                        style={{ fontFamily: "var(--font-barlow-condensed)", background: lead.notas ? `${ADMIN_ACCENT}15` : T.card, border: `1px solid ${lead.notas ? ADMIN_ACCENT + "60" : T.border}`, color: lead.notas ? ADMIN_ACCENT : T.textMuted }}>
                        {lead.notas ? <MessageSquare className="w-3 h-3" /> : <MessageSquarePlus className="w-3 h-3" />} Nota
                        {lead.notas && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: ADMIN_ACCENT }} />}
                      </button>
                      {lead.estado !== "convertido" && (
                        <Link href={`/admin/gyms/nuevo?lead_id=${lead.id}`}
                          className={buttonVariants({ className: "gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 h-auto hover:opacity-90" })}
                          style={{ fontFamily: "var(--font-barlow-condensed)", background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
                          <ArrowRightCircle className="w-3 h-3" /> Convertir
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} total={total} hrefForPage={hrefForPage} />

      {/* Cambiar estado dialog */}
      <Dialog open={!!estadoTarget} onOpenChange={(open) => !open && setEstadoTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar estado</DialogTitle>
            <DialogDescription>Lead: {estadoTarget?.nombre}</DialogDescription>
          </DialogHeader>
          <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className="h-9 px-3 rounded-lg text-sm w-full" style={sel}>
            {ESTADO_OPTS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstadoTarget(null)}>Cancelar</Button>
            <Button onClick={handleCambiarEstado} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agregar nota dialog */}
      <Dialog open={!!notaTarget} onOpenChange={(open) => !open && setNotaTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nota</DialogTitle>
            <DialogDescription>Lead: {notaTarget?.nombre}</DialogDescription>
          </DialogHeader>
          {notaTarget?.notas && (
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Historial</p>
              <div className="rounded-lg p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ background: T.bg, border: `1px solid ${T.borderSub}`, color: T.textMuted }}>
                {notaTarget.notas}
              </div>
            </div>
          )}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Escribí la nota..."
            className="w-full rounded-lg px-3 py-2 text-sm resize-none placeholder:opacity-40"
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotaTarget(null)}>Cancelar</Button>
            <Button onClick={handleAgregarNota} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: T.accent, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
