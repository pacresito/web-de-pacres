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

import { ascendientes, consanguineos, descendientes, parejaDirecta, visibles, type Grafo } from "./grafo";
import { ordenarPareja } from "./personas";
import type { Union } from "./tree";

export const ANCHO_NODO = 228;
export const ALTO_NODO = 48;
export const ANCHO_CONTADOR = 116;
export const ALTO_CONTADOR = 30;
export const ANCHO_COLUMNA = 288; // de una generación a la siguiente
const SEP_PAREJA = 26; // entre los dos miembros de una pareja: por ahí pasa su vínculo, y ahí se lee de qué tipo es
const SEP_UNIDAD = 38; // entre unidades distintas: más que SEP_PAREJA, para que se note quién va con quién
const SEP_CARRIL = 18; // entre dos repartos que bajan por el mismo hueco
export const RADIO_SALTO = 5; // el saltito con que un trazo pasa por encima de otro sin tocarlo
const DESNIVEL_MINIMO = 10; // por debajo de esto el codo del reparto se lee como un defecto, no como un quiebro
const CARRILES = 3; // los que caben en el hueco (ANCHO_COLUMNA − ANCHO_NODO) sin meterse bajo un nodo

export interface OpcionesLayout {
  puntoDeVista: string;
  /** Uniones abiertas a mano: se pintan enteras, con sus partners y sus hijos. */
  expandidas: Set<string>;
  /** Uniones de las que solo se ha pedido la pareja: sus hijos siguen tras su contador. */
  parejas: Set<string>;
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
  /** Comparte sangre con el punto de vista: los tíos sí, sus parejas no. Incluye la línea directa. */
  consanguineo: boolean;
  esPuntoDeVista: boolean;
  /** Forma pareja aquí: es de quien los hijos heredan el apellido, y por eso lo lleva. */
  esPareja: boolean;
  /**
   * Uniones suyas cuya pareja no se pinta, con el borde por el que asomarlas. No ocupan
   * sitio —son una marca sobre el propio nodo—, así que no entran en el empaquetado.
   */
  pendientes: ParejaPendiente[];
}

/** La pareja que no está: por qué unión llega y por qué borde del nodo se la llama. */
export interface ParejaPendiente {
  unionId: string;
  arriba: boolean;
}

/** Una unión pintada: la pareja y el reparto hacia sus hijos visibles. */
export interface Vinculo {
  unionId: string;
  tipo: Union["tipo"];
  /** La unión acabó (divorcio o ruptura): el trazo va a rayas. */
  roto: boolean;
  /** Un eslabón de la línea directa del punto de vista: su trazo lleva el doble de peso. */
  directo: boolean;
  /** Ancla del reparto: el punto medio de la pareja, o el contador que la sustituye. */
  x: number;
  y: number;
  /** Por dónde baja el reparto hacia los hijos: el hueco entre columnas, con su carril. */
  canal: number;
  /** Alturas de los dos miembros, para la línea que los une. */
  pareja?: [number, number];
  /** Quiénes son, en el orden de `pareja`: hace falta para tratar distinto a cada mitad. */
  miembros?: [string, string];
  /** Verticales ajenas que cruza el tramo de salida de la unión, para saltarlas. */
  saltos: number[];
  /**
   * Adónde va cada trazo de descendencia y qué ancho tiene lo que hay allí, para tocarlo.
   * `recto` va de la unión al hijo de un tirón: el desnivel es tan corto que el codo se
   * leería como un defecto del dibujo y no como el quiebro que reparte hacia otra altura.
   */
  hijos: { id?: string; x: number; y: number; ancho: number; saltos: number[]; recto: boolean }[];
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
  /** Las uniones que los apilan: más de una si alguien se casó dos veces. */
  uniones: string[];
  contador?: Omit<Contador, "x" | "y">;
  /** Lo que ocupa a lo alto, que es por donde se empaqueta. */
  alto: number;
}

/** Altura del centro de cada unidad + hasta dónde llega cada columna, para no solapar. */
interface Bloque {
  y: Map<string, number>;
  contorno: Map<number, [number, number]>;
}

/** Una rama de padres: de qué miembro cuelga, hacia dónde se aparta y si por ahí sube la sangre. */
interface RamaArriba {
  id: string;
  ancla: number;
  lado: number;
  sube: boolean;
  /** El miembro del que cuelga comparte unidad con su pareja: entre los dos parten la columna. */
  enPareja: boolean;
}

