// Qué le falta a cada uno para estar del todo escrito. Puro: `npx tsx lib/arbol/incompletos.test.ts`.
//
// El árbol se rellena preguntando a la familia, y preguntar en abstracto —«¿sabéis algo más
// de los abuelos?»— no devuelve nada. Esto es la otra pregunta: cada nodo enseña el hueco
// con la forma del dato que falta —`1937-MM-DD` pide un día y se ve que lo pide— y quien lo
// sepa lo lee de un vistazo. **Un hueco no es un error**: nadie ha hecho nada mal porque un
// documento de 1950 no diera el día.
//
// Solo se cuenta lo que alguien de la familia puede contestar, y solo si de verdad falta:
// **el segundo apellido no cuenta** —lo tiene a medias media familia y marcarlos a todos era
// no marcar a nadie—, y la onomástica tampoco, porque que un nombre no tenga santo no es un
// hueco del documento y cuando lo tiene y no es el que celebra esa persona se arregla en
// `santoral.ts`, no preguntándoselo a nadie.

import { conDia, type Fecha } from "./fechas";
import type { Grafo } from "./grafo";
import type { Apellidos } from "./personas";
import type { Persona } from "./tree";

/** Un tramo de la línea del repaso: lo que consta, o el hueco que se pide. */
export interface Trozo {
  texto: string;
  /** Es lo que falta: se pinta en el color del hueco. */
  falta: boolean;
}

/** Lo que se echa de menos de alguien. Vacío es que no queda nada que preguntar. */
export interface Huecos {
  /** No consta ninguno, ni escrito ni subiendo por el árbol. */
  apellido: boolean;
  /** La línea que sustituye a la de los años, ya troceada por lo que falta. */
  vida: Trozo[];
}

export function huecosDe(p: Persona, apellidos: Apellidos): Huecos | null {
  const apellido = apellidos.todos.length === 0;
  const vida = escribirVida(p);
  if (!apellido && !vida.some((t) => t.falta)) return null;
  return { apellido, vida };
}

/** Quiénes son: los enciende el repaso y los cuenta el interruptor de «Qué se ve». */
export function losIncompletos(g: Grafo, linaje: Map<string, Apellidos>): Set<string> {
  const salida = new Set<string>();
  for (const p of g.personaPorId.values()) if (huecosDe(p, linaje.get(p.id)!)) salida.add(p.id);
  return salida;
}

/**
 * Lo que consta de su vida, con lo que falta escrito donde iría. **La duda del documento va
 * al final y en palabras**: no es un hueco con forma, es un dato que puede no ser ese.
 */
function escribirVida(p: Persona): Trozo[] {
  const trozos = p.death
    ? [...deFecha(p.birth), { texto: " – ", falta: false }, ...deFecha(p.death)]
    : deFecha(p.birth);
  if (p.incierto) trozos.push({ texto: p.incierto === "nombre" ? " · nombre dudoso" : " · fechas dudosas", falta: true });
  return trozos;
}

/** `1986-03-01` entera, `1937-MM-DD` a la que solo le consta el año, y sin nada, `AAAA-MM-DD`. */
const deFecha = (f: Fecha | undefined): Trozo[] =>
  f === undefined
    ? [{ texto: "AAAA-MM-DD", falta: true }]
    : conDia(f)
      ? [{ texto: f, falta: false }]
      : [{ texto: `${f}-`, falta: false }, { texto: "MM-DD", falta: true }];
