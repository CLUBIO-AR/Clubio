"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Download, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { T } from "@/lib/theme";

const METODO_LABEL: Record<string, string> = {
  mercadopago:   "MercadoPago",
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
  otro:          "Otro",
};
const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const PAGE_SIZE = 25;

type Pago = {
  id: string;
  monto: number;
  metodo: string;
  created_at: string;
  alumnos: { nombre: string; apellido: string; dni?: string } | null;
  cuotas: { mes: number; anio: number; tipo: string; descripcion: string | null; actividades: { id: string; nombre: string; color: string } | null } | null;
};

type ActividadOpt = { id: string; nombre: string; color: string };

const SIN_ACTIVIDAD = "__general__";

interface Props {
  pagos: Pago[];
  desde: string;
  hasta: string;
  metodo: string;
  actividad: string;
  actividades: ActividadOpt[];
}

const inp: React.CSSProperties = {
  padding: "0.4rem 0.65rem", borderRadius: 8, outline: "none",
  background: T.card, border: `1px solid ${T.border}`, color: T.text,
  fontSize: "0.82rem", height: 36,
};

export function PagosClient({ pagos, desde, hasta, metodo, actividad, actividades }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);

  function applyFilters(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.delete("page");
    setPage(1);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setEsteMes() {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    applyFilters({
      desde: d.toISOString().split("T")[0],
      hasta: now.toISOString().split("T")[0],
    });
  }

  function setMesAnterior() {
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fin    = new Date(now.getFullYear(), now.getMonth(), 0);
    applyFilters({
      desde: inicio.toISOString().split("T")[0],
      hasta: fin.toISOString().split("T")[0],
    });
  }

  // Filtro local por nombre/DNI alumno + actividad
  const filtered = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    return pagos.filter((p) => {
      if (term) {
        const alumno = p.alumnos;
        if (!alumno) return false;
        const matchTerm =
          alumno.nombre.toLowerCase().includes(term) ||
          alumno.apellido.toLowerCase().includes(term) ||
          alumno.dni?.toLowerCase().includes(term);
        if (!matchTerm) return false;
      }
      if (actividad) {
        const actId = p.cuotas?.actividades?.id ?? null;
        if (actividad === SIN_ACTIVIDAD) {
          if (actId !== null) return false;
        } else if (actId !== actividad) {
          return false;
        }
      }
      return true;
    });
  }, [pagos, localSearch, actividad]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginados  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalFiltrado = filtered.reduce((s, p) => s + p.monto, 0);

  function exportCSV() {
    const params = new URLSearchParams();
    if (desde)       params.set("desde", desde);
    if (hasta)       params.set("hasta", hasta);
    if (metodo)      params.set("metodo", metodo);
    if (localSearch) params.set("search", localSearch);
    window.location.href = `/api/pagos/export?${params.toString()}`;
  }

  const btnSm = (active?: boolean): React.CSSProperties => ({
    padding: "0.25rem 0.7rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
    fontFamily: "var(--font-barlow-condensed)",
    background: active ? T.accent  : T.card,
    color:      active ? T.bgDeep  : T.textDim,
    border:     `1px solid ${active ? T.accent : T.border}`,
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* Búsqueda local por alumno */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: T.textDim }} />
          <input
            placeholder="Buscar alumno o DNI…"
            value={localSearch}
            onChange={(e) => { setLocalSearch(e.target.value); setPage(1); }}
            style={{ ...inp, paddingLeft: "2rem", width: 200 }}
          />
        </div>

        {/* Desde */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", fontSize: "0.65rem" }}>Desde</span>
          <input type="date" value={desde} onChange={(e) => applyFilters({ desde: e.target.value })} style={inp} />
        </div>

        {/* Hasta */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", fontSize: "0.65rem" }}>Hasta</span>
          <input type="date" value={hasta} onChange={(e) => applyFilters({ hasta: e.target.value })} style={inp} />
        </div>

        {/* Método */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", fontSize: "0.65rem" }}>Método</span>
          <select value={metodo} onChange={(e) => applyFilters({ metodo: e.target.value })} style={{ ...inp, width: 140 }}>
            <option value="">Todos</option>
            {Object.entries(METODO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Actividad */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", fontSize: "0.65rem" }}>Actividad</span>
          <select value={actividad} onChange={(e) => applyFilters({ actividad: e.target.value })} style={{ ...inp, width: 160 }}>
            <option value="">Todas</option>
            <option value={SIN_ACTIVIDAD}>General (sin actividad)</option>
            {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>

        {/* Quick actions */}
        <div className="flex gap-1.5 items-center self-end mb-0.5">
          <button onClick={setEsteMes} style={btnSm()}>Este mes</button>
          <button onClick={setMesAnterior} style={btnSm()}>Mes anterior</button>
          <button onClick={() => applyFilters({ desde: "", hasta: "", metodo: "", actividad: "" })} style={btnSm()}>Limpiar</button>
        </div>

        {/* Export */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-opacity hover:opacity-80 ml-auto"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accentBorder}` }}
        >
          <Download className="w-3.5 h-3.5" /> Exportar XLSX
        </button>
      </div>

      {/* Resumen filtrado */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
          <DollarSign className="w-4 h-4" style={{ color: T.accent }} />
          <span className="text-sm font-bold" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            {filtered.length} pagos · Total: ${totalFiltrado.toLocaleString("es-AR")}
          </span>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        <div className="px-5 py-3 grid gap-4 border-b"
          style={{ background: T.bgDeep, borderColor: T.borderSub, gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) minmax(0,1fr) 130px 110px" }}>
          {[
            { label: "Alumno", cls: "" },
            { label: "Período", cls: "" },
            { label: "Actividad", cls: "" },
            { label: "Método", cls: "" },
            { label: "Monto", cls: "text-right" },
          ].map(({ label, cls }) => (
            <p key={label} className={`text-xs font-bold uppercase tracking-[0.12em] ${cls}`}
              style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
              {label}
            </p>
          ))}
        </div>

        {paginados.length === 0 && (
          <div className="px-5 py-10 text-center" style={{ color: T.textDim }}>
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin pagos en el período seleccionado</p>
          </div>
        )}

        {paginados.map((p) => {
          const alumno = p.alumnos;
          const cuota  = p.cuotas;
          const metodoColor = p.metodo === "mercadopago" ? T.accent : p.metodo === "efectivo" ? T.lime : T.blue;
          const periodo = !cuota
            ? "—"
            : cuota.tipo !== "mensual" && cuota.descripcion
            ? cuota.descripcion.length > 28 ? cuota.descripcion.slice(0, 28) + "…" : cuota.descripcion
            : `${MESES[cuota.mes]} ${cuota.anio}`;

          const actividad = cuota?.actividades ?? null;

          return (
            <div key={p.id} className="px-5 py-3 grid gap-4 items-center border-b last:border-b-0"
              style={{ borderColor: T.borderSub, background: T.card, gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) minmax(0,1fr) 130px 110px" }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: T.text }}>
                  {alumno ? `${alumno.apellido}, ${alumno.nombre}` : "—"}
                </p>
                <p className="text-xs" style={{ color: T.textDim }}>
                  {new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-sm truncate" style={{ color: T.text }}>{periodo}</p>
                {cuota?.tipo !== "mensual" && cuota?.tipo && (
                  <p className="text-xs capitalize" style={{ color: T.textDim }}>{cuota.tipo.replace("_", " ")}</p>
                )}
              </div>
              <div className="min-w-0">
                {actividad ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: actividad.color }} />
                    <span className="text-xs truncate" style={{ color: T.text }}>{actividad.nombre}</span>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: T.textDim }}>General</span>
                )}
              </div>
              <div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "var(--font-barlow-condensed)", background: `${metodoColor}15`, color: metodoColor, border: `1px solid ${metodoColor}30` }}>
                  {METODO_LABEL[p.metodo] ?? p.metodo}
                </span>
              </div>
              <p className="text-sm font-bold font-mono text-right" style={{ color: T.text }}>
                ${p.monto.toLocaleString("es-AR")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: T.textDim }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
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
    </div>
  );
}
