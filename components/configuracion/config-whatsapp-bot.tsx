"use client";

import { useState } from "react";
import { ConfigSection, Field, Textarea, Toggle, SubBlock, Hint } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  activo: boolean;
  bienvenida: string;
  info: string;
  gymNombre: string;
}

// Respuestas automáticas para gente que escribe al WhatsApp del gym y no es alumna.
// La lógica está en lib/bot-consultas.ts (la llama el webhook de WhatsApp).
export function ConfigWhatsappBot(props: Props) {
  const [activo, setActivo] = useState(props.activo);
  const [bienvenida, setBienvenida] = useState(props.bienvenida);
  const [info, setInfo] = useState(props.info);

  const bienvenidaDefault = `¡Hola! 👋 Gracias por escribir a ${props.gymNombre || "nuestro gimnasio"}. ¿En qué te podemos ayudar?`;

  async function save() {
    if (activo && !info.trim()) {
      throw new Error("Cargá el texto de horarios y precios: es lo que más se consulta");
    }
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsapp_bot_activo: activo,
        whatsapp_bot_bienvenida: bienvenida.trim() || null,
        whatsapp_bot_info: info.trim() || null,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
  }

  return (
    <ConfigSection title="Respuestas automáticas a consultas" onSave={save}>
      <SubBlock>
        <Toggle
          checked={activo}
          onChange={setActivo}
          label="Responder automáticamente a quien no es alumno"
          description="Cuando escribe un número que no está cargado como alumno, le responde la bienvenida con tres botones. Los chats aparecen en el panel con la etiqueta Consulta."
        />
      </SubBlock>

      <SubBlock title="Mensaje de bienvenida">
        <Field label="Texto">
          <Textarea value={bienvenida} onChange={(e) => setBienvenida(e.target.value)} placeholder={bienvenidaDefault} rows={3} maxLength={900} />
        </Field>
        <Hint>Si lo dejás vacío se usa el de ejemplo. Debajo van los botones:</Hint>
        <div className="flex flex-wrap gap-1.5">
          {["Horarios y precios", "Clase de prueba", "Hablar con alguien"].map((b) => (
            <span key={b} className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: T.inputBg, color: T.accent, border: `1px solid ${T.border}` }}>
              {b}
            </span>
          ))}
        </div>
      </SubBlock>

      <SubBlock title="Respuesta a «Horarios y precios»">
        <Field label="Texto">
          <Textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder={"🏋️ Funcional: lun a vie 8, 18 y 20 h — $25.000/mes\n🧘 Pilates: mar y jue 19 h — $20.000/mes\n📍 Av. Siempreviva 742"}
            rows={6}
            maxLength={3500}
          />
        </Field>
        <Hint>
          «Clase de prueba» y «Hablar con alguien» responden un mensaje corto y dejan el chat sin leer para que lo atienda alguien del gym.
          El bot no vuelve a mandar la bienvenida si alguien del gym le escribió en las últimas 24 h.
        </Hint>
      </SubBlock>
    </ConfigSection>
  );
}
