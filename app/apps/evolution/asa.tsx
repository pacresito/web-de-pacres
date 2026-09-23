"use client";

import { useRef } from "react";

/** Lo que hay que bajar el asa para que cierre; menos, el cajón vuelve a su sitio. */
const CIERRA = 60;
/** Por debajo de esto no es un arrastre sino un toque, y un toque también cierra. */
const TOQUE = 6;

/**
 * El asa de los cajones del móvil: tocarla o bajarla cierra el panel, y mientras se baja el cajón
 * la sigue. En escritorio no se ve —allí los paneles no son cajones—. El cajón es quien la
 * contiene, y es a él a quien se mueve.
 */
export default function Asa({ cerrar }: { cerrar: () => void }) {
  const inicio = useRef<number | null>(null);
  const cajon = (e: React.PointerEvent<HTMLDivElement>) => e.currentTarget.parentElement!;
  const soltar = (e: React.PointerEvent<HTMLDivElement>, cierra: boolean) => {
    inicio.current = null;
    cajon(e).style.transform = "";
    // Se cierra después de devolverlo: si lo que se cierra es solo una parte —la tira con la
    // ficha debajo—, el cajón sigue ahí y no puede quedarse a medio bajar.
    if (cierra) cerrar();
  };
  return (
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
  );
}
