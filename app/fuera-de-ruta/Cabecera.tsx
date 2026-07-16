"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cabecera común a todas las pantallas de Fuera de Ruta (F1): wordmark "Fuera de Ruta"
// (el "de" en píldora Lima rotada), tagline mono y "¿Qué es esto?" → modal.
export default function Cabecera() {
  const [abierto, setAbierto] = useState(false);

  // Esc cierra el modal; sin overlay abierto no hay listener.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  return (
    <header className="fr-cabecera">
      <Link href="/fuera-de-ruta" className="fr-wordmark">
        Fuera <span className="fr-wordmark-de">de</span> Ruta
      </Link>
      <span className="fr-tagline">sitios chulos y poco conocidos</span>
      <button type="button" className="fr-que-es" onClick={() => setAbierto(true)}>
        ¿Qué es esto?
      </button>

      {abierto && (
        <div className="fr-modal-fondo" onClick={() => setAbierto(false)}>
          <div className="fr-modal" role="dialog" aria-modal="true" aria-label="¿Qué es esto?" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="fr-modal-cerrar" aria-label="Cerrar" onClick={() => setAbierto(false)}>×</button>
            <h2 className="fr-modal-titulo">¿Qué es esto?</h2>
            <p>
              <strong>Fuera de Ruta</strong> es una colección de sitios chulos y poco conocidos de España,
              elegidos a mano por Cris. Nada de algoritmos ni rankings: sitios de verdad, contados por alguien que ha estado.
            </p>
            <p>
              Buscas por zona, filtras por lo que te apetece y, si quieres, te montamos un plan de viaje con
              horas de luz y tiempos de coche reales.
            </p>
            <p className="fr-modal-nota">De momento solo hay Navarra. Irá creciendo.</p>
          </div>
        </div>
      )}
    </header>
  );
}