/** El hijo por el que se ha llegado a una unidad, ya colocado con todo lo que trae detrás. */
interface Entrante {
  id: string;
  bloque: Bloque;
  lado: number;
  enPareja: boolean;
}

export function calcularLayout(g: Grafo, opciones: OpcionesLayout): Layout {
  const { puntoDeVista, expandidas, parejas, ocultarNoConectados } = opciones;
  const genPov = g.generacion.get(puntoDeVista);
  if (genPov === undefined) throw new Error(`Punto de vista desconocido: ${puntoDeVista}.`);
  const nivelDe = (pid: string) => genPov - g.generacion.get(pid)!;

  const permitidos = ocultarNoConectados ? visibles(g, puntoDeVista) : null;
  const mostrados = seleccionar(g, puntoDeVista, expandidas, parejas, permitidos);
  // Plegar una unión que ya estaría aquí no haría nada.
  const pedido = expandidas.size > 0 || parejas.size > 0;
  const nucleo = pedido ? nucleoDe(g, puntoDeVista, permitidos) : mostrados;

  // Unidades: una por unión mostrada, más las personas sueltas y los contadores
  const unidades = new Map<string, Unidad>();
  const unidadDePersona = new Map<string, string>();
  const unidadDeUnion = new Map<string, string>();

  for (const grupo of agruparUniones(g, mostrados)) {
    const id = `u:${grupo.uniones[0]}`;
    const { miembros } = grupo;
    unidades.set(id, { id, nivel: nivelDe(miembros[0]), miembros, uniones: grupo.uniones, alto: altoDe(miembros.length) });
    for (const uid of grupo.uniones) unidadDeUnion.set(uid, id);
    for (const p of miembros) unidadDePersona.set(p, id);
  }
  for (const p of mostrados) {
    if (unidadDePersona.has(p)) continue;
    const id = `p:${p}`;
    unidades.set(id, { id, nivel: nivelDe(p), miembros: [p], uniones: [], alto: altoDe(1) });
    unidadDePersona.set(p, id);
  }

  // Cada unión anuncia lo que se deja fuera: la pareja que no está y los hijos que no ha
  // traído si ya está en pantalla, o los padres que le faltan a quien sí lo está.
  const contadorDeHijos = new Map<string, Unidad>(); // unionId → unidad
  const contadorDePadres = new Map<string, Unidad[]>(); // unidadId del primer hijo → unidades
  const pendienteDePersona = new Map<string, ParejaPendiente[]>(); // el que sí está → sus parejas fuera
  const permitido = (pid: string) => !permitidos || permitidos.has(pid);

  for (const u of g.unionPorId.values()) {
    const unidadUnion = unidadDeUnion.get(u.id);
    if (unidadUnion) {
      // La pareja que falta se anuncia aunque no haya hijos detrás: si no, a quien no los
      // tuvo no hay forma de sacarlo, que es justo donde más se echa de menos.
      const falta = u.partners.find((p) => !mostrados.has(p) && permitido(p));
      if (falta) {
        const junto = u.partners.find((p) => mostrados.has(p))!;
        const [primero] = ordenarPareja(u.partners, (p) => g.personaPorId.get(p));
        const pendiente = { unionId: u.id, arriba: primero === falta };
        pendienteDePersona.set(junto, [...(pendienteDePersona.get(junto) ?? []), pendiente]);
      }
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

  // Colocación: DFS desde el punto de vista, empujando por contornos
  const visitados = new Set<string>();
  // La sangre del punto de vista es la espina del recorrido: por ahí no se sube apartando
  // a los padres, se les entrega lo ya colocado para que le hagan sitio entre sus hermanos.
  const espina = new Set<string>([puntoDeVista, ...ascendientes(g, puntoDeVista)]);
  /** Ramas que cuelgan de la espina, con la altura y el lado por los que se colgarán al final. */
  const diferidas: { unidadId: string; ramaId: string; nivel: number; ancla: number; lado: number; enPareja: boolean }[] = [];

  /** Cada rama de ascendencia va a la altura del miembro del que cuelga, y se aparta hacia fuera. */
  const ramasDeAscendencia = (unidad: Unidad): RamaArriba[] => {
    const salida: RamaArriba[] = [];
    const enPareja = unidad.miembros.length > 1;
    unidad.miembros.forEach((m, i) => {
      const uid = g.unionDeHijo.get(m);
      const id = uid && unidadDeUnion.get(uid);
      if (id) salida.push({ id, sube: espina.has(m), enPareja, ...sitioDelMiembro(unidad, i) });
    });
    for (const c of contadorDePadres.get(unidad.id) ?? []) {
      salida.push({ id: c.id, ancla: 0, lado: 1, sube: false, enPareja: false });
    }
    return salida;
  };

  const ramasDeDescendencia = (unidad: Unidad): string[] => {
    const salida: string[] = [];
    for (const uid of unidad.uniones) {
      for (const c of g.unionPorId.get(uid)!.children) if (mostrados.has(c)) salida.push(unidadDePersona.get(c)!);
      const contador = contadorDeHijos.get(uid);
      if (contador) salida.push(contador.id);
    }
    return salida;
  };

  /** `entrante` es el bloque ya colocado del hijo por el que se ha llegado: no se recoloca, se le hace sitio. */
  function colocar(unidad: Unidad, entrante?: Entrante): Bloque {
    visitados.add(unidad.id);
    let base = bloqueDeUnidad(unidad);

    // Los hijos, todos juntos y centrados enfrente, cada uno en su orden: el que ya venía
    // colocado ocupa el suyo y son los demás los que le rodean… salvo que venga con pareja.
    // Entonces parte la columna en dos, y sus hermanos van enteros al lado que a él le toca
    // —los del padre arriba, los de la madre abajo—: por el hueco que deja tiene que pasar
    // el trazo de la familia de ella, y repartirlos a su alrededor lo obliga a cruzarlos.
    const descendencia: Bloque[] = [];
    for (const id of alLadoQueLeToca(ramasDeDescendencia(unidad), entrante)) {
      if (id === entrante?.id) descendencia.push(entrante.bloque);
      else if (!visitados.has(id)) descendencia.push(colocar(unidades.get(id)!));
    }
    if (descendencia.length > 0) {
      const paquete = empaquetar(descendencia);
      centrar(paquete, unidad.nivel - 1, 0);
      desplazar(paquete, separacionMinima(base, paquete, 0));
      base = fusionar(base, paquete);
    }

    // Cada rama de padres, a la altura de su miembro; si una rama colateral ya ocupa
    // ese sitio, se aparta hacia fuera hasta que las columnas dejan de solaparse. Las que
    // salen de la espina esperan a que esté entera: mientras crece, lo colocado todavía
    // no es todo lo que habrá, y apartarse de un árbol a medias las manda demasiado lejos.
    const enLaEspina = entrante !== undefined || unidad.miembros.includes(puntoDeVista);
    const ramas = ramasDeAscendencia(unidad);
    const subida = enLaEspina ? ramas.find((r) => r.sube && !visitados.has(r.id)) : undefined;
    for (const { id, ancla, lado, enPareja } of ramas) {
      if (visitados.has(id) || id === subida?.id) continue;
      if (enLaEspina) {
        diferidas.push({ unidadId: unidad.id, ramaId: id, nivel: unidad.nivel + 1, ancla, lado, enPareja });
        continue;
      }
      const bloque = colocar(unidades.get(id)!);
      centrar(bloque, unidad.nivel + 1, ancla);
      if (enPareja) desplazar(bloque, aunLado(bloque.contorno.get(unidad.nivel), ancla, lado));
      desplazar(bloque, separacionMinima(base, bloque, lado));
      base = fusionar(base, bloque);
    }
    if (!subida) return base;
    return colocar(unidades.get(subida.id)!, {
      id: unidad.id,
      bloque: base,
      lado: subida.lado,
      enPareja: subida.enPareja,
    });
  }

  let bloque = colocar(unidades.get(unidadDePersona.get(puntoDeVista)!)!);
  // De la generación más lejana a la más cercana: la rama que cuelga de más arriba elige
  // sitio primero y la de al lado del punto de vista —casi siempre la política— se aparta.
  diferidas.sort((a, b) => b.nivel - a.nivel);
  for (const { unidadId, ramaId, nivel, ancla, lado, enPareja } of diferidas) {
    if (visitados.has(ramaId)) continue;
    const rama = colocar(unidades.get(ramaId)!);
    const altura = bloque.y.get(unidadId)! + ancla;
    centrar(rama, nivel, altura);
    // Aquí el hijo del que cuelga la rama ya está colocado en otro sitio, así que no puede
    // hacer sitio a sus hermanos desde dentro: se les corre entero al lado que a él le toca.
    if (enPareja) desplazar(rama, aunLado(rama.contorno.get(nivel - 1), altura, lado));
    desplazar(rama, separacionMinima(bloque, rama, lado));
    bloque = fusionar(bloque, rama);
  }

  // De unidades a coordenadas
  const lineaDirecta = new Set<string>([puntoDeVista, ...ascendientes(g, puntoDeVista), ...descendientes(g, puntoDeVista)]);
  const sangre = consanguineos(g, puntoDeVista);
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
        consanguineo: sangre.has(pid),
        esPuntoDeVista: pid === puntoDeVista,
        esPareja: unidad.id.startsWith("u:"),
        pendientes: bordesLibres(pendienteDePersona.get(pid) ?? [], i, unidad.miembros.length),
      });
    });
  }

  const vinculos: Vinculo[] = [];
  for (const u of g.unionPorId.values()) {
    const partners = u.partners
      .map((p) => ({ id: p, ...posicion.get(p) }))
      .filter((p): p is { id: string; x: number; y: number } => p.x !== undefined);
    const pendientes = contadores.find((c) => c.unionId === u.id && c.sentido === "hijos");
    const enLugarDeLaPareja = contadores.find((c) => c.unionId === u.id && c.sentido === "padres");
    const hijos = u.children
      .map((c) => ({ id: c, ...posicion.get(c) }))
      .filter((h): h is { id: string; x: number; y: number } => h.x !== undefined);
    const ancla = partners.length > 0 ? { x: partners[0].x, y: media(partners.map((p) => p.y)) } : enLugarDeLaPareja;
    if (!ancla) continue;
    if (hijos.length === 0 && partners.length < 2 && !pendientes) continue;
    vinculos.push({
      unionId: u.id,
      tipo: u.tipo,
      roto: u.roto === true,
      // Directa es la unión por la que pasa la línea, no la que toca a alguien de ella:
      // la de mis tíos tiene a mi abuelo detrás, pero por ella no se sube ni se baja.
      directo: u.partners.some((p) => lineaDirecta.has(p)) && u.children.some((c) => lineaDirecta.has(c)),
      x: ancla.x,
      y: ancla.y,
      canal: ancla.x + ANCHO_COLUMNA / 2,
      pareja: partners.length >= 2 ? [partners[0].y, partners[1].y] : undefined,
      miembros: partners.length >= 2 ? [partners[0].id, partners[1].id] : undefined,
      saltos: [],
      // Cada trazo muere en el borde de lo que va a tocar, y una pastilla es más estrecha.
      hijos: [
        ...hijos.map((h) => ({ ...h, ancho: ANCHO_NODO, saltos: [], recto: recto(h.y, ancla.y) })),
        ...(pendientes
          ? [{ x: pendientes.x, y: pendientes.y, ancho: ANCHO_CONTADOR, saltos: [], recto: recto(pendientes.y, ancla.y) }]
          : []),
      ],
      colapsable:
        (expandidas.has(u.id) || parejas.has(u.id)) &&
        (u.partners.some((p) => !nucleo.has(p)) || u.children.some((c) => mostrados.has(c) && !nucleo.has(c))),
    });
  }

  repartirCarriles(vinculos);
  marcarSaltos(vinculos);
  return { nodos, vinculos, contadores, limites: limitesDe(nodos, contadores) };
}

