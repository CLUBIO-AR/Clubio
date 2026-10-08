"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { ConfigSection, Field, Input, Toggle, SubBlock, Hint, SecretInput } from "./config-section";
import { T } from "@/lib/theme";

type Modo = "link" | "transferencia";

interface Props {
  modo: Modo;
  mpConfigurado: boolean;
  mpPublicKey: string;
  mpSoloDineroEnCuenta: boolean;
  transferenciaAlias: string;
  transferenciaTitular: string;
  transferenciaBanco: string;
  transferenciaCbu: string;
}

const PASOS_MP = [
  {
    titulo: "Entrá a tu cuenta de Mercado Pago",
    desc: "Usá la cuenta donde querés recibir los pagos del gym.",
    link: { label: "mercadopago.com.ar", url: "https://www.mercadopago.com.ar" },
  },
  {
    titulo: "Abrí tus credenciales",
    desc: "Tu negocio → Configuración → Credenciales (o el panel de desarrolladores).",
    link: { label: "Abrir credenciales", url: "https://www.mercadopago.com.ar/settings/account/credentials" },
  },
  {
    titulo: "Copiá las credenciales de Producción",
    desc: "El Access Token (empieza con APP_USR-) y la Public Key. Pegalos abajo.",
  },
];

// "Cómo cobrás": junta en un solo lugar el modo de cobro y los datos que necesita cada modo
// (antes el modo estaba en Notificaciones y las credenciales de MP en otra sección).
export function ConfigCobro(props: Props) {
  const [modo, setModo] = useState<Modo>(props.modo);
  const [mpToken, setMpToken] = useState("");
  const [mpPubKey, setMpPubKey] = useState(props.mpPublicKey);
  const [soloDinero, setSoloDinero] = useState(props.mpSoloDineroEnCuenta);
  const [alias, setAlias] = useState(props.transferenciaAlias);
  const [titular, setTitular] = useState(props.transferenciaTitular);
  const [banco, setBanco] = useState(props.transferenciaBanco);
  const [cbu, setCbu] = useState(props.transferenciaCbu);
  const [showGuia, setShowGuia] = useState(!props.mpConfigurado);

  async function save() {
    if (modo === "transferencia" && !alias.trim()) throw new Error("Cargá el alias para cobrar por transferencia");

    const body: Record<string, unknown> = {
      email_modo: modo,
      mp_public_key: mpPubKey || null,
      mp_solo_dinero_cuenta: soloDinero,
      transferencia_alias: alias || null,
      transferencia_titular: titular || null,
      transferencia_banco: banco || null,
      transferencia_cbu: cbu.trim() || null,
    };
    // El token guardado nunca viaja al navegador: solo se manda si escribieron uno nuevo.
    if (mpToken.trim()) body.mp_access_token = mpToken.trim();

    const res = await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Error");
    setMpToken("");
  }

  const opciones: { val: Modo; label: string; desc: string }[] = [
    { val: "link", label: "Link de pago (Mercado Pago)", desc: "Cada aviso lleva un botón para pagar. El pago se registra solo." },
    { val: "transferencia", label: "Transferencia a un alias", desc: "Los avisos muestran tu alias. Registrás los pagos a mano." },
  ];

  return (
    <ConfigSection title="Cómo cobrás" onSave={save}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opciones.map(({ val, label, desc }) => (
          <button
            key={val}
            type="button"
            onClick={() => setModo(val)}
            className="text-left p-3 rounded-lg transition-colors"
            style={{
              background: modo === val ? T.accentBg : T.card,
              border: `1px solid ${modo === val ? T.accentBorder : T.border}`,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: modo === val ? T.accent : T.text }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{desc}</p>
          </button>
        ))}
      </div>

      {modo === "link" ? (
        <SubBlock title="Credenciales de Mercado Pago">
          <div className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: props.mpConfigurado ? T.accent : T.danger }}>
            {props.mpConfigurado
              ? <><CheckCircle2 className="w-4 h-4" /> Mercado Pago conectado</>
              : <><AlertCircle className="w-4 h-4" /> Falta cargar el Access Token</>}
          </div>

          <button
            type="button"
            onClick={() => setShowGuia((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
            style={{ color: T.accent, fontFamily: "var(--font-fredoka)" }}
          >
            ¿Cómo obtengo mis credenciales?
            {showGuia ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showGuia && (
            <ol className="space-y-2">
              {PASOS_MP.map((p, i) => (
                <li key={p.titulo} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                    style={{ background: T.accentBg, color: T.accent, border: `1px solid ${T.accentBorder}` }}>{i + 1}</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: T.text }}>{p.titulo}</p>
                    <p className="text-xs" style={{ color: T.textDim }}>{p.desc}</p>
                    {p.link && (
                      <a href={p.link.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs hover:opacity-70" style={{ color: T.accent }}>
                        {p.link.label} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <Field label="Access Token">
            <SecretInput value={mpToken} onChange={setMpToken} configurado={props.mpConfigurado} placeholder="APP_USR-..." />
          </Field>
          <Field label="Public Key">
            <Input value={mpPubKey} onChange={(e) => setMpPubKey(e.target.value)} placeholder="APP_USR-..." style={{ fontFamily: "monospace" }} />
          </Field>
          <div className="pt-3 border-t" style={{ borderColor: T.borderSub }}>
            <Toggle
              checked={soloDinero}
              onChange={setSoloDinero}
              label="Solo dinero en cuenta"
              description="Oculta tarjetas en el checkout: queda solo pagar con saldo de Mercado Pago, que tiene la comisión más baja."
            />
          </div>
        </SubBlock>
      ) : (
        <SubBlock title="Datos para transferir">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Alias">
              <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="migym.alias" />
            </Field>
            <Field label="CBU / CVU (opcional)">
              <Input value={cbu} onChange={(e) => setCbu(e.target.value)} placeholder="22 dígitos" inputMode="numeric" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Titular (opcional)">
              <Input value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Nombre Apellido" />
            </Field>
            <Field label="Banco (opcional)">
              <Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Brubank" />
            </Field>
          </div>
          <Hint>Estos datos aparecen en los avisos por email y WhatsApp. Mostrar el CBU y el titular le da confianza al alumno de a quién le transfiere.</Hint>
        </SubBlock>
      )}
    </ConfigSection>
  );
}
