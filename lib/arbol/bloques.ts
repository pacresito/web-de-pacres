// La escala media del lienzo: la unidad deja de ser la persona y pasa a ser el grupo de
// hermanos, con las parejas que entraron en él casándose. Puro: `npx tsx lib/arbol/bloques.test.ts`.
//
// **Están todos.** La escala de personas enseña lo que se ha desplegado; esta enseña la
// familia entera, que es a lo que se aleja quien se aleja. Las 428 personas son 130 bloques
// y la columna más ancha pasa de 12.800 px de alto a 2.800: lo que se recorría arrastrando
// se recorre de un vistazo.
//
// Los bloques no heredan la colocación de `layout.ts`: entre dos hermanos caben sus
// descendencias enteras, así que la caja que los envolviera mediría media columna. Se
// colocan aquí, apilados en la columna de su generación y **ordenados por lo cerca que te
// quedan**, con el bloque de los padres como desempate.
//
// **Y no llevan trazos.** Un bloque dice de quién es con el nombre de sus dos progenitores,
// que es el mismo dato que dibujaría la línea y no cruza la pantalla para decirlo.

import { ascendientes, descendientes, pasosDesde, visibles, type Grafo } from "./grafo";
import { ANCHO_COLUMNA } from "./layout";
import { ordenarPareja } from "./personas";

// Un bloque es más grande que un nodo de persona en coordenadas del árbol, y no por
// capricho: se lee a la altura de zoom en la que el nodo ya no se leía, así que su letra
// tiene que medir el doble para acabar midiendo lo mismo en pantalla.
export const ANCHO_BLOQUE = 240;
export const ALTO_BLOQUE = 64;
const SEP_BLOQUE = 12;

export interface Bloque {
  /** La unión de la que son hijos, o `solo:<id>` para quien no tiene padres en el documento. */
  id: string;
  /** Generación relativa al punto de vista, como en `layout.ts`: los ascendientes, positivos. */
  nivel: number;
  /** De quién son: sus dos progenitores por el nombre, o el suyo propio si no constan. */
  titulo: string;
  hermanos: string[];
  /** Los que entraron en el grupo casándose con un hermano. */
  parejas: string[];
  /**
   * El documento no le da padres a nadie de aquí, así que esto no es un grupo de hermanos:
   * es una persona sola —una raíz del árbol— y se cuenta y se nombra como tal.
   */
  sinPadres: boolean;
  /** Alguno de los suyos está en la ascendencia o la descendencia del punto de vista. */
  lineaDirecta: boolean;
  /** El punto de vista va dentro: en esta escala es él quien ancla la cámara. */
  esDelPuntoDeVista: boolean;
  x: number;
  y: number;
}

