// Cómo se llama cada persona desde el punto de vista: hermanos, tíos segundos, sobrinos…
// Puro: `npx tsx lib/arbol/parentesco.test.ts`.
//
// El término sale del ancestro común más cercano: `k` es a qué altura queda del punto de
// vista y `j` a qué altura de la otra persona. Con eso, el hijo de un primo hermano sale
// «sobrino segundo», que es como lo dice la familia. Los ordinales llegan hasta el
// segundo —los primos, hasta el tercero—; pasado el tope el cajón conserva el término
// base y suelta el ordinal: «otros sobrinos».

import { ascendientes, descendientes, parejaDirecta, type Grafo } from "./grafo";

/** Los dos cajones de quien no tiene término propio, al final de su fila y en este orden. */
export const PAREJAS = "parejas";
export const SIN_PARENTESCO = "sin parentesco";

/** Más lejos que cualquier ancestro común real: los cajones cierran la fila. */
const ORDEN_CAJON = 100;

export interface Parentesco {
  /** Generación relativa al punto de vista, como en el layout: los padres +1. */
  nivel: number;
  /** El cajón, en masculino plural: se declina al pintarlo, según quién caiga dentro. */
  termino: string;
  /** Altura del ancestro común desde el punto de vista: ordena la fila hacia fuera. */
  orden: number;
}

/**
 * A cada uno su cajón. Quien no comparte sangre va a `parejas` si es cónyuge de quien sí
 * la comparte, y a `sin parentesco` si ni eso —la política de la política, que solo entra
 * en el lienzo con el filtro levantado—.
 */
export function parentescos(g: Grafo, pov: string): Map<string, Parentesco> {
  const genPov = g.generacion.get(pov);
  if (genPov === undefined) throw new Error(`Punto de vista desconocido: ${pov}.`);
  const nivelDe = (id: string) => genPov - g.generacion.get(id)!;

  // El ancestro común más cercano de cada uno: se sube por la línea directa y cada
  // ancestro reclama a la descendencia que nadie más cercano haya reclamado ya.
  const alturaDelComun = new Map<string, number>();
  for (const a of [pov, ...ascendientes(g, pov)].sort((x, y) => nivelDe(x) - nivelDe(y))) {
    const k = nivelDe(a);
    for (const d of [a, ...descendientes(g, a)]) if (!alturaDelComun.has(d)) alturaDelComun.set(d, k);
  }

  const salida = new Map<string, Parentesco>();
  for (const id of g.personaPorId.keys()) {
    const nivel = nivelDe(id);
    // El punto de vista no es un caso especial: se cuenta entre sus propios hermanos.
    const k = id === pov ? 1 : alturaDelComun.get(id);
    if (k === undefined) {
      const pareja = [...parejaDirecta(g, id)].some((p) => alturaDelComun.has(p));
      const termino = pareja ? PAREJAS : SIN_PARENTESCO;
      salida.set(id, { nivel, termino, orden: ORDEN_CAJON + (pareja ? 0 : 1) });
      continue;
    }
    salida.set(id, { nivel, termino: terminoDe(k, k - nivel), orden: k });
  }
  return salida;
}

const ASCENDENCIA = ["padres", "abuelos", "bisabuelos", "tatarabuelos"];
const DESCENDENCIA = ["hijos", "nietos", "bisnietos", "tataranietos"];
const ORDINALES = ["", "", "segundos", "terceros"];

/**
 * La regla entera, en masculino plural: `k` es a qué altura del punto de vista queda el
 * ancestro común y `j` a qué altura de la otra persona. Declinarlo es cosa de pintarlo.
 */
export function terminoDe(k: number, j: number): string {
  if (j === 0) return grado(ASCENDENCIA, k);
  if (k === 0) return grado(DESCENDENCIA, j);
  if (k === j) return k === 1 ? "hermanos" : conOrdinal("primos", k - 1, 3);
  if (j < k) return conOrdinal(compuesto("tíos", ASCENDENCIA, k - j), j, 2);
  return conOrdinal(compuesto("sobrinos", DESCENDENCIA, j - k), k, 2);
}

/**
 * Padres, abuelos, bisabuelos… La lengua se queda sin palabras antes que el árbol, así
 * que el último grado con nombre se queda con lo que venga por detrás. Cada generación es
 * una fila aparte, así que dos filas seguidas pueden llamarse igual, pero ninguna miente
 * sobre a quién trae.
 */
const grado = (tabla: string[], n: number) => tabla[Math.min(n, tabla.length) - 1];

/** Tíos abuelos, sobrinos nietos: el término base más el grado que los separa del directo. */
const compuesto = (base: string, tabla: string[], d: number) => (d === 1 ? base : `${base} ${grado(tabla, d)}`);

/** Pasado el tope no hay ordinal que nadie use, y el cajón se queda con el término base. */
function conOrdinal(base: string, n: number, tope: number): string {
  if (n <= 1) return base;
  return n <= tope ? `${base} ${ORDINALES[n]}` : `otros ${base}`;
}

const IRREGULARES: Record<string, string> = { padre: "madre" };

/**
 * El término tal como se lee en el panel: en singular si el cajón tiene uno solo y en
 * femenino si todas son mujeres —un grupo mixto va en masculino, como la lengua—. «Sin
 * parentesco» no es un parentesco sino su falta: no se declina.
 */
export function declinar(termino: string, cuantos: number, mujeres: number): string {
  if (termino === SIN_PARENTESCO) return termino;
  const femenino = mujeres === cuantos;
  return termino
    .split(" ")
    .map((palabra) => {
      let base = palabra.endsWith("es") ? palabra.slice(0, -2) + "e" : palabra.endsWith("s") ? palabra.slice(0, -1) : palabra;
      if (femenino) base = IRREGULARES[base] ?? (base.endsWith("o") ? base.slice(0, -1) + "a" : base);
      return cuantos === 1 ? base : `${base}s`;
    })
    .join(" ");
}