/**
 * Por dónde un tramo horizontal pasa por delante de la vertical de otro reparto. El dibujo
 * lo marca con un saltito: sin él, cruzarse y bifurcarse hacia dos hijos se ven igual, y lo
 * que en un árbol dice quién desciende de quién es justamente la bifurcación.
 */
function marcarSaltos(vinculos: Vinculo[]): void {
  const verticales = vinculos
    .filter((v) => v.hijos.length > 0)
    .map((v) => ({
      de: v,
      x: v.canal,
      desde: Math.min(v.y, ...v.hijos.map((h) => h.y)),
      hasta: Math.max(v.y, ...v.hijos.map((h) => h.y)),
    }));

  /** Las verticales ajenas que corta el tramo horizontal `y`, de `x1` a `x2`. Sin rozar los extremos. */
  const cortes = (suyo: Vinculo, y: number, x1: number, x2: number): number[] =>
    verticales
      .filter(({ de, x, desde, hasta }) => {
        if (de === suyo) return false;
        const dentro = x > Math.min(x1, x2) + RADIO_SALTO && x < Math.max(x1, x2) - RADIO_SALTO;
        return dentro && desde < y - RADIO_SALTO && hasta > y + RADIO_SALTO;
      })
      .map(({ x }) => x)
      .sort((a, b) => a - b);

  for (const v of vinculos) {
    v.saltos = cortes(v, v.y, v.x, v.canal);
    // El tramo recto va a la altura de la unión y no a la del hijo: así lo comparte con la
    // salida hacia los demás en vez de dibujar un raíl paralelo a tres píxeles.
    for (const h of v.hijos) h.saltos = cortes(v, h.recto ? v.y : h.y, h.recto ? v.x : v.canal, h.x - h.ancho / 2);
  }
}

