"use client";

import { useEscape } from "../useEscape";

// El overlay que comparten el drawer de ficha y el comparador: velo que cierra al clicar
// fuera, diálogo que no propaga el clic, botón de cerrar y Esc. El modal de «¿Qué es
// esto?» de la cabecera NO pasa por aquí: es otra pieza con su propio CSS, y meterla
// costaría más props de las que ahorra.
export default function Overlay({ etiqueta, ancho, onCerrar, children }: {
  etiqueta: string;   // aria-label del diálogo
  ancho?: boolean;    // variante ancha (comparador)
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  useEscape(onCerrar);

  return (
    <div className="fr-fd-scrim" onClick={onCerrar}>
      <div
        className={`fr-fd${ancho ? " fr-fd--ancho" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="fr-fd-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        {children}
      </div>
    </div>
  );
}
