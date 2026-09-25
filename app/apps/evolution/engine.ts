// Motor de evolution: bichos que salen de casa cada mañana, buscan comida, la traen a cuestas y
// crían con lo que sobra de su despensa. Lógica pura: render.ts lo pinta y page.tsx lo conecta.
//
// Reglas del modelo, que el resto del archivo cumple:
// 1. Ningún gen con su óptimo en un extremo del rango, y ninguno decorativo.
// 2. Ningún coeficiente inventado: todo acoplamiento sale de masa, energía o geometría. Las cifras
//    de las constantes salen de `medir/costes.medir.ts`.
// 3. Determinismo: PRNG con semilla, paso fijo, orden explícito y en el tick solo `+ - * /` y
//    `sqrt`, que son exactos por IEEE. Nada de trigonometría, `exp`, `pow` ni `cbrt`.
// 4. Las estrategias malas no se arreglan aquí: solo la indefinición numérica (vector nulo =
//    mantener el rumbo).
//
// Cambiar el motor caduca la lista del dado (`semillas.ts`): se vuelve a pasar su medidor.

import { centrado, hashSemilla, azarCon, sig, unidad, type Azar } from "./azar";
import { FORMAS, MEDIDAS, chocar, enFranja, haciaCasa, isla, puntoComida, puntoEnCasa, seVe, type Forma } from "./formas";

// ─── Física ───────────────────────────────────────────────────────────────────

/** masa = radio³, igual para un bicho que para un bocado. */
export const masaDe = (radio: number): number => radio * radio * radio;

export const RADIO_COMIDA = 3;
export const E_COMIDA = masaDe(RADIO_COMIDA);

/** Capacidad de la despensa, en múltiplos de la masa: el cuerpo es el granero. */
export const CAP_RESERVA = 1;
export const C_BASAL = 4e-4;      // metabolismo por unidad de masa y tick
export const C_EMPUJE = 2.5e-3;   // moverse: masa · C_EMPUJE · v²
export const C_VISION = 7e-7;     // ver: masa · C_VISION · visión²
export const GIRO = 24;           // tangente del giro máximo por tick = GIRO / masa
export const EFICIENCIA = 0.6;    // de la masa de la presa; el resto se pierde

/** Ticks por bocado al descargar en casa. Elegida por el ojo: cuesta tiempo, no energía. */
export const TICKS_BOCADO = 5;

/** Gira el rumbo hacia `(dx,dy)` como mucho lo que permite la masa, por rotación compleja. */
export function girar(b: { hx: number; hy: number }, dx: number, dy: number, masa: number) {
  const t = GIRO / masa;
  const c = 1 / Math.sqrt(1 + t * t), s = t * c;
  const cos = b.hx * dx + b.hy * dy;
  if (cos >= c) { b.hx = dx; b.hy = dy; return; }
  const signo = b.hx * dy - b.hy * dx >= 0 ? 1 : -1;
  const nx = b.hx * c - b.hy * s * signo;
  const ny = b.hx * s * signo + b.hy * c;
  const n = Math.sqrt(nx * nx + ny * ny);   // renormaliza: el error se acumularía
  b.hx = nx / n; b.hy = ny / n;
}

/** Raíz cúbica por Newton desde el radio de ahora: `Math.cbrt` no está fijado por IEEE. */
export function raizCubica(masa: number, desde: number): number {
  let r = desde > 0 ? desde : 1;
  for (let i = 0; i < 8; i++) r = (2 * r + masa / (r * r)) / 3;
  return r;
}

// ─── Estadística ──────────────────────────────────────────────────────────────

export function mediana(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Extremos, deciles 1 y 9 y mediana de una población; `null` si no queda nadie. */
export function banda(xs: number[]): { min: number; lo: number; med: number; hi: number; max: number } | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const en = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  return { min: s[0], lo: en(0.1), med: mediana(s), hi: en(0.9), max: s[s.length - 1] };
}

// ─── Genoma y mundo ───────────────────────────────────────────────────────────

