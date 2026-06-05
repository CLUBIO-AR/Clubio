import { T } from "@/lib/theme";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function PagarSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ nombre?: string; pendiente?: string; ya_pagada?: string; condonada?: string }>;
}) {
  const sp = await searchParams;
  const nombre = sp.nombre ?? "Alumno";
  const pendiente = sp.pendiente === "1";
  const yaPagada = sp.ya_pagada === "1";
  const condonada = sp.condonada === "1";

  let titulo = "¡Pago recibido!";
  let subtitulo = `Gracias ${nombre}. Tu cuota ha sido registrada.`;
  let color: string = T.accent;

  if (pendiente) {
    titulo = "Pago en proceso";
    subtitulo = `Tu pago está siendo procesado, ${nombre}. Te notificaremos cuando se confirme.`;
    color = T.warning;
  } else if (yaPagada) {
    titulo = "Cuota ya pagada";
    subtitulo = `Esta cuota ya fue registrada como pagada, ${nombre}.`;
    color = T.blue;
  } else if (condonada) {
    titulo = "Cuota condonada";
    subtitulo = `Esta cuota fue condonada por el gimnasio, ${nombre}.`;
    color = T.textMuted;
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${color}18`, border: `2px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle style={{ width: 36, height: 36, color }} />
        </div>
        <h1 style={{
          fontFamily: "var(--font-barlow-condensed)", fontSize: "2rem",
          fontWeight: 900, color: T.text, letterSpacing: "0.04em",
          textTransform: "uppercase", marginBottom: "0.75rem",
        }}>
          {titulo}
        </h1>
        <p style={{ color: T.textMuted, fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          {subtitulo}
        </p>
        <div style={{
          padding: "0.5rem 1rem", borderRadius: 8,
          background: T.accentBg, border: `1px solid ${T.accentBorder}`,
          display: "inline-block",
        }}>
          <span style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.1em", color: T.accent }}>
            CLUBIO
          </span>
        </div>
      </div>
    </div>
  );
}
