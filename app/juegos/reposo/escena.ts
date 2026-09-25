// Motor de Reposo: la calle como función pura del tiempo, `escena(semilla, t)`.
// Puro, sin React ni canvas — calibrar.ts la mide y render.ts la pinta.
//
// Cada objeto lleva tres etiquetas independientes: su tipo (cómo cambia), su reloj (cada
// cuánto) y su visibilidad (cuánto canta el cambio una vez ocurrido) — no correlacionan: el
// árbol es lentísimo y evidente, el coche es rápido y casi invisible. El diff compara
// NIVELES, no valores continuos: lo que no cruza un escalón no cuenta, aunque haya avanzado.

const MS_HORA = 60 * 60 * 1000;
const MS_DIA = 24 * MS_HORA;
const MS_ESTACION = 91 * MS_DIA;
const MS_ANIO = 365 * MS_DIA;

/** Arranque de todo reloj: fase cero de los cíclicos, instante cero de los monótonos, borde
 *  inferior de la ventana de los únicos. Anterior a la publicación a propósito: la calle se
 *  estrena ya crecida, con árbol y sucesos, en vez de recién nacida y vacía. **No se mueve
 *  nunca:** moverlo cambia la calle a todo el que ya la ha mirado. */
export const ORIGEN_MS = Date.UTC(2026, 0, 1);

export type Tipo = "monótono" | "cíclico" | "único";

export interface Slot {
  id: string;
  tipo: Tipo;
  /** Monótono: ms por escalón. Cíclico: ms del ciclo completo. Único: tiempo medio entre sucesos. */
  periodoMs: number;
  /** Monótono: techo de escalones (Infinity si no lo tiene). Cíclico: escalones del ciclo. Único: Infinity. */
  escalones: number;
  /** 0..1, cuánto canta el cambio una vez ocurrido. */
  visibilidad: number;
}

