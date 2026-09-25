"use client";

import { useEscape } from "../useEscape";

// Diálogo sobre velo del drawer de ficha y el comparador: cierra con clic fuera, × o Esc.
export default function Overlay({ etiqueta, ancho, onCerrar, children }: {
  etiqueta: string;   // aria-label
  ancho?: boolean;
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
