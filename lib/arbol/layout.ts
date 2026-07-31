// Coloca el árbol alrededor de un punto de vista: qué se ve, en qué columna y a qué altura.
// Módulo puro y determinista (el mismo grafo y el mismo estado dan siempre el mismo
// resultado, que es lo que permite verificarlo sin navegador).
//
// **El árbol crece de izquierda a derecha**: cada generación es una columna, los
// ancestros a la izquierda y la descendencia a la derecha, en orden cronológico. Una
// familia crece a lo alto —que es por donde se hace scroll— y no a lo ancho, que es lo
// que no sobra en un móvil; además un nombre ocupa mucho más ancho que alto.
//
// Las reglas son demasiado peculiares para una librería de grafos —parejas adyacentes,
// ramas colapsadas en un contador, todo reanclado al punto de vista— así que el
// algoritmo es el clásico de contornos: cada subárbol se coloca por su cuenta y se
// empuja hacia un lado hasta que sus columnas dejan de solaparse con lo ya colocado.

import { ascendientes, descendientes, parejaDirecta, visibles, type Grafo } from "./grafo";
import { ordenarPareja } from "./personas";
import type { Union } from "./tree";

export const ANCHO_NODO = 228;
export const ALTO_NODO = 48;
export const ANCHO_CONTADOR = 116;
export const ALTO_CONTADOR = 30;
export const ANCHO_COLUMNA = 288; // de una generación a la siguiente
const SEP_PAREJA = 12; // entre los dos miembros de una pareja: por ahí pasa su vínculo
const SEP_UNIDAD = 28; // entre unidades distintas: más que SEP_PAREJA, para que se note quién va con quién

export interface OpcionesLayout {
  puntoDeVista: string;
  /** Uniones abiertas a mano: se pintan enteras, con sus partners y sus hijos. */
  expandidas: Set<string>;
  ocultarNoConectados: boolean;
}

export interface NodoLayout {
  id: string;
  x: number;
  y: number;
  /** Generación relativa al punto de vista: los padres +1 (a la izquierda), los hijos −1. */
  nivel: number;
  /** Ascendencia y descendencia directas del punto de vista (él incluido). */
  lineaDirecta: boolean;
  esPuntoDeVista: boolean;
  /** Forma pareja aquí: es de quien los hijos heredan el apellido, y por eso lo lleva. */
  esPareja: boolean;
}

/** Una unión pintada: la pareja y el reparto hacia sus hijos visibles. */
export interface Vinculo {
  unionId: string;
  tipo: Union["tipo"];
  /** Ancla del reparto: el punto medio de la pareja, o el contador que la sustituye. */
  x: number;
  y: number;
  /** Alturas de los dos miembros, para la línea que los une. */
  pareja?: [number, number];
  hijos: { x: number; y: number }[];
  /** Se abrió a mano y cerrarla se llevaría gente: es la que ofrece el botón de plegar. */
  colapsable: boolean;
}

/**
 * Una rama sin pintar, con la gente que hay detrás. `hijos` cuelga de una pareja ya
 * en pantalla; `padres` corona a quien entró por matrimonio y trae su ascendencia.
 * Abrir cualquiera de los dos es lo mismo: añadir su unión a `expandidas`.
 */
export interface Contador {
  unionId: string;
  sentido: "hijos" | "padres";
  cantidad: number;
  x: number;
  y: number;
}

export interface Layout {
  nodos: NodoLayout[];
  vinculos: Vinculo[];
  contadores: Contador[];
  limites: { minX: number; maxX: number; minY: number; maxY: number };
}

interface Unidad {
  id: string;
  nivel: number;
  /** Los miembros de una pareja se pintan juntos; vacío si la unidad es un contador. */
  miembros: string[];
  contador?: Omit<Contador, "x" | "y">;
  /** Lo que ocupa a lo alto, que es por donde se empaqueta. */
  alto: number;
}

/** Altura del centro de cada unidad + hasta dónde llega cada columna, para no solapar. */
interface Bloque {
  y: Map<string, number>;
  contorno: Map<number, [number, number]>;
}

