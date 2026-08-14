"use client";

import type { Rumbo } from "@/lib/arbol/camara";

/**
 * La brújula: cuando el punto de vista se va de la pantalla asoma por el borde en su
 * dirección, con su nombre, y devuelve a él. Sustituye al botón de centrar, que estaba
 * siempre y no decía nada; esta solo aparece cuando hace falta y dice hacia dónde.
 */
export default function Brujula({ posicion, nombre, onVolver }: { posicion: Rumbo; nombre: string; onVolver: () => void }) {
  return (
    <button
      type="button"
      onClick={onVolver}
      style={{ left: posicion.x, top: posicion.y, boxShadow: "var(--sh)" }}
      className="absolute flex h-8 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--paper)] pr-3 pl-2.5 text-[12px] font-medium whitespace-nowrap text-[var(--ink)]"
    >
      <svg width={13} height={13} viewBox="-6.5 -6.5 13 13" style={{ transform: `rotate(${posicion.angulo}deg)` }}>
        {/* El color va por `style`: en SVG un atributo de presentación no resuelve var(). */}
        <path
          d="M -4.5 0 H 4 M 1 -3 L 4 0 L 1 3"
          fill="none"
          style={{ stroke: "var(--acc)" }}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {nombre}
    </button>
  );
}
