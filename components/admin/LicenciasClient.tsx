"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge, PLAN_COLORS, PLAN_LABELS } from "./AdminBadge";
import { AdminPagination } from "./AdminPagination";
import { cambiarPlanAction, renovarLicenciaAction } from "@/app/actions/admin-gyms";

type GymRef = { id: string; nombre: string; email_contacto: string; activo: boolean };

export interface LicenciaRow {
  id: string;
  plan: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  activa: boolean;
  es_trial: boolean;
  precio_pagado: number | null;
  moneda: string;
  gyms: GymRef[] | GymRef;
}

interface LicenciasClientProps {
  licencias: LicenciaRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: { plan: string; estado: string; search: string };
}

const PLAN_OPTS = [
  { value: "", label: "Todos los planes" },
  { value: "basic", label: "Basic" },
  { value: "plus", label: "Plus" },
  { value: "multi", label: "Multi" },
];

const ESTADO_OPTS = [
  { value: "", label: "Todos los estados" },
  { value: "vigente", label: "Vigente" },
  { value: "por_vencer", label: "Por vencer (≤7 días)" },
  { value: "vencida", label: "Vencida" },
];

function gymDe(l: LicenciaRow) {
  return Array.isArray(l.gyms) ? l.gyms[0] : l.gyms;
}

function estadoDe(l: LicenciaRow): { label: string; color: string } {
  const hoy = new Date();
  const vencimiento = new Date(l.fecha_vencimiento);
  const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
  if (diffDias < 0) return { label: "Vencida", color: T.danger };
  if (diffDias <= 7) return { label: "Por vencer", color: T.warning };
  return { label: "Vigente", color: T.accent };
}

export function LicenciasClient({ licencias, total, page, totalPages, filters }: LicenciasClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planTarget, setPlanTarget] = useState<LicenciaRow | null>(null);
  const [renovarTarget, setRenovarTarget] = useState<LicenciaRow | null>(null);
  const [nuevoPlan, setNuevoPlan] = useState<"basic" | "plus" | "multi">("basic");
  const [meses, setMeses] = useState(12);
  const [precio, setPrecio] = useState(0);

  function applyFilters(next: Partial<{ plan: string; estado: string; search: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.plan) params.set("plan", merged.plan);
    if (merged.estado) params.set("estado", merged.estado);
    if (merged.search) params.set("search", merged.search);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    startTransition(() => router.push(`/admin/licencias?${params.toString()}`));
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (filters.plan) params.set("plan", filters.plan);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.search) params.set("search", filters.search);
    if (p > 1) params.set("page", String(p));
    return `/admin/licencias?${params.toString()}`;
  }

  function abrirCambiarPlan(l: LicenciaRow) {
    setError(null);
    setNuevoPlan(l.plan as "basic" | "plus" | "multi");
    setPlanTarget(l);
  }

  function abrirRenovar(l: LicenciaRow) {
    setError(null);
    setMeses(12);
    setPrecio(l.precio_pagado ?? 0);
    setRenovarTarget(l);
  }

  async function handleCambiarPlan() {
    if (!planTarget) return;
    const gym = gymDe(planTarget);
    setLoading(true);
    setError(null);
    const res = await cambiarPlanAction(gym.id, planTarget.id, nuevoPlan);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setPlanTarget(null);
    router.refresh();
  }

  async function handleRenovar() {
    if (!renovarTarget) return;
    const gym = gymDe(renovarTarget);
    setLoading(true);
    setError(null);
    const res = await renovarLicenciaAction(gym.id, renovarTarget.id, meses, precio);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setRenovarTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>LICENCIAS</h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>{total} licencia{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar por gym..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters({ search })}
            className="pl-9 placeholder:opacity-25"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
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
        <select
          value={filters.plan}
          onChange={(e) => applyFilters({ plan: e.target.value })}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          {PLAN_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.estado}
          onChange={(e) => applyFilters({ estado: e.target.value })}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          {ESTADO_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>
      )}

      {/* Table */}
      {licencias.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-sm" style={{ color: T.textDim }}>No se encontraron licencias con estos filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Gym", "Plan", "Inicio", "Vencimiento", "Estado", "Precio acordado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {licencias.map((l) => {
                const gym = gymDe(l);
                const estado = estadoDe(l);
                return (
                  <TableRow
                    key={l.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderColor: T.borderSub }}
                    onClick={() => router.push(`/admin/gyms/${gym.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <TableCell>
                      <p className="font-semibold text-sm" style={{ color: T.text }}>{gym.nombre}</p>
                      <p className="text-xs" style={{ color: T.textDim }}>{gym.email_contacto}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <AdminBadge label={PLAN_LABELS[l.plan] ?? l.plan} color={PLAN_COLORS[l.plan] ?? T.textMuted} />
                        {l.es_trial && <AdminBadge label="Trial" color={T.blue} />}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: T.textMuted }}>{new Date(l.fecha_inicio).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell className="text-sm" style={{ color: estado.color }}>{new Date(l.fecha_vencimiento).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell>
                      <AdminBadge label={estado.label} color={estado.color} />
                    </TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: T.text }}>{l.moneda} {l.precio_pagado ?? "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => abrirCambiarPlan(l)} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                          style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
                          Cambiar plan
                        </button>
                        <button onClick={() => abrirRenovar(l)} className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 inline-flex items-center gap-1.5"
                          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent }}>
                          <RefreshCw className="w-3 h-3" /> Renovar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} total={total} hrefForPage={hrefForPage} />

      {/* Cambiar plan dialog */}
      <Dialog open={!!planTarget} onOpenChange={(open) => !open && setPlanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar plan</DialogTitle>
            <DialogDescription>Actualizá el plan contratado por {planTarget ? gymDe(planTarget).nombre : ""}.</DialogDescription>
          </DialogHeader>
          <select value={nuevoPlan} onChange={(e) => setNuevoPlan(e.target.value as "basic" | "plus" | "multi")} className="h-9 px-3 rounded-lg text-sm w-full"
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
            <option value="basic">Basic — USD 28</option>
            <option value="plus">Plus — USD 45</option>
            <option value="multi">Multi — USD 75</option>
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanTarget(null)}>Cancelar</Button>
            <Button onClick={handleCambiarPlan} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renovar licencia dialog */}
      <Dialog open={!!renovarTarget} onOpenChange={(open) => !open && setRenovarTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar licencia</DialogTitle>
            <DialogDescription>Extiende el vencimiento desde la fecha actual o desde el vencimiento vigente (lo que sea posterior).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Meses a agregar</label>
              <Input type="number" min={1} value={meses} onChange={(e) => setMeses(Number(e.target.value))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Precio acordado (USD)</label>
              <Input type="number" min={0} value={precio} onChange={(e) => setPrecio(Number(e.target.value))} style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenovarTarget(null)}>Cancelar</Button>
            <Button onClick={handleRenovar} disabled={loading} className={buttonVariants({ className: "gap-2" })} style={{ background: T.accent, color: T.bgDeep, border: "none" }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Renovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
