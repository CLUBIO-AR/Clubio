"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap } from "lucide-react";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "oklch(0.07 0.018 245)" }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.88 0.22 158 / 0.15) 1px, transparent 1px), linear-gradient(90deg, oklch(0.88 0.22 158 / 0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Glow orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.88 0.22 158)" }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-2.5 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.88 0.22 158)",
                boxShadow: "0 0 24px oklch(0.88 0.22 158 / 0.4)",
              }}
            >
              <Zap className="w-5 h-5" style={{ color: "oklch(0.07 0.018 245)" }} />
            </div>
            <span
              className="text-3xl text-white tracking-widest"
              style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900 }}
            >
              CLUBIO
            </span>
          </div>
          <h1
            className="text-xl text-white tracking-wider"
            style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 700 }}
          >
            BIENVENIDO
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.015 245)" }}>
            Accedé al panel de gestión de tu gimnasio
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: "oklch(0.1 0.018 245)",
            border: "1px solid oklch(0.2 0.018 245)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "oklch(0.65 0.015 245)", fontFamily: "var(--font-barlow-condensed)" }}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@migimnasio.com"
                style={{
                  background: "oklch(0.14 0.018 245)",
                  border: "1px solid oklch(0.22 0.018 245)",
                  color: "white",
                }}
                className="placeholder:opacity-30 focus:border-[oklch(0.88_0.22_158)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ color: "oklch(0.65 0.015 245)", fontFamily: "var(--font-barlow-condensed)" }}
              >
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  background: "oklch(0.14 0.018 245)",
                  border: "1px solid oklch(0.22 0.018 245)",
                  color: "white",
                }}
                className="focus:border-[oklch(0.88_0.22_158)]"
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm font-medium"
                style={{
                  background: "oklch(0.65 0.22 27 / 0.1)",
                  border: "1px solid oklch(0.65 0.22 27 / 0.3)",
                  color: "oklch(0.75 0.2 27)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg font-extrabold uppercase tracking-widest text-sm transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                background: "oklch(0.88 0.22 158)",
                color: "oklch(0.07 0.018 245)",
                boxShadow: "0 0 20px oklch(0.88 0.22 158 / 0.3)",
              }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</> : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: "oklch(0.45 0.015 245)" }}>
          ¿No tenés cuenta?{" "}
          <Link
            href="/register"
            className="font-semibold transition-opacity hover:opacity-80"
            style={{ color: "oklch(0.88 0.22 158)" }}
          >
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
