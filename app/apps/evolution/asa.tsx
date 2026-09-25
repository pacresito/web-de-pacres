"use client";

import { useRef } from "react";

/** Lo que hay que bajar el asa para que cierre; menos, el cajón vuelve a su sitio. */
const CIERRA = 60;
/** Por debajo es un toque, que también cierra. */
const TOQUE = 6;

/** El asa de los cajones del móvil: tocarla o bajarla cierra. Mueve al cajón que la contiene. */
export default function Asa({ cerrar }: { cerrar: () => void }) {
  const inicio = useRef<number | null>(null);
  const cajon = (e: React.PointerEvent<HTMLDivElement>) => e.currentTarget.parentElement!;
  const soltar = (e: React.PointerEvent<HTMLDivElement>, cierra: boolean) => {
    inicio.current = null;
    cajon(e).style.transform = "";
    if (cierra) cerrar();   // después de devolverlo: si solo se cierra una parte, el cajón sigue ahí
  };
  return (
    <>
      <style>{`
        .asa { display: none; }
        @media (max-width: 640px) {
          /* Pegada arriba, y el hueco de arriba lo pone ella y no el panel, que dejaría ver el
             texto pasar por encima de la cabecera. */
          .asa {
            display: block; position: sticky; top: 0; z-index: 2; height: 28px; margin: 0 -1rem;
            background: var(--t-paper); touch-action: none; cursor: grab;
          }
          .asa::after {
            content: ""; position: absolute; left: 50%; top: 12px; width: 36px; height: 4px;
            margin-left: -18px; border-radius: 2px; background: var(--t-rule);
          }
        }
      `}</style>
      <div
        className="asa" role="button" aria-label="Cerrar"
        onPointerDown={(e) => { inicio.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (inicio.current === null) return;
          cajon(e).style.transform = `translateY(${Math.max(0, e.clientY - inicio.current)}px)`;
        }}
        onPointerUp={(e) => {
          if (inicio.current === null) return;
          const dy = e.clientY - inicio.current;
          soltar(e, dy > CIERRA || Math.abs(dy) < TOQUE);
        }}
        onPointerCancel={(e) => { if (inicio.current !== null) soltar(e, false); }}
      />
    </>
  );
}
