"use client";

import { useState } from "react";
import { enviarSolicitudRegistro } from "@/app/actions/registro";
import { T } from "@/lib/theme";
import { CheckCircle, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const labelStyle: React.CSSProperties = {
  color: T.textMuted, fontFamily: "var(--font-barlow-condensed)",
  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    nombre_gym: "", nombre_contacto: "", email: "",
    telefono: "", ciudad: "", mensaje: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await enviarSolicitudRegistro(form);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bgDeep }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: T.accentBg, border: `2px solid ${T.accentBorder}` }}>
            <CheckCircle className="w-8 h-8" style={{ color: T.accent }} />
          </div>
          <h1 className="text-3xl mb-3 uppercase" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text, letterSpacing: "0.04em" }}>
            ¡Solicitud enviada!
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: T.textMuted }}>
            Recibimos tu consulta. Nos ponemos en contacto con vos en las próximas 24–48hs.
            También te enviamos un email de confirmación.
          </p>
          <Link href="/login" className="text-sm font-semibold hover:opacity-75 transition-opacity" style={{ color: T.accent }}>
            Volver al inicio →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bgDeep }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `linear-gradient(${T.accent}25 1px, transparent 1px), linear-gradient(90deg, ${T.accent}25 1px, transparent 1px)`, backgroundSize: "64px 64px" }} />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.accent, boxShadow: T.accentGlow }}>
              <Zap className="w-5 h-5" style={{ color: T.bgDeep }} />
            </div>
            <span className="text-3xl tracking-[0.15em]" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}>
              CLUBIO
            </span>
          </div>
          <h2 className="text-lg tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 700, color: T.textMuted }}>
            QUIERO USAR CLUBIO
          </h2>
          <p className="text-sm mt-1 text-center" style={{ color: T.textDim }}>
            Completá el formulario y te contactamos para mostrarte la plataforma.
          </p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nombre del gimnasio *</Label>
              <Input value={form.nombre_gym} onChange={set("nombre_gym")} required placeholder="Club Atlético San Martín" style={inp} className="placeholder:opacity-25" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Tu nombre *</Label>
              <Input value={form.nombre_contacto} onChange={set("nombre_contacto")} required placeholder="Juan Pérez" style={inp} className="placeholder:opacity-25" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Email *</Label>
              <Input type="email" value={form.email} onChange={set("email")} required placeholder="vos@email.com" style={inp} className="placeholder:opacity-25" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={labelStyle}>Teléfono</Label>
                <Input value={form.telefono} onChange={set("telefono")} placeholder="+54 9 11..." style={inp} className="placeholder:opacity-25" />
              </div>
              <div className="space-y-1.5">
                <Label style={labelStyle}>Ciudad</Label>
                <Input value={form.ciudad} onChange={set("ciudad")} placeholder="Buenos Aires" style={inp} className="placeholder:opacity-25" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Mensaje (opcional)</Label>
              <textarea
                value={form.mensaje} onChange={set("mensaje")}
                placeholder="Contanos de tu gimnasio o preguntá lo que necesites"
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none placeholder:opacity-25"
                style={{ ...inp, fontSize: "0.875rem" }}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: `${T.danger}12`, border: `1px solid ${T.danger}30`, color: T.danger }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : "Quiero que me contacten"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: T.textDim }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold hover:opacity-75 transition-opacity" style={{ color: T.accent }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
