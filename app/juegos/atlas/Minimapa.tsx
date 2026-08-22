"use client";

import { useMemo } from "react";
import { MUNDO } from "@/data/atlas/mundo";
import { pathDelPlano, plano, type Marco } from "@/lib/atlas/plano";

/**
 * El minimapa de la ficha: el continente entero con el país resaltado. Es lo que enseña la
 * ubicación sin añadir un dato más que memorizar ni un reloj que atender — y como recorre los
 * países en el orden del barrido, verlo moverse por el mapa **es** el barrido.
 *
 * Va en el sitio que en la tarjeta ocupa el globo, y cuenta lo otro: el globo dice cuánto mide
 * el país y en qué parte del mundo cae; el minimapa, quiénes son sus vecinos.
 */
export default function Minimapa({ id, marco, lon, lat }: {
  id: string; marco: Marco; lon: number; lat: number;
}) {
  const { w, h } = plano(marco);
  // El fondo es el mundo entero y solo depende del marco: mientras no se cambie de continente,
  // pasar de país no lo recorre otra vez. El país va encima, así que no hay que descontarlo.
  const fondo = useMemo(() => pathDelPlano(MUNDO.map((a) => a.r), marco), [marco]);
  const mio = useMemo(() => pathDelPlano(MUNDO.filter((a) => a.id === id).map((a) => a.r), marco), [marco, id]);
  const punto = mio ? null : plano(marco).xy(lon, lat);

  // Va sin fondo ni marco: el globo de la tarjeta sí lleva su círculo de papel, pero un círculo
  // se lee como el planeta y un rectángulo solo se lee como una caja gris. El dibujo se centra
  // en la celda que le toque, que es del mismo alto que la de la silueta — las dos figuras se
  // comparan mal si cada una mide lo suyo.
  //
  // Por eso la tierra y el agua se separan **rellenando la tierra**, no pintando el agua: el
  // relleno es el mismo tono que en el globo y el mar lo pone el papel de la página, así que
  // los continentes se leen sin que aparezca la caja.
  return (
    <svg viewBox={`0 0 ${w.toFixed(2)} ${h}`} preserveAspectRatio="xMinYMid meet" style={{ width: "100%", aspectRatio: 1 }} aria-hidden>
      <path d={fondo} fill="var(--t-rule2)" stroke="var(--t-ink4)" strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Trazo además de relleno: un país fino se queda en nada si solo se rellena, y a esta
          escala casi todos lo son. */}
      <path d={mio} fill="var(--t-accent)" stroke="var(--t-accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {/* Los diminutos no están en el mapa de baja resolución: a esta escala un punto es
          exactamente lo que son. */}
      {punto && <circle cx={punto[0]} cy={punto[1]} r={w / 55} fill="var(--t-accent)" />}
    </svg>
  );
}
