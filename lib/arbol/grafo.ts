// Grafo derivado del árbol: uniones útiles, parentesco y generación absoluta.
// Módulo puro (sin React ni DOM) — toda la lógica del árbol vive aquí y se verifica
// con `npx tsx lib/arbol/grafo.test.ts`.

import type { ArbolData, Persona, Union } from "./tree";

export interface Grafo {
  personaPorId: Map<string, Persona>;
  /** Solo las uniones útiles: las de 1 partner y 0 hijos son envoltorios del extractor. */
  unionPorId: Map<string, Union>;
  /** Unión de la que cada persona es hija. Ninguna tiene más de una. */
  unionDeHijo: Map<string, string>;
  /** Uniones en las que cada persona es partner (más de una si hubo segundas nupcias). */
  unionesDePartner: Map<string, string[]>;
  /**
   * Generación absoluta: los partners de una unión la comparten y los hijos van +1,
   * así que **crece hacia la descendencia**. El ancla es arbitraria (solo se usan
   * diferencias); quien pinte filas invierte el signo para que los padres queden arriba.
   */
  generacion: Map<string, number>;
}

export function construirGrafo(data: ArbolData): Grafo {
  const personaPorId = new Map(data.people.map((p) => [p.id, p]));
  const unionPorId = new Map<string, Union>();
  const unionDeHijo = new Map<string, string>();
  const unionesDePartner = new Map<string, string[]>();

  for (const u of data.unions) {
    if (u.partners.length <= 1 && u.children.length === 0) continue;
    unionPorId.set(u.id, u);
    for (const c of u.children) unionDeHijo.set(c, u.id);
    for (const pid of u.partners) {
      const previas = unionesDePartner.get(pid);
      if (previas) previas.push(u.id);
      else unionesDePartner.set(pid, [u.id]);
    }
  }

  return { personaPorId, unionPorId, unionDeHijo, unionesDePartner, generacion: calcularGeneraciones(data, unionPorId) };
}

/**
 * Propaga la generación por las uniones. Un conflicto significa que los datos dicen a
 * la vez dos cosas incompatibles sobre alguien: lanza en vez de elegir en silencio.
 */
function calcularGeneraciones(data: ArbolData, unionPorId: Map<string, Union>): Map<string, number> {
  const vecinos = new Map<string, [string, number][]>();
  const arista = (a: string, b: string, delta: number) => {
    const lista = vecinos.get(a);
    if (lista) lista.push([b, delta]);
    else vecinos.set(a, [[b, delta]]);
  };

  for (const u of unionPorId.values()) {
    for (const a of u.partners) for (const b of u.partners) if (a !== b) arista(a, b, 0);
    for (const c of u.children) {
      for (const p of u.partners) {
        arista(p, c, 1);
        arista(c, p, -1);
      }
    }
  }

  const generacion = new Map<string, number>();
  for (const semilla of data.people) {
    if (generacion.has(semilla.id)) continue;
    generacion.set(semilla.id, 0);
    const pila = [semilla.id];
    while (pila.length > 0) {
      const x = pila.pop()!;
      const gx = generacion.get(x)!;
      for (const [y, delta] of vecinos.get(x) ?? []) {
        const gy = generacion.get(y);
        if (gy === undefined) {
          generacion.set(y, gx + delta);
          pila.push(y);
        } else if (gy !== gx + delta) {
          throw new Error(`Generación contradictoria entre ${x} y ${y}: ${gy} vs ${gx + delta}.`);
        }
      }
    }
  }
  return generacion;
}

/** Padres, abuelos… subiendo por las uniones de las que cada uno es hijo. */
export function ascendientes(g: Grafo, x: string): Set<string> {
  const out = new Set<string>();
  const pila = [x];
  while (pila.length > 0) {
    const uid = g.unionDeHijo.get(pila.pop()!);
    if (!uid) continue;
    for (const p of g.unionPorId.get(uid)!.partners) {
      if (out.has(p)) continue;
      out.add(p);
      pila.push(p);
    }
  }
  return out;
}

/** Hijos, nietos… bajando por las uniones de las que cada uno es partner. */
export function descendientes(g: Grafo, x: string): Set<string> {
  const out = new Set<string>();
  const pila = [x];
  while (pila.length > 0) {
    for (const uid of g.unionesDePartner.get(pila.pop()!) ?? []) {
      for (const c of g.unionPorId.get(uid)!.children) {
        if (out.has(c)) continue;
        out.add(c);
        pila.push(c);
      }
    }
  }
  return out;
}

/** Los partners de las uniones propias de X (más de uno si hubo segundas nupcias). */
export function parejaDirecta(g: Grafo, x: string): Set<string> {
  const out = new Set<string>();
  for (const uid of g.unionesDePartner.get(x) ?? []) {
    for (const p of g.unionPorId.get(uid)!.partners) if (p !== x) out.add(p);
  }
  return out;
}

/** Quien comparte sangre con X: él, sus ascendientes y la descendencia de cada uno. */
export function consanguineos(g: Grafo, x: string): Set<string> {
  const arriba = ascendientes(g, x);
  const out = new Set<string>([x, ...arriba, ...descendientes(g, x)]);
  for (const a of arriba) for (const d of descendientes(g, a)) out.add(d);
  return out;
}

function conConyuges(g: Grafo, personas: Set<string>): Set<string> {
  const out = new Set(personas);
  for (const p of personas) for (const c of parejaDirecta(g, p)) out.add(c);
  return out;
}

/**
 * Quién está "conectado" con X: sus consanguíneos y los cónyuges de todos ellos, como
 * nodo suelto y sin arrastrar la familia de cada uno. Es "quien comparte un ancestro
 * conmigo", así que la familia política queda fuera — también la de mi propia pareja,
 * que es de mis hijos y no mía.
 */
export function visibles(g: Grafo, x: string): Set<string> {
  return conConyuges(g, consanguineos(g, x));
}