/** Seis genes, y todos se ven en el cuerpo. */
export const RASGOS = [
  "empuje", "talla", "vision", "sociabilidad", "fiereza", "retorno",
] as const;
export type Rasgo = (typeof RASGOS)[number];
export type Genoma = Record<Rasgo, number>;

export const nombreDe = (r: Rasgo): string => (r === "vision" ? "visión" : r);

/** El único gen con signo: muta sumando y se mide en unidades, no en octavas. */
export const signado = (r: Rasgo): boolean => r === "sociabilidad";

/** Qué paga y qué cobra cada gen. */
export const TABLA: Record<Rasgo, { paga: string; cobra: string }> = {
  empuje: { paga: "coste ∝ empuje² · radio; la despensa del día es la misma para todos", cobra: "velocidad = empuje / radio, y con carga menos" },
  talla: { paga: "coste ∝ masa con la misma despensa que el pequeño; giras peor", cobra: "derecho a comerte a quien sea un 20% menor" },
  vision: { paga: "coste ∝ visión²", cobra: "detectas a distancia ∝ radio del otro" },
  sociabilidad: { paga: "competencia por el mismo bocado", cobra: "peso al centro de masa de los visibles, con signo" },
  fiereza: { paga: "riesgo, perseguir no es recoger y comer deja quieto dos segundos", cobra: "peso de atracción al menor visible" },
  retorno: { paga: "volver pronto es dejar de buscar", cobra: "peso hacia casa cuando ya llevas comida" },
};

export type Config = {
  /** La sortea la semilla; `ancho` y `alto` salen de ella salvo que se fijen. */
  forma: Forma;
  ancho: number;
  alto: number;
  /** Bocados al día: el techo de la población. Lo sortea la semilla de `URNA`. */
  comidas: number;
  censoInicial: number;
  ticksDia: number;
  /** Capacidad de la despensa, en múltiplos de la masa. */
  capReserva: number;
  /** Ancho de la franja de casa: pisarla es estar a salvo; su línea media, haber llegado. */
  casa: number;
  caza: boolean;
  /** Cuántas veces el radio del otro hay que medir para comérselo. */
  boca: number;
  /** Lo que dura comerse a otro. Elegida por el ojo (`medir/dentellada.medir.ts`). */
  ticksPresa: number;
  /** Veces la despensa con que sale el fundador, al que nadie se la paga. */
  despensaFundador: number;
  /** Factor máximo de una mutación: `1 + |centrado| · tasa`. Tocarla remide FUNDADOR, RECORRIDO y SEMI. */
  tasa: number;
  /** Lo que suma o resta una mutación de la sociabilidad: 0,75 · `tasa`. */
  paso: number;
  /** Días que vive un bicho; `Infinity` es no envejecer. */
  vida: number;
  fundador: Genoma;
};

/**
 * El mismo en todas las semillas, y en el centro del recorrido medido: es el ancla de la escala
 * con la que se pinta cada gen, así que nace liso. Iterado con `medir/convergencia.medir.ts`.
 */
export const FUNDADOR: Genoma = {
  empuje: 2.5, talla: 2.19, vision: 31.11, sociabilidad: -0.06, fiereza: 1.79, retorno: 3.33,
};
/** Los climas que puede sortear una semilla, en bocados al día. */
export const URNA = [25, 40, 55];
export const CONFIG: Config = {
  forma: "caja", ancho: 288, alto: 200,
  comidas: 40, censoInicial: 1,
  ticksDia: 1000, capReserva: CAP_RESERVA, casa: 18,
  caza: true, boca: 1.2, ticksPresa: 120,
  despensaFundador: 5, tasa: 0.05, paso: 0.0375,
  vida: 10,
  fundador: FUNDADOR,
};

/** El mundo en el que miden los medidores: con la forma que sortee cada semilla, la escala se movería. */
export const REFERENCIA = { forma: "caja" } as const satisfies Partial<Config>;

