// Motor de Reposo: la calle como función pura del tiempo, `escena(semilla, t)`. Sin React ni
// canvas: calibrar.ts la mide y calle/ la pinta.
//
// Cada objeto tiene un tipo (cómo cambia), un reloj (cada cuánto) y una visibilidad (cuánto
// se nota el cambio), independientes entre sí. El diff compara niveles enteros: lo que no
// cruza un escalón no cuenta.

const MS_HORA = 60 * 60 * 1000;
const MS_DIA = 24 * MS_HORA;
const MS_ESTACION = 91 * MS_DIA;

/** Arranque de todos los relojes, anterior a la publicación para que la calle se estrene ya
 *  crecida. **No se mueve nunca:** moverlo cambia la calle a todo el que ya la ha mirado. */
export const ORIGEN_MS = Date.UTC(2026, 0, 1);

export type Tipo = "monótono" | "cíclico" | "único";

export interface Slot {
  id: string;
  tipo: Tipo;
  /** Monótono: ms por escalón. Cíclico: ms del ciclo completo. Único: tiempo medio entre diferencias. */
  periodoMs: number;
  /** Monótono: techo de escalones (Infinity si no lo tiene). Cíclico: escalones del ciclo. Único: Infinity. */
  escalones: number;
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

  // La obra avanza por fases y termina para siempre: su último estado tiene que leerse como
  // edificio acabado, no como una obra parada.
  { id: "obra",       tipo: "monótono", periodoMs: 17.3 * MS_DIA,    escalones: 6, visibilidad: 0.70 },

  // Únicos: diferencias sueltas a intervalos irregulares; el periodo es el tiempo medio.
  { id: "cartel",     tipo: "único",    periodoMs: 200 * MS_DIA,  escalones: Infinity, visibilidad: 0.35 },
  { id: "grafiti",    tipo: "único",    periodoMs: 500 * MS_DIA,  escalones: Infinity, visibilidad: 0.50 },
  { id: "farola",     tipo: "único",    periodoMs: 550 * MS_DIA,  escalones: Infinity, visibilidad: 0.30 },
  { id: "banco",      tipo: "único",    periodoMs: 800 * MS_DIA,  escalones: Infinity, visibilidad: 0.60 },

  // Lento y evidente: lo que premia volver tras meses.
  { id: "arbol",      tipo: "monótono", periodoMs: MS_ESTACION * 1.5, escalones: Infinity, visibilidad: 0.80 },
];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
  /** Cíclico: offset de fase dentro del periodo. Monótono: offset de arranque. Único: instante del primero. */
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

/** Cuántas diferencias de este objeto han pasado ya. La semilla da los instantes uno tras
 *  otro, sin fin; el espaciado es irregular porque uno regular sería un cíclico. */
function diferenciasHasta(obj: Objeto, tMs: number): { n: number; ultimo: number } {
  const rng = mulberry32(obj.semillaHash);
  let t = obj.faseMs, n = 0, ultimo = -Infinity;
  while (t <= tMs) {
    n++;
    ultimo = t;
    t += obj.periodoMs * (0.45 + rng() * 1.1);
  }
  return { n, ultimo };
}

export function nivelDe(obj: Objeto, tMs: number): number {
  switch (obj.tipo) {
    case "monótono": {
      const n = Math.max(0, Math.floor((tMs - ORIGEN_MS + obj.faseMs) / obj.periodoMs));
      return Number.isFinite(obj.escalones) ? Math.min(n, obj.escalones - 1) : n;
    }
    case "cíclico": {
      const paso = obj.periodoMs / obj.escalones;
      const mod = (((tMs - obj.faseMs) % obj.periodoMs) + obj.periodoMs) % obj.periodoMs;
      return Math.floor(mod / paso);
    }
    case "único":
      return diferenciasHasta(obj, tMs).n;
  }
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

export interface Cambio {
  id: string;
  tipo: Tipo;
  visibilidad: number;
  nivelAntes: number;
  nivelAhora: number;
}

/** Contra lo que se vio de verdad, no contra un pasado recalculado: retocar un reloj del
 *  catálogo cambia también el pasado de la calle. */
export function diferencia(anterior: Snapshot, actual: NivelObjeto[]): Cambio[] {
  const cambios: Cambio[] = [];
  for (const obj of actual) {
    const antes = anterior[obj.id];
    if (antes !== undefined && antes !== obj.nivel) {
      cambios.push({ id: obj.id, tipo: obj.tipo, visibilidad: obj.visibilidad, nivelAntes: antes, nivelAhora: obj.nivel });
    }
  }
  return cambios;
}

// La vara con la que calibrar.ts mide el ritmo: lo sutil satura pronto y lo taparía.
export const UMBRAL_EVIDENTE = 0.6;
export const evidentes = (cambios: Cambio[]): Cambio[] => cambios.filter((c) => c.visibilidad >= UMBRAL_EVIDENTE);
