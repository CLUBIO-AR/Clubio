"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  UserX,
  UserCheck,
  Loader2,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Alumno } from "@/lib/alumnos";

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
          <h1 className="text-2xl font-bold text-zinc-900">Alumnos</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {alumnos.length} alumno{alumnos.length !== 1 ? "s" : ""} encontrado{alumnos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/alumnos/nuevo"
          className={buttonVariants({ className: "bg-indigo-600 hover:bg-indigo-500 text-white gap-2" })}
        >
          <Plus className="w-4 h-4" />
          Nuevo alumno
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters(search, activo)}
            className="pl-9 bg-white border-zinc-200 focus:border-indigo-400"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyFilters(search, activo)}
          disabled={isPending}
          className="border-zinc-200 text-zinc-600"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Buscar"}
        </Button>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActivo(tab.value); applyFilters(search, tab.value); }}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${
                activo === tab.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
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
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 border-zinc-200">
                <TableHead className="font-semibold text-zinc-700">Alumno</TableHead>
                <TableHead className="font-semibold text-zinc-700">DNI</TableHead>
                <TableHead className="font-semibold text-zinc-700">Contacto</TableHead>
                <TableHead className="font-semibold text-zinc-700">Alta</TableHead>
                <TableHead className="font-semibold text-zinc-700">Estado</TableHead>
                <TableHead className="font-semibold text-zinc-700">Cuota</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.map((alumno) => (
                <TableRow
                  key={alumno.id}
                  className="hover:bg-zinc-50/50 transition-colors border-zinc-100"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-indigo-700">
                          {(alumno.nombre?.[0] ?? "")}{(alumno.apellido?.[0] ?? "")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">
                          {alumno.apellido}, {alumno.nombre}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-600 text-sm font-mono">{alumno.dni}</TableCell>
                  <TableCell className="text-zinc-500 text-sm">
                    {alumno.email ?? alumno.telefono ?? <span className="text-zinc-300">—</span>}
                  </TableCell>
                  <TableCell className="text-zinc-500 text-sm">
                    {alumno.fecha_alta
                      ? new Date(alumno.fecha_alta).toLocaleDateString("es-AR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={alumno.activo ? "default" : "secondary"}
                      className={
                        alumno.activo
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }
                    >
                      {alumno.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-600 text-sm">
                    {alumno.monto_cuota_personalizado
                      ? `$${alumno.monto_cuota_personalizado.toLocaleString("es-AR")}`
                      : <span className="text-zinc-300">Default</span>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-zinc-700">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/alumnos/${alumno.id}`)}>
                          <Eye className="w-3.5 h-3.5" /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActivo(alumno.id!, alumno.activo ?? true)}
                          className="flex items-center gap-2"
                        >
                          {alumno.activo ? (
                            <><UserX className="w-3.5 h-3.5" /> Dar de baja</>
                          ) : (
                            <><UserCheck className="w-3.5 h-3.5" /> Reactivar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 flex items-center gap-2"
                          onClick={() => setDeleteId(alumno.id!)}
                        >
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

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar alumno?</DialogTitle>
            <DialogDescription>
              Esta acción es un soft delete. El alumno no se borrará de la base de datos
              pero quedará inaccesible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => deleteId && handleDelete(deleteId)}
            >
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
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm py-16 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
        <Users className="w-6 h-6 text-zinc-400" />
      </div>
      <div>
        <p className="font-medium text-zinc-700">
          {search ? `Sin resultados para "${search}"` : "Todavía no hay alumnos"}
        </p>
        <p className="text-sm text-zinc-400 mt-0.5">
          {search ? "Probá con otro término" : "Creá el primero con el botón de arriba"}
        </p>
      </div>
    </div>
  );
}
