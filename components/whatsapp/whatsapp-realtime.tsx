"use client";

// Tiempo real para WhatsApp: escucha los cambios de mensajes_whatsapp del gym (Supabase
// Realtime, respeta RLS: cada gym recibe solo sus filas) y
//  - refresca el inbox solo cuando estás en /dashboard/whatsapp (sin F5),
//  - mantiene la lista de mensajes sin leer para la campanita de notificaciones,
//  - muestra un aviso abajo a la derecha y, si la pestaña está en segundo plano y diste
//    permiso, una notificación del navegador.
// Si Realtime no conecta, el inbox cae a refrescar cada 15 s.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/theme";
import { marcarConversacionesLeidasAction } from "@/app/actions/whatsapp";
import { useAvisosDispositivo, type EstadoPush } from "@/lib/hooks/use-avisos-dispositivo";

export type NotificacionWhatsapp = {
  id: string;
  telefono: string;
  nombre: string;
  cuerpo: string;
  created_at: string;
};

type Ctx = {
  noLeidos: NotificacionWhatsapp[];
  conversacionesSinLeer: number;
  marcarTodasLeidas: () => Promise<void>;
  sonido: boolean;
  setSonido: (on: boolean) => void;
  push: EstadoPush;
  activarPush: () => Promise<void>;
  desactivarPush: () => Promise<void>;
};

const WhatsappNotifContext = createContext<Ctx | null>(null);

export function useWhatsappNotificaciones() {
  return useContext(WhatsappNotifContext);
}

type FilaMensaje = {
  id: string;
  gym_id: string;
  alumno_id: string | null;
  telefono: string;
  direccion: "entrante" | "saliente";
  cuerpo: string;
  leido: boolean;
  created_at: string;
  deleted_at: string | null;
  perfil_nombre: string | null;
};

const MAX_NOTIFICACIONES = 30;

function hrefChat(telefono: string) {
  return `/dashboard/whatsapp/${encodeURIComponent(telefono)}`;
}

