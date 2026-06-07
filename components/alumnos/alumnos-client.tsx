"use client";

import { useState, useTransition, useMemo } from "react";

const PAGE_SIZE = 25;
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { NuevaCuotaModal } from "@/components/cuotas/nueva-cuota-modal";
import { Plus, Search, MoreHorizontal, Eye, UserX, UserCheck, Loader2, Users, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "@/lib/theme";

type CuotaResumen = { id: string; estado: string; monto_total: number | null; mes: number; anio: number };

interface AlumnoRow {
  id?: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  email?: string | null;
  telefono?: string | null;
  activo?: boolean;
  fecha_alta?: string;
  cuotas?: CuotaResumen[] | null;
}

type ActividadOpt = { id: string; nombre: string; color: string };

interface AlumnosClientProps {
  alumnos: AlumnoRow[];
  searchDefault: string;
  activoDefault: string;
  actividadDefault: string;
  actividades: ActividadOpt[];
  mesActual: number;
  anioActual: number;
}

const CUOTA_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pagada:   { label: "Pagada",    bg: T.accentBg,          color: T.accent,   border: T.accentBorder },
  pendiente:{ label: "Pendiente", bg: `${T.warning}15`,    color: T.warning,  border: `${T.warning}40` },
  vencida:  { label: "Vencida",   bg: `${T.danger}15`,     color: T.danger,   border: `${T.danger}40` },
  condonada:{ label: "Condonada", bg: `${T.textDim}12`,    color: T.textDim,  border: T.borderSub },
};

function cuotaEstadoPeor(cuotas: CuotaResumen[]): string {
  if (cuotas.some((c) => c.estado === "vencida"))   return "vencida";
  if (cuotas.some((c) => c.estado === "pendiente")) return "pendiente";
  if (cuotas.some((c) => c.estado === "pagada"))    return "pagada";
  return "condonada";
}

