// La búsqueda: a quién se llega tecleando. Puro: `npx tsx lib/arbol/busqueda.test.ts`.
//
// Se busca sobre las dos líneas con las que cada uno aparece —el nombre con sus apellidos y
// de quién es—, no sobre el nombre a secas: a 55 personas el documento no les da apellido,
// así que hay gente a la que solo se llega por su familia y «hija de Antonia» tiene que
// encontrarla. Las dos vías no se mezclan: quien se llama así va antes que quien es hijo de
// alguien que se llama así.

import type { Grafo } from "./grafo";
import { contextoEntero, SIN_NOMBRE } from "./identidad";
import type { Apellidos } from "./personas";

/** Por dónde se ha llegado a alguien. Cada vía es un tramo de la lista, con su cabecera. */
export type Via = "nombre" | "familia" | "sin nombre";

/** El orden en que se leen los tramos, que es el de lo más literal a lo más indirecto. */
export const VIAS: Via[] = ["nombre", "familia", "sin nombre"];

export interface Resultado {
  id: string;
  via: Via;
}

export interface OpcionesBusqueda {
  /** Los apellidos ya resueltos contra el árbol: se busca por los deducidos igual que por los escritos. */
  linaje: Map<string, Apellidos>;
  /** Los pasos hasta el Centro: el único criterio de orden que existe para todo el mundo. */
  pasos: Map<string, number>;
}

export function buscar(g: Grafo, consulta: string, { linaje, pasos }: OpcionesBusqueda): Resultado[] {
  const buscadas = palabras(consulta);
  if (buscadas.length === 0) return [];

  const salida: Resultado[] = [];
  for (const [id, p] of g.personaPorId) {
    // «Sin nombre» no es un nombre sino la forma de escribir que el documento no lo daba, así
    // que no se busca ni en el propio ni en el de la familia: teclearlo devolvía a cuatro
    // personas que no se llaman así y a todo el que se casó con una de ellas.
    const suyo =
      p.nombre === SIN_NOMBRE ? "" : [p.nombre, ...otrosNombres(p.nombre), ...(linaje.get(id)?.todos ?? [])].join(" ");
    if (casan(buscadas, suyo)) salida.push({ id, via: "nombre" });
    else if (casan(buscadas, contextoEntero(g, id).replaceAll(SIN_NOMBRE, ""))) salida.push({ id, via: "familia" });
  }
  return ordenar(g, salida, pasos);
}

/** Las cuatro sin nombre, que es la única forma de llegar a ellas sin recorrer el árbol. */
export function losSinNombre(g: Grafo, { pasos }: OpcionesBusqueda): Resultado[] {
  const suyas = [...g.personaPorId.values()]
    .filter((p) => p.nombre === SIN_NOMBRE)
    .map((p) => ({ id: p.id, via: "sin nombre" as const }));
  return ordenar(g, suyas, pasos);
}

/**
 * Cuando no hay nada, la palabra de la consulta que sí encuentra a alguien —la más
 * específica de las que encuentran—. Teclear el apellido de quien no lo tiene escrito es el
 * callejón sin salida más fácil de este documento, y se sale de él quitando esa palabra.
 */
export function acortar(g: Grafo, consulta: string, o: OpcionesBusqueda): string | null {
  const crudas = consulta.split(SEPARADOR).filter((t) => t !== "");
  if (crudas.length < 2) return null;
  let mejor: { palabra: string; cuantos: number } | null = null;
  for (const palabra of crudas) {
    const cuantos = buscar(g, palabra, o).length;
    if (cuantos > 0 && (!mejor || cuantos < mejor.cuantos)) mejor = { palabra, cuantos };
  }
  return mejor?.palabra ?? null;
}

/** Cada palabra buscada tiene que empezar alguna del texto, que es como se teclea un nombre. */
function casan(buscadas: string[], texto: string): boolean {
  if (texto === "") return false;
  const suyas = palabras(texto);
  return buscadas.every((b) => suyas.some((s) => s.startsWith(b)));
}

