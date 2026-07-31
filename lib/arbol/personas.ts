// Cómo se llama y cómo se ordena una persona. Puro: `npx tsx lib/arbol/personas.test.ts`.

import { ascendientes, type Grafo } from "./grafo";
import type { Persona } from "./tree";

/**
 * Cuántos apellidos se pintan, para todo el mundo. `"nuevos"` es la opción por defecto:
 * solo los enseña quien los estrena en su línea, porque el resto se leen subiendo.
 */
export type Apellidos = "nuevos" | 0 | 1 | 2;

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
  "Luka", "Manolo", "Manuel", "Mariano", "Massimo", "Mateo", "Miguel", "Nacho", "Nazario", "Pablo", "Paco", "Pedro",
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
  "Marisol", "Mercedes", "Montse", "Nieves", "Nori", "Paz", "Pilar", "Raquel", "Rocío", "Rosario", "Ruth", "Salomé",
  "Socorro", "Sol", "Soledad", "Vega", "Yoli",
]);

/** Por el nombre de pila, y solo cuando no hay duda. */
export function esHombre(p: Persona): boolean {
  if (p.nombre === "Su marido") return true;
  if (p.nombre === "Su mujer") return false;
  return HOMBRES.has(p.nombre.split(" ")[0]);
}

export function esMujer(p: Persona): boolean {
  if (esHombre(p)) return false;
  const pila = p.nombre.split(" ")[0];
  return p.nombre === "Su mujer" || MUJERES.has(pila) || pila.endsWith("a");
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

/**
 * Qué apellido estrena cada uno: el que ningún ascendiente suyo lleva ya. Los demás se
 * leen subiendo por el árbol, así que repetirlos en cada descendiente no dice nada
 * nuevo. Quien corona una línea los enseña todos — es de donde vienen.
 */
export function apellidosNuevos(g: Grafo): Map<string, string[]> {
  const salida = new Map<string, string[]>();
  for (const [id, persona] of g.personaPorId) {
    if (persona.apellidos.length === 0) {
      salida.set(id, []);
      continue;
    }
    const arriba = new Set<string>();
    for (const a of ascendientes(g, id)) for (const apellido of g.personaPorId.get(a)?.apellidos ?? []) arriba.add(apellido);
    salida.set(
      id,
      persona.apellidos.filter((apellido) => !arriba.has(apellido)),
    );
  }
  return salida;
}

/** El nombre tal como se pinta, según cuántos apellidos pida el interruptor. */
export function etiquetaDe(p: Persona, apellidos: Apellidos, nuevos: string[]): string {
  if (apellidos === 0) return p.nombre;
  const puestos = apellidos === "nuevos" ? nuevos : p.apellidos.slice(0, apellidos);
  return [p.nombre, ...puestos].join(" ");
}
