// Detección de oportunidades (Fase F3, §4.6 y §1.11): sobre la ruta ya montada, busca
// destinos compatibles que NO están en el viaje pero pasan muy cerca —desvío de coche
// pequeño— y aportan algo distinto («un mirador a pocos minutos», «un pueblo con encanto
// próximo»). Priorizar, no descartar: son sugerencias «Ya que pasáis cerca de X…»; nunca
// alteran el plan solas (la UI las pinta aparte con «Añadir»). Puro. Test al lado.
//
// Recibe la SELECCIÓN (no una cadena de slugs ya montada) porque necesita dos cosas de
// cada destino elegido: su slug —para medir el desvío contra la ruta reconstruida con
// `cadenaVecinos`, la misma que usa el panel— y su `tipo` —para el criterio de que la
// oportunidad sea «diferenciada» (aporta un tipo que el viaje aún no tiene)—.
import type { Destino } from "../tipos";
import { tiempoCoche, seg2min, type MatrizViajes } from "../planificador/geo";
import { cadenaVecinos } from "../viaje/mi-viaje";

// Destino que enriquece el viaje sin desviarlo apenas. `desvioMin` = minutos de coche
// extra por incluirlo en la ruta (el mínimo entre encajarlo en un tramo o colgarlo de un
// extremo, ida y vuelta); la UI compone «Ya que pasáis cerca de {destino.nombre}…».
export type Oportunidad = { destino: Destino; desvioMin: number };

export type OpcionesOportunidad = {
  desvioMaxMin?: number; // desvío máximo aceptable para considerarlo «de paso»
  max?: number;          // tope de oportunidades mostradas (no saturar el panel)
};

const DESVIO_MAX_MIN = 15; // «a pocos minutos» de la ruta; el resto ya es otro viaje
const MAX_OPORTUNIDADES = 3;


// Selección + candidatas compatibles no elegidas → oportunidades ordenadas por desvío
// creciente. Vacío si no hay ruta que medir (nada seleccionado con GPS) o nada cerca y
// diferenciado. Solo entran destinos rutables (con GPS y en la matriz): sin coordenada no
// hay desvío que calcular.
export function oportunidades(
  seleccion: Destino[],
  candidatas: Destino[],
  matriz: MatrizViajes,
  opts: OpcionesOportunidad = {},
): Oportunidad[] {
  const desvioMax = opts.desvioMaxMin ?? DESVIO_MAX_MIN;
  const max = opts.max ?? MAX_OPORTUNIDADES;

  const enRuta = (d: Destino) => d.gps != null && matriz.ids.includes(d.slug);
  const cadena = cadenaVecinos(seleccion.filter(enRuta).map((d) => d.slug), matriz);
  if (cadena.length === 0) return [];

  // «Diferenciada»: aporta un tipo que el viaje aún no tiene (§1.11: surge lo que el
  // usuario no pidió pero enriquece). Evita proponer «otra cascada más» sobre un viaje ya
  // lleno de cascadas —que no sería problema (§4.7), pero tampoco una oportunidad—.
  const tiposElegidos = new Set(seleccion.map((d) => d.tipo));
  const yaElegido = new Set(seleccion.map((d) => d.slug));

  return candidatas
    .filter((d) => enRuta(d) && !yaElegido.has(d.slug) && !tiposElegidos.has(d.tipo))
    .map((d) => ({ destino: d, desvioMin: desvioDe(d.slug, cadena, matriz) }))
    .filter((o) => o.desvioMin <= desvioMax)
    .sort((a, b) => a.desvioMin - b.desvioMin)
    .slice(0, max);
}

// Minutos de coche extra por añadir `slug` a la ruta: el menor entre encajarlo en algún
// tramo (coste de inserción) y colgarlo de un extremo como ida y vuelta. Con una sola
// parada, no hay tramos: solo la ida y vuelta desde ella.
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