export function calcularLayout(g: Grafo, opciones: OpcionesLayout): Layout {
  const { puntoDeVista, expandidas, ocultarNoConectados } = opciones;
  const genPov = g.generacion.get(puntoDeVista);
  if (genPov === undefined) throw new Error(`Punto de vista desconocido: ${puntoDeVista}.`);
  const nivelDe = (pid: string) => genPov - g.generacion.get(pid)!;

  const permitidos = ocultarNoConectados ? visibles(g, puntoDeVista) : null;
  const mostrados = seleccionar(g, puntoDeVista, expandidas, permitidos);
  // Lo que se ve sin abrir nada: plegar una unión que ya estaría aquí no haría nada.
  const nucleo = expandidas.size > 0 ? seleccionar(g, puntoDeVista, new Set(), permitidos) : mostrados;

  // --- Unidades: una por unión mostrada, más las personas sueltas y los contadores ---
  const unidades = new Map<string, Unidad>();
  const unidadDePersona = new Map<string, string>();
  const unidadDeUnion = new Map<string, string>();

  for (const u of g.unionPorId.values()) {
    const miembros = ordenarPareja(
      u.partners.filter((p) => mostrados.has(p)),
      (id) => g.personaPorId.get(id),
    );
    if (miembros.length === 0) continue;
    const id = `u:${u.id}`;
    unidades.set(id, { id, nivel: nivelDe(miembros[0]), miembros, alto: altoDe(miembros.length) });
    unidadDeUnion.set(u.id, id);
    for (const p of miembros) unidadDePersona.set(p, id);
  }
  for (const p of mostrados) {
    if (unidadDePersona.has(p)) continue;
    const id = `p:${p}`;
    unidades.set(id, { id, nivel: nivelDe(p), miembros: [p], alto: altoDe(1) });
    unidadDePersona.set(p, id);
  }

  // Cada unión anuncia lo que se deja fuera: los hijos que no ha traído si ya está en
  // pantalla, o los padres que le faltan a quien sí lo está.
  const contadorDeHijos = new Map<string, Unidad>(); // unionId → unidad
  const contadorDePadres = new Map<string, Unidad[]>(); // unidadId del primer hijo → unidades
  const permitido = (pid: string) => !permitidos || permitidos.has(pid);

  for (const u of g.unionPorId.values()) {
    const unidadUnion = unidadDeUnion.get(u.id);
    if (unidadUnion) {
      const ocultos = u.children.filter((c) => !mostrados.has(c) && permitido(c));
      if (ocultos.length === 0) continue;
      const id = `c:${u.id}`;
      const nivel = unidades.get(unidadUnion)!.nivel - 1;
      const unidad = crearContador(id, nivel, { unionId: u.id, sentido: "hijos", cantidad: ocultos.length });
      unidades.set(id, unidad);
      contadorDeHijos.set(u.id, unidad);
      continue;
    }
    const primerHijo = u.children.find((c) => mostrados.has(c));
    if (!primerHijo) continue;
    const padres = u.partners.filter(permitido);
    if (padres.length === 0) continue;
    const id = `a:${u.id}`;
    const unidad = crearContador(id, nivelDe(primerHijo) + 1, { unionId: u.id, sentido: "padres", cantidad: padres.length });
    unidades.set(id, unidad);
    const ancla = unidadDePersona.get(primerHijo)!;
    contadorDePadres.set(ancla, [...(contadorDePadres.get(ancla) ?? []), unidad]);
  }

  // --- Colocación: DFS desde el punto de vista, empujando por contornos ---
  const visitados = new Set<string>();

  /** Cada rama de ascendencia va a la altura del miembro del que cuelga, y se aparta hacia fuera. */
  const ramasDeAscendencia = (unidad: Unidad): { id: string; ancla: number; lado: number }[] => {
    const salida: { id: string; ancla: number; lado: number }[] = [];
    unidad.miembros.forEach((m, i) => {
      const uid = g.unionDeHijo.get(m);
      const id = uid && unidadDeUnion.get(uid);
      if (id) salida.push({ id, ...sitioDelMiembro(unidad, i) });
    });
    for (const c of contadorDePadres.get(unidad.id) ?? []) salida.push({ id: c.id, ancla: 0, lado: 1 });
    return salida;
  };

  const ramasDeDescendencia = (unidad: Unidad): string[] => {
    if (!unidad.id.startsWith("u:")) return [];
    const union = g.unionPorId.get(unidad.id.slice(2))!;
    const hijos = union.children.filter((c) => mostrados.has(c)).map((c) => unidadDePersona.get(c)!);
    const contador = contadorDeHijos.get(union.id);
    if (contador) hijos.push(contador.id);
    return hijos;
  };

  function colocar(unidad: Unidad): Bloque {
    visitados.add(unidad.id);
    let base = bloqueDeUnidad(unidad);

    // Los hijos, todos juntos y centrados enfrente.
    const descendencia = ramasDeDescendencia(unidad)
      .filter((id) => !visitados.has(id))
      .map((id) => colocar(unidades.get(id)!));
    if (descendencia.length > 0) {
      const paquete = empaquetar(descendencia);
      centrar(paquete, unidad.nivel - 1, 0);
      desplazar(paquete, separacionMinima(base, paquete, 0));
      base = fusionar(base, paquete);
    }

    // Cada rama de padres, a la altura de su miembro; si una rama colateral ya ocupa
    // ese sitio, se aparta hacia fuera hasta que las columnas dejan de solaparse.
    for (const { id, ancla, lado } of ramasDeAscendencia(unidad)) {
      if (visitados.has(id)) continue;
      const bloque = colocar(unidades.get(id)!);
      centrar(bloque, unidad.nivel + 1, ancla);
      desplazar(bloque, separacionMinima(base, bloque, lado));
      base = fusionar(base, bloque);
    }
    return base;
  }

  const bloque = colocar(unidades.get(unidadDePersona.get(puntoDeVista)!)!);

  // --- De unidades a coordenadas ---
  const lineaDirecta = new Set<string>([puntoDeVista, ...ascendientes(g, puntoDeVista), ...descendientes(g, puntoDeVista)]);
  const posicion = new Map<string, { x: number; y: number }>();
  const nodos: NodoLayout[] = [];
  const contadores: Contador[] = [];

  for (const unidad of unidades.values()) {
    const centro = bloque.y.get(unidad.id);
    if (centro === undefined) continue; // fuera del alcance del punto de vista
    // Los padres a la izquierda y los hijos a la derecha. El `|| 0` mata el −0 de la
    // columna del punto de vista, que no es igual a 0 para un test ni bonito en el SVG.
    const x = -unidad.nivel * ANCHO_COLUMNA || 0;
    if (unidad.contador) {
      contadores.push({ ...unidad.contador, x, y: centro });
      continue;
    }
    const arriba = centro - unidad.alto / 2;
    unidad.miembros.forEach((pid, i) => {
      const y = arriba + ALTO_NODO / 2 + i * (ALTO_NODO + SEP_PAREJA);
      posicion.set(pid, { x, y });
      nodos.push({
        id: pid,
        x,
        y,
        nivel: unidad.nivel,
        lineaDirecta: lineaDirecta.has(pid),
        esPuntoDeVista: pid === puntoDeVista,
        esPareja: unidad.id.startsWith("u:"),
      });
    });
  }

  const vinculos: Vinculo[] = [];
  for (const u of g.unionPorId.values()) {
    const partners = u.partners.map((p) => posicion.get(p)).filter((p): p is { x: number; y: number } => !!p);
    const pendientes = contadores.find((c) => c.unionId === u.id && c.sentido === "hijos");
    const enLugarDeLaPareja = contadores.find((c) => c.unionId === u.id && c.sentido === "padres");
    const hijos = u.children.map((c) => posicion.get(c)).filter((p): p is { x: number; y: number } => !!p);
    const ancla = partners.length > 0 ? { x: partners[0].x, y: media(partners.map((p) => p.y)) } : enLugarDeLaPareja;
    if (!ancla) continue;
    if (hijos.length === 0 && partners.length < 2 && !pendientes) continue;
    vinculos.push({
      unionId: u.id,
      tipo: u.tipo,
      x: ancla.x,
      y: ancla.y,
      pareja: partners.length >= 2 ? [partners[0].y, partners[1].y] : undefined,
      hijos: pendientes ? [...hijos, { x: pendientes.x, y: pendientes.y }] : hijos,
      colapsable:
        expandidas.has(u.id) &&
        (u.partners.some((p) => !nucleo.has(p)) || u.children.some((c) => mostrados.has(c) && !nucleo.has(c))),
    });
  }

  return { nodos, vinculos, contadores, limites: limitesDe(nodos, contadores) };
}

