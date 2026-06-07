"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { T } from "@/lib/theme";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs" style={{ color: T.textDim }}>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs px-3 font-mono" style={{ color: T.textDim }}>{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
