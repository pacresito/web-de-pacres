"use client";

import { useMemo } from "react";
import { MUNDO } from "@/data/atlas/mundo";
import { alLimbo, ortografica, pathDelGlobo, rellenoDelGlobo } from "@/lib/atlas/globo";

/**
 * El globo de la tarjeta: la Tierra centrada en el país, con él resaltado. Es quien cuenta el
 * tamaño y la ubicación, que la silueta ya no dice porque va normalizada.
 *
 * Va con la forma, no aparte: si se enseñara con la forma tapada estaría señalando el país en
 * un mapa, que es media respuesta regalada.
 */
export default function Globo({ id, lon, lat, r = 74, lado }: { id: string; lon: number; lat: number; r?: number; lado?: string }) {
  const { tierra, relleno, mio, punto } = useMemo(() => {
    const proy = ortografica(lon, lat, r);
    const suyos = MUNDO.filter((a) => a.id === id).map((a) => a.r);
    return {
      tierra: pathDelGlobo(MUNDO.filter((a) => a.id !== id).map((a) => a.r), proy),
      // La tierra rellena, un punto más oscura que el agua: sin ella el globo es un círculo de
      // un solo tono con rayas, y no se lee cuál de los dos lados de la costa es mar.
      relleno: rellenoDelGlobo(MUNDO.map((a) => a.r), proy, alLimbo(lon, lat, r)),
      mio: pathDelGlobo(suyos, proy),
      // Los diminutos no están en el mapa de baja resolución del globo, y a esta escala un
      // punto es exactamente lo que son.
      punto: suyos.length ? null : proy(lon, lat),
    };
  }, [id, lon, lat, r]);

  // El dibujo se calcula a radio grande y se pinta al tamaño que pida quien lo usa: bajar el
  // radio adelgazaría la costa hasta perderla. Los trazos no escalan, para que a 52 px sigan
  // midiendo un píxel.
  const d = r * 2 + 2;
  return (
    <svg width={d} height={d} viewBox={`${-r - 1} ${-r - 1} ${d} ${d}`}
         style={lado ? { width: lado, height: lado, flexShrink: 0 } : undefined} aria-hidden>
      <circle r={r} fill="var(--t-paper2)" stroke="var(--t-rule)" />
      {/* No hace falta recortar por el círculo: lo escondido va pegado al canto y la cuerda
          entre dos puntos del borde cae siempre por dentro. */}
      <path d={relleno} fill="var(--t-rule2)" />
      <path d={tierra} fill="none" stroke="var(--t-ink4)" strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Trazo además de relleno: un país fino (Chile, Italia) desaparece si solo se rellena. */}
      <path d={mio} fill="var(--t-accent)" stroke="var(--t-accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {punto && <circle cx={punto[0]} cy={punto[1]} r={3.5} fill="var(--t-accent)" />}
      <circle r={r} fill="none" stroke="var(--t-rule2)" />
    </svg>
  );
}
