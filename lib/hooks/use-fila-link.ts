"use client";

import { useRouter } from "next/navigation";
import type React from "react";

// Hace que una fila de tabla/lista abra su ficha al hacer click, sin tener que ir a
// los tres puntitos. Respeta los controles internos (botones, links, menús, inputs):
// si el click viene de uno de esos, no navega. Ctrl/Cmd + click abre en otra pestaña,
// Enter con la fila enfocada también abre, y al pasar el mouse se precarga la ficha
// para que abra al toque.
const CONTROLES = "button, a, input, select, textarea, label, [role=menuitem], [role=menu], [role=dialog], [data-no-fila]";

export function useFilaLink() {
  const router = useRouter();

  return function filaProps(href: string) {
    return {
      role: "link" as const,
      tabIndex: 0,
      onClick: (e: React.MouseEvent<HTMLElement>) => {
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        // Los menús (DropdownMenu) se renderizan en un portal: el evento de React igual
        // burbujea hasta la fila, por eso se chequea el elemento clickeado y no el DOM.
        if (target.closest(CONTROLES) && target.closest(CONTROLES) !== e.currentTarget) return;
        // No navegar si el usuario estaba seleccionando texto (ej. copiar un DNI).
        if (window.getSelection()?.toString()) return;
        if (e.metaKey || e.ctrlKey) {
          window.open(href, "_blank", "noopener");
          return;
        }
        router.push(href);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && e.target === e.currentTarget) router.push(href);
      },
      onMouseEnter: () => router.prefetch(href),
    };
  };
}
