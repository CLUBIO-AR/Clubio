import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "@/lib/theme";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Construye la URL de una página dada (preserva los filtros activos) */
  hrefForPage: (page: number) => string;
}

export function AdminPagination({ page, totalPages, total, hrefForPage }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs" style={{ color: T.textDim }}>
        {total.toLocaleString("es-AR")} resultado{total !== 1 ? "s" : ""} · página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <Link
          href={hrefForPage(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textMuted, opacity: page <= 1 ? 0.4 : 1, pointerEvents: page <= 1 ? "none" : "auto" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <Link
          href={hrefForPage(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.textMuted, opacity: page >= totalPages ? 0.4 : 1, pointerEvents: page >= totalPages ? "none" : "auto" }}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
