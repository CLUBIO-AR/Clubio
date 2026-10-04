"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { T } from "@/lib/theme";

export type Conversacion = {
  telefono: string;
  nombre: string;
  ultimoMensaje: string;
  ultimaDireccion: "entrante" | "saliente";
  ultimaFecha: string;
  noLeidos: number;
};

type Filtro = "todos" | "no_leidos";

export function WhatsappSidebarClient({ conversaciones }: { conversaciones: Conversacion[] }) {
  const pathname = usePathname();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const activeTelefono = pathname.startsWith("/dashboard/whatsapp/")
    ? decodeURIComponent(pathname.split("/").pop() ?? "")
    : null;

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return conversaciones.filter((c) => {
      if (filtro === "no_leidos" && c.noLeidos === 0) return false;
      if (texto && !c.nombre.toLowerCase().includes(texto) && !c.telefono.includes(texto)) return false;
      return true;
    });
  }, [conversaciones, busqueda, filtro]);

  const totalNoLeidos = conversaciones.reduce((acc, c) => acc + (c.noLeidos > 0 ? 1 : 0), 0);

  return (
    <aside
      className="w-80 shrink-0 flex flex-col rounded-xl overflow-hidden"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="p-3 space-y-3" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textDim }} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }}
          />
        </div>

        <div className="flex gap-1.5">
          {([
            { value: "todos" as const, label: "Todos" },
            { value: "no_leidos" as const, label: `No leídos${totalNoLeidos > 0 ? ` (${totalNoLeidos})` : ""}` },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => setFiltro(t.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
              style={{
                fontFamily: "var(--font-fredoka)",
                background: filtro === t.value ? T.accentBg : "transparent",
                color: filtro === t.value ? T.accent : T.textDim,
                border: `1px solid ${filtro === t.value ? T.accentBorder : T.border}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 && (
          <p className="text-sm text-center mt-8 px-4" style={{ color: T.textDim }}>
            {busqueda || filtro === "no_leidos" ? "Sin resultados" : "Todavía no hay conversaciones"}
          </p>
        )}
        {filtradas.map((c) => {
          const active = c.telefono === activeTelefono;
          return (
            <Link
              key={c.telefono}
              href={`/dashboard/whatsapp/${encodeURIComponent(c.telefono)}`}
              className={cn("flex items-center gap-3 px-4 py-3 transition-colors")}
              style={{
                background: active ? T.accentBg : "transparent",
                borderLeft: `3px solid ${active ? T.accent : "transparent"}`,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{ background: T.accentBg, color: T.accent }}
              >
                {c.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate text-sm" style={{ color: T.text }}>{c.nombre}</p>
                <p className="text-xs truncate" style={{ color: c.noLeidos > 0 ? T.text : T.textDim }}>
                  {c.ultimaDireccion === "saliente" ? "Vos: " : ""}{c.ultimoMensaje}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-[10px]" style={{ color: T.textDim }}>
                  {new Date(c.ultimaFecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                </p>
                {c.noLeidos > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: T.accent, color: T.accentText }}
                  >
                    {c.noLeidos}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
