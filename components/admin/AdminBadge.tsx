import { T } from "@/lib/theme";

interface AdminBadgeProps {
  label: string;
  color: string;
}

/** Badge de estado genérico — el color define el acento (texto, fondo ~15%, borde ~40%) */
export function AdminBadge({ label, color }: AdminBadgeProps) {
  return (
    <span
      className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider inline-block"
      style={{
        fontFamily: "var(--font-barlow-condensed)",
        background: `${color}15`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
}

export const PLAN_COLORS: Record<string, string> = {
  basic: T.blue,
  plus: T.accent,
  multi: "#F97316",
};

export const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  plus: "Plus",
  multi: "Multi",
};
