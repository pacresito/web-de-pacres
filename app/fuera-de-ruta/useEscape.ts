"use client";

import { useEffect } from "react";

// Esc cierra el overlay abierto. `activo` es para los que siguen montados con el overlay cerrado.
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
