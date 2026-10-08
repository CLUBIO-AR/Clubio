"use client";

import { useState } from "react";
import { ConfigSection, Field, Input, Textarea, Toggle, SubBlock, Hint } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  activo: boolean;
  bienvenida: string;
  info: string;
  recomendaciones: string;
  latitud: number | null;
  longitud: number | null;
  gymNombre: string;
}

// Respuestas automáticas para gente que escribe al WhatsApp del gym y no es alumna.
// La lógica está en lib/bot-consultas.ts (la llama el webhook de WhatsApp).
export function ConfigWhatsappBot(props: Props) {
  const [activo, setActivo] = useState(props.activo);
  const [bienvenida, setBienvenida] = useState(props.bienvenida);
  const [info, setInfo] = useState(props.info);
  const [recomendaciones, setRecomendaciones] = useState(props.recomendaciones);
  // "-27.4512, -58.9867" (como lo copia Google Maps con clic derecho sobre el mapa).
  const [coordenadas, setCoordenadas] = useState(props.latitud != null && props.longitud != null ? `${props.latitud}, ${props.longitud}` : "");

  const bienvenidaDefault = `¡Hola {nombre}! 👋 Gracias por escribir a ${props.gymNombre || "nuestro gimnasio"}. ¿En qué te podemos ayudar?`;

  async function save() {
    let latitud: number | null = null;
    let longitud: number | null = null;
    if (coordenadas.trim()) {
      const partes = coordenadas.split(",").map((p) => Number(p.trim()));
      if (partes.length !== 2 || partes.some((n) => !Number.isFinite(n)) || Math.abs(partes[0]) > 90 || Math.abs(partes[1]) > 180) {
        throw new Error("Pegá las coordenadas como «latitud, longitud» (ej. -27.4512, -58.9867)");
      }
      [latitud, longitud] = partes;
    }
    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsapp_bot_activo: activo,
        whatsapp_bot_bienvenida: bienvenida.trim() || null,
        whatsapp_bot_info: info.trim() || null,
        whatsapp_bot_recomendaciones: recomendaciones.trim() || null,
        whatsapp_bot_latitud: latitud,
        whatsapp_bot_longitud: longitud,
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
        <Hint>
          Escribí <code>{"{nombre}"}</code> donde quieras el nombre de la persona (sale de su perfil de WhatsApp; si no tiene uno
          válido, se saca solo). Si lo dejás vacío se usa el de ejemplo. Debajo van los botones:
        </Hint>
        <div className="flex flex-wrap gap-1.5">
          {["Horarios y precios", "Clase de prueba", "Hablar con alguien"].map((b) => (
            <span key={b} className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: T.inputBg, color: T.accent, border: `1px solid ${T.border}` }}>
              {b}
            </span>
          ))}
        </div>
      </SubBlock>

      <SubBlock title="Información adicional para «Horarios y precios»">
        <Hint>
          El bot arma solo la lista de actividades con precio y horarios a partir de lo que cargues en <a href="/dashboard/actividades" style={{ color: T.accent, textDecoration: "underline" }}>Actividades</a> (descripción y horarios de cada una).
          Acá podés sumar lo que no está ahí: matrícula, promos, qué traer. Si no tenés actividades cargadas, se manda solo este texto.
        </Hint>
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
          «Clase de prueba» propone las próximas clases según los horarios y el cupo de cada actividad, reserva el lugar y confirma el turno; vos lo ves en el panel como mensaje sin leer.
          La persona puede cambiar el horario o cancelar desde el mismo chat, y le llega un recordatorio unas horas antes.
          «Hablar con alguien» deja el chat sin leer para que lo atienda alguien del gym.
          El bot no vuelve a mandar la bienvenida si alguien del gym le escribió en las últimas 24 h.
        </Hint>
      </SubBlock>

      <SubBlock title="Confirmación de la clase de prueba">
        <Hint>Se suman al mensaje de confirmación, junto con la dirección de la sede principal y «Llegá 10 minutos antes».</Hint>
        <Field label="Qué traer o recomendaciones (opcional)">
          <Input value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)} maxLength={200} placeholder="Traé agua, toalla y ropa cómoda" />
        </Field>
        <Field label="Ubicación en el mapa (opcional)">
          <Input value={coordenadas} onChange={(e) => setCoordenadas(e.target.value)} placeholder="-27.4512, -58.9867" inputMode="decimal" />
        </Field>
        <Hint>En Google Maps, hacé clic derecho sobre el gym y tocá las coordenadas para copiarlas. Si las cargás, el bot manda también el pin del mapa.</Hint>
      </SubBlock>
    </ConfigSection>
  );
}
