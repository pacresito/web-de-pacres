"use client";

// Lo que el lienzo dibuja además del nodo: el trazo que une a una pareja y las tres marcas
// que se pulsan sobre él —abrir la pareja que falta, cerrar una rama, abrir las que no
// caben—. Todas en coordenadas del árbol y con las clases SVG de `.arbol` en globals.css.

import { ALTO_CONTADOR, ANCHO_CONTADOR, type Contador } from "@/lib/arbol/layout";
import { tramosDePareja } from "@/lib/arbol/trazos";
import type { Union } from "@/lib/arbol/tree";

export const GUION = "4 3"; // el trazo de la unión que acabó, rota como el tachón del documento
// Un corazón de 14×11 centrado en el origen: la marca de los novios que no se casaron.
// Más pequeño no cabía la grieta del roto sin volverse un borrón a tamaño de lectura.
const CORAZON = "M 0 5.5 C -7.4 0.3 -7.3 -5.6 -3.8 -5.6 C -1.4 -5.6 0 -3.9 0 -2.7 C 0 -3.9 1.4 -5.6 3.8 -5.6 C 7.3 -5.6 7.4 0.3 0 5.5 Z";
// La grieta del que se rompió, del escote al pico y en zigzag para que no parezca el trazo.
const GRIETA = "M 0 -2.7 L 1.7 -0.8 L -1.4 1.2 L 1.2 3.2 L 0 5.5";

/**
 * El trazo que une a los dos miembros de una pareja, más marcado que el resto: en una
 * columna apretada es lo único que distingue a un matrimonio de dos vecinos cualesquiera.
 * Y dice qué unión es: **a rayas si se rompió** y **con un corazón si fueron novios y no
 * matrimonio** —partido si además se rompió, y entonces el trazo se queda entero: la
 * rotura ya la cuenta el corazón, y las dos rayas sueltas que quedaban a los lados de él
 * no se leían como un trazo discontinuo—. El corazón va relleno para comerse el trazo por
 * dentro y se pinta el último, tapando también el arranque de los hijos.
 */
export function TrazoDePareja({
  x,
  extremos,
  tipo,
  roto,
}: {
  x: number;
  extremos: [number, number];
  tipo: Union["tipo"];
  roto: boolean;
}) {
  const { tramos, centro } = tramosDePareja(extremos, tipo === "pareja");
  return (
    <>
      {tramos.map(([desde, hasta], i) => (
        <line
          key={i}
          x1={x}
          y1={desde}
          x2={x}
          y2={hasta}
          className="par"
          strokeWidth={2.5}
          strokeDasharray={roto && tipo !== "pareja" ? GUION : undefined}
        />
      ))}
      {tipo === "pareja" && (
        <g transform={`translate(${x} ${centro})`} className="par-cor">
          <path d={CORAZON} strokeWidth={1.4} />
          {roto && <path d={GRIETA} strokeWidth={1} fill="none" />}
        </g>
      )}
    </>
  );
}

/** La pareja que no se pinta: un «+» discreto asomando por el borde en que ella iría. */
export function MasPareja({ x, y, onAbrir }: { x: number; y: number; onAbrir: () => void }) {
  return (
    <g onClick={onAbrir} className="cursor-pointer">
      <circle cx={x} cy={y} r={13} fillOpacity={0} />
      <circle cx={x} cy={y} r={7.5} className="pieza" />
      <line x1={x - 3.5} y1={y} x2={x + 3.5} y2={y} className="par" strokeWidth={1.3} />
      <line x1={x} y1={y - 3.5} x2={x} y2={y + 3.5} className="par" strokeWidth={1.3} />
    </g>
  );
}

/** El botón de cerrar una rama, justo donde se abrió: sobre la unión. */
export function Manija({ x, y, onPulsar }: { x: number; y: number; onPulsar: () => void }) {
  return (
    <g onClick={onPulsar} className="cursor-pointer">
      <circle cx={x} cy={y} r={11} className="pieza" />
      <line x1={x - 5} y1={y} x2={x + 5} y2={y} className="par" strokeWidth={1.5} />
    </g>
  );
}

/** «+1 hijo», no «+1 hijos»: el contador dice cuántos hay, y con uno la ese sobra. */
const rotuloDelContador = ({ cantidad, sentido }: Contador): string =>
  cantidad > 1 ? sentido : sentido === "hijos" ? "hijo" : "padre";

export function ContadorRama({ contador, onAbrir }: { contador: Contador; onAbrir: () => void }) {
  return (
    <g onClick={onAbrir} className="cursor-pointer">
      <rect
        x={contador.x - ANCHO_CONTADOR / 2}
        y={contador.y - ALTO_CONTADOR / 2}
        width={ANCHO_CONTADOR}
        height={ALTO_CONTADOR}
        rx={ALTO_CONTADOR / 2}
        className="pieza"
        strokeDasharray="4 3"
      />
      <text x={contador.x} y={contador.y + 4} textAnchor="middle" fontSize={12} className="pieza-tx">
        +{contador.cantidad} {rotuloDelContador(contador)}
      </text>
    </g>
  );
}
