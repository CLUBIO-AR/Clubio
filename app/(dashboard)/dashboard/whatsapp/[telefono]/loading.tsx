import { T } from "@/lib/theme";

// Esqueleto del chat: con loading.tsx Next precarga esta parte al pasar el mouse por
// la conversación, así al hacer click se ve al toque mientras llegan los mensajes.
export default function WhatsappThreadLoading() {
  const burbujas: Array<{ lado: "izq" | "der"; ancho: string }> = [
    { lado: "izq", ancho: "45%" },
    { lado: "der", ancho: "60%" },
    { lado: "izq", ancho: "35%" },
    { lado: "der", ancho: "50%" },
  ];
  return (
    <div className="space-y-3 flex flex-col h-full animate-pulse">
      <div className="space-y-1.5">
        <div style={{ width: 180, height: 22, borderRadius: 8, background: T.card, border: `1px solid ${T.border}` }} />
        <div style={{ width: 110, height: 12, borderRadius: 6, background: T.card, border: `1px solid ${T.border}` }} />
      </div>
      <div className="flex-1 rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {burbujas.map((b, i) => (
          <div key={i} className={b.lado === "der" ? "flex justify-end" : "flex justify-start"}>
            <div style={{ width: b.ancho, height: 38, borderRadius: 16, background: T.inputBg }} />
          </div>
        ))}
      </div>
    </div>
  );
}
