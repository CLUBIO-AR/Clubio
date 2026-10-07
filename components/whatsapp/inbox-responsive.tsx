"use client";

import { usePathname } from "next/navigation";
import { T } from "@/lib/theme";

// En el celular la lista y el chat no entran lado a lado: se muestra uno por vez, como
// en WhatsApp (lista → tocás una conversación → chat a pantalla completa → "‹" vuelve).
// En pantallas medianas o más grandes se ven los dos juntos, como siempre.
export function InboxResponsive({ lista, children }: { lista: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const enChat = pathname.startsWith("/dashboard/whatsapp/");

  return (
    <div className="flex flex-col gap-3 md:gap-4 h-[calc(100dvh-6.75rem)] md:h-[calc(100dvh-8rem)]">
      <div className={enChat ? "hidden md:block" : "block"}>
        <h1 className="text-3xl md:text-4xl leading-none" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 900, color: T.text }}>
          WHATSAPP
        </h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Conversaciones con alumnos</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className={`${enChat ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 min-h-0`}>{lista}</div>
        <div className={`${enChat ? "flex" : "hidden md:flex"} flex-1 min-w-0 min-h-0 flex-col`}>{children}</div>
      </div>
    </div>
  );
}
