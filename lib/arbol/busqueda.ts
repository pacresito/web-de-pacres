// La búsqueda: a quién se llega tecleando. Puro: `npx tsx lib/arbol/busqueda.test.ts`.
//
// Se busca sobre las dos líneas con las que cada uno aparece —el nombre con sus apellidos y
// de quién es—, no sobre el nombre a secas: a 55 personas el documento no les da apellido,
// así que hay gente a la que solo se llega por su familia y «hija de Antonia» tiene que
// encontrarla. Las dos vías no se mezclan: quien se llama así va antes que quien es hijo de
// alguien que se llama así.
//
// **Y no hay tabla de sinónimos.** La hubo, con veintisiete grupos de nombres que en esta
// familia eran el mismo —«pepe» con «josé», «paco» con «francisco»—, y se fue entera cuando el
// documento aprendió a guardar los dos nombres de cada uno. Una equivalencia escrita por
// nombres vale para todo el que se llame así, y por eso teclear «Paco» sacaba a cuatro
// Francisco a los que nadie llama Paco: lo que dos nombres tienen en común es de la persona
// que los lleva y va en su `apodos`. **No volver a abrirla.**

import type { Grafo } from "./grafo";
import { contextoEntero, SIN_NOMBRE } from "./identidad";
import { comoSeLlama, type Apellidos } from "./personas";

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
    // **Se busca por los dos nombres**, se esté enseñando el que se esté enseñando: quien
    // teclea «José Gerardo» y quien teclea «Pepe» buscan al mismo, y el interruptor de la
    // hoja decide cómo se lee la lista, no a quién se llega.
    const suyo =
      p.nombre === SIN_NOMBRE ? "" : [p.nombre, ...(p.apodos ?? []), ...(linaje.get(id)?.todos ?? [])].join(" ");
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
  const nombre = (id: string) => {
    const p = g.personaPorId.get(id);
    return p ? comoSeLlama(p, "familiar") : "";
  };
  return (a, b) => lejos(a) - lejos(b) || nombre(a).localeCompare(nombre(b), "es") || a.localeCompare(b);
}