/**
 * Dos repartos que bajan por el mismo hueco entre columnas y se pisan de altura se
 * dibujan sobre la misma vertical y se leen como un solo trazo: los tíos de una rama
 * parecen colgar del abuelo de la otra. Pasa por vecindad y no por parentesco —la mujer
 * de un hijo vive en la fila de los hijos de otra familia—, así que no se arregla
 * moviendo a nadie: al que llega después se le corre el trazo a un carril libre del hueco.
 */
function repartirCarriles(vinculos: Vinculo[]): void {
  const porHueco = new Map<number, Vinculo[]>();
  for (const v of vinculos) {
    if (v.hijos.length > 0) porHueco.set(v.canal, [...(porHueco.get(v.canal) ?? []), v]);
  }
  for (const grupo of porHueco.values()) {
    const alto = (v: Vinculo): [number, number] => [
      Math.min(v.y, ...v.hijos.map((h) => h.y)),
      Math.max(v.y, ...v.hijos.map((h) => h.y)),
    ];
    const ocupados: number[] = []; // hasta dónde llega lo dibujado en cada carril
    for (const v of [...grupo].sort((a, b) => alto(a)[0] - alto(b)[0])) {
      const [desde, hasta] = alto(v);
      let carril = ocupados.findIndex((y) => y < desde);
      if (carril < 0) carril = ocupados.length < CARRILES ? ocupados.length : ocupados.indexOf(Math.min(...ocupados));
      ocupados[carril] = hasta;
      // A un lado y al otro del centro del hueco: el trazo no debe acabar bajo un nodo.
      v.canal += Math.ceil(carril / 2) * SEP_CARRIL * (carril % 2 === 0 ? -1 : 1);
    }
  }
}

