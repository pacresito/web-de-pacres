// Destinos compatibles que no están en el viaje pero quedan a un desvío pequeño de la ruta
// y aportan un tipo que el viaje no tiene. Sugerencias: nunca cambian el plan solas.
import type { Destino } from "../tipos";
import { tiempoCoche, seg2min, vecinoMasCercano, type MatrizViajes } from "../geo";

export type Oportunidad = { destino: Destino; desvioMin: number };

export type OpcionesOportunidad = {
  desvioMaxMin?: number;
  max?: number;
};

const DESVIO_MAX_MIN = 15;
const MAX_OPORTUNIDADES = 3;

// La ruta se reconstruye como la del panel para medir el desvío contra lo mismo.
export function oportunidades(
  seleccion: Destino[],
  candidatas: Destino[],
  matriz: MatrizViajes,
  opts: OpcionesOportunidad = {},
): Oportunidad[] {
  const desvioMax = opts.desvioMaxMin ?? DESVIO_MAX_MIN;
  const max = opts.max ?? MAX_OPORTUNIDADES;

  const enRuta = (d: Destino) => d.gps != null && matriz.ids.includes(d.slug);
  const cadena = vecinoMasCercano(matriz, seleccion.filter(enRuta).map((d) => d.slug)).orden;
  if (cadena.length === 0) return [];

  const tiposElegidos = new Set(seleccion.map((d) => d.tipo));
  const yaElegido = new Set(seleccion.map((d) => d.slug));

  return candidatas
    .filter((d) => enRuta(d) && !yaElegido.has(d.slug) && !tiposElegidos.has(d.tipo))
    .map((d) => ({ destino: d, desvioMin: desvioDe(d.slug, cadena, matriz) }))
    .filter((o) => o.desvioMin <= desvioMax)
    .sort((a, b) => a.desvioMin - b.desvioMin)
    .slice(0, max);
}

// Coche extra por añadir `slug`: lo menor entre insertarlo en un tramo y colgarlo de un
// extremo con ida y vuelta.
function desvioDe(slug: string, cadena: string[], matriz: MatrizViajes): number {
  const t = (a: string, b: string) => seg2min(tiempoCoche(matriz, a, b));
  const extremos = [
    2 * t(cadena[0], slug),
    2 * t(cadena[cadena.length - 1], slug),
  ];
  const inserciones = cadena
    .slice(0, -1)
    .map((a, i) => t(a, slug) + t(slug, cadena[i + 1]) - t(a, cadena[i + 1]));
  return Math.min(...extremos, ...inserciones);
}
