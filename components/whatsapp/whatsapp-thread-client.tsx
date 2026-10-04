"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { T } from "@/lib/theme";
import { enviarMensajeWhatsappAction } from "@/app/actions/whatsapp";

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
}: {
  telefono: string;
  mensajesIniciales: Mensaje[];
}) {
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  function handleEnviar() {
    const cuerpo = texto.trim();
    if (!cuerpo) return;
    setError(null);

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
        <div className="flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEnviar();
              }
            }}
            placeholder="Escribí un mensaje..."
            rows={1}
            className="resize-none"
            disabled={isPending}
          />
          <Button onClick={handleEnviar} disabled={isPending || !texto.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[11px] mt-1.5" style={{ color: T.textDim }}>
          Solo podés responder dentro de las 24hs desde el último mensaje del alumno.
        </p>
      </div>
    </div>
  );
}
