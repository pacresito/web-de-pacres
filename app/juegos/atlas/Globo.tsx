"use client";

import { useMemo, useRef } from "react";
import { FORMAS } from "@/data/atlas/formas";
import { MUNDO } from "@/data/atlas/mundo";
import { enganche, gradosEntre, ortografica, pathDelGlobo, rellenoDelGlobo } from "@/lib/atlas/globo";

// Los países que el mapa de baja resolución no trae. Entran al enganche por su centro, que es el
// mismo punto con el que ya se dibujan.
const CON_ANILLO = new Set(MUNDO.map((a) => a.id));
const PUNTOS = Object.entries(FORMAS)
  .filter(([id]) => !CON_ANILLO.has(id))
  .map(([id, f]) => ({ id, lon: f.lon, lat: f.lat }));

/**
 * Hasta dónde se marcan esos países, en grados de arco desde el centro del globo. **Cincuenta,
 * media cara visible:** en el Pacífico casi todo país es un punto, y con veinte el globo enseñaba
 * uno solo y no había dónde apuntar. Más no cabe: cerca del limbo la ortográfica los apila contra
 * el canto —a 70° se pintan al 94% del radio— y dejan de distinguirse unos de otros.
 */
const RADIO_PUNTOS = 50;

/** Los anillos de un país, o ninguno si no se pide ninguno. */
const anillosDe = (quien: string | null) => (quien ? MUNDO.filter((a) => a.id === quien).map((a) => a.r) : []);

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
 * `puntos` marca los que el mapa no trae, para poder apuntarles: a esta escala no se ven, y saber
 * dónde está Andorra no sirve de nada si no hay nada que pinchar. Que a veces el punto sea el país
 * preguntado se acepta —la mayoría de las veces no lo es, y quien califica es quien juega—.
 *
 * `oculto` lo dibuja como tierra cualquiera, con su costa igual que la de sus vecinos, para el
 * globo en el que se marca el sitio antes de destapar: omitirlo dejaría un hueco justo donde está
 * la respuesta. Con `alMarcar` el toque dentro del disco engancha un país y lo devuelve.
 */
export default function Globo({ id, lon, lat, r = 74, lado, oculto, puntos, marca, alMarcar }: {
  id: string; lon: number; lat: number; r?: number; lado?: string;
  oculto?: boolean; puntos?: boolean; marca?: string | null; alMarcar?: (id: string) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  // El mundo entero, que es lo que cuesta: 23.000 puntos por proyectar. Va aparte de la marca
  // porque marcar no lo cambia —son diez milisegundos por globo, y al marcar hay dos vivos—.
  const { proy, cercanos, tierra, relleno, mio, punto, diminutos } = useMemo(() => {
    const proy = ortografica(lon, lat, r);
    // `null` y no "" para el que no se resalta: la cadena vacía es el id de la tierra que no es de
    // ningún país, y se llevaría el resaltado entera.
    const resaltado = oculto ? null : id;
    const suyos = anillosDe(resaltado);
    // Los que se dibujan son los mismos que se pueden enganchar, y por eso salen de aquí: dos
    // listas separadas serían un punto que se ve y no responde, o al revés.
    const cercanos = puntos ? PUNTOS.filter((p) => gradosEntre(lon, lat, p.lon, p.lat) <= RADIO_PUNTOS) : [];
    return {
      proy, cercanos,
      tierra: pathDelGlobo(MUNDO.filter((a) => a.id !== resaltado).map((a) => a.r), proy),
      // La tierra rellena, un punto más oscura que el agua: sin ella el globo es un círculo de
      // un solo tono con rayas, y no se lee cuál de los dos lados de la costa es mar.
      relleno: rellenoDelGlobo(MUNDO.map((a) => a.r), proy),
      mio: pathDelGlobo(suyos, proy),
      // Los diminutos no están en el mapa de baja resolución del globo, y a esta escala un
      // punto es exactamente lo que son. Va por su sitio en `FORMAS`, no por el centro del globo,
      // que es otra cosa desde que la tarjeta lo desvía.
      punto: resaltado && !suyos.length ? proy(FORMAS[resaltado].lon, FORMAS[resaltado].lat) : null,
      // El resaltado no se dibuja gris: ya se pinta en acento un poco más abajo, y dos círculos
      // en el mismo sitio dejan un halo asomando por fuera del verde. Dentro del radio no hace
      // falta comprobar el horizonte, que está a noventa grados.
      diminutos: cercanos.filter((p) => p.id !== resaltado).map((p) => proy(p.lon, p.lat)),
    };
  }, [id, lon, lat, r, oculto, puntos]);

  const { trazo, trazoPunto } = useMemo(() => {
    const marcados = anillosDe(marca ?? null);
    return {
      trazo: pathDelGlobo(marcados, proy),
      trazoPunto: marca && !marcados.length ? proy(FORMAS[marca].lon, FORMAS[marca].lat) : null,
    };
  }, [proy, marca]);

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
    const enganchado = enganche(MUNDO, cercanos, proy, p, unidad);
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
      {/* Los que no tienen contorno, del gris de en medio: se ven sin gritar, y no se confunden
          con la marca —que va en tinta llena y es una circunferencia hueca, no un punto—. El radio
          va a escala del globo, como la costa. */}
      {diminutos.map((q, i) => <circle key={i} cx={q[0].toFixed(1)} cy={q[1].toFixed(1)} r={r / 100} fill="var(--t-ink3)" />)}
      {/* Trazo además de relleno: un país fino (Chile, Italia) desaparece si solo se rellena. */}
      <path d={mio} fill="var(--t-accent)" stroke="var(--t-accent)" strokeWidth={2.5} strokeLinejoin="round" />
      {punto?.[2] && <circle cx={punto[0]} cy={punto[1]} r={3.5} fill="var(--t-accent)" />}
      {/* La marca va encima y es trazo, mientras que la respuesta es relleno: así no pelean, y
          el acierto se lee solo —el contorno cae clavado sobre la forma verde— en vez de
          desaparecer debajo. */}
      <path d={trazo} fill="none" stroke="var(--t-ink)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {trazoPunto?.[2] && <circle cx={trazoPunto[0]} cy={trazoPunto[1]} r={6} fill="none" stroke="var(--t-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
      <circle r={r} fill="none" stroke="var(--t-rule2)" />
    </svg>
  );
}
