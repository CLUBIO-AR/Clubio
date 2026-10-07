"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, MessageCirclePlus, ListChecks, MailOpen, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { T } from "@/lib/theme";
import { marcarConversacionesLeidasAction, eliminarConversacionesAction } from "@/app/actions/whatsapp";

export type Conversacion = {
  telefono: string;
  nombre: string;
  ultimoMensaje: string;
  ultimaDireccion: "entrante" | "saliente";
  ultimaFecha: string;
  noLeidos: number;
  // El teléfono no es de ningún alumno: alguien que escribe para consultar.
  esConsulta: boolean;
};

// Alumno con teléfono cargado que todavía no tiene ninguna conversación — aparece
// en los resultados de búsqueda para poder arrancar el chat.
export type Contacto = {
  telefono: string;
  nombre: string;
};

type Filtro = "todos" | "no_leidos" | "consultas";

export function WhatsappSidebarClient({
  conversaciones,
  contactos,
}: {
  conversaciones: Conversacion[];
  contactos: Contacto[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Modo selección: checkboxes + acciones múltiples (marcar leídos / eliminar).
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const telefonoEnUrl = pathname.startsWith("/dashboard/whatsapp/")
    ? decodeURIComponent(pathname.split("/").pop() ?? "")
    : null;
  // Se marca la conversación clickeada al toque, sin esperar a que el server responda
  // y cambie la URL. Cuando la URL se actualiza, manda la URL.
  const [clickeado, setClickeado] = useState<{ telefono: string; desde: string | null } | null>(null);
  // Cuando la URL cambia (llegó el chat clickeado, o Esc volvió al panel en blanco), manda la URL.
  const [urlPrevia, setUrlPrevia] = useState(telefonoEnUrl);
  if (urlPrevia !== telefonoEnUrl) {
    setUrlPrevia(telefonoEnUrl);
    setClickeado(null);
  }
  const activeTelefono = clickeado ? clickeado.telefono : telefonoEnUrl;

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return conversaciones.filter((c) => {
      if (filtro === "no_leidos" && c.noLeidos === 0) return false;
      if (filtro === "consultas" && !c.esConsulta) return false;
      if (texto && !c.nombre.toLowerCase().includes(texto) && !c.telefono.includes(texto)) return false;
      return true;
    });
  }, [conversaciones, busqueda, filtro]);

  // Solo tiene sentido buscar contactos nuevos con texto escrito — si no, la lista
  // de alumnos sin conversación podría ser enorme y taparía los chats reales.
  const contactosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto || filtro !== "todos") return [];
    return contactos.filter((c) => c.nombre.toLowerCase().includes(texto));
  }, [contactos, busqueda, filtro]);

  const totalNoLeidos = conversaciones.reduce((acc, c) => acc + (c.noLeidos > 0 ? 1 : 0), 0);
  const consultasSinLeer = conversaciones.filter((c) => c.esConsulta && c.noLeidos > 0).length;

  // Solo cuentan las seleccionadas que siguen visibles con el filtro/búsqueda actual,
  // para no actuar sobre conversaciones que el usuario ya no está viendo.
  const seleccionVisible = filtradas.filter((c) => seleccion.has(c.telefono)).map((c) => c.telefono);
  const todasSeleccionadas = filtradas.length > 0 && seleccionVisible.length === filtradas.length;

  function salirDeSeleccion() {
    setSeleccionando(false);
    setSeleccion(new Set());
    setConfirmandoEliminar(false);
    setErrorAccion(null);
  }

  function toggle(telefono: string) {
    setConfirmandoEliminar(false);
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(telefono)) next.delete(telefono);
      else next.add(telefono);
      return next;
    });
  }

  function toggleTodas() {
    setConfirmandoEliminar(false);
    setSeleccion(todasSeleccionadas ? new Set() : new Set(filtradas.map((c) => c.telefono)));
  }

  function marcarLeidas() {
    if (seleccionVisible.length === 0) return;
    setErrorAccion(null);
    startTransition(async () => {
      const res = await marcarConversacionesLeidasAction(seleccionVisible);
      if (!res.ok) { setErrorAccion(res.error); return; }
      salirDeSeleccion();
      router.refresh();
    });
  }

  function eliminar() {
    if (seleccionVisible.length === 0) return;
    if (!confirmandoEliminar) { setConfirmandoEliminar(true); return; }
    setErrorAccion(null);
    const borrandoActiva = !!activeTelefono && seleccionVisible.includes(activeTelefono);
    startTransition(async () => {
      const res = await eliminarConversacionesAction(seleccionVisible);
      if (!res.ok) { setErrorAccion(res.error); setConfirmandoEliminar(false); return; }
      salirDeSeleccion();
      if (borrandoActiva) router.push("/dashboard/whatsapp");
      router.refresh();
    });
  }

  return (
    <aside
      className="w-full flex flex-col rounded-xl overflow-hidden"
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
          <button
            type="button"
            onClick={() => (seleccionando ? salirDeSeleccion() : setSeleccionando(true))}
            title={seleccionando ? "Cancelar selección" : "Seleccionar conversaciones"}
            aria-pressed={seleccionando}
            className="px-2 py-1.5 rounded-lg transition-colors shrink-0"
            style={{
              background: seleccionando ? T.accentBg : "transparent",
              color: seleccionando ? T.accent : T.textDim,
              border: `1px solid ${seleccionando ? T.accentBorder : T.border}`,
            }}
          >
            {seleccionando ? <X className="w-4 h-4" /> : <ListChecks className="w-4 h-4" />}
          </button>
          {([
            { value: "todos" as const, label: "Todos" },
            { value: "no_leidos" as const, label: `No leídos${totalNoLeidos > 0 ? ` (${totalNoLeidos})` : ""}` },
            { value: "consultas" as const, label: `Consultas${consultasSinLeer > 0 ? ` (${consultasSinLeer})` : ""}` },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => setFiltro(t.value)}
              className="flex-1 px-1 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors"
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

        {seleccionando && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTodas}
                className="flex items-center gap-2 text-xs"
                style={{ color: T.textDim }}
                disabled={filtradas.length === 0}
              >
                <Casilla marcada={todasSeleccionadas} />
                {seleccionVisible.length > 0 ? `${seleccionVisible.length} seleccionada${seleccionVisible.length === 1 ? "" : "s"}` : "Seleccionar todas"}
              </button>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={marcarLeidas}
                disabled={isPending || seleccionVisible.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                style={{ background: T.inputBg, color: T.text, border: `1px solid ${T.border}` }}
              >
                <MailOpen className="w-3.5 h-3.5" /> Marcar leídas
              </button>
              <button
                type="button"
                onClick={eliminar}
                onBlur={() => setConfirmandoEliminar(false)}
                disabled={isPending || seleccionVisible.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                style={{
                  background: confirmandoEliminar ? T.danger : "transparent",
                  color: confirmandoEliminar ? "#fff" : T.danger,
                  border: `1px solid ${T.danger}`,
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmandoEliminar ? `¿Eliminar ${seleccionVisible.length}?` : "Eliminar"}
              </button>
            </div>
            {errorAccion && <p className="text-xs" style={{ color: T.danger }}>{errorAccion}</p>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtradas.length === 0 && contactosFiltrados.length === 0 && (
          <p className="text-sm text-center mt-8 px-4" style={{ color: T.textDim }}>
            {busqueda || filtro !== "todos" ? "Sin resultados" : "Todavía no hay conversaciones"}
          </p>
        )}
        {filtradas.map((c) => {
          const active = c.telefono === activeTelefono;
          const marcada = seleccion.has(c.telefono);
          const filaStyle = {
            background: (seleccionando ? marcada : active) ? T.accentBg : "transparent",
            borderLeft: `3px solid ${(seleccionando ? marcada : active) ? T.accent : "transparent"}`,
            borderBottom: `1px solid ${T.border}`,
          };
          const contenido = (
            <>
              {seleccionando ? (
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <Casilla marcada={marcada} />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: T.accentBg, color: T.accent }}
                >
                  {c.nombre.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="font-semibold truncate text-sm" style={{ color: active && !seleccionando ? T.accent : T.text }}>{c.nombre}</p>
                  {c.esConsulta && (
                    <span
                      className="shrink-0 px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{ fontFamily: "var(--font-fredoka)", background: `color-mix(in oklch, ${T.blue} 12%, transparent)`, color: T.blue, border: `1px solid color-mix(in oklch, ${T.blue} 30%, transparent)` }}
                    >
                      Consulta
                    </span>
                  )}
                </div>
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
            </>
          );

          if (seleccionando) {
            return (
              <button
                key={c.telefono}
                type="button"
                role="checkbox"
                aria-checked={marcada}
                onClick={() => toggle(c.telefono)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors"
                style={filaStyle}
              >
                {contenido}
              </button>
            );
          }

          return (
            <Link
              key={c.telefono}
              href={`/dashboard/whatsapp/${encodeURIComponent(c.telefono)}`}
              onClick={() => setClickeado({ telefono: c.telefono, desde: telefonoEnUrl })}
              aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--fila-hover)]")}
              style={{ ...filaStyle, ["--fila-hover" as string]: active ? T.accentBg : T.cardHover }}
            >
              {contenido}
            </Link>
          );
        })}

        {!seleccionando && contactosFiltrados.length > 0 && (
          <>
            <p
              className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}
            >
              Iniciar conversación
            </p>
            {contactosFiltrados.map((c) => (
              <Link
                key={c.telefono}
                href={`/dashboard/whatsapp/${encodeURIComponent(c.telefono)}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: T.inputBg, color: T.textDim }}
                >
                  {c.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate text-sm" style={{ color: T.text }}>{c.nombre}</p>
                  <p className="text-xs truncate" style={{ color: T.textDim }}>{c.telefono}</p>
                </div>
                <MessageCirclePlus className="w-4 h-4 shrink-0" style={{ color: T.accent }} />
              </Link>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <span
      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
      style={{
        background: marcada ? T.accent : "transparent",
        border: `1.5px solid ${marcada ? T.accent : T.border}`,
      }}
    >
      {marcada && <Check className="w-3 h-3" style={{ color: T.accentText }} strokeWidth={3} />}
    </span>
  );
}
