"use client";

// La cinta, pegada al borde izquierdo: en qué punto de la columna que miras estás y cuánta
// queda. Va en vertical porque el eje es horizontal y una generación se recorre a lo alto,
// que además es lo largo de un móvil: en horizontal sus segmentos medirían la mitad.
// **No se toca** —lo dice `cinta.ts`— así que no lleva ni foco ni botón: es una lectura.

import type { Segmento } from "@/lib/arbol/cinta";
import { ALTO_REGLA } from "./Regla";

/** Lo que le deja libre abajo el chip del Centro, que ocupa esa esquina. */
const HUECO_CHIP = 64;

export default function Cinta({ segmentos }: { segmentos: Segmento[] }) {
  return (
    <div
      style={{ top: ALTO_REGLA, bottom: HUECO_CHIP }}
      // Los gestos son del lienzo, que sigue debajo: la cinta no se toca, se lee.
      className="pointer-events-none absolute left-0 flex w-2.5 flex-col items-center justify-center gap-px"
    >
      {segmentos.map((segmento) => (
        <span
          key={segmento.id}
          // Dónde estás, en acento y más ancho; de dónde eres, en el gris del texto: son
          // dos preguntas distintas y la segunda no se apaga al alejarse de ella.
          // Y el tope de alto es lo que la salva cuando la columna trae dos grupos: sin él
          // cada segmento se estira media pantalla y lo que era una cinta es una barra.
          className={`max-h-4 min-h-px flex-1 rounded-full ${
            segmento.aqui
              ? "w-[5px] bg-[var(--acc)]"
              : segmento.tuyo
                ? "w-[3px] bg-[var(--mut)]"
                : "w-[3px] bg-[var(--line)]"
          }`}
        />
      ))}
    </div>
  );
}
