"use client";

// La regla de generación: a cuántas generaciones de ti queda cada columna del lienzo. Va
// arriba y a lo ancho porque es donde se lee sin buscarla, y acompaña al paneo: rotula las
// mismas columnas que ya distingue el claroscuro del fondo, que solo dice dónde cambia la
// generación y no cuál es. Dónde cae cada marca lo calcula `reglaDe`; aquí solo se pinta.

import type { Marca } from "@/lib/arbol/camara";

/** Lo que mide la franja, y por tanto lo que se corre hacia abajo el cromo de arriba. */
export const ALTO_REGLA = 26;

export default function Regla({ marcas }: { marcas: Marca[] }) {
  // Sin nada que rotular no se pinta: una franja vacía se lee como una cabecera rota.
  if (marcas.length === 0) return null;
  return (
    <div
      style={{ height: ALTO_REGLA }}
      // Los gestos son del lienzo, que sigue debajo: la regla no se toca, se lee.
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden border-b border-[var(--line)] bg-[var(--soft)]"
    >
      {marcas.map((marca) => (
        <span
          key={marca.nivel}
          style={{ left: marca.x }}
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-px font-[family-name:var(--mono)] text-[11px] whitespace-nowrap ${
            marca.nivel === 0 ? "bg-[var(--acch)] font-medium text-[var(--acc)]" : "text-[var(--mut)]"
          }`}
        >
          {marca.etiqueta}
        </span>
      ))}
    </div>
  );
}