// 24 objetos que cubren los tres tipos, de horas a años. El catálogo es el mismo para
// cualquier semilla — lo que varía con ella es la fase de cada uno (`construirCalle`).
//
// Dos cosas que gobiernan los números de aquí y no se ven mirándolos:
//
// **Un cíclico no es un contador, es un interruptor de n posiciones.** Por grande que sea el
// hueco, la probabilidad de pillarlo distinto no pasa de (n-1)/n; el monótono y el único sí
// se acercan a la certeza. Y lo que decide si un hueco ya lo pilla no es el periodo, es el
// **paso** (periodo/escalones): con paso corto, un hueco de un día ya cruza de sobra y el
// objeto satura ahí, sin dejar nada que crecer hasta el mes. Por eso los evidentes, que son
// los que hacen crecer lo que se ve del día al mes, llevan el paso de 2 a 14 días, y los de
// paso corto se quedan entre los sutiles, donde saturar pronto no se nota.
//
// **Ningún periodo cíclico cae en una cadencia humana** (24 h, 7/14/30 días): quien volviera
// con esa cadencia sería ciego a ese objeto para siempre. Eso es la regla 5, pero como
// accidente del catálogo en vez de como lección — el aliasing que enseña es el que sale de
// que cada objeto tenga SU ritmo, no el de un reloj clavado al calendario del jugador.
export const CATALOGO: Slot[] = [
  // Rápidos y sutiles: los caza quien busca.
  { id: "coche",      tipo: "cíclico",  periodoMs: 9 * MS_HORA,      escalones: 5, visibilidad: 0.20 },
  { id: "ropa",       tipo: "cíclico",  periodoMs: 2.2 * MS_DIA,     escalones: 4, visibilidad: 0.30 },
  { id: "puesto",     tipo: "cíclico",  periodoMs: 6.5 * MS_DIA,     escalones: 3, visibilidad: 0.45 },
  { id: "papelera",   tipo: "cíclico",  periodoMs: 4.1 * MS_DIA,     escalones: 3, visibilidad: 0.25 },
  { id: "buzon",      tipo: "cíclico",  periodoMs: 13.3 * MS_DIA,    escalones: 3, visibilidad: 0.35 },

  // Medios y evidentes: el grueso de lo que se ve, de un día a un mes. El paso (periodo /
  // escalones) va de 2 a 14 días — quien vuelve a diario solo pilla los de paso corto, quien
  // vuelve al mes los pilla todos.
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

  // El único objeto que se muere a propósito: una obra concreta arranca con la calle, avanza
  // por fases y termina para siempre. Después no vuelve a cambiar nunca — y está bien, porque
  // lo que deja es un edificio que antes no estaba. Es el premio, no un fallo; pero al
  // pintarla, que se note terminada, o queda como señuelo permanente de un fallo.
  { id: "obra",       tipo: "monótono", periodoMs: 17.3 * MS_DIA,    escalones: 6, visibilidad: 0.70 },

  // Únicos: sucesos sueltos, cada uno pasa una vez y no vuelve. El periodo es el tiempo medio
  // hasta el siguiente — un goteo irregular que no se acaba, no un evento con fecha.
  { id: "cartel",     tipo: "único",    periodoMs: 200 * MS_DIA,  escalones: Infinity, visibilidad: 0.35 },
  { id: "grafiti",    tipo: "único",    periodoMs: 500 * MS_DIA,  escalones: Infinity, visibilidad: 0.50 },
  { id: "farola",     tipo: "único",    periodoMs: 550 * MS_DIA,  escalones: Infinity, visibilidad: 0.30 },
  { id: "banco",      tipo: "único",    periodoMs: 800 * MS_DIA,  escalones: Infinity, visibilidad: 0.60 },

  // Lentos y evidentes: la razón de existir de un hueco de estaciones o años. La fachada se
  // apaga durante años y un día la repintan, así que su ciclo es de años y su paso de meses:
  // con techo en vez de ciclo se apagaría del todo el primer año y medio y no volvería a
  // cambiar nunca — un objeto muerto pintado en mitad de la calle.
  { id: "fachada",    tipo: "cíclico",  periodoMs: 7.3 * MS_ANIO,     escalones: 6,        visibilidad: 0.70 },
  { id: "arbol",      tipo: "monótono", periodoMs: MS_ESTACION * 1.5, escalones: Infinity, visibilidad: 0.80 },
  { id: "comercio",   tipo: "único",    periodoMs: 3 * MS_ANIO,       escalones: Infinity, visibilidad: 0.85 },
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

/** Instancia el catálogo para una semilla: misma forma, fases distintas. Memoizado porque es
 *  la misma calle en cada llamada, no porque haga falta para la pureza. */
export function construirCalle(semilla: string): Objeto[] {
  const cacheada = cacheCalles.get(semilla);
  if (cacheada) return cacheada;
  const objetos = CATALOGO.map((slot): Objeto => {
    const semillaHash = hash32(`${semilla}:${slot.id}`);
    const rng = mulberry32(semillaHash);
    if (slot.tipo === "único") {
      // Nunca en el borde: un suceso que cae justo en el origen es indistinguible de uno que
      // nunca estuvo, porque no hay visita anterior con la que hacer diff contra él.
      return { ...slot, semillaHash, faseMs: ORIGEN_MS + slot.periodoMs * (0.1 + rng() * 0.8) };
    }
    return { ...slot, semillaHash, faseMs: Math.floor(rng() * slot.periodoMs) };
  });
  cacheCalles.set(semilla, objetos);
  return objetos;
}

/** Cuántos sucesos de este objeto han pasado ya. Los instantes los va dando la semilla uno
 *  tras otro, sin lista que agotar: el suceso nº 40 existe aunque falten décadas para él, por
 *  la misma razón por la que el árbol nunca deja de crecer. Cada suceso pasa una vez y no
 *  vuelve —la tienda que cerró no reabre—, pero la calle no se queda sin sucesos.
 *  El espaciado es irregular a propósito: un goteo regular sería un cíclico con otro nombre. */
function sucesosHasta(obj: Objeto, tMs: number): { n: number; ultimo: number } {
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
      return sucesosHasta(obj, tMs).n;
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

/** El diff va contra lo que el jugador vio de verdad, nunca contra un pasado recalculado:
 *  tocar un reloj del catálogo cambiaría el pasado de la calle, no solo su futuro, y el
 *  snapshot archivado es lo único que evita que la siguiente visita mienta sobre eso. */
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

// Lo evidente es la vara del ritmo en calibrar.ts: lo sutil satura pronto y taparía si lo que
// se ve crece de verdad con el hueco.
export const UMBRAL_EVIDENTE = 0.6;
export const evidentes = (cambios: Cambio[]): Cambio[] => cambios.filter((c) => c.visibilidad >= UMBRAL_EVIDENTE);