export type Bicho = {
  id: number; idMadre: number; gen: number;
  /** Primer día en el campo: la edad es `dia - nacido`. */
  nacido: number;
  x: number; y: number; hx: number; hy: number;
  radio: number; masa: number;
  /** Bocados a cuestas, que pesan. */
  carga: number;
  /** Id de quien tiene en la boca, o 0; `restan` ticks para tragarlo. */
  muerde: number;
  restan: number;
  /** Id de quien lo tiene en la boca, o 0. Preso no se vive el tick. */
  preso: number;
  reserva: number;
  vivo: boolean;
  /** Pisa la franja de casa: ni caza ni es cazado ni se le ve. */
  aSalvo: boolean;
  /** Pasada la línea media de casa: ahí se descarga, se duerme y se cría. */
  enCasa: boolean;
  /** En casa y sin nada a la vista. Solo lo lee el pintado. */
  dormido: boolean;
  /** Crías de esta noche. */
  hijos: number;
  /** Crías de toda su vida. */
  crias: number;
  muerte: Muerte | null;
  /** Nacido esta noche. */
  recien: boolean;
  g: Genoma;
};

export type Muerte = "comido" | "hambre" | "vejez";

/** Dónde se comieron a alguien. Dura `MARCA` ticks. */
export type Marca = { x: number; y: number; r: number; t: number };

/** El cuerpo de quien murió de hambre o de viejo, disolviéndose. */
export type Resto = { b: Bicho; restan: number };

/** Ticks que tarda un cuerpo en disolverse. */
export const DISOLUCION = 180;

export type Mundo = {
  cfg: Config;
  azar: Azar;
  /** Días completos: todos crían a la vez, así que son generaciones. */
  dia: number;
  /** Descargas del día. */
  viajes: number;
  t: number;
  /** Lo que duró el último día. */
  duracion: number;
  bichos: Bicho[];
  comida: { x: number; y: number }[];
  siguienteId: number;
  /** El día está cerrado y espera a `amanecer`: la noche dura lo que decida quien mira. */
  noche: boolean;
  /**
   * Distancia genética típica de cada isla a su centro: por debajo, dos bichos son de los mismos
   * y no se comen. Sale de la población cada mañana.
   */
  especie: number[];
  marcas: Marca[];
  restos: Resto[];
  extinto: boolean;
  /** `fuera` son noches a la intemperie, no muertes. */
  cuenta: { nacidos: number; hambre: number; fuera: number; comidos: number; vejez: number };
};

/** De 0, nacido hoy, a 1, se muere hoy. Sin vejez es 0. */
export const edadDe = (m: Mundo, b: Bicho): number =>
  Number.isFinite(m.cfg.vida) ? Math.min(1, (m.dia - b.nacido) / m.cfg.vida) : 0;

/** Masa a mover: la propia, la carga y la reserva que no cabe en el cuerpo. */
const masaCargada = (c: Config, b: Bicho): number =>
  b.masa + b.carga * E_COMIDA + Math.max(0, b.reserva - c.capReserva * b.masa);
const radioCargado = (c: Config, b: Bicho): number => raizCubica(masaCargada(c, b), b.radio);

export const formaDe = (semilla: string): Forma => FORMAS[hashSemilla(`forma ${semilla}`) % FORMAS.length];

export function crearMundo(semilla: string, cfg: Partial<Config> = {}): Mundo {
  const c: Config = { ...CONFIG, ...cfg };
  const azar = azarCon(semilla);
  // El clima se sortea siempre, aunque se haya fijado: así el resto del azar no cambia.
  const clima = URNA[Math.floor(sig(azar) * URNA.length)];
  if (cfg.comidas === undefined) c.comidas = clima;
  if (cfg.forma === undefined) c.forma = formaDe(semilla);
  if (cfg.ancho === undefined) c.ancho = MEDIDAS[c.forma].ancho;
  if (cfg.alto === undefined) c.alto = MEDIDAS[c.forma].alto;
  const m: Mundo = {
    cfg: c, azar, dia: 0, viajes: 0, t: 0, duracion: 0, bichos: [], comida: [], siguienteId: 1,
    noche: false, especie: [0], marcas: [], restos: [],
    extinto: false, cuenta: { nacidos: 0, hambre: 0, fuera: 0, comidos: 0, vejez: 0 },
  };
  // Una fundadora por isla.
  if (cfg.censoInicial === undefined && c.forma === "islas") c.censoInicial = 2;
  for (let i = 0; i < c.censoInicial; i++) {
    nacer(m, { ...c.fundador }, -1, 0, puntoEnCasa(c, azar, i)).reserva *= c.despensaFundador;
  }
  amanecer(m);
  return m;
}

