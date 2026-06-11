import { ShieldCheck, Menu } from "lucide-react";
import { T } from "@/lib/theme";
import { ADMIN_ACCENT } from "./AdminSidebar";

interface AdminNavbarProps {
  nombre: string;
  email: string;
  onMenuClick?: () => void;
}

export function AdminNavbar({ nombre, email, onMenuClick }: AdminNavbarProps) {
  const initials = nombre.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header
      className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 shrink-0"
      style={{ background: T.bg, borderBottom: `1px solid ${T.borderSub}` }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-1 rounded-lg transition-colors"
          style={{ color: T.textMuted }}
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: ADMIN_ACCENT }} />
          <span className="hidden sm:inline text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
            Panel interno — visible solo para superadmins
          </span>
          <span className="sm:hidden text-xs uppercase tracking-widest" style={{ color: T.textDim, fontFamily: "var(--font-barlow-condensed)" }}>
            Panel admin
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-bold leading-none" style={{ color: T.text }}>{nombre}</p>
          <p className="text-xs mt-0.5" style={{ color: T.textDim }}>{email}</p>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            background: "#F9731620",
            border: `1px solid #F9731648`,
            color: ADMIN_ACCENT,
            fontFamily: "var(--font-barlow-condensed)",
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
