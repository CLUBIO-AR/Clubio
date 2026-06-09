"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Search, MoreHorizontal, Eye, Ban, CheckCircle2, Loader2 } from "lucide-react";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { AdminBadge, PLAN_COLORS, PLAN_LABELS } from "./AdminBadge";
import { AdminPagination } from "./AdminPagination";
import { toggleGymActivoAction } from "@/app/actions/admin-gyms";

export interface GymRow {
  id: string;
  nombre: string;
  email_contacto: string;
  activo: boolean;
  created_at: string;
  licencias: { id: string; plan: string; activa: boolean; fecha_vencimiento: string; es_trial: boolean }[] | { id: string; plan: string; activa: boolean; fecha_vencimiento: string; es_trial: boolean };
}

interface GymsClientProps {
  gyms: GymRow[];
  total: number;
  page: number;
  totalPages: number;
  alumnosPorGym: Record<string, number>;
  cobradoPorGym: Record<string, number>;
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
  { value: "activo", label: "Activo" },
  { value: "suspendido", label: "Suspendido" },
  { value: "vencida", label: "Licencia vencida" },
];

function licenciaDe(g: GymRow) {
  return Array.isArray(g.licencias) ? g.licencias[0] : g.licencias;
}

export function GymsClient({ gyms, total, page, totalPages, alumnosPorGym, cobradoPorGym, filters }: GymsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  function applyFilters(next: Partial<{ plan: string; estado: string; search: string; page: number }>) {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.plan) params.set("plan", merged.plan);
    if (merged.estado) params.set("estado", merged.estado);
    if (merged.search) params.set("search", merged.search);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    startTransition(() => router.push(`/admin/gyms?${params.toString()}`));
  }

  function hrefForPage(p: number) {
    const params = new URLSearchParams();
    if (filters.plan) params.set("plan", filters.plan);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.search) params.set("search", filters.search);
    if (p > 1) params.set("page", String(p));
    return `/admin/gyms?${params.toString()}`;
  }

  async function handleToggleActivo(id: string, currentActivo: boolean) {
    setActionLoadingId(id);
    await toggleGymActivoAction(id, !currentActivo);
    setActionLoadingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>GYMS</h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>{total} gym{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/gyms/nuevo"
          className={buttonVariants({ className: "gap-2 font-bold uppercase tracking-widest text-sm hover:opacity-90" })}
          style={{ fontFamily: "var(--font-barlow-condensed)", background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}
        >
          <Plus className="w-4 h-4" /> Nuevo gym
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar por nombre o email..."
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

      {/* Table */}
      {gyms.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <p className="text-sm" style={{ color: T.textDim }}>No se encontraron gyms con estos filtros.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Gym", "Plan", "Alumnos", "Cobrado mes", "Estado", "Licencia", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gyms.map((gym) => {
                const licencia = licenciaDe(gym);
                const vencida = licencia && new Date(licencia.fecha_vencimiento) < new Date();
                return (
                  <TableRow
                    key={gym.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderColor: T.borderSub }}
                    onClick={() => router.push(`/admin/gyms/${gym.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT, fontFamily: "var(--font-barlow-condensed)" }}>
                          {gym.nombre.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: T.text }}>{gym.nombre}</p>
                          <p className="text-xs" style={{ color: T.textDim }}>{gym.email_contacto}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {licencia && (
                        <div className="flex items-center gap-1.5">
                          <AdminBadge label={PLAN_LABELS[licencia.plan] ?? licencia.plan} color={PLAN_COLORS[licencia.plan] ?? T.textMuted} />
                          {licencia.es_trial && <AdminBadge label="Trial" color={T.blue} />}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: T.textMuted }}>{alumnosPorGym[gym.id] ?? 0}</TableCell>
                    <TableCell className="text-sm font-mono" style={{ color: T.text }}>${(cobradoPorGym[gym.id] ?? 0).toLocaleString("es-AR")}</TableCell>
                    <TableCell>
                      <AdminBadge label={gym.activo ? "Activo" : "Suspendido"} color={gym.activo ? T.accent : T.danger} />
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: vencida ? T.danger : T.textDim }}>
                      {licencia ? new Date(licencia.fecha_vencimiento).toLocaleDateString("es-AR") : "—"}
                      {vencida && " (vencida)"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:opacity-75 transition-opacity outline-none"
                          style={{ color: T.textDim }}
                        >
                          {actionLoadingId === gym.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/gyms/${gym.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalle
                          </DropdownMenuItem>
                          {gym.activo ? (
                            <DropdownMenuItem onClick={() => handleToggleActivo(gym.id, gym.activo)} variant="destructive">
                              <Ban className="w-4 h-4 mr-2" /> Suspender
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleToggleActivo(gym.id, gym.activo)}>
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Reactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} total={total} hrefForPage={hrefForPage} />
    </div>
  );
}