/**
 * Qué personas entran: el punto de vista con toda su ascendencia y descendencia, su
 * pareja con la ascendencia de ella, y las uniones abiertas a mano (sus dos partners,
 * sus hijos y las parejas de esos hijos). Lo demás queda detrás de un contador.
 */
function seleccionar(g: Grafo, pov: string, expandidas: Set<string>, permitidos: Set<string> | null): Set<string> {
  const dentro = new Set<string>([pov, ...ascendientes(g, pov), ...descendientes(g, pov)]);
  for (const d of [...dentro]) for (const c of parejaDirecta(g, d)) dentro.add(c);
  for (const pareja of parejaDirecta(g, pov)) for (const a of ascendientes(g, pareja)) dentro.add(a);

  // Una unión abierta solo cuenta si toca algo ya visible: así nada queda flotando
  // suelto al cambiar de punto de vista.
  let cambiado = true;
  while (cambiado) {
    cambiado = false;
    for (const uid of expandidas) {
      const union = g.unionPorId.get(uid);
      if (!union) continue;
      if (!union.partners.some((p) => dentro.has(p)) && !union.children.some((c) => dentro.has(c))) continue;
      const antes = dentro.size;
      for (const p of union.partners) dentro.add(p);
      for (const hijo of union.children) {
        dentro.add(hijo);
        for (const c of parejaDirecta(g, hijo)) dentro.add(c);
      }
      if (dentro.size !== antes) cambiado = true;
    }
  }

  if (!permitidos) return dentro;
  const filtrado = new Set<string>();
  for (const p of dentro) if (permitidos.has(p)) filtrado.add(p);
  return filtrado;
}

