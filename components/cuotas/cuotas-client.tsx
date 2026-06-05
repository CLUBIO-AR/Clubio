"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PAGE_SIZE = 25;
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NuevaCuotaModal } from "@/components/cuotas/nueva-cuota-modal";
import { Search, MoreHorizontal, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight, Loader2, Receipt, Plus } from "lucide-react";
import { T } from "@/lib/theme";

const MESES_LARGO = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pendiente:     { label: "Pendiente",     bg: `${T.warning}15`, color: T.warning },
  vencida:       { label: "Vencida",       bg: `${T.danger}15`,  color: T.danger  },
  pagada:        { label: "Pagada",        bg: T.accentBg,       color: T.accent  },
  condonada:     { label: "Condonada",     bg: `${T.textDim}12`, color: T.textDim },
  pagada_parcial:{ label: "Pago parcial",  bg: `${T.blue}15`,    color: T.blue    },
};

const TABS = [
  { value: "todos",     label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "vencida",   label: "Vencidas" },
  { value: "pagada",    label: "Pagadas" },
];

interface Stats { total: number; pagadas: number; vencidas: number; pendientes: number; totalCobrado: number; }

interface CuotasClientProps {
  actividades: { id: string; nombre: string; color: string }[];
  actividadDefault: string;
  cuotas: Array<{
    id: string; mes: number; anio: number; monto_base: number; monto_recargo: number;
    monto_total: number; estado: string; fecha_vencimiento: string; fecha_pago?: string | null;
    recargo_nivel?: number | null; metodo_pago?: string | null;
    alumno_id?: string | null;
    actividad_id?: string | null;
    actividades?: { nombre: string; color: string } | null;
    alumnos?: { nombre: string; apellido: string; dni: string } | null;
  }>;
  mes: number;
  anio: number;
  estadoDefault: string;
  searchDefault: string;
  stats: Stats;
}

