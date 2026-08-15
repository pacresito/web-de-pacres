// Cómo se llama y cómo se ordena una persona. Puro: `npx tsx lib/arbol/personas.test.ts`.

import { ascendientes, type Grafo } from "./grafo";
import type { Persona } from "./tree";

/**
 * Cuántos apellidos se pintan, para todo el mundo. `"nuevos"` los enseña solo a quien los
 * estrena en su línea, porque el resto se leen subiendo.
 */
export type ModoApellidos = "nuevos" | 0 | 1 | 2;

/**
 * Uno para todos. Es de lo poco que llena el nodo sin pedirle nada a quien mira: el primer
 * apellido dice de qué rama es cada uno, y leerlo subiendo por el árbol —que es lo que
 * ahorra `"nuevos"`— es trabajo que solo hace quien ya sabe cómo está montado esto.
 */
export const APELLIDOS_POR_DEFECTO: ModoApellidos = 1;

/**
 * El hombre arriba y la mujer abajo. Si ninguno de los dos trae sexo, se respeta el
 * orden del documento en vez de inventarse un criterio.
 */
export function ordenarPareja(ids: string[], persona: (id: string) => Persona | undefined): string[] {
  if (ids.length !== 2) return ids;
  const [a, b] = ids.map(persona);
  if (!a || !b) return ids;
  if (a.sexo === "h" || b.sexo === "m") return ids;
  if (b.sexo === "h" || a.sexo === "m") return [ids[1], ids[0]];
  return ids;
}

/** Los dos apellidos de una persona, ya resueltos contra el árbol. */
export interface Apellidos {
  /** Hasta dos: primero los que constan por escrito y detrás los heredados. */
  todos: string[];
  /** Cuántos de `todos` constan en el documento; los demás salen del árbol. */
  escritos: number;
  /** Los que ningún ascendiente lleva ya: los únicos que no se leen subiendo. */
  nuevos: string[];
}

/**
 * A cada uno sus apellidos. En los documentos solo los trae una cuarta parte de la
 * familia —a los hijos no se les repetían—, así que los que faltan se heredan subiendo:
 * el primero del padre y el segundo de la madre, y de cada uno el primero del suyo. Lo
 * heredado se deduce al vuelo y no se guarda: el JSON es lo que decían los documentos, y
 * lo que no decían se pinta distinto precisamente por eso.
 */
export function apellidosDe(g: Grafo): Map<string, Apellidos> {
  const resueltos = new Map<string, string[]>();

  const resolver = (id: string): string[] => {
    const memoria = resueltos.get(id);
    if (memoria) return memoria;
    const escritos = g.personaPorId.get(id)?.apellidos.slice(0, 2) ?? [];
    resueltos.set(id, escritos); // deja algo puesto antes de subir, por si los datos trajeran un ciclo
    if (escritos.length === 2) return escritos;

    // El primero es del padre y el segundo de la madre, y de cada uno el primero del suyo.
    // Sin padre en el árbol el de la madre no se sube de sitio: dejaría el apellido en el
    // lado que no es. Salvo que tampoco lo haya fuera de él —el apellido escrito lo delata,
    // que es de un padre que existe y no está—: entonces lo cría su madre sola y lleva los
    // dos de ella, en su orden.
    const [padre, madre] = progenitores(g, id);
    const deLaMadre = madre ? resolver(madre) : [];
    const deMadreSola = !padre && escritos.length === 0;
    const porLugar: (string | undefined)[] = deMadreSola ? deLaMadre : [padre && resolver(padre)[0], deLaMadre[0]];
    const todos: string[] = [];
    for (const lugar of [0, 1]) {
      const apellido = escritos[lugar] ?? porLugar[lugar];
      if (apellido === undefined) break;
      todos.push(apellido);
    }
    resueltos.set(id, todos);
    return todos;
  };

  const salida = new Map<string, Apellidos>();
  for (const [id, persona] of g.personaPorId) {
    const todos = resolver(id);
    const arriba = new Set<string>();
    for (const a of ascendientes(g, id)) for (const apellido of resolver(a)) arriba.add(apellido);
    salida.set(id, {
      todos,
      escritos: Math.min(persona.apellidos.length, todos.length),
      nuevos: todos.filter((apellido) => !arriba.has(apellido)),
    });
  }
  return salida;
}

/** El padre y la madre, que es de donde viene cada apellido. */
function progenitores(g: Grafo, id: string): [string | undefined, string | undefined] {
  const union = g.unionPorId.get(g.unionDeHijo.get(id) ?? "");
  if (!union) return [undefined, undefined];
  const [uno, otro] = ordenarPareja(union.partners, (p) => g.personaPorId.get(p));
  if (otro) return [uno, otro]; // ordenarPareja ya ha puesto al hombre delante
  return g.personaPorId.get(uno)?.sexo === "m" ? [undefined, uno] : [uno, undefined];
}

/** El nombre tal como se pinta, con la marca de dónde empieza lo que no consta escrito. */
export interface Etiqueta {
  texto: string;
  /** Carácter en el que arrancan los apellidos heredados; el final si no hay ninguno. */
  heredadoDesde: number;
}

/** Según cuántos apellidos pida el interruptor, y de los suyos. */
export function etiquetaDe(p: Persona, modo: ModoApellidos, apellidos: Apellidos): Etiqueta {
  const puestos = modo === 0 ? [] : modo === "nuevos" ? apellidos.nuevos : apellidos.todos.slice(0, modo);
  const heredados = new Set(apellidos.todos.slice(apellidos.escritos));
  const primero = puestos.findIndex((apellido) => heredados.has(apellido));
  return {
    texto: [p.nombre, ...puestos].join(" "),
    heredadoDesde: [p.nombre, ...puestos.slice(0, primero < 0 ? puestos.length : primero)].join(" ").length,
  };
}
