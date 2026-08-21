// El recorrido geográfico de Atlas: por continente, y dentro de cada uno en barrido en S —de
// norte a sur por filas, cada fila al contrario que la anterior—. Es a la vez el orden de la
// pestaña explorar y el de entrada de países nuevos, para que lo nuevo caiga al lado de lo visto.
//
// Los continentes van de lo lejano a lo cercano: lo cercano se aprende solo.
//
// BORRADOR de scripts/build-atlas-orden.mts, hecho para RETOCARSE A MANO — la geografía de
// verdad no cabe en una regla de bandas. Volver a correr el script pisa los retoques: mirar el
// diff antes de quedárselo.
import type { Continente } from "@/lib/atlas/paises";

/** El marco del minimapa del continente: [lon0, lat0, lon1, lat1]. */
export type Marco = [number, number, number, number];

export const ORDEN: { continente: Continente; marco: Marco; paises: string[] }[] = [
  { continente: "África", marco: [-19, -36, 52, 38], paises: ["ma"] },
  { continente: "América del Sur", marco: [-82, -56, -34, 13], paises: ["cl"] },
  { continente: "Europa", marco: [-25, 34, 60, 72], paises: ["no", "ru", "it", "mc", "fr", "es", "pt", "mt"] },
];

/** El recorrido entero, sin continentes: el orden en que entran los países nuevos. */
export const RECORRIDO = ORDEN.flatMap((g) => g.paises);
