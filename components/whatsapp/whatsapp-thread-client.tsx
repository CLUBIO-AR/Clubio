"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { T } from "@/lib/theme";
import { enviarMensajeWhatsappAction } from "@/app/actions/whatsapp";
import { enviarAvisoCuotaPorTelefonoAction } from "@/app/actions/avisos";

// Atajos disponibles en el chat — no dependen de la ventana de 24hs porque mandan
// una plantilla aprobada, no texto libre.
const COMANDOS: Record<string, { label: string; run: (telefono: string) => Promise<{ ok: true; data: { canales: string[] } } | { ok: false; error: string }> }> = {
  "/aviso_cuota": {
    label: "Aviso de cuota",
    run: enviarAvisoCuotaPorTelefonoAction,
  },
};

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
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sugerenciaIndex, setSugerenciaIndex] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ultimoEntrante = [...mensajes].reverse().find((m) => m.direccion === "entrante");

  // Sugerencias de comandos — solo mientras se está escribiendo el primer "token"
  // (antes del primer espacio), para no interferir con texto libre normal.
  const sugerencias = texto.startsWith("/") && !texto.includes(" ")
    ? Object.keys(COMANDOS).filter((c) => c.startsWith(texto.toLowerCase()))
    : [];

  function elegirSugerencia(comando: string) {
    setTexto(comando);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  function handleEnviar() {
    const cuerpo = texto.trim();
    if (!cuerpo) return;
    setError(null);

    const comando = COMANDOS[cuerpo.toLowerCase()];
    if (comando) {
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
        setTexto("");
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

    startTransition(async () => {
      const res = await enviarMensajeWhatsappAction(telefono, cuerpo);
      if (!res.ok) {
        setError(res.error);
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
      setTexto("");
    });
  }

  return (
    <div className="flex-1 flex flex-col rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {mensajes.length === 0 && (
          <p className="text-sm text-center mt-10" style={{ color: T.textDim }}>Todavía no hay mensajes con este número.</p>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={m.direccion === "saliente" ? "flex justify-end" : "flex justify-start"}>
            <div
              className="max-w-[70%] rounded-2xl px-4 py-2.5"
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

      <div className="p-4" style={{ borderTop: `1px solid ${T.border}` }}>
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
                  if (e.key === "Tab" || e.key === "Enter") {
                    e.preventDefault();
                    elegirSugerencia(sugerencias[sugerenciaIndex]);
                    return;
                  }
                  if (e.key === "Escape") {
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
              className="resize-none"
              disabled={isPending}
            />
            <Button onClick={handleEnviar} disabled={isPending || !texto.trim()} size="icon">
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
