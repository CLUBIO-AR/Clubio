"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface RegisterForm {
  nombre: string; slug: string; email_contacto: string;
  password: string; nombre_admin: string;
}

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al registrar el gimnasio"); setLoading(false); return; }
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email_contacto, password: form.password });
    if (signInError) { router.push("/login"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  const inputStyle = {
    background: "oklch(0.14 0.018 245)",
    border: "1px solid oklch(0.22 0.018 245)",
    color: "white",
  };

  const labelStyle = {
    color: "oklch(0.65 0.015 245)",
    fontFamily: "var(--font-barlow-condensed)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "oklch(0.07 0.018 245)" }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(oklch(0.88 0.22 158 / 0.15) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.22 158 / 0.15) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5" style={{ background: "oklch(0.88 0.22 158 / 0.15)", border: "1px solid oklch(0.88 0.22 158 / 0.4)", boxShadow: "0 0 30px oklch(0.88 0.22 158 / 0.2)" }}>
            <Zap className="w-7 h-7" style={{ color: "oklch(0.88 0.22 158)" }} />
          </div>
          <h1 className="text-4xl text-white tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 800 }}>
            REGISTRÁ TU GYM
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.015 245)" }}>Creá tu cuenta y empezá a gestionar</p>
        </div>

        <div className="rounded-2xl p-7 space-y-4" style={{ background: "oklch(0.1 0.018 245)", border: "1px solid oklch(0.2 0.018 245)" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nombre del gimnasio</Label>
              <Input name="nombre" required value={form.nombre} onChange={handleChange} placeholder="GYM Atlas" style={inputStyle} className="placeholder:opacity-30" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Slug (URL)</Label>
              <div className="flex">
                <span className="flex items-center px-3 rounded-l-lg text-xs" style={{ background: "oklch(0.12 0.018 245)", border: "1px solid oklch(0.22 0.018 245)", borderRight: "none", color: "oklch(0.45 0.015 245)" }}>app.com/</span>
                <Input name="slug" required value={form.slug} onChange={handleChange} placeholder="gym-atlas" style={{ ...inputStyle, borderRadius: "0 0.5rem 0.5rem 0" }} className="placeholder:opacity-30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Tu nombre</Label>
              <Input name="nombre_admin" required value={form.nombre_admin} onChange={handleChange} placeholder="Juan Pérez" style={inputStyle} className="placeholder:opacity-30" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Email</Label>
              <Input name="email_contacto" type="email" required value={form.email_contacto} onChange={handleChange} placeholder="admin@migimnasio.com" style={inputStyle} className="placeholder:opacity-30" />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Contraseña</Label>
              <Input name="password" type="password" required minLength={8} value={form.password} onChange={handleChange} style={inputStyle} />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "oklch(0.65 0.22 27 / 0.1)", border: "1px solid oklch(0.65 0.22 27 / 0.3)", color: "oklch(0.75 0.2 27)" }}>{error}</div>
            )}

            <button type="submit" disabled={loading} className="w-full h-11 rounded-lg font-extrabold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60" style={{ fontFamily: "var(--font-barlow-condensed)", background: "oklch(0.88 0.22 158)", color: "oklch(0.07 0.018 245)", boxShadow: "0 0 20px oklch(0.88 0.22 158 / 0.3)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "oklch(0.45 0.015 245)" }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "oklch(0.88 0.22 158)" }}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
