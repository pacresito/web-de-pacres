// Los trazos del lienzo, en coordenadas del árbol: por dónde va cada línea entre dos
// recuadros. Puro: `npx tsx lib/arbol/trazos.test.ts`.
//
// Vive aquí y no en el componente porque **es geometría, no dibujo**: `layout.ts` dice
// dónde cae cada nodo y esto dice cómo se llega de uno a otro, sin saber de color, de grosor
// ni de tema. Y porque un trazo que arranca donde no debe se ve raro pero no falla: el
// camino se pintó saliendo de unos padres por los que no pasaba hasta que alguien lo miró.

import { ALTO_NODO, RADIO_SALTO, type Vinculo } from "./layout";

export type Hijo = Vinculo["hijos"][number];

/** A qué altura corre el trazo de un hijo: la suya, salvo el recto, que va a la de la unión. */
export const alturaDe = (v: Vinculo, h: Hijo): number => (h.recto ? v.y : h.y);

/**
 * Un tramo horizontal hacia la derecha que salta por encima de los trazos que se cruza:
 * sin el saltito, un cruce y una bifurcación hacia dos hijos se dibujan igual.
 */
export function horizontal(hasta: number, y: number, saltos: number[]): string {
  const arcos = saltos.map((x) => `H ${x - RADIO_SALTO} A ${RADIO_SALTO} ${RADIO_SALTO} 0 0 1 ${x + RADIO_SALTO} ${y}`);
  return [...arcos, `H ${hasta}`].join(" ");
}

/**
 * El trazo de una unión a uno de sus hijos: sale del ancla, baja por el canal y muere en el
 * borde del hijo. Con `desdeY` arranca a esa altura del canal en vez de en el ancla, que es
 * el trozo que apunta a los padres: de hermano a hermano se pasa por el canal y no por
 * ellos, así que el trazo ni sale del ancla ni sube más allá del otro hermano. **El hijo
 * recto también tiene su tramo de ancla**, escondido dentro de su horizontal en vez de en un
 * tramo propio: sin cortarlo ahí, bastaba con desplegar a un hermano —que lo pone a la
 * altura de la unión y lo vuelve recto— para que el camino se pintase saliendo de unos
 * padres por los que no pasa.
 */
export function bajada(v: Vinculo, h: Hijo, desdeY?: number): string {
  const borde = h.x - h.ancho / 2;
  const y = alturaDe(v, h);
  if (desdeY === undefined) {
    if (h.recto) return `M ${v.x} ${v.y} ${horizontal(borde, y, h.saltos)}`;
    return `M ${v.x} ${v.y} ${horizontal(v.canal, v.y, v.saltos)} V ${y} ${horizontal(borde, y, h.saltos)}`;
  }
  // Los saltos de antes del canal se van con el tramo que los traía: pintarlos desde aquí
  // haría retroceder al trazo hasta buscarlos.
  const arranque = desdeY === y ? `M ${v.canal} ${y}` : `M ${v.canal} ${desdeY} V ${y}`;
  return `${arranque} ${horizontal(borde, y, h.saltos.filter((x) => x > v.canal))}`;
}

/**
 * El layout da los centros de los dos miembros de una pareja y el trazo se queda en el hueco
 * que hay entre ellos: los nodos llevan la opacidad de su generación, así que lo que cruzara
 * por debajo se leería a través del recuadro como si lo atravesara.
 */
export const entreBordes = ([a, b]: [number, number]): [number, number] =>
  a < b ? [a + ALTO_NODO / 2, b - ALTO_NODO / 2] : [a - ALTO_NODO / 2, b + ALTO_NODO / 2];

// El trazo de los novios muere en el corazón, que por arriba es el escote y por abajo el
// pico. A la misma distancia de los dos quedaba despegado.
export const ESCOTE = 2.7;
export const PICO = 5.5;

/**
 * En qué tramos se parte el trazo de una pareja y dónde queda su centro. Solo se parte el de
 * los novios, para dejarle su hueco al corazón; el matrimonio va de una pieza.
 */
export function tramosDePareja(extremos: [number, number], conCorazon: boolean) {
  const [arriba, abajo] = [...extremos].sort((a, b) => a - b);
  const centro = (arriba + abajo) / 2;
  const tramos: [number, number][] = conCorazon
    ? [
        [arriba, centro - ESCOTE],
        [centro + PICO, abajo],
      ]
    : [[arriba, abajo]];
  return { tramos, centro };
}

/**
 * Dónde muere la mitad del trazo de pareja que sí es camino: en el ancla del reparto, o en
 * el borde del corazón si fueron novios. De ahí a la otra mitad no se pasa —esa va a su
 * pareja—, y por eso la mitad se dibuja y no el trazo entero.
 */
export const hastaElAncla = (borde: number, ancla: number, conCorazon: boolean): number =>
  !conCorazon ? ancla : borde < ancla ? ancla - ESCOTE : ancla + PICO;
