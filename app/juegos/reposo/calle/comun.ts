// El puente entre el motor y el dibujo: la luz, las cajas del catálogo y los cuatro ayudantes
// que usan todos los módulos de `calle/`.
//
// **Lo que ningún dibujo puede tocar:** los 24 ids. Son lo que archivan las crónicas, así que
// la calle se puede repintar entera —incluso después de publicar— sin que ninguna partida
// pasada mienta. Lo que sí cambia con el dibujo es cuánto canta cada cambio, y eso se repasa
// en las 24 visibilidades de `escena.ts`.
import type { NivelObjeto } from "../escena";
import { CAJAS, LIENZO, PIEZAS, css, esNoche, luzDe, mezcla, tenir } from "../render";
import type { Cajas, Luz, Oklch, Vista } from "../render";

export { CAJAS, LIENZO, PIEZAS, css, esNoche, luzDe, mezcla, tenir };
export type { Cajas, Luz, Oklch, Vista };

export type Pieza = (typeof PIEZAS)[string];
export type Ctx = CanvasRenderingContext2D;

export const ACERA = 640; // borde alto de la acera, en el lienzo de 1600×900
export const SUELO = 700; // donde la acera se convierte en asfalto

function visible(p: Pieza, hora: number): boolean {
  if (!p.franja) return true;
  const h = ((hora % 24) + 24) % 24;
  return h >= p.franja[0] && h < p.franja[1];
}

/** Las piezas que toca pintar a esta hora, en el orden de PIEZAS —que es el de profundidad—,
 *  cada una con su nivel. Lo que no se pinta conserva su zona sensible: de eso se encarga
 *  `zonas()`, que no mira la hora. */
export function enEscena(niveles: NivelObjeto[], hora: number): { id: string; p: Pieza; n: number }[] {
  const nivel = new Map(niveles.map((x) => [x.id, x.nivel]));
  return Object.entries(PIEZAS)
    .filter(([, p]) => visible(p, hora))
    .map(([id, p]) => ({ id, p, n: nivel.get(id) ?? 0 }));
}

/** Aleatorio determinista a partir de un entero: el mismo adorno en el mismo sitio en cada
 *  repintado. Un `Math.random()` en el pintado haría parpadear la calle al mover la hora, y
 *  peor: sería un cambio que el diff no conoce y que el jugador señalaría. */
export function azar(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Matriz de Bayer 4×4 → umbral 0..1. Todo el sombreado de la calle sale de aquí: en un medio
 *  sin medias tintas, una sombra suave es densidad de puntos. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const trama = (x: number, y: number) => BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] / 16;
