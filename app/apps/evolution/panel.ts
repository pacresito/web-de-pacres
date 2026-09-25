"use client";

import { useEffect } from "react";

/**
 * Lo que comparten los paneles: se cierran con Escape y, si leen el mundo, lo leen cada `ms`,
 * porque el bucle vive en refs y no avisa a React. `leer` tiene que venir memorizado.
 */
export function usePanel(cerrar: () => void, leer?: () => void, ms = 700) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    let id = 0;
    if (leer) {
      leer();
      id = window.setInterval(leer, ms);
    }
    return () => { window.clearInterval(id); window.removeEventListener("keydown", esc); };
  }, [cerrar, leer, ms]);
}
