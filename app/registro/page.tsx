"use client";

import { useState } from "react";
import { enviarSolicitudRegistro } from "@/app/actions/registro";
import { T } from "@/lib/theme";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegistroPage() {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await enviarSolicitudRegistro(form);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    setEnviado(true);
  }

  const inp: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 12px", borderRadius: 8, fontSize: 14,
    background: "#111827", border: `1px solid #1f2937`, color: "#f9fafb",
    outline: "none", boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "#6b7280", marginBottom: 6,
  };

  if (enviado) {
    return (
      <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${T.accent}18`, border: `2px solid ${T.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <CheckCircle style={{ width: 32, height: 32, color: T.accent }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-barlow-condensed)", fontSize: "2rem", fontWeight: 900, color: "#f9fafb", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
            ¡Recibimos tu consulta!
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            Nos pondremos en contacto con vos en las próximas 24–48hs para contarte todo sobre CLUBIO.
          </p>
          <div style={{ padding: "0.5rem 1rem", borderRadius: 8, background: T.accentBg, border: `1px solid ${T.accentBorder}`, display: "inline-block" }}>
            <span style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.1em", color: T.accent }}>
              CLUBIO
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-block", padding: "0.4rem 1rem", borderRadius: 8, background: T.accentBg, border: `1px solid ${T.accentBorder}`, marginBottom: 24 }}>
            <span style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "0.12em", color: T.accent }}>CLUBIO</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-barlow-condensed)", fontSize: "1.8rem", fontWeight: 900, color: "#f9fafb", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Quiero usar Clubio
          </h1>
          <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>
            Completá el formulario y te contactamos para mostrarte la plataforma y resolver todas tus dudas.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Nombre del gimnasio *</label>
            <input value={form.nombre_gym} onChange={set("nombre_gym")} required placeholder="Ej: Club Atlético San Martín" style={inp} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Nombre de contacto *</label>
              <input value={form.nombre_contacto} onChange={set("nombre_contacto")} required placeholder="Tu nombre" style={inp} />
            </div>
            <div>
              <label style={label}>Ciudad</label>
              <input value={form.ciudad} onChange={set("ciudad")} placeholder="Buenos Aires" style={inp} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Email *</label>
              <input type="email" value={form.email} onChange={set("email")} required placeholder="vos@email.com" style={inp} />
            </div>
            <div>
              <label style={label}>Teléfono</label>
              <input value={form.telefono} onChange={set("telefono")} placeholder="+54 9 11..." style={inp} />
            </div>
          </div>

          <div>
            <label style={label}>¿Alguna duda o comentario?</label>
            <textarea
              value={form.mensaje} onChange={set("mensaje")}
              placeholder="Opcional — contanos de tu gimnasio o preguntá lo que necesites"
              rows={3}
              style={{ ...inp, height: "auto", padding: "10px 12px", resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 48, borderRadius: 10, fontFamily: "var(--font-barlow-condensed)", fontWeight: 800,
              fontSize: 16, letterSpacing: "0.1em", textTransform: "uppercase",
              background: loading ? "#065f46" : T.accent, color: "#030712",
              border: "none", cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.8 : 1, transition: "opacity 0.2s",
            }}
          >
            {loading ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Enviando...</> : "Quiero que me contacten"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4b5563", textDecoration: "none" }}>
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
