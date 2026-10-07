"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { T } from "@/lib/theme";
import { enviarMensajeWhatsappAction } from "@/app/actions/whatsapp";
import { enviarAvisoCuotaPorTelefonoAction } from "@/app/actions/avisos";

// Atajos disponibles en el chat — no dependen de la ventana de 24hs porque mandan
// una plantilla aprobada, no texto libre.
type Comando = keyof typeof COMANDOS;
const COMANDOS: Record<string, { label: string; run: (telefono: string) => Promise<{ ok: true; data: { canales: string[] } } | { ok: false; error: string }> }> = {
  "/aviso_cuota": {
    label: "Aviso de cuota",
    run: enviarAvisoCuotaPorTelefonoAction,
  },
};

// Variantes aceptadas por comando: "/aviso cuota", "/aviso-cuota", "/avisocuota", "/aviso".
const ALIAS_COMANDOS: Record<string, Comando> = {
  "/aviso": "/aviso_cuota",
  "/avisocuota": "/aviso_cuota",
};

/** "/Aviso  Cuota" → "/aviso_cuota". Devuelve null si no es un comando conocido. */
function resolverComando(texto: string): Comando | null {
  const norm = texto.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (norm in COMANDOS) return norm as Comando;
  return ALIAS_COMANDOS[norm] ?? ALIAS_COMANDOS[norm.replace(/_/g, "")] ?? null;
}

type Mensaje = {
  id: string;
  cuerpo: string;
  direccion: "entrante" | "saliente";
  estado: string;
  created_at: string;
};

