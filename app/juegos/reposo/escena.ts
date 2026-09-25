// Motor de Reposo: la calle como función pura del tiempo, `escena(semilla, t)`. Sin React ni
// canvas: calibrar.ts la mide y calle/ la pinta.
//
// Cada objeto tiene un tipo (cómo cambia), un reloj (cada cuánto) y una visibilidad (cuánto
// se nota el cambio), independientes entre sí. El diff compara niveles enteros: lo que no
// cruza un escalón no cuenta.
//
// **Nada crece para siempre:** lo que solo crece llega a su último dibujo y a partir de ahí el
// diff contaría cambios que no se ven. El árbol se poda y la obra se repite.

const MS_HORA = 60 * 60 * 1000;
const MS_DIA = 24 * MS_HORA;

/** Una sola calle para todos: cambiar la semilla cambia la calle. */
export const SEMILLA = "reposo";

/** Arranque de todos los relojes, anterior a la publicación para que la calle se estrene ya
 *  crecida. **No se mueve nunca:** moverlo cambia la calle a todo el que ya la ha mirado. */
export const ORIGEN_MS = Date.UTC(2026, 0, 1);

export type Tipo = "cíclico" | "único";

export interface Slot {
  id: string;
  tipo: Tipo;
  /** Cíclico: ms del ciclo completo. Único: tiempo medio entre diferencias. */
  periodoMs: number;
  /** Cíclico: escalones del ciclo. Único: Infinity. */
  escalones: number;
  /** Cíclico: cuánto dura cada escalón respecto a los demás. Sin él, todos igual. */
  pesos?: number[];
  /** 0..1, cuánto canta el cambio una vez ocurrido. */
  visibilidad: number;
}

// El catálogo es el mismo para cualquier semilla; la semilla solo pone la fase de cada objeto.
//
// **Un cíclico es un interruptor de n posiciones:** por largo que sea el hueco, la
// probabilidad de verlo distinto no pasa de (n-1)/n. Y lo que decide si un hueco lo pilla es
// el paso (periodo/escalones): con paso corto satura en un día. Por eso los evidentes llevan
// pasos de 2 a 14 días, y los de paso corto son sutiles.
//
// **Ningún periodo cíclico cae en una cadencia humana** (24 h, 7/14/30 días): quien volviera
// con esa cadencia no vería cambiar ese objeto nunca.
export const CATALOGO: Slot[] = [
  // Rápidos y sutiles: los caza quien busca.
  { id: "coche",      tipo: "cíclico",  periodoMs: 9 * MS_HORA,      escalones: 5, visibilidad: 0.20 },
  { id: "ropa",       tipo: "cíclico",  periodoMs: 2.2 * MS_DIA,     escalones: 4, visibilidad: 0.30 },
  { id: "puesto",     tipo: "cíclico",  periodoMs: 6.5 * MS_DIA,     escalones: 3, visibilidad: 0.45 },
  { id: "papelera",   tipo: "cíclico",  periodoMs: 4.1 * MS_DIA,     escalones: 3, visibilidad: 0.25 },
  { id: "buzon",      tipo: "cíclico",  periodoMs: 13.3 * MS_DIA,    escalones: 3, visibilidad: 0.35 },

  // Medios y evidentes: el grueso de lo que cambia entre un día y un mes.
  { id: "persiana",   tipo: "cíclico",  periodoMs: 10.2 * MS_DIA,  escalones: 5, visibilidad: 0.60 },
  { id: "contenedor", tipo: "cíclico",  periodoMs: 15.3 * MS_DIA,  escalones: 5, visibilidad: 0.65 },
  { id: "escaparate", tipo: "cíclico",  periodoMs: 20.4 * MS_DIA,  escalones: 5, visibilidad: 0.65 },
  { id: "bici",       tipo: "cíclico",  periodoMs: 25.6 * MS_DIA,  escalones: 5, visibilidad: 0.60 },
  { id: "toldo",      tipo: "cíclico",  periodoMs: 32.3 * MS_DIA,  escalones: 5, visibilidad: 0.60 },
  { id: "macetero",   tipo: "cíclico",  periodoMs: 35.8 * MS_DIA,  escalones: 5, visibilidad: 0.60 },
  { id: "terraza",    tipo: "cíclico",  periodoMs: 40.9 * MS_DIA,  escalones: 5, visibilidad: 0.65 },
  { id: "mesas",      tipo: "cíclico",  periodoMs: 45.3 * MS_DIA,  escalones: 5, visibilidad: 0.65 },
  { id: "cortina",    tipo: "cíclico",  periodoMs: 50.6 * MS_DIA,  escalones: 5, visibilidad: 0.60 },
  { id: "sombrilla",  tipo: "cíclico",  periodoMs: 60.7 * MS_DIA,  escalones: 5, visibilidad: 0.65 },
  { id: "letrero",    tipo: "cíclico",  periodoMs: 68.9 * MS_DIA,  escalones: 5, visibilidad: 0.60 },

  // Lentos y evidentes: lo que premia volver tras meses. La obra es una rehabilitación que se
  // repite —andamio, lona y el edificio de otro color—, casi siempre acabada; el árbol crece
  // unos tres años y lo podan.
  { id: "obra",       tipo: "cíclico",  periodoMs: 1290 * MS_DIA,  escalones: 9, visibilidad: 0.70,
    pesos: [1.3, 1.3, 8, 1.3, 1.3, 8, 1.3, 1.3, 8] },
  { id: "arbol",      tipo: "cíclico",  periodoMs: 1150 * MS_DIA,  escalones: 8, visibilidad: 0.80 },

  // Únicos: diferencias sueltas a intervalos irregulares; el periodo es el tiempo medio. El
  // cartel, lo bastante a menudo para que se vean pasar las temporadas.
  { id: "cartel",     tipo: "único",    periodoMs: 75 * MS_DIA,   escalones: Infinity, visibilidad: 0.45 },
  { id: "grafiti",    tipo: "único",    periodoMs: 500 * MS_DIA,  escalones: Infinity, visibilidad: 0.50 },
  { id: "farola",     tipo: "único",    periodoMs: 550 * MS_DIA,  escalones: Infinity, visibilidad: 0.30 },
  { id: "banco",      tipo: "único",    periodoMs: 800 * MS_DIA,  escalones: Infinity, visibilidad: 0.60 },
];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Aleatorio determinista a partir de un entero. Nunca `Math.random()`: la calle y lo que pasa
 *  en ella son funciones del tiempo, y lo que cambiara al repintar se tomaría por un cambio. */
