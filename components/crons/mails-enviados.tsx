"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, Mail } from "lucide-react";
import { T } from "@/lib/theme";
import { PaginationControls } from "@/components/ui/pagination-controls";

const PAGE_SIZE = 10;

const MESES_CORTO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatFecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${MESES_CORTO[d.getMonth() + 1]}/${String(d.getFullYear()).slice(2)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type NotifRow = {
  id: string;
  tipo: string | null;
  enviado_a: string | null;
  estado: string | null;
  created_at: string;
  alumnos: { nombre: string; apellido: string } | null;
};

interface Props {
  notifs: NotifRow[];
  total: number;
  page: number;
  desde: string;
  hasta: string;
}

const dateInp: React.CSSProperties = {
  padding: "0.35rem 0.6rem", borderRadius: 8, outline: "none",
  background: T.bg, border: `1px solid ${T.border}`, color: T.text,
  fontSize: "0.78rem", height: 32,
};

export function MailsEnviados({ notifs, total, page, desde, hasta }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(overrides).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayFiltro = !!(desde || hasta);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: T.borderSub }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.blue, fontFamily: "var(--font-barlow-condensed)" }}>
          — Mails enviados
        </h2>
        <div className="flex items-center gap-2">
          <input type="date" value={desde} onChange={(e) => update({ mDesde: e.target.value, mPage: "" })} style={dateInp} />
          <span className="text-xs" style={{ color: T.textDim }}>—</span>
          <input type="date" value={hasta} onChange={(e) => update({ mHasta: e.target.value, mPage: "" })} style={dateInp} />
          {hayFiltro && (
            <button
              onClick={() => update({ mDesde: "", mHasta: "", mPage: "" })}
              className="text-xs font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md transition-opacity hover:opacity-75"
              style={{ fontFamily: "var(--font-barlow-condensed)", color: T.textDim, border: `1px solid ${T.border}` }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-2 grid gap-3 border-b" style={{ borderColor: T.borderSub, background: T.bgDeep, gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr) 80px 70px" }}>
        {["Alumno", "Email", "Tipo", "Estado"].map((h) => (
          <p key={h} className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{h}</p>
        ))}
      </div>

      {notifs.length === 0 && (
        <div className="px-5 py-10 text-center" style={{ color: T.textDim }}>
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{hayFiltro ? "Sin avisos en el rango seleccionado" : "Sin avisos enviados"}</p>
        </div>
      )}

      {notifs.map((n) => {
        const alumno = n.alumnos;
        const ok = n.estado === "enviado";
        return (
          <div key={n.id} className="px-5 py-3 grid gap-3 items-center border-b last:border-b-0"
            style={{ borderColor: T.borderSub, gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr) 80px 70px" }}>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: T.text }}>
                {alumno ? `${alumno.apellido}, ${alumno.nombre}` : "—"}
              </p>
              <p className="text-xs" style={{ color: T.textDim }}>{formatFecha(n.created_at)}</p>
            </div>
            <p className="text-xs font-mono truncate" style={{ color: T.textDim }}>{n.enviado_a}</p>
            <p className="text-xs capitalize" style={{ color: T.textDim }}>{n.tipo?.replace(/_/g, " ")}</p>
            <div className="flex items-center gap-1">
              {ok ? (
                <><CheckCircle className="w-3.5 h-3.5" style={{ color: T.accent }} /><span className="text-xs" style={{ color: T.accent }}>OK</span></>
              ) : (
                <><AlertCircle className="w-3.5 h-3.5" style={{ color: T.danger }} /><span className="text-xs" style={{ color: T.danger }}>{n.estado}</span></>
              )}
            </div>
          </div>
        );
      })}

      {notifs.length > 0 && (
        <div className="px-5 py-3 border-t" style={{ borderColor: T.borderSub }}>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => update({ mPage: p > 1 ? String(p) : "" })}
          />
        </div>
      )}
    </div>
  );
}