export function WhatsappRealtimeProvider({
  gymId,
  noLeidosIniciales,
  children,
}: {
  gymId: string;
  noLeidosIniciales: NotificacionWhatsapp[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [noLeidos, setNoLeidos] = useState(noLeidosIniciales);
  const [toasts, setToasts] = useState<NotificacionWhatsapp[]>([]);
  const avisos = useAvisosDispositivo();
  const { sonar } = avisos;
  const pushActivo = avisos.push === "activo";
  const [realtimeCaido, setRealtimeCaido] = useState(false);

  // Refs para leer el valor actual dentro del callback de Realtime sin resuscribirse.
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  const nombresRef = useRef(new Map<string, string>());
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enInbox = pathname.startsWith("/dashboard/whatsapp");

  const refrescarInbox = useCallback(() => {
    if (!pathnameRef.current.startsWith("/dashboard/whatsapp")) return;
    // Varios eventos juntos (mensaje + status entregado + marcar leído) → un solo refresh.
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 400);
  }, [router]);

  const resolverNombre = useCallback(async (fila: FilaMensaje): Promise<string> => {
    const key = fila.telefono.replace(/\D/g, "").slice(-10);
    const cache = nombresRef.current.get(key);
    if (cache) return cache;
    const supabase = createClient();
    const { data } = await supabase
      .from("alumnos")
      .select("nombre, apellido")
      .eq("gym_id", gymId)
      .ilike("telefono", `%${key}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nombre = data ? `${data.nombre} ${data.apellido}` : (fila.perfil_nombre ?? `+${fila.telefono}`);
    // Solo se cachean los alumnos: el nombre de perfil puede llegar recién en un mensaje posterior.
    if (data) nombresRef.current.set(key, nombre);
    return nombre;
  }, [gymId]);

  const notificar = useCallback(async (fila: FilaMensaje) => {
    const nombre = await resolverNombre(fila);
    const notif: NotificacionWhatsapp = { id: fila.id, telefono: fila.telefono, nombre, cuerpo: fila.cuerpo, created_at: fila.created_at };

    setNoLeidos((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)].slice(0, MAX_NOTIFICACIONES));
    // Suena siempre que llega un mensaje, aunque estés mirando ese chat (como WhatsApp).
    sonar();

    // Si ya estás mirando ese chat, no hace falta avisar (la página lo marca leído sola).
    const mirandoEseChat = pathnameRef.current === hrefChat(fila.telefono) && !document.hidden;
    if (mirandoEseChat) return;

    setToasts((prev) => [notif, ...prev].slice(0, 3));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== notif.id)), 7000);

    // Con push activo la notificación la muestra el service worker (aunque la pestaña esté
    // cerrada); acá solo hace falta si este dispositivo no tiene push.
    if (!pushActivo && document.hidden && "Notification" in window && Notification.permission === "granted") {
      const n = new Notification(nombre, { body: fila.cuerpo, tag: `wa-${fila.telefono}`, icon: "/icon.jpeg" });
      n.onclick = () => { window.focus(); router.push(hrefChat(fila.telefono)); n.close(); };
    }
  }, [resolverNombre, router, sonar, pushActivo]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    // IMPORTANTE: la suscripción tiene que salir con el token del usuario logueado. Sin
    // esto Realtime se conecta como "anon", la política RLS (gym_isolation) no deja ver
    // ninguna fila y nunca llega un evento — el inbox no se actualizaba sin F5 por eso.
    const conectar = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelado) return;
      if (!session) {
        console.warn("[whatsapp-realtime] sin sesión, no se puede escuchar en tiempo real");
        setRealtimeCaido(true);
        return;
      }
      await supabase.realtime.setAuth(session.access_token);
      if (cancelado) return;

      channel = supabase
        .channel(`wa-${gymId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "mensajes_whatsapp", filter: `gym_id=eq.${gymId}` },
          (payload) => {
            refrescarInbox();
            const fila = payload.new as Partial<FilaMensaje>;
            if (!fila?.id) return;

            if (payload.eventType === "INSERT" && fila.direccion === "entrante" && !fila.leido) {
              void notificar(fila as FilaMensaje);
            }
            // Leído (al abrir el chat, aunque sea en otra pestaña) o eliminado → sale de la lista.
            if (payload.eventType === "UPDATE" && (fila.leido || fila.deleted_at)) {
              setNoLeidos((prev) => prev.filter((n) => n.id !== fila.id));
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setRealtimeCaido(false);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[whatsapp-realtime] sin conexión en tiempo real, refrescando cada 15 s:", status);
            setRealtimeCaido(true);
          }
        });
    };
    void conectar();

    // El token de Supabase dura ~1 h: al renovarse, Realtime tiene que usar el nuevo.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void supabase.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelado = true;
      subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [gymId, notificar, refrescarInbox]);

  // Al volver a la pestaña después de un rato (la compu se suspendió, se cortó internet),
  // se pudo haber perdido algún evento: refrescamos una vez para ponernos al día.
  useEffect(() => {
    const alVolver = () => { if (!document.hidden) refrescarInbox(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [refrescarInbox]);

  // Plan B si Realtime no conecta: refrescar el inbox cada 15 s mientras estás ahí.
  useEffect(() => {
    if (!realtimeCaido || !enInbox) return;
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [realtimeCaido, enInbox, router]);

  const conversacionesSinLeer = useMemo(() => new Set(noLeidos.map((n) => n.telefono)).size, [noLeidos]);

  // "(3) CLUBIO" en el título de la pestaña mientras haya conversaciones sin leer.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = conversacionesSinLeer > 0 ? `(${conversacionesSinLeer}) ${base}` : base;
  }, [conversacionesSinLeer, pathname]);

  const marcarTodasLeidas = useCallback(async () => {
    const telefonos = Array.from(new Set(noLeidos.map((n) => n.telefono)));
    if (telefonos.length === 0) return;
    setNoLeidos([]);
    await marcarConversacionesLeidasAction(telefonos);
    refrescarInbox();
  }, [noLeidos, refrescarInbox]);


  const value = useMemo<Ctx>(() => ({
    noLeidos, conversacionesSinLeer, marcarTodasLeidas,
    sonido: avisos.sonido, setSonido: avisos.setSonido,
    push: avisos.push, activarPush: avisos.activarPush, desactivarPush: avisos.desactivarPush,
  }), [noLeidos, conversacionesSinLeer, marcarTodasLeidas, avisos.sonido, avisos.setSonido, avisos.push, avisos.activarPush, avisos.desactivarPush]);

  return (
    <WhatsappNotifContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 w-[min(340px,calc(100vw-2rem))]" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.16)" }}
              onClick={() => { router.push(hrefChat(t.telefono)); setToasts((p) => p.filter((x) => x.id !== t.id)); }}
              role="button"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: T.accentBg }}>
                <MessageCircle className="w-4 h-4" style={{ color: T.accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{t.nombre}</p>
                <p className="text-xs line-clamp-2" style={{ color: T.textDim }}>{t.cuerpo}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={(e) => { e.stopPropagation(); setToasts((p) => p.filter((x) => x.id !== t.id)); }}
                style={{ color: T.textDim }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </WhatsappNotifContext.Provider>
  );
}
