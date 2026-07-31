"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { T } from "@/lib/theme";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const suspended = searchParams.get("suspended") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("Email o contraseña incorrectos"); setLoading(false); return; }
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: T.bgDeep }}>
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(${T.accent}25 1px, transparent 1px), linear-gradient(90deg, ${T.accent}25 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      {/* Soft glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-64 rounded-full blur-3xl pointer-events-none" style={{ background: `${T.accent}12` }} />

      <div className="relative w-full max-w-sm">
        {/* Clubio brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.accent, boxShadow: T.accentGlow }}>
              <Zap className="w-5 h-5" style={{ color: T.accentText }} />
            </div>
            <span className="text-3xl tracking-[0.15em]" style={{ fontFamily: "var(--font-povlar)", fontWeight: 400, color: T.textOnDark, textTransform: "lowercase" }}>
              CLUBIO
            </span>
          </div>
          <h2 className="text-lg tracking-widest" style={{ fontFamily: "var(--font-fredoka)", fontWeight: 700, color: T.textOnDarkMuted }}>
            BIENVENIDO
          </h2>
          <p className="text-sm mt-1 text-center" style={{ color: T.textOnDarkDim }}>
            Accedé al panel de gestión de tu gimnasio
          </p>
        </div>

        {/* Banner suscripción vencida */}
        {suspended && (
          <div className="mb-6 px-4 py-4 rounded-xl flex gap-3 items-start text-sm" style={{ background: `${T.warning}12`, border: `1px solid ${T.warning}40` }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: T.warning }} />
            <div style={{ color: T.textOnDark }}>
              <p className="font-semibold mb-0.5">Tu suscripción venció</p>
              <p style={{ color: T.textOnDarkMuted }}>
                El acceso está suspendido. Contactate con{" "}
                <a href="mailto:hola@clubio.com.ar" className="underline underline-offset-2" style={{ color: T.accent }}>
                  hola@clubio.com.ar
                </a>{" "}
                para renovar y retomar.
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-2xl p-7 space-y-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.textMuted, fontFamily: "var(--font-fredoka)" }}>
                Email
              </Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@migimnasio.com"
                style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }}
                className="placeholder:opacity-25" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: T.textMuted, fontFamily: "var(--font-fredoka)" }}>
                Contraseña
              </Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }} />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: `${T.danger}12`, border: `1px solid ${T.danger}30`, color: T.danger }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-lg font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              style={{ fontFamily: "var(--font-fredoka)", background: T.accent, color: T.accentText, boxShadow: T.accentGlow }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: T.textOnDarkDim }}>
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-semibold transition-opacity hover:opacity-75" style={{ color: T.accent }}>
            Registrá tu gym
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
