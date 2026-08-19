// Las ramas de la familia. Puro: `npx tsx lib/arbol/ramas.test.ts`.
//
// La familia no se cuenta por documentos —los tres Word son tres tomos, no tres ramas—
// sino por antepasado, y con exclusiones: los descendientes de Ambrosio son 85 hasta que
// se les quitan los de Vicente, que forman rama aparte. Eso no está en el dato y no cabe
// en él: se deriva del grafo y se queda aquí.
//
// **La rama es un conjunto, no un valor.** Descender de dos deja a 13 personas en más de
// una, y salen en todas: pertenecer a dos ramas es un hecho de la familia, no una
// ambigüedad que resolver. Y quien no desciende de ninguno de los siete —las 124 que
// entraron casándose— hereda las de su cónyuge, así que nadie se queda sin rama.

import { descendientes, parejaDirecta, type Grafo } from "./grafo";

export interface Rama {
  /** El apellido con el que la familia la nombra. */
  nombre: string;
  /** De quién desciende, él incluido. */
  ancestro: string;
  /** Quién y los suyos forman rama aparte y no cuentan en esta. */
  excluye?: string;
}

export const RAMAS: Rama[] = [
  { nombre: "Castrillo", ancestro: "p81", excluye: "p84" }, // Ambrosio Castrillo González
  { nombre: "Crespo", ancestro: "p84" }, // Vicente Crespo
  { nombre: "Crespo-León", ancestro: "p211", excluye: "p84" }, // Miguel Crespo
  { nombre: "Velasco", ancestro: "p271", excluye: "p289" }, // José Velasco Martínez
  { nombre: "Maestre", ancestro: "p289" }, // José Maestre
  // Los Pérez de Catalina, sin lo que salió de casarla con un Velasco: esa línea la cuenta
  // la familia como Velasco y solo como Velasco, igual que la de los Martín con los Cardona.
  { nombre: "Pérez", ancestro: "p466", excluye: "p395" },
  { nombre: "Cardona", ancestro: "p1" }, // José Cardona Torres
  // Juan Martín Cruzán, sin lo que salió de casar a su hija con un Cardona: esa línea la
  // cuenta la familia como Cardona y solo como Cardona.
  { nombre: "Martín", ancestro: "p62", excluye: "p3" },
  // El padre de Santi, del que todavía no se sabe el nombre. La familia de un cónyuge no
  // hereda la rama de su hijo político —la rama solo salta al cónyuge y nunca de segunda
  // mano—, así que o es rama o se queda fuera del reparto.
  { nombre: "Sala", ancestro: "p442" },
  { nombre: "Baños", ancestro: "p461" }, // Francisco Baños García, el padre de Mar
];

export interface Pertenencia {
  /** En el orden de `RAMAS`, que es el de la familia y no el de los datos. */
  ramas: string[];
  /**
   * No desciende de ningún antepasado y las suyas son las de su pareja: aquí va quién es
   * esa pareja, porque decir la rama sin decir por quién se entra no sitúa a nadie. Nulo en
   * quien la tiene de sangre. **Es una sola persona**: nadie del árbol hereda ramas de dos
   * parejas distintas, y el día que pase habrá que decidir cómo se lee eso, no taparlo.
   */
  porMatrimonio: string | null;
}

export function calcularRamas(g: Grafo, ramas = RAMAS): Map<string, Pertenencia> {
  const porRama = ramas.map((rama) => estirpe(g, rama));
  const salida = new Map<string, Pertenencia>();

  const suyas = (id: string) => ramas.filter((_, i) => porRama[i].has(id)).map((r) => r.nombre);
  for (const id of g.personaPorId.keys()) {
    const propias = suyas(id);
    if (propias.length > 0) salida.set(id, { ramas: propias, porMatrimonio: null });
  }

  // El matrimonio se resuelve sobre la sangre ya repartida, nunca sobre lo que otro haya
  // heredado: si no, la rama viajaría de cónyuge en cónyuge hasta cubrir el árbol entero.
  for (const id of g.personaPorId.keys()) {
    if (salida.has(id)) continue;
    const heredadas = new Set<string>();
    let deQuien: string | null = null;
    for (const otro of parejaDirecta(g, id)) {
      for (const rama of suyas(otro)) {
        heredadas.add(rama);
        deQuien ??= otro;
      }
    }
    if (deQuien !== null) {
      salida.set(id, { ramas: ramas.map((r) => r.nombre).filter((n) => heredadas.has(n)), porMatrimonio: deQuien });
    }
  }
  return salida;
}

/** Una rama vista desde fuera: lo que pinta el mapa de la escala más lejana. */
export interface Reparto {
  nombre: string;
  /** De quién sale el apellido. Es lo que decide si la rama se pinta: ver `ramaVisible`. */
  ancestro: string;
  /** Los suyos, ordenados como vengan del reparto: es la lista que se abre al tocarla. */
  gente: string[];
  /**
   * Cuántos de ellos están además en otra rama. El mapa suma más que el árbol y no lo
   * disimula: pertenecer a dos es un hecho de la familia, y cada rectángulo dice cuántos.
   */
  compartidos: number;
  /** El punto de vista es de esta. */
  tuya: boolean;
}

export function repartoDeRamas(
  pertenencias: Map<string, Pertenencia>,
  puntoDeVista: string,
  ramas = RAMAS,
): Reparto[] {
  const suyas = pertenencias.get(puntoDeVista)?.ramas ?? [];
  return ramas.map(({ nombre, ancestro }) => {
    const gente = [...pertenencias].filter(([, p]) => p.ramas.includes(nombre));
    return {
      nombre,
      ancestro,
      gente: gente.map(([id]) => id),
      compartidos: gente.filter(([, p]) => p.ramas.length > 1).length,
      tuya: suyas.includes(nombre),
    };
  });
}

/**
 * Si el mapa pinta esa rama con el filtro puesto: **solo cuando se puede ver a quien
 * estrena su apellido**. Sin la regla, la familia política levanta rama propia con los
 * dos o tres suyos que asoman como cónyuges —los Cardona y los Sala de Pablo—, y una
 * rama que se llama por un apellido de nadie a quien el árbol enseña no es una rama, es
 * el rastro de un matrimonio. Sin filtro no hay nada que decidir: están todos.
 */
export const ramaVisible = (rama: Reparto, dentro: Set<string> | null): boolean =>
  rama.gente.length > 0 && (!dentro || dentro.has(rama.ancestro));

/** Quién desciende de su antepasado —él incluido— menos la rama que se desgaja de ella. */
function estirpe(g: Grafo, { nombre, ancestro, excluye }: Rama): Set<string> {
  if (!g.personaPorId.has(ancestro)) throw new Error(`La rama ${nombre} no encuentra a su antepasado (${ancestro}).`);
  const dentro = conElAncestro(g, ancestro);
  if (excluye) for (const fuera of conElAncestro(g, excluye)) dentro.delete(fuera);
  return dentro;
}

const conElAncestro = (g: Grafo, id: string): Set<string> => new Set([id, ...descendientes(g, id)]);
