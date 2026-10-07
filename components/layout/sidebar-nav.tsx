"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, CreditCard, DollarSign, Settings, LogOut, Receipt, Menu, X, Dumbbell, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/theme";
import { NotificacionesBell } from "@/components/whatsapp/notificaciones-bell";
import { useWhatsappNotificaciones } from "@/components/whatsapp/whatsapp-realtime";

const NAV_ITEMS = [
  { href: "/dashboard",               label: "Inicio",         icon: LayoutDashboard, exact: true },
  { href: "/dashboard/alumnos",       label: "Alumnos",        icon: Users },
  { href: "/dashboard/cuotas",        label: "Cuotas",         icon: CreditCard },
  { href: "/dashboard/pagos",         label: "Pagos",          icon: DollarSign },
  { href: "/dashboard/whatsapp",      label: "WhatsApp",       icon: MessageCircle },
  { href: "/dashboard/actividades",   label: "Actividades",    icon: Dumbbell },
  { href: "/dashboard/suscripcion",   label: "Suscripción",    icon: Receipt },
  { href: "/dashboard/configuracion", label: "Configuración",  icon: Settings },
];

interface SidebarNavProps {
  gymNombre: string;
  usuarioNombre: string;
  usuarioRol: string;
  // El inbox de WhatsApp solo aparece si el gym tiene WhatsApp conectado
  // (ver lib/whatsapp-config.ts); si no, sería una pantalla vacía.
  mostrarWhatsapp: boolean;
}

export function SidebarNav({ gymNombre, usuarioNombre, usuarioRol, mostrarWhatsapp }: SidebarNavProps) {
  const navItems = NAV_ITEMS.filter((i) => mostrarWhatsapp || i.href !== "/dashboard/whatsapp");
  const pathname = usePathname();
  const router   = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const waNotif = useWhatsappNotificaciones();
  const waSinLeer = waNotif?.conversacionesSinLeer ?? 0;

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
        style={{ background: T.bgDeep, borderBottom: `1px solid ${T.borderOnDark}` }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-lg transition-colors"
          style={{ color: T.textOnDarkMuted }}
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/icon.jpeg"
            alt=""
            width={24}
            height={24}
            className="w-6 h-6 rounded-md shrink-0"
            style={{ boxShadow: T.accentGlow }}
          />
          <span
            className="text-lg tracking-[0.15em]"
            style={{ fontFamily: "var(--font-povlar)", fontWeight: 400, color: T.textOnDark, textTransform: "lowercase" }}
          >
            CLUBIO
          </span>
        </div>
        {/* Campanita de WhatsApp (o espacio para centrar el logo) */}
        {mostrarWhatsapp ? <NotificacionesBell lado="abajo" /> : <div className="w-9" />}
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
        style={{ background: T.bgDeep, borderRight: `1px solid ${T.borderOnDark}` }}
      >
        {/* Logo + close button (close only on mobile) */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icon.jpeg"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg shrink-0"
              style={{ boxShadow: T.accentGlow }}
            />
            <span
              className="text-xl tracking-[0.15em]"
              style={{ fontFamily: "var(--font-povlar)", fontWeight: 400, color: T.textOnDark, textTransform: "lowercase" }}
            >
              CLUBIO
            </span>
          </div>
          {mostrarWhatsapp && (
            <div className="hidden md:block">
              <NotificacionesBell lado="derecha" />
            </div>
          )}
          <button
            className="md:hidden p-1 rounded transition-colors"
            style={{ color: T.textOnDarkDim }}
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
            style={{ background: "rgba(255, 255, 255, 0.04)", border: `1px solid ${T.limeBorder}` }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
              style={{
                background: "rgba(215, 255, 61, 0.14)",
                border: `1px solid ${T.limeBorder}`,
                color: T.lime,
                fontFamily: "var(--font-fredoka)",
              }}
            >
              {gymInitials}
            </div>
            <div className="min-w-0">
              <p
                className="font-extrabold uppercase truncate text-sm tracking-wider"
                style={{ color: T.textOnDark, fontFamily: "var(--font-fredoka)" }}
              >
                {gymNombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: T.lime }} />
                <span className="text-xs" style={{ color: T.lime }}>Panel activo</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-3 mb-2" style={{ height: "1px", background: T.borderOnDark }} />

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2 pb-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeDrawer}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150")}
                style={{
                  fontFamily: "var(--font-fredoka)",
                  letterSpacing: "0.08em",
                  background:  active ? "rgba(215, 255, 61, 0.12)" : "transparent",
                  color:       active ? T.lime   : T.textOnDarkMuted,
                  borderLeft:  `3px solid ${active ? T.lime : "transparent"}`,
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? T.lime : T.textOnDarkDim }} />
                {label}
                {href === "/dashboard/whatsapp" && waSinLeer > 0 && (
                  <span
                    className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold tracking-normal"
                    style={{ background: T.lime, color: T.bgDeep }}
                  >
                    {waSinLeer > 99 ? "99+" : waSinLeer}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Powered by */}
        <div className="px-5 py-2" style={{ borderTop: `1px solid ${T.borderOnDark}` }}>
          <p
            className="text-xs uppercase tracking-[0.2em] select-none"
            style={{ color: T.textOnDarkDim, fontFamily: "var(--font-fredoka)", fontWeight: 700 }}
          >
            Powered by Clubio
          </p>
        </div>

        {/* User */}
        <div className="px-3 pb-3">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255, 255, 255, 0.04)", border: `1px solid ${T.limeBorder}` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ background: "rgba(215, 255, 61, 0.14)", border: `1px solid ${T.limeBorder}`, color: T.lime, fontFamily: "var(--font-fredoka)" }}
            >
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: T.textOnDark }}>{usuarioNombre}</p>
              <p className="text-xs capitalize" style={{ color: T.textOnDarkDim }}>{usuarioRol}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="transition-colors p-1 rounded"
              style={{ color: T.textOnDarkDim }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.lime)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.textOnDarkDim)}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
