"use client";

// El interruptor de tema, con la paleta del árbol pero el mismo estado que el resto del
// sitio: quien lo cambia aquí lo cambia en /lab y en la home. El icono (luna en claro, sol
// en oscuro) lo dibuja `.t-theme-ico` de globals.css a partir de `currentColor` y del
// `data-theme` de <html>, así que ya sale bien en el primer pintado, sin esperar a React.

import { usePersistedTheme } from "../components/usePersistedTheme";

const SUELTO = "inline-flex items-center justify-center p-1 text-[var(--mut)] hover:text-[var(--ink)] active:text-[var(--ink)]";

export default function TemaBoton({ className, conTexto }: { className?: string; conTexto?: boolean }) {
  const [tema, setTema] = usePersistedTheme();
  const siguiente = tema === "dark" ? "light" : "dark";
  // El botón dice a qué tema lleva, no en cuál está: es lo que va a pasar al pulsarlo, y
  // es lo mismo que ya decían el título y la etiqueta cuando solo era un icono.
  const texto = siguiente === "dark" ? "Tema oscuro" : "Tema claro";
  return (
    <button
      type="button"
      onClick={() => setTema(siguiente)}
      title={texto}
      aria-label={`Activar ${texto.toLowerCase()}`}
      className={className ?? SUELTO}
    >
      {conTexto && texto}
      <i className={`t-theme-ico ${conTexto ? "ml-auto" : ""}`} aria-hidden="true" />
    </button>
  );
}
