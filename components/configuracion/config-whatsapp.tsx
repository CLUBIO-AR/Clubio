"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ConfigSection, Field, Input, Toggle, SubBlock, Hint, SecretInput } from "./config-section";
import { T } from "@/lib/theme";

interface Props {
  activo: boolean;
  phoneNumberId: string;
  tokenConfigurado: boolean;
  templateAviso: string;
  templateTransferencia: string;
  templateConfirmacion: string;
  templateRecordatorioPrueba: string;
}

// Conexión con la API de WhatsApp (Meta Cloud API). Cuando está completa, aparece el
// inbox de WhatsApp en el menú y los avisos de cuota también salen por WhatsApp.
export function ConfigWhatsapp(props: Props) {
  const [activo, setActivo] = useState(props.activo);
  const [phoneNumberId, setPhoneNumberId] = useState(props.phoneNumberId);
  const [token, setToken] = useState("");
  const [tAviso, setTAviso] = useState(props.templateAviso);
  const [tTransf, setTTransf] = useState(props.templateTransferencia);
  const [tConf, setTConf] = useState(props.templateConfirmacion);
  const [tRecordatorio, setTRecordatorio] = useState(props.templateRecordatorioPrueba);
  const [showPlantillas, setShowPlantillas] = useState(false);

  const conectado = props.activo && !!props.phoneNumberId && props.tokenConfigurado;

  async function save() {
    if (activo && !phoneNumberId.trim()) throw new Error("Cargá el Phone Number ID para activar WhatsApp");
    if (activo && !props.tokenConfigurado && !token.trim()) throw new Error("Cargá el token de acceso para activar WhatsApp");
    if (phoneNumberId && !/^\d{10,20}$/.test(phoneNumberId.trim())) {
      throw new Error("El Phone Number ID son solo números (lo ves en Meta → WhatsApp → Configuración de la API)");
    }

    const body: Record<string, unknown> = {
      whatsapp_activo: activo,
      whatsapp_phone_number_id: phoneNumberId.trim() || null,
      whatsapp_template_aviso: tAviso.trim() || null,
      whatsapp_template_transferencia: tTransf.trim() || null,
      whatsapp_template_confirmacion: tConf.trim() || null,
      whatsapp_template_recordatorio_prueba: tRecordatorio.trim() || null,
    };
    if (token.trim()) body.whatsapp_access_token = token.trim();

    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
    setToken("");
    // El menú lateral muestra u oculta el inbox según esta configuración.
    window.location.reload();
  }

  return (
    <ConfigSection title="WhatsApp" onSave={save}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: conectado ? T.accent : T.textDim }}>
        {conectado
          ? <><CheckCircle2 className="w-4 h-4" /> Conectado — el inbox y los avisos por WhatsApp están activos</>
          : <><AlertCircle className="w-4 h-4" /> No conectado — completá los datos para activar el inbox y los avisos</>}
      </div>

      <SubBlock>
        <Toggle
          checked={activo}
          onChange={setActivo}
          label="Usar WhatsApp"
          description="Envía los avisos de cuota por WhatsApp y habilita el inbox para chatear con tus alumnos."
        />
      </SubBlock>

      <SubBlock title="Conexión con Meta">
        <Field label="Phone Number ID">
          <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="ej: 1347672705095738" style={{ fontFamily: "monospace" }} />
        </Field>
        <Hint>Es el ID del número, no el número de teléfono ni el ID de la cuenta. Lo ves en Meta → WhatsApp → Configuración de la API.</Hint>
        <Field label="Token de acceso">
          <SecretInput value={token} onChange={setToken} configurado={props.tokenConfigurado} placeholder="EAA..." />
        </Field>
        <Hint>Usá un token permanente de un usuario del sistema (Business Suite → Usuarios del sistema), no el temporal de 24 h.</Hint>
      </SubBlock>

      <SubBlock>
        <button
          type="button"
          onClick={() => setShowPlantillas((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider"
          style={{ color: T.textDim, fontFamily: "var(--font-fredoka)" }}
        >
          Plantillas de mensajes
          {showPlantillas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPlantillas && (
          <>
            <Hint>Nombres exactos de las plantillas aprobadas en WhatsApp Manager. Normalmente no hace falta cambiarlos.</Hint>
            <Field label="Aviso de cuota (con botón de pago)">
              <Input value={tAviso} onChange={(e) => setTAviso(e.target.value)} placeholder="aviso_cuota" style={{ fontFamily: "monospace" }} />
            </Field>
            <Field label="Aviso de cuota (transferencia)">
              <Input value={tTransf} onChange={(e) => setTTransf(e.target.value)} placeholder="aviso_cuota_transferencia" style={{ fontFamily: "monospace" }} />
            </Field>
            <Field label="Confirmación de pago">
              <Input value={tConf} onChange={(e) => setTConf(e.target.value)} placeholder="confirmacion_pago" style={{ fontFamily: "monospace" }} />
            </Field>
            <Field label="Recordatorio de clase de prueba">
              <Input value={tRecordatorio} onChange={(e) => setTRecordatorio(e.target.value)} placeholder="recordatorio_clase_prueba_v1" style={{ fontFamily: "monospace" }} />
            </Field>
            <Hint>El recordatorio usa esta plantilla solo si pasaron más de 24 h desde el último mensaje de la persona. Si la dejás vacía, en ese caso no se manda.</Hint>
          </>
        )}
      </SubBlock>
    </ConfigSection>
  );
}
