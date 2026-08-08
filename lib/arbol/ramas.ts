// Las siete ramas de la familia. Puro: `npx tsx lib/arbol/ramas.test.ts`.
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
  { nombre: "Cardona", ancestro: "p1" }, // José Cardona Torres
  // Juan Martín Cruzán, sin lo que salió de casar a su hija con un Cardona: esa línea la
  // cuenta la familia como Cardona y solo como Cardona.
  { nombre: "Martín", ancestro: "p62", excluye: "p3" },
];

export interface Pertenencia {
  /** En el orden de `RAMAS`, que es el de la familia y no el de los datos. */
  ramas: string[];
  /** No desciende de ningún antepasado: las suyas son las de su cónyuge. */
  porMatrimonio: boolean;
}

export function calcularRamas(g: Grafo, ramas = RAMAS): Map<string, Pertenencia> {
  const porRama = ramas.map((rama) => estirpe(g, rama));
  const salida = new Map<string, Pertenencia>();

  const suyas = (id: string) => ramas.filter((_, i) => porRama[i].has(id)).map((r) => r.nombre);
  for (const id of g.personaPorId.keys()) {
    const propias = suyas(id);
    if (propias.length > 0) salida.set(id, { ramas: propias, porMatrimonio: false });
  }

  // El matrimonio se resuelve sobre la sangre ya repartida, nunca sobre lo que otro haya
  // heredado: si no, la rama viajaría de cónyuge en cónyuge hasta cubrir el árbol entero.
  for (const id of g.personaPorId.keys()) {
    if (salida.has(id)) continue;
    const heredadas = new Set<string>();
    for (const otro of parejaDirecta(g, id)) for (const rama of suyas(otro)) heredadas.add(rama);
    if (heredadas.size > 0) {
      salida.set(id, { ramas: ramas.map((r) => r.nombre).filter((n) => heredadas.has(n)), porMatrimonio: true });
    }
  }
  return salida;
}

/** Quién desciende de su antepasado —él incluido— menos la rama que se desgaja de ella. */
function estirpe(g: Grafo, { nombre, ancestro, excluye }: Rama): Set<string> {
  if (!g.personaPorId.has(ancestro)) throw new Error(`La rama ${nombre} no encuentra a su antepasado (${ancestro}).`);
  const dentro = conElAncestro(g, ancestro);
  if (excluye) for (const fuera of conElAncestro(g, excluye)) dentro.delete(fuera);
  return dentro;
}

const conElAncestro = (g: Grafo, id: string): Set<string> => new Set([id, ...descendientes(g, id)]);
