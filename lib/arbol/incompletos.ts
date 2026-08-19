// Qué le falta a cada uno para estar del todo escrito. Puro: `npx tsx lib/arbol/incompletos.test.ts`.
//
// El árbol se rellena preguntando a la familia, y preguntar en abstracto —«¿sabéis algo más
// de los abuelos?»— no devuelve nada. Esto es la otra pregunta: cada nodo enseña el hueco
// con la forma del dato que falta —`1937-MM-DD` pide un día y se ve que lo pide— y quien lo
// sepa lo lee de un vistazo. **Un hueco no es un error**: nadie ha hecho nada mal porque un
// documento de 1950 no diera el día.
//
// **Y lo dudoso se marca igual que lo que falta, sin decirlo con palabras**: el color ya lo
// dice, y una coletilla detrás de cada fecha llenaba la línea de letra que nadie iba a leer
// dos veces.
//
// Solo se cuenta lo que alguien de la familia puede contestar, y solo si de verdad falta:
// **el segundo apellido no cuenta** —lo tiene a medias media familia y marcarlos a todos era
// no marcar a nadie—, y la onomástica tampoco, porque que un nombre no tenga santo no es un
// hueco del documento y cuando lo tiene y no es el que celebra esa persona se arregla en
// `santoral.ts`, no preguntándoselo a nadie.

import { conDia, type Fecha } from "./fechas";
import type { Grafo } from "./grafo";
import { SIN_NOMBRE } from "./identidad";
import type { Apellidos } from "./personas";
import type { Persona } from "./tree";

/**
 * Lo que el documento puso donde iba un nombre cuando no lo tenía. **No son nombres**: son el
 * papel que esa persona hacía en la frase de otro —«el marido», «un hijo»—, y en el repaso hay
 * que poder pedirlos como se pide una fecha.
 */
const NO_ES_NOMBRE = new Set([SIN_NOMBRE, "Marido", "Mujer", "Hijo", "Hija", "Señor", "Señora"]);

/** Un tramo de la línea del repaso: lo que consta, o el hueco que se pide. */
export interface Trozo {
  texto: string;
  /** Es lo que falta o lo que el documento dudaba: se pinta en el color del hueco. */
  falta: boolean;
}

/** Lo que se echa de menos de alguien. `null` es que no queda nada que preguntar. */
export interface Huecos {
  /** Del nombre: no lo hay, o lo hay y el documento no lo daba por seguro. */
  nombre: "falta" | "dudoso" | null;
  /** No consta ninguno, ni escrito ni subiendo por el árbol. */
  apellido: boolean;
  /** La línea que sustituye a la de los años, ya troceada por lo que falta. */
  vida: Trozo[];
}

export function huecosDe(p: Persona, apellidos: Apellidos): Huecos | null {
  const nombre = NO_ES_NOMBRE.has(p.nombre) ? "falta" : p.incierto === "nombre" ? "dudoso" : null;
  const apellido = apellidos.todos.length === 0;
  const vida = escribirVida(p);
  if (!nombre && !apellido && !vida.some((t) => t.falta)) return null;
  return { nombre, apellido, vida };
}

/** Lo que se pide en la línea del nombre, o nada: lo dudoso se marca en color y no en letra. */
export function loQueFalta({ nombre, apellido }: Huecos): string | null {
  if (nombre === "falta" && apellido) return "Falta nombre y apellido";
  if (nombre === "falta") return "Falta nombre";
  return apellido ? "Falta apellido" : null;
}

/** Quiénes son: los enciende el repaso y los cuenta el interruptor de «Qué se ve». */
export function losIncompletos(g: Grafo, linaje: Map<string, Apellidos>): Set<string> {
  const salida = new Set<string>();
  for (const p of g.personaPorId.values()) if (huecosDe(p, linaje.get(p.id)!)) salida.add(p.id);
  return salida;
}

/**
 * Lo que consta de su vida, con lo que falta escrito donde iría. **La duda del documento tiñe
 * la fecha entera** y no una parte: `incierto` no señala qué cifra baila, dice que de esa vida
 * no se responde.
 */
function escribirVida(p: Persona): Trozo[] {
  const trozos = p.death
    ? [...deFecha(p.birth), { texto: " – ", falta: false }, ...deFecha(p.death)]
    : deFecha(p.birth);
  return p.incierto === "fechas" ? trozos.map((t) => ({ ...t, falta: true })) : trozos;
}

/** `1986-03-01` entera, `1937-MM-DD` a la que solo le consta el año, y sin nada, `AAAA-MM-DD`. */
const deFecha = (f: Fecha | undefined): Trozo[] =>
  f === undefined
    ? [{ texto: "AAAA-MM-DD", falta: true }]
    : conDia(f)
      ? [{ texto: f, falta: false }]
      : [{ texto: `${f}-`, falta: false }, { texto: "MM-DD", falta: true }];
