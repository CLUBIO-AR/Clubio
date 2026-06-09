"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";
import { crearTenantAction, type NuevoGymForm } from "@/app/actions/admin-nuevo-gym";

interface LeadPrefill {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  gym_nombre: string | null;
}

interface NuevoGymWizardProps {
  lead: LeadPrefill | null;
}

const PASOS = ["Datos del gym", "Owner", "Comercial", "Configuración"];

const PLAN_PRECIOS: Record<string, number> = { basic: 28, plus: 45, multi: 75 };

const labelStyle: React.CSSProperties = {
  color: T.textMuted, fontFamily: "var(--font-barlow-condensed)",
  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
};
const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text };

type FormState = {
  nombre: string;
  email_contacto: string;
  telefono: string;
  direccion: string;
  owner_nombre: string;
  owner_email: string;
  plan: "basic" | "plus" | "multi";
  meses_licencia: 1 | 6 | 12;
  precio_acordado_usd: string;
  monto_cuota_defecto: string;
  dia_vencimiento: string;
  dias_aviso_antes: string;
  recargo_porcentaje: string;
  recargo_dias: string;
};

function initialForm(lead: LeadPrefill | null): FormState {
  return {
    nombre: lead?.gym_nombre ?? "",
    email_contacto: lead?.email ?? "",
    telefono: lead?.telefono ?? "",
    direccion: "",
    owner_nombre: lead?.nombre ?? "",
    owner_email: lead?.email ?? "",
    plan: "basic",
    meses_licencia: 12,
    precio_acordado_usd: String(PLAN_PRECIOS.basic * 12),
    monto_cuota_defecto: "",
    dia_vencimiento: "10",
    dias_aviso_antes: "7,3,1",
    recargo_porcentaje: "10",
    recargo_dias: "0",
  };
}

