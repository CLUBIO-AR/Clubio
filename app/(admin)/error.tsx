"use client";

import { useEffect } from "react";
import { T } from "@/lib/theme";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: T.text }}>Error en panel admin</h2>
        <p className="text-sm" style={{ color: T.textMuted }}>
          Ocurrió un error inesperado en el panel de administración.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm rounded-md transition-colors"
          style={{ background: T.accent, color: T.accentText }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