export function WhatsappThreadClient({
  telefono,
  mensajesIniciales,
  ventanaAbierta,
}: {
  telefono: string;
  mensajesIniciales: Mensaje[];
  // Calculada en el server component (page.tsx) para no llamar Date.now() en el
  // cliente durante el render — Meta solo permite texto libre dentro de las 24hs
  // desde el último mensaje del alumno; si nunca escribió o pasaron más de 24hs,
  // hay que iniciar con una plantilla aprobada (ver "Reenviar aviso" en Cuotas).
  ventanaAbierta: boolean;
}) {
  // Los mensajes vienen del server y se actualizan solos (Realtime → router.refresh()).
  // Lo que mandás desde acá se muestra al toque como "pendiente" hasta que llega la
  // versión del server; cuando cambian los mensajes del server, los pendientes se descartan.
  const [pendientes, setPendientes] = useState<Mensaje[]>([]);
  const [inicialesPrevios, setInicialesPrevios] = useState(mensajesIniciales);
  if (mensajesIniciales !== inicialesPrevios) {
    setInicialesPrevios(mensajesIniciales);
    setPendientes([]);
  }
  const mensajes = [...mensajesIniciales, ...pendientes];
  const setMensajes = setPendientes;
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sugerenciaIndex, setSugerenciaIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ultimoEntrante = [...mensajes].reverse().find((m) => m.direccion === "entrante");

  // Sugerencias de comandos mientras se escribe algo que empieza con "/". Se compara
  // normalizado ("/aviso cuota" ≈ "/aviso_cuota") y se ocultan cuando el texto ya es
  // exactamente un comando, así Enter lo manda en vez de volver a autocompletar.
  const textoNorm = texto.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const comandoExacto = texto.startsWith("/") ? resolverComando(texto) : null;
  const sugerencias = texto.startsWith("/") && !comandoExacto && texto.length < 30
    ? (Object.keys(COMANDOS) as Comando[]).filter((c) => c.startsWith(textoNorm))
    : [];

  function elegirSugerencia(comando: string) {
    setTexto(comando);
    inputRef.current?.focus();
  }

  // Esc sale del chat y deja el panel en blanco para elegir otro. No actúa si otro
  // componente ya usó la tecla (sugerencias de comandos, panel de notificaciones).
  const router = useRouter();
  useEffect(() => {
    const salir = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[role=dialog], [role=menu]")) return;
      router.push("/dashboard/whatsapp");
    };
    window.addEventListener("keydown", salir);
    return () => window.removeEventListener("keydown", salir);
  }, [router]);

  // Bajar al último mensaje solo cuando llega o se manda uno (no en cada tecla).
  const cantidadMensajes = mensajes.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cantidadMensajes]);

  function handleEnviar(textoAEnviar: string = texto) {
    const cuerpo = textoAEnviar.trim();
    if (!cuerpo || isPending) return;
    setError(null);

    const clave = cuerpo.startsWith("/") ? resolverComando(cuerpo) : null;
    if (clave) {
      const comando = COMANDOS[clave];
      // La caja se vacía apenas se manda, no cuando vuelve la respuesta de Meta.
      setTexto("");
      startTransition(async () => {
        const res = await comando.run(telefono);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setMensajes((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            cuerpo: `📋 Plantilla enviada: ${comando.label} (${res.data.canales.join(", ")})`,
            direccion: "saliente",
            estado: "enviado",
            created_at: new Date().toISOString(),
          },
        ]);
      });
      return;
    }

    if (cuerpo.startsWith("/")) {
      setError(`Comando desconocido. Disponibles: ${Object.keys(COMANDOS).join(", ")}`);
      return;
    }

    if (!ventanaAbierta) {
      setError("Fuera de la ventana de 24hs no se puede mandar texto libre — usá /aviso_cuota.");
      return;
    }

    setTexto("");
    startTransition(async () => {
      const res = await enviarMensajeWhatsappAction(telefono, cuerpo);
      if (!res.ok) {
        setError(res.error);
        // Si falló, devolvemos el texto a la caja para no perder lo que se escribió.
        setTexto((actual) => actual || cuerpo);
        return;
      }
      setMensajes((prev) => [
        ...prev,
        {
          id: res.data.wa_message_id,
          cuerpo,
          direccion: "saliente",
          estado: "enviado",
          created_at: new Date().toISOString(),
        },
      ]);
    });
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col md:rounded-xl overflow-hidden md:border" style={{ background: T.card, borderColor: T.border }}>
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3">
        {mensajes.length === 0 && (
          <p className="text-sm text-center mt-10" style={{ color: T.textDim }}>Todavía no hay mensajes con este número.</p>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={m.direccion === "saliente" ? "flex justify-end" : "flex justify-start"}>
            <div
              className="max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 md:px-4 py-2.5"
              style={{
                background: m.direccion === "saliente" ? T.accent : T.inputBg,
                color: m.direccion === "saliente" ? T.accentText : T.text,
              }}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{m.cuerpo}</p>
              <p
                className="text-[10px] mt-1 text-right"
                style={{ color: m.direccion === "saliente" ? "rgba(255,255,255,0.7)" : T.textDim }}
              >
                {new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:p-4" style={{ borderTop: `1px solid ${T.border}` }}>
        {error && <p className="text-xs mb-2" style={{ color: T.danger }}>{error}</p>}
        {!ventanaAbierta && (
          <p className="text-xs mb-2" style={{ color: T.textDim }}>
            {ultimoEntrante
              ? "Pasaron más de 24hs desde el último mensaje del alumno — no se puede mandar texto libre, "
              : "Este alumno todavía no te escribió — no se puede iniciar con texto libre, "}
            pero podés usar <code className="px-1 rounded" style={{ background: T.inputBg }}>/aviso_cuota</code> para mandarle la plantilla.
          </p>
        )}
        <div className="relative">
          {sugerencias.length > 0 && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1.5 rounded-lg overflow-hidden"
              style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
            >
              {sugerencias.map((comando, i) => (
                <button
                  key={comando}
                  type="button"
                  onClick={() => elegirSugerencia(comando)}
                  onMouseEnter={() => setSugerenciaIndex(i)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                  style={{ background: i === sugerenciaIndex ? T.accentBg : "transparent" }}
                >
                  <span className="text-sm font-mono" style={{ color: i === sugerenciaIndex ? T.accent : T.text }}>{comando}</span>
                  <span className="text-xs" style={{ color: T.textDim }}>{COMANDOS[comando].label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setSugerenciaIndex(0); }}
              onKeyDown={(e) => {
                if (sugerencias.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSugerenciaIndex((i) => (i + 1) % sugerencias.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSugerenciaIndex((i) => (i - 1 + sugerencias.length) % sugerencias.length);
                    return;
                  }
                  if (e.key === "Tab") {
                    e.preventDefault();
                    elegirSugerencia(sugerencias[sugerenciaIndex]);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    // Enter sobre una sugerencia la manda directo.
                    e.preventDefault();
                    handleEnviar(sugerencias[sugerenciaIndex] ?? texto);
                    return;
                  }
                  if (e.key === "Escape") {
                    // Con sugerencias abiertas, Esc solo las cierra (no sale del chat).
                    e.preventDefault();
                    setTexto("");
                    return;
                  }
                }

                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviar();
                }
              }}
              placeholder={ventanaAbierta ? "Escribí un mensaje..." : "/aviso_cuota"}
              rows={1}
              // 16px en el celular: con menos, el iPhone hace zoom al tocar la caja de texto.
              className="resize-none text-base md:text-sm"
            />
            <Button onClick={() => handleEnviar()} disabled={isPending || !texto.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {ventanaAbierta && (
          <p className="text-[11px] mt-1.5" style={{ color: T.textDim }}>
            Solo podés responder dentro de las 24hs desde el último mensaje del alumno.
          </p>
        )}
      </div>
    </div>
  );
}
