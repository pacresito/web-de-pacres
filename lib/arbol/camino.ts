// El camino de uno a otro: los eslabones que hay que recorrer, dichos como los diría la
// familia. Puro: `npx tsx lib/arbol/camino.test.ts`.
//
// Es lo que contesta a «¿y esta quién es?» cuando la lengua no tiene palabra para la
// relación, que le pasa a 271 de las 416. Los eslabones son los mismos que cuentan la
// distancia, así que el camino nunca dice un número distinto del de la ficha.

import { vecinos, type Grafo, type Paso, type Vecino } from "./grafo";
import { declinado } from "./identidad";

export interface Eslabon {
  id: string;
  /** Cómo se llega desde el anterior; el primero no viene de ninguna parte. */
  paso?: Paso;
  /** Ya declinada y lista para leer, del anterior a este: «hija de», «casado con». */
  frase?: string;
}

export interface Camino {
  eslabones: Eslabon[];
  pasos: number;
  /** «de padre» o «de madre», y solo cuando el camino arranca subiendo y sigue. */
  porParte?: string;
}

/**
 * El camino más corto. Cuando dos ramas se cruzan hay más de uno igual de corto: se coge el
 * primero que aparece y no se dice que había otro —la endogamia no se resuelve aquí—.
 */
export function caminoEntre(g: Grafo, desde: string, hasta: string): Camino {
  for (const id of [desde, hasta]) if (!g.personaPorId.has(id)) throw new Error(`Persona desconocida: ${id}.`);

  const previo = new Map<string, Vecino & { de: string }>();
  const vistos = new Set([desde]);
  let frente = [desde];
  while (frente.length > 0 && !vistos.has(hasta)) {
    const siguiente: string[] = [];
    for (const a of frente) {
      for (const v of vecinos(g, a)) {
        if (vistos.has(v.id)) continue;
        vistos.add(v.id);
        previo.set(v.id, { ...v, de: a });
        siguiente.push(v.id);
      }
    }
    frente = siguiente;
  }
  if (!vistos.has(hasta)) throw new Error(`No hay camino de ${desde} a ${hasta}: el árbol tendría dos piezas.`);

  const eslabones: Eslabon[] = [];
  for (let id = hasta; id !== desde; ) {
    const p = previo.get(id)!;
    eslabones.unshift({ id, paso: p.paso, frase: fraseDe(g, p.de, p) });
    id = p.de;
  }
  eslabones.unshift({ id: desde });

  // Con un solo paso la aclaración sobra: «tu padre por parte de padre» no dice nada.
  const primero = eslabones[1];
  const porParte =
    eslabones.length > 2 && primero?.paso === "progenitor" ? declinado(g, primero.id, "de padre", "de madre") : undefined;
  return { eslabones, pasos: eslabones.length - 1, porParte };
}

/**
 * El eslabón se lee de arriba abajo, así que lo que dice es qué es el anterior de este: por
 * eso se declina por quien lo mira desde atrás y no por quien está nombrado.
 */
function fraseDe(g: Grafo, de: string, v: Vecino): string {
  switch (v.paso) {
    case "progenitor":
      return `${declinado(g, de, "hijo", "hija")} de`;
    case "hijo":
      return `${declinado(g, de, "padre", "madre")} de`;
    case "hermano":
      return `${declinado(g, de, "hermano", "hermana")} de`;
    case "pareja":
      return g.unionPorId.get(v.unionId)?.tipo === "pareja" ? "pareja de" : `${declinado(g, de, "casado", "casada")} con`;
  }
}
