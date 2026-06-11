"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, CreditCard, DollarSign, Settings, LogOut, Zap, Receipt, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/dashboard",               label: "Inicio",         icon: LayoutDashboard, exact: true },
  { href: "/dashboard/alumnos",       label: "Alumnos",        icon: Users },
  { href: "/dashboard/cuotas",        label: "Cuotas",         icon: CreditCard },
  { href: "/dashboard/pagos",         label: "Pagos",          icon: DollarSign },
  { href: "/dashboard/suscripcion",   label: "Suscripción",    icon: Receipt },
  { href: "/dashboard/configuracion", label: "Configuración",  icon: Settings },
];

interface SidebarNavProps {
  gymNombre: string;
  usuarioNombre: string;
  usuarioRol: string;
}

export function SidebarNav({ gymNombre, usuarioNombre, usuarioRol }: SidebarNavProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const gymInitials  = gymNombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const userInitials = usuarioNombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const closeDrawer = () => setMobileOpen(false);

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div
        className="md:hidden fixed top-0 inset-x-0 h-14 z-40 flex items-center justify-between px-4 shrink-0"
        style={{ background: T.bgDeep, borderBottom: `1px solid ${T.borderSub}` }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-lg transition-colors"
          style={{ color: T.textMuted }}
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: T.accent, boxShadow: T.accentGlow }}
          >
            <Zap className="w-3 h-3" style={{ color: T.bgDeep }} />
          </div>
          <span
            className="text-lg tracking-[0.15em]"
            style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}
          >
            CLUBIO
          </span>
        </div>
        {/* Spacer to center the logo */}
        <div className="w-9" />
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={closeDrawer}
        />
      )}

      {/* ── Sidebar — drawer on mobile, static in flexbox on desktop ── */}
      <aside
        className={cn(
          "flex flex-col shrink-0",
          // Mobile: fixed drawer that slides in/out
          "fixed inset-y-0 left-0 w-72 z-50 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: participates in normal flex layout
          "md:static md:w-64 md:translate-x-0 md:z-auto"
        )}
        style={{ background: T.bgDeep, borderRight: `1px solid ${T.borderSub}` }}
      >
        {/* Logo + close button (close only on mobile) */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: T.accent, boxShadow: T.accentGlow }}
            >
              <Zap className="w-4 h-4" style={{ color: T.bgDeep }} />
            </div>
            <span
              className="text-xl tracking-[0.15em]"
              style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}
            >
              CLUBIO
            </span>
          </div>
          <button
            className="md:hidden p-1 rounded transition-colors"
            style={{ color: T.textDim }}
            onClick={closeDrawer}
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gym card */}
        <div className="px-3 pb-3">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
              style={{
                background: T.accentBg,
                border: `1px solid ${T.accentBorder}`,
                color: T.accent,
                fontFamily: "var(--font-barlow-condensed)",
              }}
            >
              {gymInitials}
            </div>
            <div className="min-w-0">
              <p
                className="font-extrabold uppercase truncate text-sm tracking-wider"
                style={{ color: T.text, fontFamily: "var(--font-barlow-condensed)" }}
              >
                {gymNombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Zap className="w-2.5 h-2.5" style={{ color: T.accent }} />
                <span className="text-xs" style={{ color: T.accent }}>Panel activo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-3 mb-2" style={{ height: "1px", background: T.borderSub }} />

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2 pb-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeDrawer}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150")}
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  letterSpacing: "0.08em",
                  background:  active ? T.accentBg : "transparent",
                  color:       active ? T.accent   : T.textMuted,
                  borderLeft:  `3px solid ${active ? T.accent : "transparent"}`,
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? T.accent : T.textDim }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Powered by */}
        <div className="px-5 py-2" style={{ borderTop: `1px solid ${T.borderSub}` }}>
          <p
            className="text-xs uppercase tracking-[0.2em] select-none"
            style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)", fontWeight: 700 }}
          >
            Powered by Clubio
          </p>
        </div>

        {/* User */}
        <div className="px-3 pb-3">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "var(--font-barlow-condensed)" }}
            >
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{usuarioNombre}</p>
              <p className="text-xs capitalize" style={{ color: T.textDim }}>{usuarioRol}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="transition-colors p-1 rounded"
              style={{ color: T.textDim }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.accent)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.textDim)}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
