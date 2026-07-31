// Cómo se llama y cómo se ordena una persona. Puro: `npx tsx lib/arbol/personas.test.ts`.

import { ascendientes, type Grafo } from "./grafo";
import type { Persona } from "./tree";

/**
 * Cuántos apellidos se pintan, para todo el mundo. `"nuevos"` es la opción por defecto:
 * solo los enseña quien los estrena en su línea, porque el resto se leen subiendo.
 */
export type ModoApellidos = "nuevos" | 0 | 1 | 2;

/**
 * Nombres de pila de hombre que aparecen en el árbol. Solo sirven para colocar al
 * hombre encima de la mujer en cada pareja: fuera de ahí, el sexo no se usa ni se
 * guarda. La lista es explícita —y no una regla sobre la terminación— porque en
 * español la regla falla justo donde importa (Rocío, Amparo, Socorro son de mujer).
 * Si una pareja sale al revés, el arreglo es añadir el nombre aquí.
 */
const HOMBRES = new Set([
  "Aladino", "Alberto", "Alejandro", "Alessandro", "Alfonso", "Alfredo", "Ambrosio", "Antonio", "Aquilino", "Arturo",
  "Audemio", "Ballan", "Bruno", "Carlos", "Cecilio", "César", "Dani", "David", "Diego", "Edgar", "Eduardo", "Eladio",
  "Eliseo", "Enrique", "Eric", "Evelino", "Evelio", "Federico", "Feliciano", "Felicísimo", "Fernando", "Froilán",
  "Félix", "Gabi", "Gabriel", "Gerardo", "Ginés", "Gonzalo", "Goyo", "Guillermo", "Hijo", "Horacio", "Isidoro", "Iván",
  "Iyán", "Jaime", "Javi", "Javier", "Jero", "Joaquín", "Jorge", "Jose", "José", "Juan", "Julio", "Lucas", "Luis",
  "Luka", "Manolo", "Manuel", "Mariano", "Marido", "Massimo", "Mateo", "Miguel", "Nacho", "Nazario", "Pablo", "Paco", "Pedro",
  "Pepe", "Rafa", "Raúl", "Ricardo", "Rober", "Rubén", "Santi", "Sergio", "Señor", "Venancio", "Vicente", "Víctor",
  "Ladi", "Yago", "Álvaro", "Ángel", "Óscar",
]);

/**
 * Nombres de mujer que no acaban en -a, que es la regla que cubre a las demás. Sirven
 * para el caso contrario: si a una de los dos se la reconoce mujer, el otro sube aunque
 * su nombre no conste (`Ruth + Sin nombre`).
 */
const MUJERES = new Set([
  "Ascensión", "Belén", "Carmen", "Concepción", "Consuelo", "Cruz", "Dolores", "Encarna", "Encarnación", "Flor",
  "Inés", "Isabel", "Juani", "Leonor", "Lourdes", "Magda", "Mar", "Mari", "Marijose", "Marili", "Marilu", "Mariló",
  "Marisol", "Mercedes", "Montse", "Mujer", "Nieves", "Nori", "Paz", "Pilar", "Raquel", "Rocío", "Rosario", "Ruth",
  "Salomé", "Socorro", "Sol", "Soledad", "Vega", "Yoli",
]);

/** Por el nombre de pila, y solo cuando no hay duda. */
export function esHombre(p: Persona): boolean {
  return HOMBRES.has(p.nombre.split(" ")[0]);
}

export function esMujer(p: Persona): boolean {
  if (esHombre(p)) return false;
  const pila = p.nombre.split(" ")[0];
  return MUJERES.has(pila) || pila.endsWith("a");
}

/**
 * El hombre arriba y la mujer abajo. Si no se reconoce a ninguno de los dos, se respeta
 * el orden del documento en vez de inventarse un criterio.
 */
export function ordenarPareja(ids: string[], persona: (id: string) => Persona | undefined): string[] {
  if (ids.length !== 2) return ids;
  const [a, b] = ids.map(persona);
  if (!a || !b) return ids;
  if (esHombre(a) || esMujer(b)) return ids;
  if (esHombre(b) || esMujer(a)) return [ids[1], ids[0]];
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

    // El primero es del padre y el segundo de la madre; sin padre no hay primero que
    // poner, y el de la madre no se sube de sitio: dejaría el apellido en el lado que no es.
    const [padre, madre] = progenitores(g, id);
    const primero = escritos[0] ?? (padre && resolver(padre)[0]);
    if (primero === undefined) return escritos;
    const segundo = madre && resolver(madre)[0];
    const todos = segundo === undefined ? [primero] : [primero, segundo];
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
  const solo = g.personaPorId.get(uno);
  return solo && esMujer(solo) ? [undefined, uno] : [uno, undefined];
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