function nacer(m: Mundo, g: Genoma, idMadre: number, gen: number, donde: [number, number]): Bicho {
  const [x, y] = donde;
  const [hx, hy] = unidad(m.azar);
  const b: Bicho = {
    id: m.siguienteId++, idMadre, gen, nacido: m.dia, x, y, hx, hy,
    // Nace con la despensa llena: eso es lo que cuesta un hijo, y va con su masa.
    radio: g.talla, masa: masaDe(g.talla), carga: 0, reserva: m.cfg.capReserva * masaDe(g.talla),
    muerde: 0, restan: 0, preso: 0,
    vivo: true, aSalvo: false, enCasa: false, dormido: false, hijos: 0, crias: 0, muerte: null, recien: false, g,
  };
  m.bichos.push(b);
  return b;
}

/** Diferencia relativa media gen a gen: adimensional, para que ningún gen tape a los demás. */
export function distancia(a: Genoma, b: Genoma): number {
  let s = 0;
  for (const r of RASGOS) {
    const d = Math.abs(a[r] - b[r]), suma = Math.abs(a[r]) + Math.abs(b[r]);
    if (suma > 1e-9) s += d / suma;
  }
  return s / RASGOS.length;
}

/** Distancia mediana de la población a su genoma mediano. */
function dispersion(bichos: Bicho[]): number {
  if (bichos.length < 2) return 0;
  const centro = {} as Genoma;
  for (const r of RASGOS) centro[r] = mediana(bichos.map((b) => b.g[r]));
  return mediana(bichos.map((b) => distancia(b.g, centro)));
}

/** Comida nueva y todos despiertan donde se durmieron. La comida no se acumula. */
export function amanecer(m: Mundo) {
  const c = m.cfg;
  m.t = 0;
  m.viajes = 0;
  m.noche = false;
  m.comida.length = 0;
  m.marcas.length = 0;
  m.especie = c.forma === "islas"
    ? [0, 1].map((i) => dispersion(m.bichos.filter((b) => isla(c, b.x) === i)))
    : [dispersion(m.bichos)];
  const margen = c.casa + RADIO_COMIDA;
  for (let i = 0; i < c.comidas; i++) {
    const [x, y] = puntoComida(c, margen, RADIO_COMIDA, m.azar, i + m.dia);
    m.comida.push({ x, y });
  }
  for (const b of m.bichos) {
    b.aSalvo = false;
    b.enCasa = false;
    b.dormido = false;
    b.hijos = 0;
    b.recien = false;
    // En casa se sale mirando al campo: se refleja la componente del rumbo que apunta al muro.
    if (enFranja(c, b.x, b.y)) {
      const [dx, dy] = haciaCasa(c, b.x, b.y);
      const p = b.hx * dx + b.hy * dy;
      if (p > 0) { b.hx -= 2 * p * dx; b.hy -= 2 * p * dy; }
    }
  }
}

/**
 * Suma de vectores, nunca una pila de `if`: comida visible, menor visible, centro de masa de los
 * visibles y casa, cada uno por su peso. Devuelve si ha visto algo.
 */
