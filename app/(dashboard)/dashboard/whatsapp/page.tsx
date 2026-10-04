import { MessageCircle } from "lucide-react";
import { T } from "@/lib/theme";

export default function WhatsappPage() {
  return (
    <div
      className="h-full rounded-xl flex flex-col items-center justify-center text-center p-10"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
    >
      <MessageCircle className="w-10 h-10 mb-3" style={{ color: T.textDim }} />
      <p style={{ color: T.textDim }}>Elegí una conversación de la lista para ver el chat.</p>
    </div>
  );
}
