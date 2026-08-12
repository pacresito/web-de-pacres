// Cómo se llama cada persona desde el punto de vista: hermanos, tíos segundos, sobrinos…
// Puro: `npx tsx lib/arbol/parentesco.test.ts`.
//
// El término sale del ancestro común más cercano: `k` es a qué altura queda del punto de
// vista y `j` a qué altura de la otra persona. Con eso, el hijo de un primo hermano sale
// «sobrino segundo», que es como lo dice la familia. Los ordinales llegan hasta el
// segundo —los primos, hasta el tercero—; pasado el tope el cajón conserva el término
// base y suelta el ordinal: «otros sobrinos».

import { ascendientes, descendientes, parejaDirecta, pasosDesde, type Grafo } from "./grafo";

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

const CUANTAS = ["", "una", "dos", "tres", "cuatro", "cinco", "seis"];

/**
 * A qué altura del punto de vista queda alguien, contado en generaciones y no en pasos. Es
 * lo que se dice cuando no hay término: la ficha lo pone debajo del nombre y el índice
 * encabeza con él cada tramo de la fila.
 */
export function escribirNivel(nivel: number): string {
  if (nivel === 0) return "tu generación";
  const cuantas = Math.abs(nivel);
  const escrita = CUANTAS[cuantas] ?? String(cuantas);
  return `${escrita} ${cuantas === 1 ? "generación" : "generaciones"} por ${nivel > 0 ? "encima" : "debajo"}`;
}

// --- La relación con uno solo, tal como la lee la ficha ---

/**
 * Cuando la lengua no da término. **No tener palabra no es no ser familia**, y siguen siendo
 * dos casos: quien comparte sangre es pariente por lejos que quede, y quien no la comparte
 * está ahí por la pareja de alguien. La distancia exacta la da el nivel, que va debajo.
 */
export const parienteLejano = (mujer: boolean): string => `Es tu pariente ${mujer ? "lejana" : "lejano"}`;
export const FAMILIA_POLITICA = "Es de tu familia política";

export interface Relacion {
  /** Ya declinada y lista para leer: «Es tu prima», «Es la pareja de tu tío». */
  frase: string;
  /** Eslabones de familia hasta el punto de vista: un padre, un hijo, un hermano, una pareja. */
  pasos: number;
  /** Generación relativa al punto de vista, como en el layout: los padres +1. */
  nivel: number;
}

/**
 * Lo que la ficha dice arriba del todo, para todo el árbol de una vez. El panel reparte a
 * la familia en cajones y aquí hay que nombrar a uno solo, así que los cajones no sirven
 * tal cual: **de quien entró casándose se dice de quién es pareja**, que es lo que lo ata
 * a la familia, y solo cuando ni por ahí hay palabra se cae en la distancia.
 */
export function relacionesDesde(g: Grafo, pov: string): Map<string, Relacion> {
  const cajones = parentescos(g, pov);
  const pasos = pasosDesde(g, pov);
  // La familia de la pareja no comparte sangre con nadie y se quedaría entera sin palabra:
  // se la nombra desde ella, que es de donde le viene el parentesco.
  const politica = [...parejaDirecta(g, pov)].map((id) => parentescos(g, id));
  const salida = new Map<string, Relacion>();
  for (const [id, { termino, nivel }] of cajones) {
    salida.set(id, { frase: fraseDe(g, cajones, politica, pov, id, termino), pasos: pasos.get(id)!, nivel });
  }
  return salida;
}

/**
 * Los dos cajones no son palabras, y «otros sobrinos» tampoco: es el término al que se le
 * ha caído el ordinal porque nadie lo usa, y en singular diría de alguien que es «tu otro
 * sobrino», que no significa nada.
 */
const sinPalabra = (termino: string): boolean =>
  termino === PAREJAS || termino === SIN_PARENTESCO || termino.startsWith("otros ");

function fraseDe(
  g: Grafo,
  cajones: Map<string, Parentesco>,
  politica: Map<string, Parentesco>[],
  pov: string,
  id: string,
  termino: string,
): string {
  if (id === pov) return "Eres tú";
  if (!sinPalabra(termino)) return `Es tu ${unaSola(g, id, termino)}`;
  if (termino === PAREJAS) {
    const suyas = parejaDirecta(g, id);
    if (suyas.has(pov)) return "Es tu pareja";
    for (const otro of suyas) {
      const suyo = cajones.get(otro)?.termino;
      if (suyo && !sinPalabra(suyo)) return `Es la pareja de tu ${unaSola(g, otro, suyo)}`;
    }
  }
  // La sangre no se nombra con una palabra prestada: al sobrino al que se le ha caído el
  // ordinal se le llama pariente, aunque además sea sobrino de la pareja.
  if (termino === PAREJAS || termino === SIN_PARENTESCO) return deLaPareja(g, politica, id) ?? FAMILIA_POLITICA;
  return parienteLejano(esMujer(g, id));
}

/** Quien entra por la pareja lleva su parentesco: «Es la abuela de tu pareja». */
function deLaPareja(g: Grafo, politica: Map<string, Parentesco>[], id: string): string | null {
  for (const suyos of politica) {
    const termino = suyos.get(id)?.termino;
    if (!termino || sinPalabra(termino)) continue;
    return `Es ${esMujer(g, id) ? "la" : "el"} ${unaSola(g, id, termino)} de tu pareja`;
  }
  return null;
}

/** Sin sexo en el dato manda el masculino, que es lo que la lengua hace con lo que no sabe. */
const esMujer = (g: Grafo, id: string): boolean => g.personaPorId.get(id)?.sexo === "m";

const unaSola = (g: Grafo, id: string, termino: string): string => declinar(termino, 1, esMujer(g, id) ? 1 : 0);

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