function decidir(m: Mundo, b: Bicho, radioMax: number, luz: number, cae: boolean): boolean {
  const g = b.g;
  let sx = 0, sy = 0;

  const alcanceC = g.vision * luz * RADIO_COMIDA;
  let d2c = alcanceC * alcanceC, cx = 0, cy = 0, hay = false;
  for (const c of m.comida) {
    const dx = c.x - b.x, dy = c.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 < d2c && d2 > 1e-9 && seVe(m.cfg, b.x, b.y, c.x, c.y)) { d2c = d2; cx = dx; cy = dy; hay = true; }
  }
  if (hay) { const d = Math.sqrt(d2c); sx += cx / d; sy += cy / d; }

  let mMenor = Infinity, xMenor = 0, yMenor = 0;
  let sumM = 0, sumX = 0, sumY = 0;
  const alcanceB = g.vision * luz * radioMax;
  // El que está en una boca no está en el mundo: ningún gen puede leer si una presa ya es de otro.
  for (const o of m.bichos) {
    if (o === b || !o.vivo || o.aSalvo || o.preso) continue;
    const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
    if (d2 > alcanceB * alcanceB) continue;
    const alcance = g.vision * luz * o.radio;
    if (d2 > alcance * alcance) continue;
    if (!seVe(m.cfg, b.x, b.y, o.x, o.y)) continue;
    sumM += o.masa; sumX += o.masa * dx; sumY += o.masa * dy;
    if (o.masa < mMenor) { mMenor = o.masa; xMenor = dx; yMenor = dy; }
  }
  if (mMenor < b.masa) {
    const d = Math.sqrt(xMenor * xMenor + yMenor * yMenor);
    if (d > 1e-6) {
      const w = g.fiereza * ((b.masa - mMenor) / (b.masa + mMenor));
      sx += (xMenor / d) * w; sy += (yMenor / d) * w;
    }
  }
  if (sumM > 0) {
    const dx = sumX / sumM, dy = sumY / sumM;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 1e-6) { sx += (dx / d) * g.sociabilidad; sy += (dy / d) * g.sociabilidad; }
  }

  // A casa tiran la carga y, mientras cae la luz, la oscuridad.
  const [hx, hy] = haciaCasa(m.cfg, b.x, b.y);
  const w = g.retorno * (b.carga + (cae ? 1 - luz : 0));
  if (w > 0) { sx += hx * w; sy += hy * w; }

  const vio = hay || sumM > 0;
  const n2 = sx * sx + sy * sy;
  if (n2 < 1e-12) return vio;
  const n = Math.sqrt(n2);
  girar(b, sx / n, sy / n, masaCargada(m.cfg, b));
  return vio;
}

/**
 * Multiplicativa en los genes positivos —log-normal sin `exp`, y sin sesgo de recorte en el
 * cero— y aditiva en el que lleva signo.
 */
export function mutar(a: Azar, g: Genoma, c: Config): Genoma {
  const h: Genoma = { ...g };
  for (const r of RASGOS) {
    const n = centrado(a);
    if (signado(r)) { h[r] = g[r] + n * c.paso; continue; }
    const f = 1 + Math.abs(n) * c.tasa;
    h[r] = n >= 0 ? g[r] * f : g[r] / f;
    if (h[r] < 1e-6) h[r] = 1e-6;
  }
  return h;
}

function comer(m: Mundo, dep: Bicho, presa: Bicho) {
  dep.reserva += presa.masa * EFICIENCIA;
  dep.carga += presa.carga;
  presa.vivo = false;
  presa.muerte = "comido";
  m.marcas.push({ x: presa.x, y: presa.y, r: presa.radio, t: m.t });
  m.cuenta.comidos++;
  dep.muerde = 0; dep.restan = 0;
  if (presa.muerde) soltar(m, presa);
}

const presaDe = (m: Mundo, b: Bicho): Bicho | null => m.bichos.find((o) => o.id === b.muerde) ?? null;

/** Suelta viva a la presa: un mordisco interrumpido no mata. */
function soltar(m: Mundo, dep: Bicho) {
  const p = presaDe(m, dep);
  if (p) p.preso = 0;
  dep.muerde = 0; dep.restan = 0;
}