/**
 * Lo que se ve sin abrir nada: el suelo al que devuelve plegar, y el punto de partida
 * desde el que se cuenta qué uniones hay que abrir para llegar hasta alguien.
 */
export function nucleoDe(g: Grafo, pov: string, permitidos: Set<string> | null = null): Set<string> {
  return seleccionar(g, pov, new Set(), new Set(), permitidos);
}

/**
 * Qué personas entran: el punto de vista con toda su ascendencia y descendencia, las
 * parejas de todos ellos, la ascendencia de la suya propia, y las uniones abiertas a
 * mano —solo sus partners y sus hijos: la pareja de un hijo llega al abrir la unión de
 * ese hijo, no antes—. De las pedidas por el «+» entra solo la pareja. Lo demás queda
 * detrás de un contador.
 */
function seleccionar(
  g: Grafo,
  pov: string,
  expandidas: Set<string>,
  parejas: Set<string>,
  permitidos: Set<string> | null,
): Set<string> {
  const dentro = new Set<string>([pov, ...ascendientes(g, pov), ...descendientes(g, pov)]);
  for (const d of [...dentro]) for (const c of parejaDirecta(g, d)) dentro.add(c);
  for (const pareja of parejaDirecta(g, pov)) for (const a of ascendientes(g, pareja)) dentro.add(a);

  // Una unión abierta solo cuenta si toca algo ya visible: así nada queda flotando
  // suelto al cambiar de punto de vista.
  let cambiado = true;
  while (cambiado) {
    cambiado = false;
    for (const uid of new Set([...expandidas, ...parejas])) {
      const union = g.unionPorId.get(uid);
      if (!union) continue;
      if (!union.partners.some((p) => dentro.has(p)) && !union.children.some((c) => dentro.has(c))) continue;
      const antes = dentro.size;
      for (const p of union.partners) dentro.add(p);
      if (expandidas.has(uid)) for (const hijo of union.children) dentro.add(hijo);
      if (dentro.size !== antes) cambiado = true;
    }
  }

  if (!permitidos) return dentro;
  const filtrado = new Set<string>();
  for (const p of dentro) if (permitidos.has(p)) filtrado.add(p);
  return filtrado;
}

