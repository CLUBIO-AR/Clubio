"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface RegisterForm {
  nombre: string;
  slug: string;
  email_contacto: string;
  password: string;
  nombre_admin: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    nombre: "",
    slug: "",
    email_contacto: "",
    password: "",
    nombre_admin: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "nombre"
        ? { slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }
        : {}),
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

    if (!res.ok) {
      setError(data.error ?? "Error al registrar el gimnasio");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email_contacto,
      password: form.password,
    });

    if (signInError) {
      setError("Gym creado. Por favor iniciá sesión.");
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2320_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2320_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Registrá tu gym</h1>
          <p className="text-zinc-400 text-sm mt-1">Creá tu cuenta y empezá a gestionar</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Nombre del gimnasio</Label>
              <Input
                name="nombre"
                type="text"
                required
                value={form.nombre}
                onChange={handleChange}
                placeholder="GYM Atlas"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Slug (URL)</Label>
              <div className="flex items-center">
                <span className="px-3 h-9 flex items-center bg-zinc-800 border border-r-0 border-zinc-700 rounded-l-md text-xs text-zinc-500">
                  app.com/
                </span>
                <Input
                  name="slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="gym-atlas"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Tu nombre</Label>
              <Input
                name="nombre_admin"
                type="text"
                required
                value={form.nombre_admin}
                onChange={handleChange}
                placeholder="Juan Pérez"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Email</Label>
              <Input
                name="email_contacto"
                type="email"
                required
                value={form.email_contacto}
                onChange={handleChange}
                placeholder="admin@migimnasio.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Contraseña</Label>
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500"
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-10 font-medium mt-2"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creando cuenta...</>
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
