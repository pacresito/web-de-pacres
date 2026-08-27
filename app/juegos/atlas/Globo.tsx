"use client";

import { useMemo, useRef } from "react";
import { FORMAS } from "@/data/atlas/formas";
import { MUNDO } from "@/data/atlas/mundo";
import { alLimbo, enganche, ortografica, pathDelGlobo, rellenoDelGlobo } from "@/lib/atlas/globo";

// Los países que el mapa de baja resolución no trae. Entran al enganche por su centro, que es el
// mismo punto con el que ya se dibujan.
const CON_ANILLO = new Set(MUNDO.map((a) => a.id));
const PUNTOS = Object.entries(FORMAS)
  .filter(([id]) => !CON_ANILLO.has(id))
  .map(([id, f]) => ({ id, lon: f.lon, lat: f.lat }));

/**
 * El globo de la tarjeta: la Tierra centrada en el país, con él resaltado. Es quien cuenta el
 * tamaño y la ubicación, que la silueta ya no dice porque va normalizada.
 *
 * Va con la forma, no aparte: si se enseñara con la forma tapada estaría señalando el país en
 * un mapa, que es media respuesta regalada.
 *
 * **`lon` y `lat` son dónde se planta el globo, no dónde está el país.** No coinciden: la tarjeta
 * lo desvía a propósito para que la respuesta no caiga en el centro del disco. Quien sabe dónde
 * está cada país es `FORMAS`, y de ahí salen los puntos de los que no tienen contorno.
 *
 * `oculto` lo dibuja como tierra cualquiera, con su costa igual que la de sus vecinos, para el
 * globo en el que se marca el sitio antes de destapar: omitirlo dejaría un hueco justo donde está
 * la respuesta. Con `alMarcar` el toque dentro del disco engancha un país y lo devuelve.
 */
export default function Globo({ id, lon, lat, r = 74, lado, oculto, marca, alMarcar }: {
  id: string; lon: number; lat: number; r?: number; lado?: string;
  oculto?: boolean; marca?: string | null; alMarcar?: (id: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const { proy, borde, tierra, relleno, mio, punto, trazo, trazoPunto } = useMemo(() => {
    const proy = ortografica(lon, lat, r);
    const borde = alLimbo(lon, lat, r);
    // `null` y no "" para el que no se resalta: la cadena vacía es el id de la tierra que no es de
    // ningún país, y se llevaría el resaltado entera.
    const resaltado = oculto ? null : id;
    const anillosDe = (quien: string | null) => (quien ? MUNDO.filter((a) => a.id === quien).map((a) => a.r) : []);
    const suyos = anillosDe(resaltado);
    const marcados = anillosDe(marca ?? null);
    return {
      proy, borde,
      tierra: pathDelGlobo(MUNDO.filter((a) => a.id !== resaltado).map((a) => a.r), proy),
      // La tierra rellena, un punto más oscura que el agua: sin ella el globo es un círculo de
      // un solo tono con rayas, y no se lee cuál de los dos lados de la costa es mar.
      relleno: rellenoDelGlobo(MUNDO.map((a) => a.r), proy, borde),
      mio: pathDelGlobo(suyos, proy),
      // Los diminutos no están en el mapa de baja resolución del globo, y a esta escala un
      // punto es exactamente lo que son. Va por su sitio en `FORMAS`, no por el centro del globo,
      // que es otra cosa desde que la tarjeta lo desvía.
      punto: resaltado && !suyos.length ? proy(FORMAS[resaltado].lon, FORMAS[resaltado].lat) : null,
      trazo: pathDelGlobo(marcados, proy),
      trazoPunto: marca && !marcados.length ? proy(FORMAS[marca].lon, FORMAS[marca].lat) : null,
    };
  }, [id, lon, lat, r, oculto, marca]);

  /**
   * Dentro del disco se marca; fuera, el toque sigue subiendo, que ahí es cerrar. Lo que
   * distingue un toque de otro es dónde cae, así que vale igual con dedo y con ratón.
   */
  const tocar = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!alMarcar || !svg.current) return;
    const caja = svg.current.getBoundingClientRect();
    // Cuántas unidades del dibujo mide un píxel de pantalla: el globo se calcula a radio fijo y
    // se pinta al tamaño que quepa, y los umbrales del enganche van en píxeles del de verdad.
    const unidad = (r * 2 + 2) / caja.width;
    const p: [number, number] = [
      (e.clientX - caja.left) * unidad - (r + 1),
      (e.clientY - caja.top) * unidad - (r + 1),
    ];
    if (Math.hypot(p[0], p[1]) > r) return;
    e.stopPropagation();
    const enganchado = enganche(MUNDO, PUNTOS, proy, borde, p, unidad);
    if (enganchado) alMarcar(enganchado);
  };

  // El dibujo se calcula a radio grande y se pinta al tamaño que pida quien lo usa: bajar el
  // radio adelgazaría la costa hasta perderla. Los trazos no escalan, para que a 52 px sigan
  // midiendo un píxel.
  const d = r * 2 + 2;
  return (
    <svg ref={svg} onClick={tocar} width={d} height={d} viewBox={`${-r - 1} ${-r - 1} ${d} ${d}`}
         style={{ ...(lado && { width: lado, height: lado, flexShrink: 0 }), ...(alMarcar && { cursor: "crosshair" }) }}
         aria-hidden>
      <circle r={r} fill="var(--t-paper2)" stroke="var(--t-rule)" />
      {/* No hace falta recortar por el círculo: lo escondido va pegado al canto y la cuerda
          entre dos puntos del borde cae siempre por dentro. */}
      <path d={relleno} fill="var(--t-rule2)" />
      <path d={tierra} fill="none" stroke="var(--t-ink4)" strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Trazo además de relleno: un país fino (Chile, Italia) desaparece si solo se rellena. */}
      <path d={mio} fill="var(--t-accent)" stroke="var(--t-accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {punto && <circle cx={punto[0]} cy={punto[1]} r={3.5} fill="var(--t-accent)" />}
      {/* La marca va encima y es trazo, mientras que la respuesta es relleno: así no pelean, y
          el acierto se lee solo —el contorno cae clavado sobre la forma verde— en vez de
          desaparecer debajo. */}
      <path d={trazo} fill="none" stroke="var(--t-ink)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {trazoPunto && <circle cx={trazoPunto[0]} cy={trazoPunto[1]} r={6} fill="none" stroke="var(--t-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      <circle r={r} fill="none" stroke="var(--t-rule2)" />
    </svg>
  );
}
