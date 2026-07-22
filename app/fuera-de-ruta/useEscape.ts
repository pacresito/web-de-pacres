"use client";

import { useEffect } from "react";

// Esc cierra el overlay de turno (modal de la cabecera, drawer de ficha, comparador).
// `activo` existe para los que viven montados con el overlay cerrado: sin overlay a la
// vista no hay listener que escuche.
export function useEscape(onEscape: () => void, activo = true) {
  useEffect(() => {
    if (!activo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape, activo]);
}