export function azar(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Objeto extends Slot {
  /** Cíclico: offset de fase dentro del periodo. Único: instante del primero. */
  faseMs: number;
  /** El hash de (semilla, id): la fuente de todo lo aleatorio de este objeto. */
  semillaHash: number;
}

const cacheCalles = new Map<string, Objeto[]>();

/** El catálogo con las fases de una semilla. */
export function construirCalle(semilla: string): Objeto[] {
  const cacheada = cacheCalles.get(semilla);
  if (cacheada) return cacheada;
  const objetos = CATALOGO.map((slot): Objeto => {
    const semillaHash = hash32(`${semilla}:${slot.id}`);
    const rng = mulberry32(semillaHash);
    if (slot.tipo === "único") {
      // Nunca pegado al origen: ahí no hay visita anterior contra la que verla.
      return { ...slot, semillaHash, faseMs: ORIGEN_MS + slot.periodoMs * (0.1 + rng() * 0.8) };
    }
    return { ...slot, semillaHash, faseMs: Math.floor(rng() * slot.periodoMs) };
  });
  cacheCalles.set(semilla, objetos);
  return objetos;
}

/** Los instantes de las diferencias de un único, uno tras otro y sin fin. El espaciado es
 *  irregular porque uno regular sería un cíclico. */
function* instantes(obj: Objeto): Generator<number> {
  const rng = mulberry32(obj.semillaHash);
  for (let t = obj.faseMs; ; t += obj.periodoMs * (0.45 + rng() * 1.1)) yield t;
}

export function nivelDe(obj: Objeto, tMs: number): number {
  if (obj.tipo === "único") {
    let n = 0;
    for (const t of instantes(obj)) { if (t > tMs) break; n++; }
    return n;
  }
  const mod = (((tMs - obj.faseMs) % obj.periodoMs) + obj.periodoMs) % obj.periodoMs;
  if (!obj.pesos) return Math.floor(mod / (obj.periodoMs / obj.escalones));
  const total = obj.pesos.reduce((a, b) => a + b, 0);
  let x = (mod / obj.periodoMs) * total;
  const i = obj.pesos.findIndex((p) => (x -= p) < 0);
  return i < 0 ? obj.escalones - 1 : i;
}

/** Cuándo ocurrieron las `n` primeras diferencias de un único: el cartel elige su tema por la
 *  fecha en que lo pegaron. */
export function fechasDe(semilla: string, id: string, n: number): number[] {
  const obj = construirCalle(semilla).find((o) => o.id === id);
  const salida: number[] = [];
  if (!obj || obj.tipo !== "único") return salida;
  for (const t of instantes(obj)) { if (salida.length >= n) break; salida.push(t); }
  return salida;
}

export interface NivelObjeto {
  id: string;
  tipo: Tipo;
  nivel: number;
  visibilidad: number;
}

export function escena(semilla: string, tMs: number): NivelObjeto[] {
  return construirCalle(semilla).map((obj) => ({
    id: obj.id, tipo: obj.tipo, nivel: nivelDe(obj, tMs), visibilidad: obj.visibilidad,
  }));
}

/** Lo que se archiva en cada visita: el nivel visto de verdad, no el instante. */
export type Snapshot = Record<string, number>;

export function snapshot(niveles: NivelObjeto[]): Snapshot {
  return Object.fromEntries(niveles.map((n) => [n.id, n.nivel]));
}

/** Los objetos cuyo nivel ha cambiado. Contra lo que se vio de verdad, no contra un pasado
 *  recalculado: retocar un reloj del catálogo cambia también el pasado de la calle. */
export function diferencia(anterior: Snapshot, actual: NivelObjeto[]): NivelObjeto[] {
  return actual.filter((o) => anterior[o.id] !== undefined && anterior[o.id] !== o.nivel);
}

// La vara con la que calibrar.ts mide el ritmo: lo sutil satura pronto y lo taparía.
const UMBRAL_EVIDENTE = 0.6;
export const evidentes = (cambios: NivelObjeto[]) => cambios.filter((c) => c.visibilidad >= UMBRAL_EVIDENTE);
