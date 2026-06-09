"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { updateAdminSettingsAction } from "@/app/actions/admin-settings";

interface Props {
  notificationEmail: string;
  tipoCambioUsd: number;
  diasCobroAntesVencimiento: number;
  clubioMpTokenMask: string | null;
  planBasicPrecio: number;
  planPlusPrecio: number;
  planMultiPrecio: number;
  monedaSuscripcion: "USD" | "ARS";
}

export function AdminSettingsClient({
  notificationEmail,
  tipoCambioUsd,
  diasCobroAntesVencimiento,
  clubioMpTokenMask,
  planBasicPrecio,
  planPlusPrecio,
  planMultiPrecio,
  monedaSuscripcion,
}: Props) {
  const [email, setEmail] = useState(notificationEmail);
  const [tipoCambio, setTipoCambio] = useState(String(tipoCambioUsd));
  const [dias, setDias] = useState(String(diasCobroAntesVencimiento));
  const [mpToken, setMpToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [precioBasic, setPrecioBasic] = useState(String(planBasicPrecio));
  const [precioPlus, setPrecioPlus] = useState(String(planPlusPrecio));
  const [precioMulti, setPrecioMulti] = useState(String(planMultiPrecio));
  const [moneda, setMoneda] = useState<"USD" | "ARS">(monedaSuscripcion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = () => setSaved(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await updateAdminSettingsAction({
      notificationEmail: email,
      tipoCambioUsd: Number(tipoCambio),
      diasCobroAntesVencimiento: Number(dias),
      clubioMpAccessToken: mpToken,
      planBasicPrecio: Number(precioBasic),
      planPlusPrecio: Number(precioPlus),
      planMultiPrecio: Number(precioMulti),
      monedaSuscripcion: moneda,
    });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    setMpToken(""); // limpiar campo token tras guardar
    setTimeout(() => setSaved(false), 3000);
  }

  const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text };

  function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
      <div className="rounded-xl p-6 space-y-4 max-w-lg" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-widest mb-1" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>{title}</h2>
          {description && <p className="text-xs" style={{ color: T.textDim }}>{description}</p>}
        </div>
        {children}
      </div>
    );
  }

  function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>
        {children}
        {hint && <p className="text-xs" style={{ color: T.textDim }}>{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl leading-none" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>CONFIGURACIÓN</h1>
        <p className="text-sm mt-1" style={{ color: T.textDim }}>Ajustes globales del panel de administración</p>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm max-w-lg" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>
      )}

      {/* Notificaciones */}
      <Section title="Notificaciones internas" description="Email donde llegan los avisos de nuevo lead, solicitudes de registro y alertas de suscripciones.">
        <Field label="Email de notificaciones">
          <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); dirty(); }} style={inp} />
        </Field>
      </Section>

      {/* Mercado Pago de CLUBIO */}
      <Section title="Mercado Pago — CLUBIO" description="Access token de la cuenta de MP de CLUBIO, usada para cobrar las suscripciones a los gyms.">
        <Field
          label="Access Token"
          hint={clubioMpTokenMask
            ? `Token actual: ●●●●●●●●${clubioMpTokenMask}. Dejá en blanco para no cambiarlo.`
            : "No hay token configurado. Sin este campo no se pueden generar cobros de MP."}
        >
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={mpToken}
              onChange={(e) => { setMpToken(e.target.value); dirty(); }}
              placeholder={clubioMpTokenMask ? "Dejar en blanco para no cambiar" : "APP_USR-xxxx..."}
              style={{ ...inp, paddingRight: "2.5rem" }}
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: T.textDim }}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
      </Section>

      {/* Planes y precios */}
      <Section title="Planes y precios" description="Precios que se usan al generar cobros de suscripción. Cambiá la moneda según cómo estés cobrando.">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>Moneda</span>
          {(["USD", "ARS"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMoneda(m); dirty(); }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                background: moneda === m ? `${ADMIN_ACCENT}20` : T.bg,
                border: `1px solid ${moneda === m ? ADMIN_ACCENT + "60" : T.borderSub}`,
                color: moneda === m ? ADMIN_ACCENT : T.textMuted,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Basic", value: precioBasic, set: setPrecioBasic },
            { label: "Plus", value: precioPlus, set: setPrecioPlus },
            { label: "Multi", value: precioMulti, set: setPrecioMulti },
          ].map(({ label, value, set }) => (
            <Field key={label} label={`${label} (${moneda})`}>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={value}
                onChange={(e) => { set(e.target.value); dirty(); }}
                style={inp}
              />
            </Field>
          ))}
        </div>

        {moneda === "USD" && (
          <Field label="Tipo de cambio USD → ARS" hint="Se usa para calcular el monto en ARS al crear la preferencia de Mercado Pago.">
            <Input
              type="number"
              min="1"
              step="1"
              value={tipoCambio}
              onChange={(e) => { setTipoCambio(e.target.value); dirty(); }}
              style={inp}
            />
          </Field>
        )}
      </Section>

      {/* Automatización */}
      <Section title="Automatización de cobros" description="El cron diario genera y envía el cobro al gym N días antes de que venza su licencia.">
        <Field label="Días de anticipación" hint="Default: 10. El cron solo genera un cobro por período — si ya existe, lo saltea.">
          <Input
            type="number"
            min="1"
            max="60"
            step="1"
            value={dias}
            onChange={(e) => { setDias(e.target.value); dirty(); }}
            style={inp}
          />
        </Field>
      </Section>

      {/* Guardar */}
      <div className="flex items-center gap-3 max-w-lg">
        <Button
          onClick={handleSave}
          disabled={loading}
          className={buttonVariants({ className: "gap-2" })}
          style={{ background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar configuración
        </Button>
        {saved && (
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}>
            Guardado ✓
          </span>
        )}
      </div>
    </div>
  );
}