/**
 * Cada pareja pendiente sale por el borde en que ella iría, salvo que ese borde ya lo
 * ocupe la pareja pintada del nodo (el miembro `i` de una unidad de `total`) o el
 * pendiente anterior: entonces se va al otro, que es el que queda libre.
 */
function bordesLibres(pendientes: ParejaPendiente[], i: number, total: number): ParejaPendiente[] {
  const salida: ParejaPendiente[] = [];
  for (const { unionId, arriba } of pendientes) {
    let borde = arriba;
    if (total > 1 && (borde ? i > 0 : i < total - 1)) borde = !borde;
    if (salida.some((p) => p.arriba === borde)) borde = !borde;
    salida.push({ unionId, arriba: borde });
  }
  return salida;
}

/**
 * Los hermanos, con el que sube movido al extremo del lado que ocupa en su pareja: arriba
 * del todo si él va debajo de ella —así los suyos le quedan encima— y al revés si va
 * encima. Sin pareja no parte nada y se queda donde le toca por edad.
 */
function alLadoQueLeToca(ramas: string[], entrante?: Entrante): string[] {
  if (!entrante?.enPareja) return ramas;
  const otros = ramas.filter((id) => id !== entrante.id);
  return entrante.lado < 0 ? [...otros, entrante.id] : [entrante.id, ...otros];
}

/** Lo que hay que desplazar para dejar la columna `contorno` entera por encima o por debajo de `altura`. */
function aunLado(contorno: [number, number] | undefined, altura: number, lado: number): number {
  if (!contorno) return 0;
  const [min, max] = contorno;
  if (lado > 0) return Math.max(0, altura + ALTO_NODO / 2 + SEP_UNIDAD - min);
  return Math.min(0, altura - ALTO_NODO / 2 - SEP_UNIDAD - max);
}

/**
 * El hijo cae tan cerca de la altura de la unión que el codo no repartiría nada: el trazo
 * va derecho a él. Un hijo nunca queda exactamente enfrente —lo que se centra ante sus
 * padres es el paquete entero de hermanos, no uno de ellos— y ese resto de píxeles se
 * dibujaba como dos esquinas seguidas.
 */
const recto = (hijo: number, union: number) => Math.abs(hijo - union) < DESNIVEL_MINIMO;

const altoDe = (miembros: number) => miembros * ALTO_NODO + (miembros - 1) * SEP_PAREJA;
const media = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const crearContador = (id: string, nivel: number, contador: Omit<Contador, "x" | "y">): Unidad => ({
  id,
  nivel,
  miembros: [],
  uniones: [],
  contador,
  alto: ALTO_CONTADOR,
});

/**
 * Las uniones mostradas, agrupadas por la gente que comparten: quien se casó dos veces
 * sale una sola vez en el lienzo, con una pareja encima y otra debajo. Cada nueva unión
 * se cuelga por el extremo donde ya está quien la trae, así que el trazo de una pareja
 * sigue uniendo a dos vecinos.
 */
function agruparUniones(g: Grafo, mostrados: Set<string>): { uniones: string[]; miembros: string[] }[] {
  const grupos: { uniones: string[]; miembros: string[] }[] = [];
  const grupoDePersona = new Map<string, { uniones: string[]; miembros: string[] }>();

  for (const u of g.unionPorId.values()) {
    const suyos = ordenarPareja(
      u.partners.filter((p) => mostrados.has(p)),
      (id) => g.personaPorId.get(id),
    );
    if (suyos.length === 0) continue;
    const grupo = suyos.map((p) => grupoDePersona.get(p)).find((x) => x);
    if (!grupo) {
      grupos.push({ uniones: [u.id], miembros: suyos });
      for (const p of suyos) grupoDePersona.set(p, grupos[grupos.length - 1]);
      continue;
    }
    grupo.uniones.push(u.id);
    const pendientes = suyos.filter((p) => !grupoDePersona.has(p));
    if (u.partners.includes(grupo.miembros[0])) grupo.miembros.unshift(...pendientes);
    else grupo.miembros.push(...pendientes);
    for (const p of pendientes) grupoDePersona.set(p, grupo);
  }
  return grupos;
}

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
