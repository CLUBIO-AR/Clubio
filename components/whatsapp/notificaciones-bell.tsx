"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { T } from "@/lib/theme";
import { useWhatsappNotificaciones } from "./whatsapp-realtime";

function hace(fecha: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

// Campanita con los mensajes de WhatsApp sin leer. `lado` decide hacia dónde se abre el
// panel: a la derecha del sidebar en escritorio, hacia abajo en la barra del celular.
export function NotificacionesBell({ lado }: { lado: "derecha" | "abajo" }) {
  const ctx = useWhatsappNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // El panel se dibuja en document.body con position: fixed (portal), así ningún
  // elemento de la página puede quedar por encima. Se ubica al lado del botón.
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const r = botonRef.current?.getBoundingClientRect();
      if (!r) return;
      const ancho = Math.min(340, window.innerWidth - 32);
      if (lado === "derecha") {
        setPos({ top: Math.max(16, r.top), left: Math.min(r.right + 12, window.innerWidth - ancho - 16), width: ancho });
      } else {
        setPos({ top: r.bottom + 8, left: Math.max(16, r.right - ancho), width: ancho });
      }
    };
    ubicar();
    window.addEventListener("resize", ubicar);
    return () => window.removeEventListener("resize", ubicar);
  }, [abierto, lado]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !botonRef.current?.contains(t)) setAbierto(false);
    };
    // En captura y con preventDefault: Esc cierra el panel y no llega a cerrar el chat de atrás.
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setAbierto(false); } };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", cerrar); document.removeEventListener("keydown", esc, true); };
  }, [abierto]);

  if (!ctx) return null;
  const { noLeidos, conversacionesSinLeer, marcarTodasLeidas, permisoNavegador, pedirPermisoNavegador } = ctx;

  // Una fila por conversación (el mensaje más nuevo), con cuántos sin leer tiene.
  const porTelefono = new Map<string, { ultimo: (typeof noLeidos)[number]; cantidad: number }>();
  for (const n of noLeidos) {
    const actual = porTelefono.get(n.telefono);
    if (actual) actual.cantidad++;
    else porTelefono.set(n.telefono, { ultimo: n, cantidad: 1 });
  }
  const filas = Array.from(porTelefono.values());

  return (
    <div className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={conversacionesSinLeer > 0 ? `Notificaciones: ${conversacionesSinLeer} conversaciones sin leer` : "Notificaciones"}
        aria-expanded={abierto}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: conversacionesSinLeer > 0 ? T.lime : T.textOnDarkMuted, background: abierto ? "rgba(255,255,255,0.08)" : "transparent" }}
      >
        {conversacionesSinLeer > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {conversacionesSinLeer > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: T.lime, color: T.bgDeep }}
          >
            {conversacionesSinLeer > 9 ? "9+" : conversacionesSinLeer}
          </span>
        )}
      </button>

      {abierto && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Mensajes nuevos de WhatsApp"
          className="fixed z-[1000] rounded-xl overflow-hidden"
          style={{ ...pos, background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 12px 32px rgba(0,0,0,0.22)" }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: T.text, fontFamily: "var(--font-fredoka)" }}>
              Mensajes nuevos
            </p>
            {filas.length > 0 && (
              <button
                type="button"
                onClick={() => void marcarTodasLeidas()}
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: T.accent }}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar leídos
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {filas.length === 0 && (
              <p className="text-sm text-center py-8 px-4" style={{ color: T.textDim }}>No tenés mensajes sin leer.</p>
            )}
            {filas.map(({ ultimo, cantidad }) => (
              <Link
                key={ultimo.telefono}
                href={`/dashboard/whatsapp/${encodeURIComponent(ultimo.telefono)}`}
                onClick={() => setAbierto(false)}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--fila-hover)]"
                style={{ borderBottom: `1px solid ${T.borderSub}`, ["--fila-hover" as string]: T.cardHover }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: T.accentBg, color: T.accent }}>
                  {ultimo.nombre.replace(/^\+/, "").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{ultimo.nombre}</p>
                    <span className="text-[10px] shrink-0" style={{ color: T.textDim }}>{hace(ultimo.created_at)}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: T.textDim }}>
                    {cantidad > 1 && <strong style={{ color: T.accent }}>{cantidad} · </strong>}
                    {ultimo.cuerpo}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {permisoNavegador === "default" && (
            <button
              type="button"
              onClick={() => void pedirPermisoNavegador()}
              className="w-full px-4 py-2.5 text-xs font-semibold text-left"
              style={{ background: T.bg, color: T.accent, borderTop: `1px solid ${T.border}` }}
            >
              🔔 Avisarme aunque esté en otra pestaña
            </button>
          )}
          {permisoNavegador === "denied" && (
            <p className="px-4 py-2.5 text-[11px]" style={{ background: T.bg, color: T.textDim, borderTop: `1px solid ${T.border}` }}>
              Las notificaciones del navegador están bloqueadas. Activalas desde el candado de la barra de direcciones.
            </p>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
