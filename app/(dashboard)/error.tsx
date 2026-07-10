"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">Algo salió mal</h2>
        <p className="text-sm text-gray-400">
          Ocurrió un error inesperado. Si el problema persiste, contactá a soporte.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-md transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