/** Mete la presa en la boca y encara al que muerde hacia ella. */
function morder(m: Mundo, dep: Bicho, presa: Bicho) {
  dep.muerde = presa.id;
  dep.restan = m.cfg.ticksPresa;
  presa.preso = dep.id;
  const dx = presa.x - dep.x, dy = presa.y - dep.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 1e-6) { dep.hx = dx / d; dep.hy = dy / d; }
}

/** Ticks que dura el zarpazo en pantalla. */
export const MARCA = 14;

function mover(m: Mundo, b: Bicho, v: number) {
  b.x += b.hx * v; b.y += b.hy * v;
  chocar(m.cfg, b, b.radio);
}

/** El sol: 0 al alba y al ocaso, 1 a mediodía. Parábola porque `Math.sin` no es exacto. */
export const luzDe = (t: number, c: Config): number => {
  const u = t / c.ticksDia;
  return 4 * u * (1 - u);
};

/** Un tick. Devuelve `true` cuando se acaba la jornada. */
export function tick(m: Mundo) {
  if (m.extinto) return true;
  const c = m.cfg;
  m.t++;
  if (m.marcas.length) m.marcas = m.marcas.filter((z) => m.t - z.t < MARCA);
  if (m.restos.length) {
    for (const z of m.restos) z.restan--;
    m.restos = m.restos.filter((z) => z.restan > 0);
  }
  const luz = luzDe(m.t, c), cae = luz < luzDe(m.t - 1, c);
  let radioMax = 1;
  for (const b of m.bichos) if (b.vivo && !b.aSalvo && b.radio > radioMax) radioMax = b.radio;

  for (const b of m.bichos) {
    if (!b.vivo || b.preso) continue;
    // Dormir es estar en casa sin nada a la vista; mordiendo no se decide ni se anda.
    const vio = b.muerde ? false : decidir(m, b, radioMax, luz, cae);
    const dormido = b.enCasa && !vio;
    b.dormido = dormido;
    const v = dormido || b.muerde ? 0 : b.g.empuje / radioCargado(c, b);
    if (v > 0) mover(m, b, v);

    b.reserva -= masaCargada(c, b) * (C_BASAL + C_VISION * b.g.vision * b.g.vision + C_EMPUJE * v * v);
    if (b.reserva <= 0) {
      b.vivo = false;
      b.muerte = "hambre";
      if (b.muerde) soltar(m, b);
      m.restos.push({ b, restan: DISOLUCION });
      m.cuenta.hambre++;
      continue;
    }

    for (let i = m.comida.length - 1; i >= 0 && !b.muerde; i--) {
      const f = m.comida[i];
      const dx = f.x - b.x, dy = f.y - b.y, r = b.radio + RADIO_COMIDA;
      if (dx * dx + dy * dy <= r * r) { m.comida.splice(i, 1); b.carga++; break; }
    }

    const [, , d] = haciaCasa(c, b.x, b.y);
    b.aSalvo = d <= c.casa;
    b.enCasa = d <= c.casa / 2;
    if (b.enCasa && b.carga > 0 && m.t % TICKS_BOCADO === 0) {
      b.reserva += E_COMIDA;
      if (--b.carga === 0) m.viajes++;
    }
  }

  if (c.caza) {
    for (let i = 0; i < m.bichos.length; i++) {
      const a = m.bichos[i];
      if (!a.vivo || a.aSalvo || a.preso) continue;
      for (let j = i + 1; j < m.bichos.length; j++) {
        const b = m.bichos[j];
        if (!b.vivo || b.aSalvo || b.preso) continue;
        const dx = b.x - a.x, dy = b.y - a.y, r = a.radio + b.radio;
        if (dx * dx + dy * dy > r * r) continue;
        if (distancia(a.g, b.g) <= m.especie[isla(c, a.x)]) continue;   // de los tuyos no se come
        const dentellada = c.ticksPresa > 0 ? morder : comer;
        if (!a.muerde && a.radio >= c.boca * b.radio) { dentellada(m, a, b); }
        else if (!b.muerde && b.radio >= c.boca * a.radio) { dentellada(m, b, a); break; }
      }
    }
  }

  // Después de la caza: el tick del mordisco ya cuenta como el primero.
  for (const b of m.bichos) {
    if (!b.vivo || !b.muerde || --b.restan > 0) continue;
    const presa = presaDe(m, b);
    if (presa) comer(m, b, presa);
    else { b.muerde = 0; b.restan = 0; }
  }

  m.bichos = m.bichos.filter((b) => b.vivo);
  return m.t >= c.ticksDia;
}

