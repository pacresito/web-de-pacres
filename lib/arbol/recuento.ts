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
  /** Cuántos se pueden llegar a pintar: el denominador. */
  alcanzables: number;
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
  opciones: { puntoDeVista: string; ocultarNoConectados: boolean },
  puestos: Set<string>,
): Recuento {
  const { puntoDeVista, ocultarNoConectados } = opciones;
  const permitidos = ocultarNoConectados ? visibles(g, puntoDeVista) : null;
  const camino = caminos(g, nucleoDe(g, puntoDeVista));

  interface Celda {
    nivel: number;
    termino: string;
    orden: number;
    puestos: string[];
    alcanzables: number;
    mujeres: number;
    uniones: Set<string>;
  }
  const celdas = new Map<string, Celda>();

  for (const [id, { nivel, termino, orden }] of parentescos(g, puntoDeVista)) {
    if (permitidos && !permitidos.has(id)) continue;
    const clave = `${nivel}:${termino}`;
    const celda = celdas.get(clave) ?? { nivel, termino, orden, puestos: [], alcanzables: 0, mujeres: 0, uniones: new Set() };
    celdas.set(clave, celda);
    celda.alcanzables++;
    if (g.personaPorId.get(id)!.sexo === "m") celda.mujeres++;
    if (puestos.has(id)) celda.puestos.push(id);
    for (const union of camino.get(id) ?? []) celda.uniones.add(union);
  }

  const filas = new Map<number, Fila>();
  for (const celda of [...celdas.values()].sort((a, b) => a.orden - b.orden)) {
    const fila = filas.get(celda.nivel) ?? { nivel: celda.nivel, fracciones: [] };
    filas.set(celda.nivel, fila);
    fila.fracciones.push({
      termino: declinar(celda.termino, celda.alcanzables, celda.mujeres),
      puestos: celda.puestos,
      alcanzables: celda.alcanzables,
      uniones: [...celda.uniones],
    });
  }

  const todas = [...celdas.values()];
  return {
    filas: [...filas.values()].sort((a, b) => b.nivel - a.nivel),
    puestos: todas.reduce((n, c) => n + c.puestos.length, 0),
    alcanzables: todas.reduce((n, c) => n + c.alcanzables, 0),
  };
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
