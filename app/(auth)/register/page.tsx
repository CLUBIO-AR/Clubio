"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/theme";

interface RegisterForm {
  nombre: string; slug: string; email_contacto: string;
  password: string; nombre_admin: string;
}

const labelStyle: React.CSSProperties = {
  color: T.textMuted,
  fontFamily: "var(--font-barlow-condensed)",
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({ nombre: "", slug: "", email_contacto: "", password: "", nombre_admin: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev, [name]: value,
      ...(name === "nombre" ? { slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register-gym", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al registrar"); setLoading(false); return; }
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email_contacto, password: form.password });
    if (signInError) { router.push("/login"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.border}`, color: T.text };

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
            REGISTRÁ TU GIMNASIO
          </h2>
          <p className="text-sm mt-1" style={{ color: T.textDim }}>Creá tu cuenta y empezá a gestionar</p>
        </div>

        <div className="rounded-2xl p-7 space-y-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nombre del gimnasio</Label>
              <Input name="nombre" required value={form.nombre} onChange={handleChange} placeholder="GYM Atlas" style={inp} className="placeholder:opacity-25" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Slug (URL)</Label>
              <div className="flex">
                <span className="flex items-center px-3 rounded-l-lg text-xs" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRight: "none", color: T.textDim }}>app.com/</span>
                <Input name="slug" required value={form.slug} onChange={handleChange} placeholder="gym-atlas" style={{ ...inp, borderRadius: "0 0.5rem 0.5rem 0" }} className="placeholder:opacity-25" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Tu nombre</Label>
              <Input name="nombre_admin" required value={form.nombre_admin} onChange={handleChange} placeholder="Juan Pérez" style={inp} className="placeholder:opacity-25" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Email</Label>
              <Input name="email_contacto" type="email" required value={form.email_contacto} onChange={handleChange} placeholder="admin@migimnasio.com" style={inp} className="placeholder:opacity-25" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Contraseña</Label>
              <Input name="password" type="password" required minLength={8} value={form.password} onChange={handleChange} style={inp} />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: `${T.danger}12`, border: `1px solid ${T.danger}30`, color: T.danger }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "var(--font-barlow-condensed)", background: T.accent, color: T.bgDeep, boxShadow: T.accentGlow }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : "Crear cuenta"}
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
