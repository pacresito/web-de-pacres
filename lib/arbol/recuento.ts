// El panel de recuento: cuánta familia hay puesta en cada generación, cuánta se puede
// llegar a poner y qué hay que abrir para traerla. Puro: `npx tsx lib/arbol/recuento.test.ts`.
//
// Una fila por generación —los ancestros arriba— y dentro de cada fila una fracción por
// parentesco, de la línea directa hacia fuera. El denominador es todo lo alcanzable bajo
// el filtro activo, no lo que está a un clic: pulsar trae lo pedido y todo lo que haga
// falta para llegar hasta ello.

import { visibles, type Grafo } from "./grafo";
import { nucleoDe } from "./layout";
import { declinar, parentescos } from "./parentesco";

export interface Fraccion {
  termino: string;
  /** Los que están puestos: el numerador, y lo que se resalta al señalarla. */
  puestos: string[];
  /** Todos los del cajón: el denominador, y la lista que se abre al pulsar el parentesco. */
  todos: string[];
  /**
   * Las uniones que hay que abrir para llenarla, contadas desde el núcleo. Abrirlas la
   * llena; quitarlas de las abiertas la repliega hasta el núcleo, como la manija «−».
   */
  uniones: string[];
}

export interface Fila {
  /** Generación relativa al punto de vista, como en el layout: los padres +1. */
  nivel: number;
  fracciones: Fraccion[];
}

export interface Recuento {
  filas: Fila[];
  puestos: number;
  alcanzables: number;
}

export function calcularRecuento(
  g: Grafo,
  opciones: { puntoDeVista: string; ocultarNoConectados: boolean; plegados?: Set<string> },
  puestos: Set<string>,
): Recuento {
  const { puntoDeVista, ocultarNoConectados, plegados } = opciones;
  const permitidos = ocultarNoConectados ? visibles(g, puntoDeVista) : null;
  // El suelo es el mismo que pinta el lienzo, plegados incluidos: contado sin ellos, la
  // fracción diría que a un Maestre no hay que abrirle nada y pulsarla no lo traería.
  const camino = caminos(g, nucleoDe(g, puntoDeVista, null, plegados));

  interface Celda {
    nivel: number;
    termino: string;
    orden: number;
    puestos: string[];
    todos: string[];
    mujeres: number;
    uniones: Set<string>;
  }
  const celdas = new Map<string, Celda>();

  for (const [id, { nivel, termino, orden }] of parentescos(g, puntoDeVista)) {
    if (permitidos && !permitidos.has(id)) continue;
    const clave = `${nivel}:${termino}`;
    const celda = celdas.get(clave) ?? { nivel, termino, orden, puestos: [], todos: [], mujeres: 0, uniones: new Set() };
    celdas.set(clave, celda);
    celda.todos.push(id);
    if (g.personaPorId.get(id)!.sexo === "m") celda.mujeres++;
    if (puestos.has(id)) celda.puestos.push(id);
    for (const union of camino.get(id) ?? []) celda.uniones.add(union);
  }

  const filas = new Map<number, Fila>();
  for (const celda of [...celdas.values()].sort((a, b) => a.orden - b.orden)) {
    const fila = filas.get(celda.nivel) ?? { nivel: celda.nivel, fracciones: [] };
    filas.set(celda.nivel, fila);
    fila.fracciones.push({
      termino: declinar(celda.termino, celda.todos.length, celda.mujeres),
      puestos: celda.puestos,
      todos: celda.todos,
      uniones: [...celda.uniones],
    });
  }

  const todas = [...celdas.values()];
  return {
    filas: [...filas.values()].sort((a, b) => b.nivel - a.nivel),
    puestos: todas.reduce((n, c) => n + c.puestos.length, 0),
    alcanzables: todas.reduce((n, c) => n + c.todos.length, 0),
  };
}

/** Qué hay que abrir para traer a esta gente al lienzo, desde lo que ya se ve sin abrir nada. */
export function unionesHasta(
  g: Grafo,
  puntoDeVista: string,
  gente: string[],
  plegados?: Set<string>,
): string[] {
  const camino = caminos(g, nucleoDe(g, puntoDeVista, null, plegados));
  const uniones = new Set<string>();
  for (const id of gente) for (const union of camino.get(id) ?? []) uniones.add(union);
  return [...uniones];
}

/**
 * Qué uniones hay que abrir para traer a cada persona. Abrir una unión pone a sus dos
 * miembros y a todos sus hijos, y solo cuenta si toca a alguien que ya esté puesto: el
 * camino es entonces una cadena de uniones que se van tocando, y el más corto es el que
 * menos gente arrastra. Nadie queda fuera de alcance: el árbol entero se recorre así.
 */
function caminos(g: Grafo, desde: Set<string>): Map<string, string[]> {
  const camino = new Map<string, string[]>();
  for (const p of desde) camino.set(p, []);

  let frontera = [...desde];
  while (frontera.length > 0) {
    const siguiente: string[] = [];
    for (const p of frontera) {
      const suyas = [...(g.unionesDePartner.get(p) ?? []), g.unionDeHijo.get(p)];
      for (const uid of suyas) {
        const union = uid && g.unionPorId.get(uid);
        if (!union) continue;
        const ruta = [...camino.get(p)!, union.id];
        for (const otro of [...union.partners, ...union.children]) {
          if (camino.has(otro)) continue;
          camino.set(otro, ruta);
          siguiente.push(otro);
        }
      }
    }
    frontera = siguiente;
  }
  return camino;
}