export function CuotasClient({ cuotas, mes, anio, estadoDefault, searchDefault, actividadDefault, actividades, stats }: CuotasClientProps) {
  const router = useRouter();
  const [search, setSearch]       = useState(searchDefault);
  const [estado, setEstado]       = useState(estadoDefault);
  const [actividad, setActividad] = useState(actividadDefault);
  const [curMes, setCurMes]       = useState(mes);
  const [curAnio, setCurAnio] = useState(anio);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [modalAlumno, setModalAlumno] = useState<{ id: string; nombre: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(cuotas.length / PAGE_SIZE));
  const paginadas  = cuotas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function navigate(newMes: number, newAnio: number, newEstado: string, newSearch: string, newActividad?: string) {
    const act = newActividad ?? actividad;
    const p = new URLSearchParams();
    p.set("mes", String(newMes));
    p.set("anio", String(newAnio));
    if (newEstado !== "todos") p.set("estado", newEstado);
    if (newSearch) p.set("search", newSearch);
    if (act) p.set("actividad", act);
    setPage(1);
    startTransition(() => router.push(`/dashboard/cuotas?${p.toString()}`));
  }

  function prevMes() {
    const m = curMes === 1 ? 12 : curMes - 1;
    const a = curMes === 1 ? curAnio - 1 : curAnio;
    setCurMes(m); setCurAnio(a);
    navigate(m, a, estado, search);
  }

  function nextMes() {
    const m = curMes === 12 ? 1 : curMes + 1;
    const a = curMes === 12 ? curAnio + 1 : curAnio;
    setCurMes(m); setCurAnio(a);
    navigate(m, a, estado, search);
  }

  const STAT_CARDS = [
    { label: "Total",      value: stats.total,      color: T.textMuted },
    { label: "Pendientes", value: stats.pendientes,  color: T.warning   },
    { label: "Vencidas",   value: stats.vencidas,    color: T.danger    },
    { label: "Cobrado",    value: `$${stats.totalCobrado.toLocaleString("es-AR")}`, color: T.accent },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>CUOTAS</h1>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>{cuotas.length} cuota{cuotas.length !== 1 ? "s" : ""} en vista</p>
          {totalPages > 1 && <p className="text-xs" style={{ color: T.textDim }}>Página {page} de {totalPages}</p>}
        </div>
        {/* Mes selector */}
        <div className="flex items-center gap-2">
          <button onClick={prevMes} disabled={isPending} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-75" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textMuted }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold uppercase tracking-widest text-sm min-w-36 text-center" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>
            {MESES_LARGO[curMes]} {curAnio}
          </span>
          <button onClick={nextMes} disabled={isPending} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-75" style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textMuted }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</p>
            <p className="text-2xl font-black" style={{ fontFamily: "var(--font-barlow-condensed)", color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textDim }} />
          <Input
            placeholder="Buscar alumno o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigate(curMes, curAnio, estado, search)}
            className="pl-9 placeholder:opacity-25"
            style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>
        <button onClick={() => navigate(curMes, curAnio, estado, search)} disabled={isPending}
          className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider hover:opacity-80 transition-all"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, border: `1px solid ${T.border}`, color: T.accent }}>
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
        </button>

        {/* Estado tabs */}
        <div className="flex items-center gap-0.5 rounded-lg p-1" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          {TABS.map((tab) => (
            <button key={tab.value}
              onClick={() => { setEstado(tab.value); navigate(curMes, curAnio, tab.value, search); }}
              className="px-3 py-1.5 text-xs rounded-md font-bold uppercase tracking-widest transition-all"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: estado === tab.value ? T.accent : "transparent", color: estado === tab.value ? T.bgDeep : T.textMuted }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actividad filter */}
        {actividades.length > 0 && (
          <select
            value={actividad}
            onChange={(e) => { setActividad(e.target.value); navigate(curMes, curAnio, estado, search, e.target.value); }}
            className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-barlow-condensed)", background: actividad ? T.accentBg : T.card, border: `1px solid ${actividad ? T.accentBorder : T.border}`, color: actividad ? T.accent : T.textMuted }}
          >
            <option value="">Todas las actividades</option>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {cuotas.length === 0 ? <EmptyState /> : (
        <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: T.bg, borderColor: T.border }}>
                {["Alumno", "DNI", "Período", "Actividad", "Monto", "Vencimiento", "Estado", ""].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-widest font-bold"
                    style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", borderColor: T.border }}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginadas.map((c) => {
                const est = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.pendiente;
                const a = c.alumnos;
                const vencida = new Date(c.fecha_vencimiento) < new Date() && c.estado === "vencida";
                return (
                  <TableRow key={c.id} className="transition-colors cursor-pointer" style={{ borderColor: T.borderSub }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.cardHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
                          {(a?.nombre?.[0] ?? "")}{(a?.apellido?.[0] ?? "")}
                        </div>
                        <span className="font-medium text-sm" style={{ color: T.text }}>{a?.apellido}, {a?.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm" style={{ color: T.textMuted }}>{a?.dni}</TableCell>
                    <TableCell className="font-bold text-sm" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
                      {MESES_LARGO[c.mes]?.slice(0, 3).toUpperCase()} {c.anio}
                    </TableCell>
                    <TableCell>
                      {c.actividades ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: (c.actividades as { nombre: string; color: string }).color }} />
                          <span className="text-xs font-medium" style={{ color: T.text }}>
                            {(c.actividades as { nombre: string; color: string }).nombre}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: T.textDim }}>General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-bold font-mono text-sm" style={{ color: T.text }}>${c.monto_total?.toLocaleString("es-AR")}</span>
                        {c.monto_recargo > 0 && (
                          <span className="ml-1.5 text-xs" style={{ color: T.danger }}>+${c.monto_recargo.toLocaleString("es-AR")} recargo</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: vencida ? T.danger : T.textMuted }}>
                      {new Date(c.fecha_vencimiento).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                        style={{ fontFamily: "var(--font-barlow-condensed)", background: est.bg, color: est.color, border: `1px solid ${est.color}25` }}>
                        {est.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:opacity-75 transition-opacity outline-none"
                          style={{ color: T.textDim }}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/cuotas/${c.id}`)}>
                            <Eye className="w-3.5 h-3.5" /> Ver detalle
                          </DropdownMenuItem>
                          {(c.estado === "pendiente" || c.estado === "vencida") && (
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/cuotas/${c.id}?accion=pagar`)}>
                              <CheckCircle className="w-3.5 h-3.5" /> Registrar pago
                            </DropdownMenuItem>
                          )}
                          {c.alumno_id && c.alumnos && (
                            <DropdownMenuItem onClick={() => setModalAlumno({ id: c.alumno_id!, nombre: `${c.alumnos!.apellido}, ${c.alumnos!.nombre}` })}>
                              <Plus className="w-3.5 h-3.5" /> Nueva cuota especial
                            </DropdownMenuItem>
                          )}
                          {c.estado !== "pagada" && c.estado !== "condonada" && (
                            <>
                              <DropdownMenuSeparator style={{ background: T.border }} />
                              <DropdownMenuItem variant="destructive" onClick={() => router.push(`/dashboard/cuotas/${c.id}?accion=condonar`)}>
                                <XCircle className="w-3.5 h-3.5" /> Condonar
                              </DropdownMenuItem>
                            </>
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: T.textDim }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, cuotas.length)} de {cuotas.length}
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

      <NuevaCuotaModal
        open={!!modalAlumno}
        onClose={() => setModalAlumno(null)}
        alumnoId={modalAlumno?.id}
        alumnoNombre={modalAlumno?.nombre}
        mesDefault={curMes}
        anioDefault={curAnio}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl py-20 flex flex-col items-center gap-4 text-center" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
        <Receipt className="w-7 h-7" style={{ color: T.accent }} />
      </div>
      <div>
        <p className="font-bold text-lg uppercase" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>
          Sin cuotas para este período
        </p>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>
          Podés generarlas manualmente o esperar el cron mensual
        </p>
      </div>
    </div>
  );
}
