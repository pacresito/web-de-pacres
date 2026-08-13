// La cinta: en qué punto de la columna que miras estás. Puro: `npx tsx lib/arbol/cinta.test.ts`.
//
// Con el eje de izquierda a derecha, una generación es una columna y se recorre a lo alto:
// la más ancha mide 3.800 px de bloques y muchos más de personas, así que arrastrando se
// pierde la cuenta de cuánto queda por debajo. La cinta la lleva —un segmento por grupo de
// hermanos— y **no se toca**: llevar a un bloque ya lo hace la escala de familias, a un
// pellizco y con el nombre escrito, y aquí un segmento no llega ni a objetivo táctil.
//
// La unidad es el bloque en las dos escalas que la pintan: en la de personas, quien está en
// pantalla enciende el suyo. Así la cinta no cambia de significado al pellizcar.

import type { Bloque } from "./bloques";
import { ANCHO_COLUMNA } from "./layout";

/** Un grupo de hermanos de la columna que se está mirando. */
export interface Segmento {
  id: string;
  /** Tiene a alguien en pantalla: es donde estás. */
  aqui: boolean;
  /** Es el tuyo, esté o no en pantalla: el punto de vista es de uno de estos grupos. */
  tuyo: boolean;
}

/** Dónde mira la cámara y cuánto abarca, en coordenadas del árbol. */
export interface Mirada {
  x: number;
  y: number;
  alto: number;
}

/**
 * Los segmentos de la columna que cae bajo el centro de la pantalla, de arriba abajo.
 *
 * **El orden lo pone el lienzo y no el reparto en bloques**: los dos coinciden en la escala
 * de familias, pero en la de personas el layout coloca a cada uno donde le toca por su
 * ascendencia, así que ordenar por el reparto encendía segmentos sueltos por toda la cinta
 * para una pantalla que solo enseña a una familia. Por lo mismo, el bloque que no se está
 * dibujando no tiene segmento: la cinta mide lo que hay, no lo que habría desplegándolo todo.
 *
 * **Y solo cuando la columna no cabe**, como la brújula: con todos los segmentos encendidos
 * la cinta no dice en qué punto estás, dice que no hay ningún punto donde estar.
 */
export function cintaDe(
  bloques: Pick<Bloque, "id" | "nivel" | "esDelPuntoDeVista">[],
  /** De qué bloque es cada uno de los dibujados y a qué altura se ha dibujado. */
  dibujados: { bloque: string; y: number }[],
  { x, y, alto }: Mirada,
): Segmento[] {
  const nivel = Math.round(-x / ANCHO_COLUMNA);
  const columna = new Map(bloques.filter((b) => b.nivel === nivel).map((b) => [b.id, b]));
  const arriba = new Map<string, number>();
  const presentes = new Set<string>();
  for (const dibujado of dibujados) {
    if (!columna.has(dibujado.bloque)) continue;
    arriba.set(dibujado.bloque, Math.min(arriba.get(dibujado.bloque) ?? Infinity, dibujado.y));
    if (Math.abs(dibujado.y - y) <= alto / 2) presentes.add(dibujado.bloque);
  }
  if (arriba.size < 2 || presentes.size === arriba.size) return [];
  return [...arriba]
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => ({ id, aqui: presentes.has(id), tuyo: columna.get(id)!.esDelPuntoDeVista }));
}