/**
 * Los nombres que en esta familia son el mismo nombre, **y valen en los dos sentidos**: quien
 * busca «Pilar» quiere a Piluca y a Piluquita, y quien busca «Piluca» quiere a las Pilar.
 *
 * **Van por el nombre entero y no por palabras sueltas.** Con «josé» valiendo como palabra,
 * teclear «Pepe» sacaba también a las tres María José, que de Pepe no tienen nada; y el
 * compuesto se escribe entero —«maría josé»— cuando es él el que tiene otro nombre.
 *
 * Solo entran los que el castellano da por equivalentes, el hipocorístico de siempre: el apodo
 * de una persona no es otro nombre suyo, es una nota, y adivinar de dónde sale acaba llevando
 * a alguien a la ficha de otro. Un grupo cuyos nombres no lleve nadie del árbol sobra, y su
 * test lo dice.
 */
export const IGUALES: string[][] = [
  ["javier", "javi"],
  ["santiago", "santi"],
  ["daniel", "dani"],
  ["francisco", "paco", "fran"],
  ["francisca", "paqui", "paquita", "pacita"],
  ["dolores", "lola"],
  ["maria dolores", "marilo"],
  ["pilar", "piluca", "piluquita"],
  ["jose", "pepe"],
  ["maria jose", "marijose"],
  ["maria luisa", "marilu"],
  ["maria del carmen", "mamen"],
  ["montserrat", "montse"],
  ["magdalena", "magda"],
  ["manuel", "manolo"],
  ["concepcion", "concha", "conchita"],
  ["ignacio", "nacho"],
  ["gregorio", "goyo"],
  ["juana", "juani"],
  ["yolanda", "yoli"],
  ["mercedes", "merche"],
  ["antonia", "toni"], // «Toñi» pierde la eñe al normalizar y cae aquí sola
  ["roberto", "rober"],
  ["gabriel", "gabi"],
  ["maravillas", "mavi"],
  ["ascension", "chon"],
  ["catalina", "catina"],
];

/**
 * Y los que solo valen hacia un lado: **quien teclea el primero encuentra también al segundo,
 * y no al revés**. Carmiña es una Carmen y quien busca «Carmen» la quiere; quien escribe
 * «Carmiña» está buscando a una persona, no a las otras cuatro.
 */
export const TAMBIEN_ENCUENTRA: [string, string][] = [["carmen", "carmina"]];

/** Por qué otros nombres se llega a quien se llama así. Se arma una vez, al cargar el módulo. */
const POR_NOMBRE = new Map<string, string[]>();
for (const grupo of IGUALES) for (const suyo of grupo) POR_NOMBRE.set(suyo, grupo.filter((n) => n !== suyo));
for (const [buscado, encontrado] of TAMBIEN_ENCUENTRA) {
  POR_NOMBRE.set(encontrado, [...(POR_NOMBRE.get(encontrado) ?? []), buscado]);
}

/** Los otros nombres de quien se llama así, ya normalizados: se buscan como si fueran suyos. */
export const otrosNombres = (nombre: string): string[] => POR_NOMBRE.get(normalizar(nombre)) ?? [];

/** Sin tildes, sin mayúsculas y con un solo espacio: la forma en que se escriben las tablas. */
const normalizar = (nombre: string): string => palabras(nombre).join(" ");

/** Todo lo que no es letra ni número separa: así «(1902)» es una palabra y el año se busca. */
const SEPARADOR = /[^\p{L}\p{N}]+/u;

/** Sin tildes y en minúsculas: quien busca «muñoz» y quien busca «munoz» buscan lo mismo. */
const palabras = (texto: string): string[] =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(SEPARADOR)
    .filter((t) => t !== "");

/** Primero quien se llama así y luego quien es de esa familia; dentro de cada tramo, cercanía. */
function ordenar(g: Grafo, resultados: Resultado[], pasos: Map<string, number>): Resultado[] {
  const cerca = porCercania(g, pasos);
  return resultados.sort((a, b) => VIAS.indexOf(a.via) - VIAS.indexOf(b.via) || cerca(a.id, b.id));
}

/**
 * El orden de cualquier lista de gente del árbol: la distancia al Centro, que es el único
 * criterio que existe para todo el mundo —cuatro de cada diez no traen ningún año con el que
 * ordenarlos—. El nombre y el id solo desempatan, para que la lista no baile.
 */
export function porCercania(g: Grafo, pasos: Map<string, number>): (a: string, b: string) => number {
  const lejos = (id: string) => pasos.get(id) ?? Number.MAX_SAFE_INTEGER;
  const nombre = (id: string) => g.personaPorId.get(id)?.nombre ?? "";
  return (a, b) => lejos(a) - lejos(b) || nombre(a).localeCompare(nombre(b), "es") || a.localeCompare(b);
}
