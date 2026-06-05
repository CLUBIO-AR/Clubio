import { T } from "@/lib/theme";
import { XCircle } from "lucide-react";

export default async function PagarFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ nombre?: string }>;
}) {
  const sp = await searchParams;
  const nombre = sp.nombre ?? "Alumno";

  return (
    <div style={{ minHeight: "100vh", background: T.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${T.danger}12`, border: `2px solid ${T.danger}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <XCircle style={{ width: 36, height: 36, color: T.danger }} />
        </div>
        <h1 style={{
          fontFamily: "var(--font-barlow-condensed)", fontSize: "2rem",
          fontWeight: 900, color: T.text, letterSpacing: "0.04em",
          textTransform: "uppercase", marginBottom: "0.75rem",
        }}>
          Pago no completado
        </h1>
        <p style={{ color: T.textMuted, fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          {nombre}, el pago no pudo procesarse. Podés intentarlo nuevamente o contactar al gimnasio.
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
