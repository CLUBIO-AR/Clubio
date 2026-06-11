"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Inbox,
  ScrollText,
  Mail,
  Clock,
  Wallet,
  LogOut,
  Zap,
  ChevronDown,
  ShieldCheck,
  Settings,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/theme";

// Acento naranja — diferenciador visual del panel de superadmin (vs. esmeralda del panel de gym)
export const ADMIN_ACCENT = "#F97316";
const ADMIN_ACCENT_BG = "#F9731620";
const ADMIN_ACCENT_BORDER = "#F9731648";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/gyms", label: "Gyms", icon: Building2 },
  { href: "/admin/licencias", label: "Licencias", icon: CreditCard },
  { href: "/admin/suscripciones", label: "Suscripciones", icon: Wallet },
  { href: "/admin/leads", label: "Leads", icon: Inbox },
  { href: "/admin/superadmins", label: "Superadmins", icon: ShieldCheck },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

const LOGS_ITEMS = [
  { href: "/admin/logs/emails", label: "Emails", icon: Mail },
  { href: "/admin/logs/crons", label: "Crons", icon: Clock },
  { href: "/admin/logs/pagos", label: "Pagos / Webhooks", icon: Wallet },
  { href: "/admin/logs/acciones", label: "Audit Trail", icon: History },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ mobileOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [logsOpen, setLogsOpen] = useState(pathname.startsWith("/admin/logs"));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const closeDrawer = () => onClose?.();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
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
        {/* Logo + close button */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: ADMIN_ACCENT, boxShadow: `0 0 18px ${ADMIN_ACCENT_BORDER}` }}
            >
              <Zap className="w-4 h-4" style={{ color: T.bgDeep }} />
            </div>
            <div>
              <span
                className="text-xl tracking-[0.15em] block leading-none"
                style={{ fontFamily: "var(--font-barlow-condensed)", fontWeight: 900, color: T.text }}
              >
                CLUBIO
              </span>
              <span
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ fontFamily: "var(--font-barlow-condensed)", color: ADMIN_ACCENT }}
              >
                Admin
              </span>
            </div>
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

        <div className="mx-3 mb-2" style={{ height: "1px", background: T.borderSub }} />

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2 pb-2 space-y-0.5 overflow-y-auto">
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
                  background:  active ? ADMIN_ACCENT_BG : "transparent",
                  color:       active ? ADMIN_ACCENT   : T.textMuted,
                  borderLeft:  `3px solid ${active ? ADMIN_ACCENT : "transparent"}`,
                }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: active ? ADMIN_ACCENT : T.textDim }} />
                {label}
              </Link>
            );
          })}

          {/* Logs — submenu */}
          <button
            onClick={() => setLogsOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              letterSpacing: "0.08em",
              background: pathname.startsWith("/admin/logs") ? ADMIN_ACCENT_BG : "transparent",
              color:      pathname.startsWith("/admin/logs") ? ADMIN_ACCENT   : T.textMuted,
              borderLeft: `3px solid ${pathname.startsWith("/admin/logs") ? ADMIN_ACCENT : "transparent"}`,
            }}
          >
            <ScrollText className="w-4 h-4 shrink-0" style={{ color: pathname.startsWith("/admin/logs") ? ADMIN_ACCENT : T.textDim }} />
            <span className="flex-1 text-left">Logs</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-150", logsOpen && "rotate-180")} style={{ color: T.textDim }} />
          </button>

          {logsOpen && (
            <div className="pl-6 space-y-0.5">
              {LOGS_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150"
                    style={{
                      fontFamily: "var(--font-barlow-condensed)",
                      letterSpacing: "0.06em",
                      background: active ? ADMIN_ACCENT_BG : "transparent",
                      color:      active ? ADMIN_ACCENT   : T.textDim,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-150"
            style={{
              fontFamily: "var(--font-barlow-condensed)",
              letterSpacing: "0.08em",
              color: T.textMuted,
            }}
          >
            <LogOut className="w-4 h-4 shrink-0" style={{ color: T.textDim }} />
            Salir
          </button>
        </div>
      </aside>
    </>
  );
}
