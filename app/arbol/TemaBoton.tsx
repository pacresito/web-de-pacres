"use client";

// El interruptor de tema, con la paleta del árbol pero el mismo estado que el resto del
// sitio: quien lo cambia aquí lo cambia en /lab y en la home. El icono (luna en claro, sol
// en oscuro) lo dibuja `.t-theme-ico` de globals.css a partir de `currentColor` y del
// `data-theme` de <html>, así que ya sale bien en el primer pintado, sin esperar a React.

import { usePersistedTheme } from "../components/usePersistedTheme";

export default function TemaBoton({ className }: { className?: string }) {
  const [tema, setTema] = usePersistedTheme();
  const siguiente = tema === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTema(siguiente)}
      title={siguiente === "dark" ? "Tema oscuro" : "Tema claro"}
      aria-label={siguiente === "dark" ? "Activar tema oscuro" : "Activar tema claro"}
      className={`inline-flex items-center justify-center p-1 text-[var(--mut)] hover:text-[var(--ink)] active:text-[var(--ink)] ${className ?? ""}`}
    >
      <i className="t-theme-ico" aria-hidden="true" />
    </button>
  );
}
