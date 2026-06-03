"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, MoreHorizontal, Eye, UserX, UserCheck, Loader2, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Alumno } from "@/lib/alumnos";
import { Button } from "@/components/ui/button";

const NEON = "oklch(0.88 0.22 158)";
const BG = "oklch(0.1 0.018 245)";
const CARD = "oklch(0.13 0.018 245)";
const BORDER = "oklch(0.2 0.018 245)";

interface AlumnosClientProps {
  alumnos: Partial<Alumno>[];
  searchDefault: string;
  activoDefault: string;
}

export function AlumnosClient({ alumnos, searchDefault, activoDefault }: AlumnosClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchDefault);
  const [activo, setActivo] = useState(activoDefault);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function applyFilters(newSearch: string, newActivo: string) {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newActivo !== "todos") params.set("activo", newActivo);
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !currentActivo }),
    });
    router.refresh();
  }

  const FILTER_TABS = [
    { value: "todos", label: "Todos" },
    { value: "true", label: "Activos" },
    { value: "false", label: "Inactivos" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-4xl text-white leading-none"
            style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900 }}
          >
            ALUMNOS
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.5 0.015 245)" }}>
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} encontrado{alumnos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/alumnos/nuevo"
          className={buttonVariants({ className: "gap-2 font-bold uppercase tracking-widest text-sm" })}
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            background: NEON,
            color: "oklch(0.07 0.018 245)",
            boxShadow: `0 0 20px ${NEON}40`,
            border: "none",
          }}
        >
          <Plus className="w-4 h-4" /> Nuevo alumno
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.015 245)" }} />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters(search, activo)}
            className="pl-9 placeholder:opacity-30"
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: "white" }}
          />
        </div>
        <button
          onClick={() => applyFilters(search, activo)}
          disabled={isPending}
          className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: CARD, border: `1px solid ${BORDER}`, color: NEON }}
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
        </button>

        <div className="flex items-center gap-0.5 rounded-lg p-1" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActivo(tab.value); applyFilters(search, tab.value); }}
              className="px-3 py-1.5 text-xs rounded-md font-bold uppercase tracking-widest transition-all"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                background: activo === tab.value ? NEON : "transparent",
                color: activo === tab.value ? "oklch(0.07 0.018 245)" : "oklch(0.5 0.015 245)",
                boxShadow: activo === tab.value ? `0 0 12px ${NEON}50` : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {alumnos.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: BG, borderColor: BORDER }}>
                {["Alumno", "DNI", "Contacto", "Alta", "Estado", "Cuota", ""].map((h) => (
                  <TableHead
                    key={h}
                    className="text-xs uppercase tracking-widest font-bold"
                    style={{ color: "oklch(0.45 0.015 245)", fontFamily: "var(--font-barlow-condensed)", borderColor: BORDER }}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.map((alumno) => (
                <TableRow
                  key={alumno.id}
                  className="transition-colors cursor-pointer"
                  style={{ borderColor: BORDER }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.15 0.018 245)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{
                          background: `${NEON}20`,
                          border: `1px solid ${NEON}30`,
                          color: NEON,
                          fontFamily: "var(--font-barlow-condensed)",
                        }}
                      >
                        {(alumno.nombre?.[0] ?? "")}{(alumno.apellido?.[0] ?? "")}
                      </div>
                      <p className="font-semibold text-white text-sm">
                        {alumno.apellido}, {alumno.nombre}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "oklch(0.65 0.015 245)" }}>{alumno.dni}</TableCell>
                  <TableCell className="text-sm" style={{ color: "oklch(0.55 0.015 245)" }}>
                    {alumno.email ?? alumno.telefono ?? <span style={{ color: "oklch(0.3 0.015 245)" }}>—</span>}
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: "oklch(0.55 0.015 245)" }}>
                    {alumno.fecha_alta ? new Date(alumno.fecha_alta).toLocaleDateString("es-AR") : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--font-barlow-condensed)",
                        background: alumno.activo ? `${NEON}15` : "oklch(0.3 0.015 245 / 0.3)",
                        color: alumno.activo ? NEON : "oklch(0.45 0.015 245)",
                        border: `1px solid ${alumno.activo ? `${NEON}30` : "oklch(0.25 0.015 245)"}`,
                      }}
                    >
                      {alumno.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono" style={{ color: alumno.monto_cuota_personalizado ? NEON : "oklch(0.35 0.015 245)" }}>
                    {alumno.monto_cuota_personalizado ? `$${alumno.monto_cuota_personalizado.toLocaleString("es-AR")}` : "Default"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="w-8 h-8" style={{ color: "oklch(0.4 0.015 245)" }}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44" style={{ background: "oklch(0.14 0.018 245)", border: `1px solid ${BORDER}` }}>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/alumnos/${alumno.id}`)}>
                          <Eye className="w-3.5 h-3.5" /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActivo(alumno.id!, alumno.activo ?? true)}>
                          {alumno.activo ? <><UserX className="w-3.5 h-3.5" /> Dar de baja</> : <><UserCheck className="w-3.5 h-3.5" /> Reactivar</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator style={{ background: BORDER }} />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteId(alumno.id!)}>
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <DialogHeader>
            <DialogTitle className="text-white">¿Eliminar alumno?</DialogTitle>
            <DialogDescription style={{ color: "oklch(0.5 0.015 245)" }}>
              El alumno quedará inaccesible (soft delete).
            </DialogDescription>
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
    <div className="rounded-xl py-20 flex flex-col items-center gap-4 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${NEON}10`, border: `1px solid ${NEON}20` }}>
        <Users className="w-7 h-7" style={{ color: NEON }} />
      </div>
      <div>
        <p className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-barlow-condensed)", textTransform: "uppercase" }}>
          {search ? `SIN RESULTADOS PARA "${search}"` : "TODAVÍA NO HAY ALUMNOS"}
        </p>
        <p className="text-sm mt-1" style={{ color: "oklch(0.45 0.015 245)" }}>
          {search ? "Probá con otro término" : "Creá el primero con el botón de arriba"}
        </p>
      </div>
    </div>
  );
}
