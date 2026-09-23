"use client";

// La línea de fotos de una persona, que se lee igual en los dos sitios donde aparece: en la
// ficha, donde es el campo que las descubre, y bajo el visor, donde además dice cuál se está
// mirando. Es una sola pieza porque es una sola cosa: sus fotos, en el orden en que se vivieron.

import type { FotoEnFicha } from "@/lib/arbol/fotos";

export default function Fotos({
  fotos,
  /** Cuál se está mirando, si es que se está mirando alguna: esa se lee, no se pulsa. */
  actual,
  onFoto,
}: {
  fotos: FotoEnFicha[];
  actual?: string;
  onFoto: (clave: string) => void;
}) {
  // El punto va delante de todas, también de la primera, y la fila entera se corre a la
  // izquierda lo que mide: el que abre renglón cae en ese margen y el `clip-path` lo recorta.
  // Así ningún renglón empieza por un punto sin medir dónde parte, que es lo que falla al
  // medirlo: quitar el punto estrecha el rótulo y lo devuelve al renglón de arriba, sin punto.
  // El recorte deja 4px de holgura para el anillo de foco.
  return (
    <span className="-ml-5 flex flex-wrap items-baseline gap-y-1 [clip-path:inset(-4px_-4px_-4px_calc(1.25rem-4px))]">
      {fotos.map((f) => (
        <span key={f.clave} className="flex items-baseline">
          <span aria-hidden className="w-5 shrink-0 text-center text-[var(--mut)]">
            ·
          </span>
          {f.clave === actual ? (
            <span className="font-semibold text-[var(--ink)]" aria-current="true">
              {f.rotulo}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onFoto(f.clave)}
              className="text-[var(--mut)] underline decoration-[var(--line)] underline-offset-[3px] hover:text-[var(--ink)] active:text-[var(--ink)]"
            >
              {f.rotulo}
            </button>
          )}
        </span>
      ))}
    </span>
  );
}