export function NuevoGymWizard({ lead }: NuevoGymWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm(lead));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ ownerEmail: string; password: string; loginUrl: string; emailEnviado: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setPlan(plan: "basic" | "plus" | "multi") {
    setForm((f) => ({ ...f, plan, precio_acordado_usd: String(PLAN_PRECIOS[plan] * f.meses_licencia) }));
  }

  function setMeses(meses: 1 | 6 | 12) {
    setForm((f) => ({ ...f, meses_licencia: meses, precio_acordado_usd: String(PLAN_PRECIOS[f.plan] * meses) }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (form.nombre.trim().length < 2) return "Ingresá el nombre del gym";
      if (!form.email_contacto.includes("@")) return "Email de contacto inválido";
    }
    if (step === 1) {
      if (form.owner_nombre.trim().length < 2) return "Ingresá el nombre del owner";
      if (!form.owner_email.includes("@")) return "Email del owner inválido";
    }
    if (step === 2) {
      if (!form.precio_acordado_usd || Number(form.precio_acordado_usd) <= 0) return "Ingresá el precio acordado";
    }
    if (step === 3) {
      const dia = Number(form.dia_vencimiento);
      if (!Number.isInteger(dia) || dia < 1 || dia > 28) return "Día de vencimiento inválido (1-28)";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(PASOS.length - 1, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) return setError(err);
    setError(null);
    setLoading(true);

    const dias_aviso_antes = form.dias_aviso_antes
      .split(",")
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isFinite(d) && d > 0);

    const payload: NuevoGymForm = {
      nombre: form.nombre.trim(),
      email_contacto: form.email_contacto.trim(),
      telefono: form.telefono.trim() || undefined,
      direccion: form.direccion.trim() || undefined,
      owner_nombre: form.owner_nombre.trim(),
      owner_email: form.owner_email.trim(),
      plan: form.plan,
      meses_licencia: form.meses_licencia,
      precio_acordado_usd: Number(form.precio_acordado_usd),
      lead_id: lead?.id,
      monto_cuota_defecto: form.monto_cuota_defecto ? Number(form.monto_cuota_defecto) : undefined,
      dia_vencimiento: Number(form.dia_vencimiento),
      dias_aviso_antes: dias_aviso_antes.length ? dias_aviso_antes : [7, 3, 1],
      recargo_porcentaje: Number(form.recargo_porcentaje),
      recargo_dias: Number(form.recargo_dias),
    };

    const res = await crearTenantAction(payload);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setResultado(res.data);
  }

  async function copiarCredenciales() {
    if (!resultado) return;
    const texto = `URL: ${resultado.loginUrl}\nEmail: ${resultado.ownerEmail}\nPassword: ${resultado.password}`;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // ── Pantalla de resultado ──────────────────────────────
  if (resultado) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="rounded-xl p-6 text-center" style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: T.accent }} />
          <h2 className="text-2xl font-black" style={{ fontFamily: "var(--font-barlow-condensed)", color: T.text }}>Gym creado exitosamente</h2>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>
            {resultado.emailEnviado ? "Le enviamos las credenciales por email al owner." : "No pudimos enviar el email — copiá las credenciales y enviáselas manualmente."}
          </p>
        </div>

        <div className="rounded-xl p-5 space-y-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}>Credenciales para enviar al cliente</h3>
          <div className="space-y-1.5 text-sm font-mono">
            <p style={{ color: T.textMuted }}>URL: <span style={{ color: T.text }}>{resultado.loginUrl}</span></p>
            <p style={{ color: T.textMuted }}>Email: <span style={{ color: T.text }}>{resultado.ownerEmail}</span></p>
            <p style={{ color: T.textMuted }}>Password: <span style={{ color: T.text }}>{resultado.password}</span></p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={copiarCredenciales} className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80 inline-flex items-center gap-2"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: "#F9731620", border: "1px solid #F9731648", color: ADMIN_ACCENT }}>
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? "Copiado" : "Copiar credenciales"}
            </button>
            <Link href="/admin/gyms" className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80 inline-flex items-center"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.card, border: `1px solid ${T.border}`, color: T.text }}>
              Ver gyms
            </Link>
            <button onClick={() => { setResultado(null); setStep(0); setForm(initialForm(null)); }} className="h-9 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted }}>
              Nuevo gym
            </button>
          </div>
          <p className="text-xs pt-1" style={{ color: T.warning }}>⚠️ El password solo se muestra una vez. Copialo antes de salir de esta pantalla.</p>
        </div>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/admin/gyms" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold transition-opacity hover:opacity-70" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a gyms
        </Link>
        <h1 className="text-4xl leading-none mt-2" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>NUEVO GYM</h1>
        {lead && <p className="text-sm mt-1" style={{ color: T.textDim }}>Convirtiendo lead: {lead.nombre} ({lead.email})</p>}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {PASOS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  background: i < step ? T.accent : i === step ? ADMIN_ACCENT : T.card,
                  color: i <= step ? T.bgDeep : T.textDim,
                  border: `1px solid ${i <= step ? "transparent" : T.border}`,
                }}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs uppercase tracking-widest font-bold hidden sm:inline" style={{ fontFamily: "var(--font-barlow-condensed)", color: i <= step ? T.text : T.textDim }}>{label}</span>
            </div>
            {i < PASOS.length - 1 && <div className="flex-1 h-px" style={{ background: i < step ? T.accent : T.border }} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}40`, color: T.danger }}>{error}</div>
      )}

      <div className="rounded-xl p-6 space-y-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {step === 0 && (
          <>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nombre del gym</Label>
              <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} style={inp} />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Email de contacto</Label>
              <Input type="email" value={form.email_contacto} onChange={(e) => set("email_contacto", e.target.value)} style={inp} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label style={labelStyle}>Teléfono</Label>
                <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} style={inp} />
              </div>
              <div className="space-y-1.5">
                <Label style={labelStyle}>Dirección</Label>
                <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} style={inp} />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nombre del owner</Label>
              <Input value={form.owner_nombre} onChange={(e) => set("owner_nombre", e.target.value)} style={inp} />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Email del owner</Label>
              <Input type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} style={inp} />
              <p className="text-xs" style={{ color: T.textDim }}>Va a recibir las credenciales de acceso por este email.</p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Plan</Label>
              <div className="flex gap-2">
                {(["basic", "plus", "multi"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPlan(p)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
                    style={{
                      fontFamily: "var(--font-barlow-condensed)",
                      background: form.plan === p ? "#F9731620" : T.inputBg,
                      border: `1px solid ${form.plan === p ? "#F9731648" : T.border}`,
                      color: form.plan === p ? ADMIN_ACCENT : T.textMuted,
                    }}>
                    {p === "basic" ? "Basic — USD 28" : p === "plus" ? "Plus — USD 45" : "Multi — USD 75"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Duración de la licencia</Label>
              <div className="flex gap-2">
                {([1, 6, 12] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMeses(m)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
                    style={{
                      fontFamily: "var(--font-barlow-condensed)",
                      background: form.meses_licencia === m ? T.accentBg : T.inputBg,
                      border: `1px solid ${form.meses_licencia === m ? T.accentBorder : T.border}`,
                      color: form.meses_licencia === m ? T.accent : T.textMuted,
                    }}>
                    {m} {m === 1 ? "mes" : "meses"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Precio acordado (USD, total del período)</Label>
              <Input type="number" min={0} value={form.precio_acordado_usd} onChange={(e) => set("precio_acordado_usd", e.target.value)} style={inp} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Monto de cuota por defecto (opcional)</Label>
              <Input type="number" min={0} value={form.monto_cuota_defecto} onChange={(e) => set("monto_cuota_defecto", e.target.value)} style={inp} placeholder="Lo configura el gym luego si se deja vacío" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label style={labelStyle}>Día de vencimiento mensual</Label>
                <Input type="number" min={1} max={28} value={form.dia_vencimiento} onChange={(e) => set("dia_vencimiento", e.target.value)} style={inp} />
              </div>
              <div className="space-y-1.5">
                <Label style={labelStyle}>Días de aviso antes (separados por coma)</Label>
                <Input value={form.dias_aviso_antes} onChange={(e) => set("dias_aviso_antes", e.target.value)} style={inp} placeholder="7,3,1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label style={labelStyle}>Recargo (%)</Label>
                <Input type="number" min={0} value={form.recargo_porcentaje} onChange={(e) => set("recargo_porcentaje", e.target.value)} style={inp} />
              </div>
              <div className="space-y-1.5">
                <Label style={labelStyle}>Días de gracia antes del recargo</Label>
                <Input type="number" min={0} value={form.recargo_dias} onChange={(e) => set("recargo_dias", e.target.value)} style={inp} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={back} disabled={step === 0 || loading} className="h-10 px-5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all hover:opacity-80 inline-flex items-center gap-2 disabled:opacity-30"
          style={{ fontFamily: "var(--font-barlow-condensed)", background: "transparent", border: `1px solid ${T.border}`, color: T.textMuted }}>
          <ArrowLeft className="w-4 h-4" /> Atrás
        </button>

        {step < PASOS.length - 1 ? (
          <button onClick={next} className={buttonVariants({ className: "gap-2 h-10 px-5 font-bold uppercase tracking-wider text-sm hover:opacity-90" })}
            style={{ fontFamily: "var(--font-barlow-condensed)", background: ADMIN_ACCENT, color: T.bgDeep, border: "none" }}>
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className={buttonVariants({ className: "gap-2 h-10 px-5 font-bold uppercase tracking-wider text-sm hover:opacity-90" })}
            style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, border: "none" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Crear gym
          </button>
        )}
      </div>
    </div>
  );
}