/**
 * Cierra el día. Nadie muere por quedarse fuera: solo no cría. En casa, lo que pasa de la
 * despensa se convierte en hijos mientras quepa el siguiente; luego mata la vejez.
 */
export function anochecer(m: Mundo) {
  m.duracion = m.t;
  const c = m.cfg;
  for (const b of m.bichos) if (b.muerde) soltar(m, b);
  m.dia++;   // antes de criar, para que `nacido` sea el primer día en el campo
  const adultos = m.bichos.length;   // `nacer` añade al array
  for (let i = 0; i < adultos; i++) {
    const b = m.bichos[i];
    if (!b.enCasa) { m.cuenta.fuera++; continue; }
    const cap = c.capReserva * b.masa;
    // Se muta antes de mirar si cabe: un hijo grande cuesta más.
    for (;;) {
      const sobra = b.reserva - cap;
      if (sobra <= 0) break;
      const g = mutar(m.azar, b.g, c);
      const coste = c.capReserva * masaDe(g.talla);
      if (coste > sobra) break;
      b.reserva -= coste;
      const h = nacer(m, g, b.id, b.gen + 1, [b.x, b.y]);
      const [ux, uy] = unidad(m.azar);
      const d = b.radio + h.radio + 1;
      const sitio = { x: b.x + ux * d, y: b.y + uy * d, hx: 0, hy: 0 };
      chocar(c, sitio, h.radio);
      h.x = sitio.x; h.y = sitio.y;
      h.recien = true;
      b.hijos++;
      b.crias++;
      m.cuenta.nacidos++;
    }
  }
  if (c.vida < Infinity) {
    for (const b of m.bichos) {
      if (m.dia - b.nacido < c.vida) continue;
      b.vivo = false;
      b.muerte = "vejez";
      m.restos.push({ b, restan: DISOLUCION });
      m.cuenta.vejez++;
    }
    m.bichos = m.bichos.filter((b) => b.vivo);
  }
  m.noche = true;
  if (m.bichos.length === 0) m.extinto = true;
}

/** Un día entero: la jornada, la noche y el alba. */
export function correrDia(m: Mundo) {
  if (m.extinto) return;
  for (;;) if (tick(m)) break;
  anochecer(m);
  if (!m.extinto) amanecer(m);
}

/** Censo, cuentas y la mediana de cada gen: la media escondería una población partida en dos. */
export function resumen(m: Mundo) {
  const medianas = {} as Genoma;
  for (const r of RASGOS) medianas[r] = mediana(m.bichos.map((b) => b.g[r]));
  return {
    dia: m.dia, censo: m.bichos.length, extinto: m.extinto, medianas, cuenta: m.cuenta,
    viajes: m.viajes, comida: m.comida.length,
    velocidad: mediana(m.bichos.map((b) => b.g.empuje / b.g.talla)),
  };
}

/** Copia independiente: el mundo es dato plano, y así no se olvida ningún campo. */
export const copiar = (m: Mundo): Mundo => structuredClone(m);

/** Estado comparable: dos mundos con la misma semilla dan la misma cadena. */
export function huella(m: Mundo): string {
  const partes = [String(m.dia), String(m.t), String(m.bichos.length), String(m.comida.length)];
  for (const b of m.bichos) {
    partes.push(`${b.id}:${b.x.toFixed(9)},${b.y.toFixed(9)},${b.hx.toFixed(9)},` +
      `${b.reserva.toFixed(9)},${b.carga},${b.muerde},${b.preso},` +
      `${b.g.empuje.toFixed(9)},${b.g.retorno.toFixed(9)}`);
  }
  return partes.join("|");
}
