// El puente entre el motor y el dibujo: la luz, las cajas y los ayudantes de todo `calle/`.
//
// **Los ids no se tocan:** son lo que guarda cada visita. El dibujo se puede rehacer entero;
// al hacerlo, repasar las visibilidades de `escena.ts`.
import type { NivelObjeto } from "../escena";
import { CAJAS, LIENZO, PIEZAS, TIENDA, css, esNoche, luzDe, mezcla, tenir } from "../render";
import type { Cajas, Luz, Oklch, Vista } from "../render";

export { CAJAS, LIENZO, PIEZAS, TIENDA, css, esNoche, luzDe, mezcla, tenir };
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

/** Las piezas que se pintan a esta hora, en orden de profundidad y con su nivel. */
export function enEscena(niveles: NivelObjeto[], hora: number): { id: string; p: Pieza; n: number }[] {
  const nivel = new Map(niveles.map((x) => [x.id, x.nivel]));
  return Object.entries(PIEZAS)
    .filter(([, p]) => visible(p, hora))
    .map(([id, p]) => ({ id, p, n: nivel.get(id) ?? 0 }));
}

/** Aleatorio determinista a partir de un entero. Nunca `Math.random()` al pintar: cada
 *  repintado cambiaría algo que el diff no conoce, y se tomaría por una diferencia. */
export function azar(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Matriz de Bayer 4×4 → umbral 0..1: todo el sombreado es densidad de puntos. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const trama = (x: number, y: number) => BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] / 16;