const altoDe = (miembros: number) => miembros * ALTO_NODO + (miembros - 1) * SEP_PAREJA;
const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const crearContador = (id: string, nivel: number, contador: Omit<Contador, "x" | "y">): Unidad => ({
  id,
  nivel,
  miembros: [],
  contador,
  alto: ALTO_CONTADOR,
});

function bloqueDeUnidad(u: Unidad): Bloque {
  return { y: new Map([[u.id, 0]]), contorno: new Map([[u.nivel, [-u.alto / 2, u.alto / 2]]]) };
}

function desplazar(b: Bloque, dy: number): void {
  if (dy === 0) return;
  for (const [id, y] of b.y) b.y.set(id, y + dy);
  for (const [nivel, [min, max]] of b.contorno) b.contorno.set(nivel, [min + dy, max + dy]);
}

function fusionar(a: Bloque, b: Bloque): Bloque {
  for (const [id, y] of b.y) a.y.set(id, y);
  for (const [nivel, [min, max]] of b.contorno) {
    const previo = a.contorno.get(nivel);
    a.contorno.set(nivel, previo ? [Math.min(previo[0], min), Math.max(previo[1], max)] : [min, max]);
  }
  return a;
}

function empaquetar(bloques: Bloque[]): Bloque {
  const acc = bloques[0];
  for (const b of bloques.slice(1)) {
    desplazar(b, empujeAbajo(acc, b));
    fusionar(acc, b);
  }
  return acc;
}

/** Cuánto hay que bajar `b` para que ninguna columna compartida se solape. */
function empujeAbajo(a: Bloque, b: Bloque): number {
  let dy = 0;
  for (const [nivel, [min]] of b.contorno) {
    const otro = a.contorno.get(nivel);
    if (otro) dy = Math.max(dy, otro[1] + SEP_UNIDAD - min);
  }
  return dy;
}

/**
 * El desplazamiento que deja `b` libre de `a`, hacia `lado` (−1 arriba, +1 abajo)
 * o hacia donde menos haya que moverse si da igual.
 */
function separacionMinima(a: Bloque, b: Bloque, lado: number): number {
  let abajo = 0;
  let arriba = 0;
  let choca = false;
  for (const [nivel, [min, max]] of b.contorno) {
    const otro = a.contorno.get(nivel);
    if (!otro) continue;
    if (min < otro[1] + SEP_UNIDAD && otro[0] < max + SEP_UNIDAD) choca = true;
    abajo = Math.max(abajo, otro[1] + SEP_UNIDAD - min);
    arriba = Math.min(arriba, otro[0] - SEP_UNIDAD - max);
  }
  if (!choca) return 0;
  if (lado > 0) return abajo;
  if (lado < 0) return arriba;
  return abajo <= -arriba ? abajo : arriba;
}

/** A qué altura cae el miembro `i` respecto al centro de su unidad, y hacia dónde se abre. */
function sitioDelMiembro(unidad: Unidad, i: number): { ancla: number; lado: number } {
  const ancla = -unidad.alto / 2 + ALTO_NODO / 2 + i * (ALTO_NODO + SEP_PAREJA);
  return { ancla, lado: unidad.miembros.length < 2 ? 1 : Math.sign(ancla) || 1 };
}

/** Deja el centro de la columna `nivel` de `b` a la altura `objetivo`. */
function centrar(b: Bloque, nivel: number, objetivo: number): void {
  const columna = b.contorno.get(nivel) ?? extremos(b);
  desplazar(b, objetivo - (columna[0] + columna[1]) / 2);
}

function extremos(b: Bloque): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [lo, hi] of b.contorno.values()) {
    min = Math.min(min, lo);
    max = Math.max(max, hi);
  }
  return [min, max];
}

function limitesDe(nodos: NodoLayout[], contadores: Contador[]): Layout["limites"] {
  const piezas = [
    ...nodos.map((n) => ({ x: n.x, y: n.y, ancho: ANCHO_NODO, alto: ALTO_NODO })),
    ...contadores.map((c) => ({ x: c.x, y: c.y, ancho: ANCHO_CONTADOR, alto: ALTO_CONTADOR })),
  ];
  if (piezas.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return {
    minX: Math.min(...piezas.map((p) => p.x - p.ancho / 2)),
    maxX: Math.max(...piezas.map((p) => p.x + p.ancho / 2)),
    minY: Math.min(...piezas.map((p) => p.y - p.alto / 2)),
    maxY: Math.max(...piezas.map((p) => p.y + p.alto / 2)),
  };
}