export function AlumnosClient({ alumnos, searchDefault, activoDefault, actividadDefault, actividades, mesActual, anioActual }: AlumnosClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchDefault);
  const [activo, setActivo] = useState(activoDefault);
  const [actividad, setActividad] = useState(actividadDefault);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalAlumno, setModalAlumno] = useState<{ id: string; nombre: string } | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(alumnos.length / PAGE_SIZE));
  const paginados  = useMemo(
    () => alumnos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [alumnos, page]
  );

  function applyFilters(newSearch: string, newActivo: string, newActividad: string) {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newActivo !== "todos") params.set("activo", newActivo);
    if (newActividad) params.set("actividad", newActividad);
    setPage(1);
    startTransition(() => router.push(`/dashboard/alumnos?${params.toString()}`));
  }

  async function handleDelete(id: string) {
    setActionLoading(true);
    await fetch(`/api/alumnos/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setActionLoading(false);
    router.refresh();
  }

  async function handleToggleActivo(id: string, currentActivo: boolean) {
    await fetch(`/api/alumnos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !currentActivo }),
    });
    router.refresh();
  }

  const TABS = [
    { value: "todos", label: "Todos" },
    { value: "true",  label: "Activos" },
    { value: "false", label: "Inactivos" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-white leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900 }}>ALUMNOS</h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} encontrado{alumnos.length !== 1 ? "s" : ""}
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </p>
        </div>
        <Link
          href="/dashboard/alumnos/nuevo"
          className={buttonVariants({ className: "gap-2 font-bold uppercase tracking-widest text-sm hover:opacity-90" })}
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, border: "none", boxShadow: T.accentGlow }}
        >
          <Plus className="w-4 h-4" /> Nuevo alumno
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters(search, activo, actividad)}
            className="pl-9 placeholder:opacity-25"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>
        <button
          onClick={() => applyFilters(search, activo, actividad)}
          disabled={isPending}
          className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, border: `1px solid ${T.border}`, color: T.accent }}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
        </button>
        <div className="flex items-center gap-0.5 rounded-lg p-1" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActivo(tab.value); applyFilters(search, tab.value, actividad); }}
              className="px-3 py-1.5 text-xs rounded-md font-bold uppercase tracking-widest transition-all"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                background: activo === tab.value ? T.accent : "transparent",
                color:      activo === tab.value ? T.bgDeep : T.textMuted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={actividad}
          onChange={(e) => { setActividad(e.target.value); applyFilters(search, activo, e.target.value); }}
          className="h-9 px-3 rounded-lg text-sm"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
        >
          <option value="">Todas las actividades</option>
          {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      {alumnos.length === 0 ? <EmptyState search={search} /> : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Alumno", "DNI", "Contacto", "Alta", "Estado", "Cuota actual", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.map((alumno) => {
                const cuotas = (alumno.cuotas ?? []) as CuotaResumen[];
                const estado = cuotas.length > 0 ? cuotaEstadoPeor(cuotas) : null;
                const cuotaStyle = estado ? CUOTA_CONFIG[estado] : null;

                return (
                  <TableRow
                    key={alumno.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderColor: T.borderSub }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
                          {(alumno.nombre?.[0] ?? "")}{(alumno.apellido?.[0] ?? "")}
                        </div>
                        <p className="font-semibold text-sm" style={{ color: T.text }}>{alumno.apellido}, {alumno.nombre}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm" style={{ color: T.textMuted }}>{alumno.dni}</TableCell>
                    <TableCell className="text-sm" style={{ color: T.textDim }}>
                      {alumno.email ?? alumno.telefono ?? <span style={{ color: T.textDim, opacity: 0.4 }}>—</span>}
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: T.textDim }}>
                      {alumno.fecha_alta ? new Date(alumno.fecha_alta).toLocaleDateString("es-AR") : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                        style={{
                          fontFamily: "var(--font-barlow-condensed)",
                          background: alumno.activo ? T.accentBg : `${T.textDim}15`,
                          color:      alumno.activo ? T.accent   : T.textDim,
                          border:     `1px solid ${alumno.activo ? T.accentBorder : T.borderSub}`,
                        }}>
                        {alumno.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {cuotaStyle ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                            style={{ fontFamily: "var(--font-barlow-condensed)", background: cuotaStyle.bg, color: cuotaStyle.color, border: `1px solid ${cuotaStyle.border}` }}>
                            {cuotaStyle.label}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setModalAlumno({ id: alumno.id!, nombre: `${alumno.apellido}, ${alumno.nombre}` }); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                            style={{ fontFamily: "var(--font-barlow-condensed)", background: `${T.textDim}12`, color: T.textDim, border: `1px solid ${T.borderSub}` }}
                          >
                            <Plus className="w-3 h-3" /> Generar
                          </button>
                        )}
                        {/* Botón + para cuota especial siempre visible */}
                        <button
                          title="Nueva cuota especial"
                          onClick={(e) => { e.stopPropagation(); setModalAlumno({ id: alumno.id!, nombre: `${alumno.apellido}, ${alumno.nombre}` }); }}
                          className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: T.accent }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="w-8 h-8" style={{ color: T.textDim }}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/alumnos/${alumno.id}`)}>
                            <Eye className="w-3.5 h-3.5" /> Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setModalAlumno({ id: alumno.id!, nombre: `${alumno.apellido}, ${alumno.nombre}` })}>
                            <Receipt className="w-3.5 h-3.5" /> Nueva cuota especial
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActivo(alumno.id!, alumno.activo ?? true)}>
                            {alumno.activo ? <><UserX className="w-3.5 h-3.5" /> Dar de baja</> : <><UserCheck className="w-3.5 h-3.5" /> Reactivar</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator style={{ background: T.border }} />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(alumno.id!)}>
                            Eliminar
                          </DropdownMenuItem>
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: T.textDim }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, alumnos.length)} de {alumnos.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-3 font-mono" style={{ color: T.textDim }}>{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
              style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal nueva cuota */}
      <NuevaCuotaModal
        open={!!modalAlumno}
        onClose={() => setModalAlumno(null)}
        alumnoId={modalAlumno?.id}
        alumnoNombre={modalAlumno?.nombre}
        mesDefault={mesActual}
        anioDefault={anioActual}
        onCreated={() => router.refresh()}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>¿Eliminar alumno?</DialogTitle>
            <DialogDescription style={{ color: T.textMuted }}>El alumno quedará inaccesible (soft delete).</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={() => deleteId && handleDelete(deleteId)}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="rounded-xl py-20 flex flex-col items-center gap-4 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
        <Users className="w-7 h-7" style={{ color: T.accent }} />
      </div>
      <div>
        <p className="font-bold text-lg uppercase" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
          {search ? `Sin resultados para "${search}"` : "Todavía no hay alumnos"}
        </p>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>
          {search ? "Probá con otro término" : "Creá el primero con el botón de arriba"}
        </p>
      </div>
    </div>
  );
}