export interface Bloques {
  bloques: Bloque[];
  limites: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface OpcionesBloques {
  puntoDeVista: string;
  ocultarNoConectados: boolean;
}

export function calcularBloques(g: Grafo, { puntoDeVista, ocultarNoConectados }: OpcionesBloques): Bloques {
  const genPov = g.generacion.get(puntoDeVista);
  if (genPov === undefined) throw new Error(`Punto de vista desconocido: ${puntoDeVista}.`);

  const permitidos = ocultarNoConectados ? visibles(g, puntoDeVista) : null;
  const dentro = (id: string) => !permitidos || permitidos.has(id);
  const directa = new Set([puntoDeVista, ...ascendientes(g, puntoDeVista), ...descendientes(g, puntoDeVista)]);

  // Reparto: cada uno a la unión de la que es hijo, y el que se casó con la de su pareja
  const grupos = new Map<string, { hermanos: string[]; parejas: string[] }>();
  const cajon = (id: string) => {
    const previo = grupos.get(id);
    if (previo) return previo;
    const nuevo = { hermanos: [], parejas: [] };
    grupos.set(id, nuevo);
    return nuevo;
  };
  for (const id of g.personaPorId.keys()) {
    if (!dentro(id)) continue;
    const propia = g.unionDeHijo.get(id);
    if (propia) cajon(propia).hermanos.push(id);
    else {
      const prestada = unionDeLaPareja(g, id);
      if (prestada) cajon(prestada).parejas.push(id);
      else cajon(`solo:${id}`).hermanos.push(id);
    }
  }

  // De grupo a bloque, sin colocar todavía
  const pasos = pasosDesde(g, puntoDeVista);
  const sinColocar = [...grupos].map(([id, { hermanos, parejas }]) => {
    const suyos = [...hermanos, ...parejas];
    return {
      id,
      nivel: genPov - g.generacion.get(suyos[0])!,
      titulo: tituloDe(g, id, hermanos[0] ?? parejas[0]),
      hermanos,
      parejas,
      sinPadres: !g.unionPorId.has(id),
      padre: padreDe(g, id, grupos),
      // Lo cerca que te queda el bloque es lo cerca que te queda el más cercano de los suyos.
      cerca: Math.min(...suyos.map((p) => pasos.get(p) ?? Infinity)),
      lineaDirecta: suyos.some((p) => directa.has(p)),
      esDelPuntoDeVista: suyos.includes(puntoDeVista),
    };
  });

  // Colocación: una columna por generación, apilada de arriba abajo
  // **Arriba lo tuyo.** Cada columna se ordena por lo cerca que te queda su bloque, que es
  // lo mismo que hace cualquier lista de la app: el mapa está anclado a un punto de vista,
  // así que la primera fila de todas las columnas es tu familia y lo lejano se hunde.
  // A igual distancia manda el sitio que ocupa el bloque de los padres en la columna
  // anterior —por eso se recorre de la generación más vieja a la más joven—: sin ese
  // desempate, una familia sale repartida por la columna entera.
  const porNivel = new Map<number, typeof sinColocar>();
  for (const bloque of sinColocar) porNivel.set(bloque.nivel, [...(porNivel.get(bloque.nivel) ?? []), bloque]);

  const orden = new Map<string, number>();
  const bloques: Bloque[] = [];
  for (const nivel of [...porNivel.keys()].sort((a, b) => b - a)) {
    const columna = porNivel.get(nivel)!;
    // Sin padres colocados —las raíces y quien entró de fuera— van al final de su distancia,
    // en el orden del documento: no hay nada anterior contra lo que ordenarlos.
    columna.sort(
      (a, b) => antes(a.cerca, b.cerca) || antes(orden.get(a.padre ?? "") ?? Infinity, orden.get(b.padre ?? "") ?? Infinity),
    );
    columna.forEach((bloque, i) => {
      orden.set(bloque.id, i);
      bloques.push({ ...bloque, x: -nivel * ANCHO_COLUMNA || 0, y: i * (ALTO_BLOQUE + SEP_BLOQUE) });
    });
  }

  return { bloques, limites: limitesDe(bloques) };
}

/** Comparar restando no sirve aquí: quien no te alcanza vale Infinity, y dos dan NaN. */
const antes = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

/** La unión de la que es hijo el primero de sus cónyuges que tenga padres en el documento. */
function unionDeLaPareja(g: Grafo, id: string): string | undefined {
  for (const unionId of g.unionesDePartner.get(id) ?? []) {
    for (const otro of g.unionPorId.get(unionId)!.partners) {
      if (otro === id) continue;
      const suya = g.unionDeHijo.get(otro);
      if (suya) return suya;
    }
  }
  return undefined;
}

/** En qué bloque están los padres de este, si es que están repartidos en alguno. */
function padreDe(g: Grafo, id: string, grupos: Map<string, unknown>): string | undefined {
  const union = g.unionPorId.get(id);
  if (!union) return undefined;
  for (const progenitor of union.partners) {
    const suyo = g.unionDeHijo.get(progenitor) ?? unionDeLaPareja(g, progenitor) ?? `solo:${progenitor}`;
    if (grupos.has(suyo)) return suyo;
  }
  return undefined;
}

/** «de Miguel y Ana». Los dos nombres, porque en esta familia hay cuatro Migueles. */
function tituloDe(g: Grafo, id: string, cualquiera: string): string {
  const union = g.unionPorId.get(id);
  if (!union) return g.personaPorId.get(cualquiera)?.nombre ?? "";
  const nombres = ordenarPareja(union.partners, (p) => g.personaPorId.get(p))
    .map((p) => g.personaPorId.get(p)?.nombre)
    .filter((n): n is string => !!n);
  return nombres.length > 0 ? `de ${nombres.join(" y ")}` : "";
}

function limitesDe(bloques: Bloque[]): Bloques["limites"] {
  const xs = bloques.map((b) => b.x);
  const ys = bloques.map((b) => b.y);
  return {
    minX: Math.min(...xs) - ANCHO_BLOQUE / 2,
    maxX: Math.max(...xs) + ANCHO_BLOQUE / 2,
    minY: Math.min(...ys) - ALTO_BLOQUE / 2,
    maxY: Math.max(...ys) + ALTO_BLOQUE / 2,
  };
}
