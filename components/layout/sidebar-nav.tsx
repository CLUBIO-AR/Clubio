"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/alumnos", label: "Alumnos", icon: Users },
  { href: "/dashboard/cuotas", label: "Cuotas", icon: CreditCard },
  { href: "/dashboard/pagos", label: "Pagos", icon: DollarSign },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarNavProps {
  gymNombre: string;
  usuarioNombre: string;
  usuarioRol: string;
}

export function SidebarNav({ gymNombre, usuarioNombre, usuarioRol }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = gymNombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="w-64 flex flex-col shrink-0 border-r"
      style={{ background: "oklch(0.07 0.018 245)", borderColor: "oklch(0.15 0.018 245)" }}
    >
      {/* Clubio logo top */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.88 0.22 158)", boxShadow: "0 0 12px oklch(0.88 0.22 158 / 0.35)" }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: "oklch(0.07 0.018 245)" }} />
          </div>
          <span
            className="text-lg text-white tracking-[0.15em]"
            style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900 }}
          >
            CLUBIO
          </span>
        </div>
      </div>

      {/* Gym selector */}
      <div className="px-3 pb-4">
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-xl"
          style={{ background: "oklch(0.12 0.018 245)", border: "1px solid oklch(0.18 0.018 245)" }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-extrabold text-sm"
            style={{
              background: "oklch(0.88 0.22 158 / 0.2)",
              border: "1px solid oklch(0.88 0.22 158 / 0.3)",
              color: "oklch(0.88 0.22 158)",
              fontFamily: "var(--font-barlow-condensed)",
              letterSpacing: "0.05em",
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className="font-extrabold uppercase truncate text-white tracking-wider text-sm"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              {gymNombre}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap className="w-2.5 h-2.5" style={{ color: "oklch(0.88 0.22 158)" }} />
              <span className="text-xs" style={{ color: "oklch(0.88 0.22 158)" }}>
                Panel activo
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b mx-3" style={{ borderColor: "oklch(0.15 0.018 245)" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-150 relative group",
              )}
              style={{
                fontFamily: "var(--font-barlow-condensed)",
                letterSpacing: "0.08em",
                background: active ? "oklch(0.88 0.22 158 / 0.12)" : "transparent",
                color: active ? "oklch(0.88 0.22 158)" : "oklch(0.62 0.015 245)",
                borderLeft: active ? "3px solid oklch(0.88 0.22 158)" : "3px solid transparent",
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? "oklch(0.88 0.22 158)" : "oklch(0.45 0.015 245)" }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Clubio brand */}
      <div className="px-5 py-2.5 border-t" style={{ borderColor: "oklch(0.12 0.018 245)" }}>
        <p
          className="text-xs uppercase tracking-[0.2em] opacity-30 text-white select-none"
          style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 800 }}
        >
          Powered by Clubio
        </p>
      </div>

      {/* User footer */}
      <div className="p-3" style={{ borderTop: "none" }}>
        {/* User info */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1"
          style={{ background: "oklch(0.12 0.018 245)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              background: "oklch(0.88 0.22 158 / 0.2)",
              color: "oklch(0.88 0.22 158)",
              fontFamily: "var(--font-barlow-condensed)",
            }}
          >
            {usuarioNombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{usuarioNombre}</p>
            <p className="text-xs capitalize" style={{ color: "oklch(0.55 0.015 245)" }}>
              {usuarioRol}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="transition-colors p-1 rounded"
            style={{ color: "oklch(0.45 0.015 245)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "oklch(0.88 0.22 158)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "oklch(0.45 0.015 245)")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
