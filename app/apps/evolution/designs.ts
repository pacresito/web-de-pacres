// Los cuatro diseños de evolution: cuerpo, comida, suelo y paleta. **La semilla elige cuál**, así
// que la palabra que escribes no solo define el mundo — define de qué están hechos sus bichos.
//
// Un diseño no puede inventarse nada: los cuatro comparten el **mismo contrato de genes** —qué gen
// vive en qué parte, con qué umbral aparece cada órgano y qué estados se leen— y solo cambian el
// material y el repertorio de formas. Lo que sí es común y no se duplica está aquí arriba: la
// ventana de lectura, la normalización y los umbrales. Si cada diseño tuviera su escala, dos
// personas mirando la misma semilla verían genes distintos.
//
// Se llama `designs` y no `diseños` porque es un identificador ASCII (regla «Nombres»).

import { RADIO_COMIDA, hashSemilla, type Genoma, type Rasgo } from "./engine";

const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/**
 * **La ventana de lectura de cada gen: el p01 y el p99 de una simulación de varios mundos.**
 *
 * No son ÷2 y ×2 del fundador. El fundador no tiene por qué estar donde vive la población —y
 * durante mucho tiempo no lo estuvo—, así que anclar en él dejaba la mitad de cada rango sin
 * visitar y los adornos que cuelgan de un umbral fuera de alcance para siempre. Anclando en la
 * población, un extremo del dibujo lo tiene el 1% de los bichos, que es lo que hace que verlo
 * signifique algo.
 *
 * Salen de `convergencia.medir.ts` —20 mundos × 1000 días— y se refrescan corriéndolo otra vez: el
 * fundador es el punto medio de esta tabla, así que moverlo mueve la tabla y viceversa.
 */
export const VENTANA: Record<Rasgo, [number, number]> = {
  empuje: [1.42, 2.82],
  talla: [2.89, 5.40],
  vision: [10.32, 26.97],
  sociabilidad: [-0.51, 0.07],
  fiereza: [1.64, 4.72],
  retorno: [1.33, 2.91],
};

/**
 * De valor de gen a 0…1 dentro de su ventana. **En octavas**, porque los genes mutan multiplicando
 * y la distancia natural entre 1 y 4 es la misma que entre 4 y 16.
 */
const n01 = (r: Rasgo, v: number): number => {
  const [lo, hi] = VENTANA[r];
  return clamp(Math.log2(v / lo) / Math.log2(hi / lo), 0, 1);
};

/**
 * La sociabilidad va en la misma vara, y **su cero deja de ser el cero físico para ser el
 * fundador**. Cuesta un matiz —un bicho pintado liso no es "me da igual la compañía", es "igual que
 * su tatarabuela"— y a cambio el gen se ve: su recorrido medido es de −0,51 a +0,07, así que a
 * escala de ±1 la población entera se pintaba idéntica.
 */
const n01soc = (s: number): number => {
  const [lo, hi] = VENTANA.sociabilidad;
  return clamp((s - lo) / (hi - lo), 0, 1);
};

/**
 * **El fundador nace liso y todo adorno es una desviación de él.** Los umbrales están a la misma
 * distancia del centro por los dos lados, así que el bicho del primer día no tiene dientes, ni
 * miembro prensil, ni patas, ni púas, ni apéndices sociables: lo que se ve encima de un bicho es
 * exactamente lo que le ha pasado a su linaje.
 *
 * Es lo que convierte el cuerpo en un display de diferencia y no en una ficha de características, y
 * lo que hace que mirar el mundo dos veces con cien días de por medio cuente algo. **Vale para los
 * cuatro diseños**, y un diseño que no lo cumpla está roto: lo comprueba `designs.test.ts`.
 */
const DESVIO = 0.12;
const U_ALTO = 0.5 + DESVIO, U_BAJO = 0.5 - DESVIO;

/** Los seis genes normalizados y los cuatro derivados, que es lo único que ve un diseño. */
export type Medidas = {
  ta: number; sp: number; vi: number; fi: number; re: number; so: number;
  /** Miembro prensil, para robar. */ brazo: number;
  /** Patas. Acortan la propulsión principal. */ pata: number;
  /** Púas del insociable. */ pincho: number;
  /** Apéndices del sociable. */ aleta: number;
};

export function medidas(g: Genoma): Medidas {
  const so = n01soc(g.sociabilidad);
  const fi = n01("fiereza", g.fiereza), re = n01("retorno", g.retorno);
  return {
    ta: n01("talla", g.talla), sp: n01("empuje", g.empuje), vi: n01("vision", g.vision),
    fi, re, so,
    brazo: Math.max(0, (fi - U_ALTO) / (1 - U_ALTO)),
    pata: Math.max(0, (re - U_ALTO) / (1 - U_ALTO)),
    pincho: Math.max(0, (U_BAJO - so) / U_BAJO),
    aleta: Math.max(0, (so - U_ALTO) / (1 - U_ALTO)),
  };
}

// ─── Color ────────────────────────────────────────────────────────────────────

export type Paleta = {
  tema: "light" | "dark";
  bg: string; bg2: string;
  home: string; homeInk: string;
  food: string;
  /** Rampa del cuerpo, recorrida por la fiereza. */
  cold: string; mid: string; hot: string;
  /** A dónde se apaga un cuerpo sin energía. No es gris: es el fondo tragándoselo. */
  dim: string;
  hi: string; line: string; maw: string;
  acc: string; acc2: string; jaw: string; belly: string; fin: string;
  /** Para lo poco que se escribe encima del mundo: los hijos de cada madre al anochecer. */
  tinta: string;
};

const hexa = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mezcla dos `#rrggbb`. No hay otro formato en la parte de la paleta que se mezcla. */
export function mix(a: string, b: string, t: number): string {
  const A = hexa(a), B = hexa(b);
  const c = (i: number) => Math.round(clamp(A[i] + (B[i] - A[i]) * t, 0, 255)).toString(16).padStart(2, "0");
  return `#${c(0)}${c(1)}${c(2)}`;
}
export const canales = hexa;

/** El color del cuerpo: la fiereza recorre la rampa y la energía lo apaga hacia el fondo. */
export const colorCuerpo = (p: Paleta, fi: number, e: number) =>
  mix(fi < 0.5 ? mix(p.cold, p.mid, fi * 2) : mix(p.mid, p.hot, (fi - 0.5) * 2), p.dim, (1 - e) * 0.42);

/** PRNG del pintado, de semilla fija. No toca el del motor: aquí nada decide nada. */
export function azarFijo(s: number) {
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── El contrato de un diseño ─────────────────────────────────────────────────

/** Lo que hace falta para pintar un bicho, venga del mundo o de una muestra de leyenda. */
export type Cuerpo = {
  x: number; y: number; hx: number; hy: number;
  /** Radio dibujado. No es `g.talla`: una cría crece desde nada durante su primera noche. */
  radio: number;
  /** Bocados encima, que se pintan sobre el cuerpo. */
  carga?: number;
  g: Genoma;
};

export type Design = {
  id: string;
  nombre: string;
  paleta: (tema: "light" | "dark") => Paleta;
  /** El bicho, con el morro en +x y el origen en el centro. Quien llama pone posición y rumbo. */
  cuerpo: (ctx: CanvasRenderingContext2D, b: Cuerpo, vigor: number, p: Paleta) => void;
  /** Hasta dónde llega lo dibujado, en unidades de mundo y por eje. Lo usa la leyenda para encajar. */
  extension: (g: Genoma, radio: number) => [number, number];
  /** Un bocado, centrado en el origen. `giro` es estable por bocado: sale de su posición. */
  comida: (ctx: CanvasRenderingContext2D, p: Paleta, giro: number) => void;
  /** El suelo y la franja de casa, en unidades de mundo. Se cuece una vez, no por cuadro. */
  fondo: (c: CanvasRenderingContext2D, ancho: number, alto: number, casa: number, escala: number, p: Paleta) => void;
};

// ─── Suelos ───────────────────────────────────────────────────────────────────
//
// **El grano y las motas se generan una sola vez**, con semilla fija: regenerarlos por cuadro los
// haría parpadear como nieve de televisión, y son más de mil figuras — pintarlas sesenta veces por
// segundo cuesta más que todos los bichos juntos.

/** La franja del perímetro, rellena de un solo tono. Casa es una orilla, no un marco. */
function franja(c: CanvasRenderingContext2D, ancho: number, alto: number, casa: number, p: Paleta) {
  c.fillStyle = p.home;
  c.beginPath();
  c.rect(0, 0, ancho, alto);
  c.rect(casa, casa, ancho - casa * 2, alto - casa * 2);
  c.fill("evenodd");
}

/** Moteado de arena, solo dentro de la franja: casa tiene textura y el suelo no. */
function moteado(c: CanvasRenderingContext2D, ancho: number, alto: number, casa: number, escala: number, p: Paleta, azar: () => number) {
  c.fillStyle = p.homeInk;
  for (let i = 0; i < 1100; i++) {
    const x = azar() * ancho, y = azar() * alto;
    if (x > casa && x < ancho - casa && y > casa && y < alto - casa) continue;
    c.globalAlpha = 0.25 + azar() * 0.5;
    c.beginPath(); c.arc(x, y, (0.6 + azar() * 1.5) / escala, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}

/**
 * El borde interior de casa, ondulado. Es una orilla: se lee como algo del mundo y no como el marco
 * de un plano. **La línea media de la franja —donde de verdad se está a salvo— no se pinta:** quien
 * juega la aprende viendo que ahí dejan de cazarse.
 */
function orilla(c: CanvasRenderingContext2D, ancho: number, alto: number, casa: number, escala: number, p: Paleta) {
  c.strokeStyle = p.homeInk;
  c.lineWidth = 2 / escala;
  c.beginPath();
  const onda = (v: number) => Math.sin(v * 0.16) * 0.8;
  const paso = 2.2;
  for (let x = casa; x <= ancho - casa; x += paso) {
    const y = casa + onda(x);
    if (x === casa) c.moveTo(x, y); else c.lineTo(x, y);
  }
  for (let y = casa; y <= alto - casa; y += paso) c.lineTo(ancho - casa + onda(y), y);
  for (let x = ancho - casa; x >= casa; x -= paso) c.lineTo(x, alto - casa + onda(x));
  for (let y = alto - casa; y >= casa; y -= paso) c.lineTo(casa + onda(y), y);
  c.closePath();
  c.stroke();
}

/** El mismo borde, recto. Los diseños de material duro lo quieren así: ahí la recta es el material. */
function canto(c: CanvasRenderingContext2D, ancho: number, alto: number, casa: number, escala: number, p: Paleta, guiones = false) {
  const f = 1 / escala;
  c.strokeStyle = p.homeInk;
  c.lineWidth = 2 * f;
  if (guiones) c.setLineDash([6 * f, 5 * f]);
  c.strokeRect(casa, casa, ancho - casa * 2, alto - casa * 2);
  c.setLineDash([]);
}

/** Grano de papel: despega el suelo del color plano sin dibujar nada que signifique algo. */
function papel(c: CanvasRenderingContext2D, ancho: number, alto: number, escala: number, p: Paleta, azar: () => number) {
  c.fillStyle = mix(p.bg, p.bg2, 0.9);
  c.globalAlpha = 0.5;
  for (let i = 0; i < 480; i++) {
    const s = (1 + azar() * 2.2) / escala;
    c.fillRect(azar() * ancho, azar() * alto, s, s * 0.7);
  }
  c.globalAlpha = 1;
}

/** Suelo de papel con casa moteada y orilla ondulada. */
const sueloPapel: Design["fondo"] = (c, ancho, alto, casa, escala, p) => {
  const azar = azarFijo(3);
  c.fillStyle = p.bg; c.fillRect(0, 0, ancho, alto);
  papel(c, ancho, alto, escala, p, azar);
  franja(c, ancho, alto, casa, p);
  moteado(c, ancho, alto, casa, escala, p, azar);
  orilla(c, ancho, alto, casa, escala, p);
};

/** Lo mismo con una viñeta: el centro del mundo se aclara y los bordes se hunden. */
const sueloVineta: Design["fondo"] = (c, ancho, alto, casa, escala, p) => {
  const azar = azarFijo(3);
  c.fillStyle = p.bg; c.fillRect(0, 0, ancho, alto);
  const gr = c.createRadialGradient(ancho * 0.45, alto * 0.42, alto * 0.1, ancho * 0.5, alto * 0.5, ancho * 0.72);
  gr.addColorStop(0, mix(p.bg, p.hi, 0.1));
  gr.addColorStop(1, p.bg2);
  c.fillStyle = gr; c.fillRect(0, 0, ancho, alto);
  franja(c, ancho, alto, casa, p);
  moteado(c, ancho, alto, casa, escala, p, azar);
  orilla(c, ancho, alto, casa, escala, p);
};

/** Motas finas y casa rayada en diagonal. Borde recto: aquí el material es la recta. */
const sueloMotas: Design["fondo"] = (c, ancho, alto, casa, escala, p) => {
  const azar = azarFijo(3);
  c.fillStyle = p.bg; c.fillRect(0, 0, ancho, alto);
  c.fillStyle = p.bg2;
  const s = 1.4 / escala;
  for (let i = 0; i < 900; i++) c.fillRect(azar() * ancho, azar() * alto, s, s);
  franja(c, ancho, alto, casa, p);
  c.save();
  c.beginPath();
  c.rect(0, 0, ancho, alto);
  c.rect(casa, casa, ancho - casa * 2, alto - casa * 2);
  c.clip("evenodd");
  c.strokeStyle = p.homeInk;
  c.lineWidth = 1 / escala;
  for (let d = -alto; d < ancho + alto; d += 7 / escala * 2.7) {
    c.beginPath(); c.moveTo(d, 0); c.lineTo(d + alto, alto); c.stroke();
  }
  c.restore();
  canto(c, ancho, alto, casa, escala, p);
};

/** Rejilla y casa con marcas de regla. El suelo de un instrumento se mide. */
const sueloRejilla: Design["fondo"] = (c, ancho, alto, casa, escala, p) => {
  c.fillStyle = p.bg; c.fillRect(0, 0, ancho, alto);
  const f = 1 / escala;
  c.strokeStyle = p.bg2; c.lineWidth = f;
  for (let x = casa; x < ancho - casa; x += 16) { c.beginPath(); c.moveTo(x, casa); c.lineTo(x, alto - casa); c.stroke(); }
  for (let y = casa; y < alto - casa; y += 16) { c.beginPath(); c.moveTo(casa, y); c.lineTo(ancho - casa, y); c.stroke(); }
  franja(c, ancho, alto, casa, p);
  c.strokeStyle = p.homeInk; c.lineWidth = f;
  const marca = (i: number) => (i % 5 === 0 ? casa * 0.55 : casa * 0.3);
  for (let x = casa, i = 0; x < ancho - casa; x += 8, i++) {
    const l = marca(i);
    c.beginPath(); c.moveTo(x, casa); c.lineTo(x, casa - l); c.stroke();
    c.beginPath(); c.moveTo(x, alto - casa); c.lineTo(x, alto - casa + l); c.stroke();
  }
  for (let y = casa, i = 0; y < alto - casa; y += 8, i++) {
    const l = marca(i);
    c.beginPath(); c.moveTo(casa, y); c.lineTo(casa - l, y); c.stroke();
    c.beginPath(); c.moveTo(ancho - casa, y); c.lineTo(ancho - casa + l, y); c.stroke();
  }
  canto(c, ancho, alto, casa, escala, p, true);
};

// ─── Comidas ──────────────────────────────────────────────────────────────────

/** Disco con halo. El halo es lo que lo despega del suelo sin engordarlo. */
const discoCon = (factor: number): Design["comida"] => (ctx, p) => {
  const r = RADIO_COMIDA * factor;
  const gr = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.35);
  gr.addColorStop(0, p.food);
  gr.addColorStop(1, mix(p.food, p.bg, 1));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, TAU); ctx.fill();
  ctx.fillStyle = p.food;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fill();
};

/** Bacilo: cápsula tumbada con un brillo. Gira con el bocado para que el suelo no sea un peine. */
const bacilo: Design["comida"] = (ctx, p, giro) => {
  const r = RADIO_COMIDA, L = r * 0.98, w = r * 0.46;
  ctx.save();
  ctx.rotate(giro);
  ctx.fillStyle = p.food;
  ctx.beginPath();
  ctx.moveTo(-L + w, -w); ctx.lineTo(L - w, -w);
  ctx.arc(L - w, 0, w, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-L + w, w);
  ctx.arc(-L + w, 0, w, Math.PI / 2, -Math.PI / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = mix(p.food, p.hi, 0.45);
  ctx.beginPath(); ctx.ellipse(0, -w * 0.28, L * 0.42, w * 0.24, 0, 0, TAU); ctx.fill();
  ctx.restore();
};

const triangulo: Design["comida"] = (ctx, p, giro) => {
  const r = RADIO_COMIDA;
  ctx.save();
  ctx.rotate(giro);
  ctx.fillStyle = p.food;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(r * 0.92, r * 0.6); ctx.lineTo(-r * 0.92, r * 0.6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
};

const cruz: Design["comida"] = (ctx, p) => {
  const r = RADIO_COMIDA, q = r * 0.78;
  ctx.strokeStyle = p.food;
  ctx.lineWidth = r * 0.30;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(-q, 0); ctx.lineTo(q, 0); ctx.moveTo(0, -q); ctx.lineTo(0, q);
  ctx.stroke();
};

// ─── 1 · Pez ──────────────────────────────────────────────────────────────────
//
// Recorte de papel plano con sombra desplazada. La sombra va **solidaria al cuerpo** —rota con él—,
// así que no promete una luz global que este mundo no tiene.
//
// · talla → cuerpo y boca, con dientes arriba · empuje → casco, de ladrillo a bala
// · visión → ojos · fiereza → tono y brazo con mano · sociabilidad → púas o pectorales
// · retorno → caudal, y patas que se la comen

const COLA = 2.1;

/** Las medidas del casco del pez, que necesitan a la vez el dibujo y quien calcula lo que ocupa. */
function pezCasco(m: Medidas, R: number, e: number) {
  return {
    fr: R * (0.95 + 0.80 * m.sp),
    bk: R * (0.88 + 0.10 * m.sp),
    W: R * (1.20 - 0.54 * m.sp) * (0.86 + 0.14 * e),
    pa: 1 + 3.2 * (1 - m.sp), pb: 0.32 + 0.95 * m.sp, q: 2.2 + (1 - m.sp) * 3.8,
  };
}

const pezCuerpo: Design["cuerpo"] = (ctx, b, e, p) => {
  const R = b.radio, m = medidas(b.g), k = pezCasco(m, R, e);
  const { fr, bk, W } = k;
  const bod = colorCuerpo(p, m.fi, e);
  const aleta = mix(bod, p.fin, 0.5);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.transform(b.hx, b.hy, -b.hy, b.hx, 0, 0);   // rumbo sin ángulos ni trigonometría
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const front = (u: number) => W * Math.pow(Math.max(0, 1 - Math.pow(u, k.pa)), k.pb);
  const borde = (t: number): [number, number] => {
    const tt = ((t % TAU) + TAU) % TAU, ct = Math.cos(tt), st = Math.sin(tt), sg = Math.sign(st) || 1;
    if (ct >= 0) return [fr * ct, sg * front(ct)];
    const q = 2 / k.q;
    return [bk * Math.sign(ct) * Math.abs(ct) ** q, sg * W * Math.abs(st) ** q];
  };
  const contorno = () => {
    ctx.beginPath();
    for (let i = 0; i <= 88; i++) {
      const [x, y] = borde((i / 88) * TAU);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  // retorno · la caudal, que las patas acortan: no se puede nadar y andar con lo mismo
  const largo = R * (0.50 + COLA * 0.48 * m.re) * (1 - 0.55 * m.pata), abre = 0.40 + 0.72 * m.re;
  ctx.fillStyle = aleta;
  ctx.beginPath();
  ctx.moveTo(-bk * 0.86, 0);
  ctx.lineTo(-bk - largo * 0.92, -largo * abre);
  ctx.quadraticCurveTo(-bk - largo * 0.50, 0, -bk - largo * 0.92, largo * abre);
  ctx.closePath(); ctx.fill();

  if (m.pata > 0.02) {
    const ll = R * (0.30 + 0.85 * m.pata), pie = R * (0.22 + 0.40 * m.pata);
    for (const sd of [-1, 1]) {
      const cx = -bk * 0.52, cy = sd * W * 0.70, kx = cx - ll * 0.72, ky = sd * (W * 0.70 + ll * 0.68);
      ctx.strokeStyle = mix(aleta, p.line, 0.35);
      ctx.lineWidth = Math.max(0.6, R * 0.10);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.fillStyle = aleta;
      ctx.beginPath(); ctx.moveTo(kx, ky);
      ctx.lineTo(kx - pie * 0.95, ky + sd * pie * 0.30);
      ctx.quadraticCurveTo(kx - pie * 0.55, ky + sd * pie * 0.85, kx + pie * 0.20, ky + sd * pie * 0.62);
      ctx.closePath(); ctx.fill();
    }
  }

  // sociabilidad − · la corona del huraño. **Ni en proa ni en popa, y con un hueco donde sale el
  // brazo**: una corona cerrada borra hacia dónde mira el bicho, que a este tamaño es lo primero
  // que hay que poder leer.
  if (m.pincho > 0.02) {
    const largoP = R * (0.10 + 0.66 * m.pincho);
    ctx.fillStyle = mix(bod, p.line, 0.35);
    for (const a of [0.45, 1.38, 1.98, 2.58]) for (const sd of [-1, 1]) {
      const t = sd * a;
      const [x, y] = borde(t), [x1, y1] = borde(t - 0.13), [x2, y2] = borde(t + 0.13);
      const L = Math.hypot(x / bk, y / W) || 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x + (x / bk / L) * largoP, y + (y / W / L) * largoP);
      ctx.lineTo(x2, y2);
      ctx.closePath(); ctx.fill();
    }
  }

  // sociabilidad + · las pectorales. Se retiran a popa cuando hay brazos con los que chocar y el
  // hombro se adelanta: cada pieza cede solo cuando la otra existe.
  if (m.aleta > 0.02) {
    const fl = R * (0.34 + 0.86 * m.aleta), atras = R * (0.10 + 0.55 * m.brazo);
    ctx.fillStyle = mix(aleta, p.acc, 0.55);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(R * 0.18 - atras, sd * W * 0.86);
      ctx.quadraticCurveTo(R * 0.26 + fl * 0.9 - atras, sd * (W + fl * 0.62), fr * 0.62 + fl * 0.66 - atras, sd * (W * 0.50 + fl * 0.20));
      ctx.quadraticCurveTo(R * 0.30 + fl * 0.2 - atras, sd * (W * 0.98 + fl * 0.10), -R * 0.14 - atras, sd * W * 0.72);
      ctx.closePath(); ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(-R * 0.06, R * 0.10);
  contorno();
  ctx.fillStyle = mix(bod, p.line, 0.28);
  ctx.fill();
  ctx.restore();

  contorno();
  ctx.fillStyle = bod;
  ctx.fill();

  if (m.brazo > 0.02) {
    const al = R * (0.34 + 0.95 * m.brazo), mano = R * (0.16 + 0.30 * m.brazo);
    const sx = fr * (0.28 + 0.30 * m.aleta);
    for (const sd of [-1, 1]) {
      const sy = sd * W * 0.78, ex = sx + al * 0.85, ey = sd * (W * 0.78 + al * 0.62);
      ctx.strokeStyle = mix(bod, p.line, 0.30);
      ctx.lineWidth = Math.max(0.8, R * 0.145);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = p.jaw;
      ctx.beginPath(); ctx.arc(ex, ey, mano * 0.60, 0, TAU); ctx.fill();
      ctx.strokeStyle = p.jaw;
      ctx.lineWidth = Math.max(0.7, R * 0.085);
      for (let f = 0; f < 3; f++) {
        const a = -0.62 + f * 0.62;
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex + mano * Math.cos(a) * 1.05, ey + sd * mano * Math.sin(a + 0.62) * 1.05);
        ctx.stroke();
      }
    }
  }

  ctx.save();
  contorno();
  ctx.clip();
  ctx.fillStyle = mix(p.belly, bod, 0.12);
  ctx.beginPath(); ctx.ellipse(-bk * 0.46, W * 0.34, bk * 0.34, W * 0.24, 0, 0, TAU); ctx.fill();
  ctx.restore();
  const n = Math.min(3, b.carga ?? 0);
  ctx.fillStyle = p.food;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(-bk * 0.66 + i * R * 0.24, W * 0.35, Math.max(0.7, R * 0.095), 0, TAU);
    ctx.fill();
  }

  // talla · la boca. **Se planta por delante de los ojos aunque sobresalga del contorno**:
  // buscándole sitio dentro del morro, un bicho grande y rápido acababa con los dientes encima de
  // los ojos y sin cara que mirar.
  const er = R * (0.10 + 0.30 * m.vi), ex = fr * 0.34, ey = W * (0.36 + 0.06 * m.vi);
  const mw = R * (0.10 + 0.62 * m.ta);
  let mu = 0.88;
  while (mu > 0.2 && front(mu) < mw * 1.02) mu -= 0.04;
  const mx = Math.min(fr * 1.02, Math.max(fr * mu, ex + er * 1.15 + mw * 0.10));
  const curva = R * (0.05 + 0.45 * m.ta) * (0.25 + 0.85 * m.aleta - 0.35 * m.pincho);
  ctx.strokeStyle = p.maw;
  ctx.lineWidth = Math.max(0.5, R * (0.05 + 0.06 * m.ta));
  ctx.beginPath();
  ctx.moveTo(mx - mw * 0.10, -mw);
  ctx.quadraticCurveTo(mx + curva, 0, mx - mw * 0.10, mw);
  ctx.stroke();
  if (m.ta > U_ALTO) {
    const t = (m.ta - U_ALTO) / (1 - U_ALTO);
    ctx.fillStyle = p.hi;
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
      const u = 0.85 - i * 0.42;
      ctx.beginPath();
      ctx.moveTo(mx - mw * 0.10, sd * mw * u);
      ctx.lineTo(mx + mw * (0.30 + 0.30 * t), sd * mw * (u - 0.16));
      ctx.lineTo(mx - mw * 0.06, sd * mw * (u - 0.30));
      ctx.closePath(); ctx.fill();
    }
  }

  // visión · los ojos, con los párpados bajándose por debajo de 0,4 de reserva: el gesto que dice
  // que a este le queda poco, y se lee antes que el color apagándose.
  for (const sd of [-1, 1]) {
    ctx.fillStyle = p.hi;
    ctx.beginPath(); ctx.arc(ex, sd * ey, er, 0, TAU); ctx.fill();
    ctx.fillStyle = p.maw;
    ctx.beginPath(); ctx.arc(ex + er * 0.20, sd * ey, er * 0.50, 0, TAU); ctx.fill();
    if (e < 0.4) {
      ctx.fillStyle = bod;
      ctx.beginPath(); ctx.rect(ex - er * 1.1, sd * ey - er * 1.12, er * 2.2, er * 0.92); ctx.fill();
    }
  }
  ctx.restore();
};

const pezExtension: Design["extension"] = (g, R) => {
  const m = medidas(g), k = pezCasco(m, R, 1);
  const cola = k.bk + R * (0.50 + COLA * 0.48 * m.re) * (1 - 0.55 * m.pata) * 1.92;
  const pincho = m.pincho > 0.02 ? R * (0.10 + 0.66 * m.pincho) : 0;
  const brazo = R * (0.34 + 0.95 * m.brazo), pata = R * (0.30 + 0.85 * m.pata);
  const fl = R * (0.34 + 0.86 * m.aleta), mw = R * (0.10 + 0.62 * m.ta);
  return [
    Math.max(k.fr * 1.02 + mw * 0.6, cola + pincho, k.bk * 0.52 + pata + R * 0.6,
      k.fr * 0.28 + brazo + R * 0.5, k.fr + pincho),
    Math.max(k.W + pincho, k.W + fl * 0.66, k.W * 0.78 + brazo * 0.62 + R * 0.4,
      k.W * 0.70 + pata * 0.68 + R * 0.4),
  ];
};

// ─── 2 · Protozoo ─────────────────────────────────────────────────────────────
//
// Membrana blanda con degradado, un ojo y un flagelo. El lento es una ameba lobulada; el rápido,
// una gota lanceolada.
//
// **Contrapartida conocida:** los lóbulos y las púas se pelean por el mismo borde, así que el bicho
// lento e insociable tiene el contorno tan roto que la talla pierde legibilidad.

function protoCasco(m: Medidas, R: number, e: number) {
  return {
    fr: R * (0.92 + 0.90 * m.sp),
    bk: R * (0.92 + 0.18 * m.sp),
    W: R * (1.28 - 0.48 * m.sp) * (0.80 + 0.20 * e),
    amp: (1 - m.sp) * 0.26 * (1 - m.pincho * 0.7),
  };
}

const protoCuerpo: Design["cuerpo"] = (ctx, b, e, p) => {
  const R = b.radio, m = medidas(b.g), k = protoCasco(m, R, e);
  const { fr, bk, W } = k;
  const bod = colorCuerpo(p, m.fi, e), lw = Math.max(0.6, R * 0.10);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.transform(b.hx, b.hy, -b.hy, b.hx, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const rad = (t: number) => {
    const ct = Math.cos(t), st = Math.sin(t);
    const ax = ct >= 0 ? fr : bk, wy = W * (1 - 0.42 * m.sp * Math.max(0, ct));
    return (1 / Math.hypot(ct / ax, st / wy)) * (1 + k.amp * Math.cos(5 * t + 0.5));
  };
  const contorno = () => {
    ctx.beginPath();
    for (let i = 0; i <= 84; i++) {
      const t = (i / 84) * TAU, r = rad(t);
      const x = r * Math.cos(t), y = r * Math.sin(t);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  // retorno · el flagelo, que los undulipodios acortan
  const tl = R * (0.9 + 2.0 * m.re) * (1 - 0.62 * m.pata);
  ctx.strokeStyle = p.line;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-bk * 0.8, 0);
  ctx.bezierCurveTo(-bk - tl * 0.35, -tl * 0.30, -bk - tl * 0.70, tl * 0.30, -bk - tl, 0);
  ctx.stroke();

  if (m.pata > 0.02) {
    const ll = R * (0.34 + 0.92 * m.pata), pw = R * (0.16 + 0.34 * m.pata);
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
      const bx = -bk * (0.30 + i * 0.42), by = sd * W * (0.78 - i * 0.10);
      const kx = bx - ll * 0.55, ky = sd * (Math.abs(by) + ll * 0.78);
      ctx.strokeStyle = mix(bod, p.line, 0.35);
      ctx.lineWidth = Math.max(0.6, R * 0.085);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.fillStyle = mix(bod, p.fin, 0.55);
      ctx.beginPath(); ctx.ellipse(kx - pw * 0.35, ky + sd * pw * 0.30, pw * 0.72, pw * 0.36, sd * 0.7, 0, TAU); ctx.fill();
    }
  }

  if (m.pincho > 0.02) {
    const spl = R * (0.18 + 0.72 * m.pincho);
    ctx.strokeStyle = mix(bod, p.line, 0.45);
    ctx.lineWidth = Math.max(0.5, R * 0.075);
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * TAU, r = rad(t);
      ctx.beginPath();
      ctx.moveTo(r * Math.cos(t) * 0.92, r * Math.sin(t) * 0.92);
      ctx.lineTo((r + spl) * Math.cos(t), (r + spl) * Math.sin(t));
      ctx.stroke();
    }
  }

  if (m.aleta > 0.02) {
    const len = R * (0.32 + 0.85 * m.aleta);
    ctx.strokeStyle = p.acc;
    ctx.lineWidth = Math.max(0.5, R * 0.07);
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
      const th = ((32 + i * 33) * Math.PI) / 180, r = rad(sd * th);
      const bx = r * Math.cos(th), by = sd * r * Math.sin(th);
      const nx = Math.cos(th) * 0.45 + 0.85, ny = sd * Math.sin(th) * 0.85;
      const q = len / Math.hypot(nx, ny);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + nx * q * 0.55 - ny * q * 0.30, by + ny * q * 0.55 + nx * q * 0.30, bx + nx * q, by + ny * q);
      ctx.stroke();
    }
  }

  const gr = ctx.createLinearGradient(0, -W, 0, W);
  gr.addColorStop(0, mix(bod, p.hi, 0.30));
  gr.addColorStop(1, bod);
  contorno();
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.strokeStyle = mix(bod, p.line, 0.45);
  ctx.lineWidth = lw * 0.65;
  ctx.stroke();

  if (m.brazo > 0.02) {
    const al = R * (0.42 + 1.05 * m.brazo), sk = R * (0.09 + 0.16 * m.brazo);
    for (const sd of [-1, 1]) {
      const th = 0.62, r0 = rad(sd * th);
      const sx = r0 * Math.cos(th) * 0.95, sy = sd * r0 * Math.sin(th) * 0.95;
      const ex = sx + al * 0.80, ey = sy + sd * al * 0.55;
      ctx.strokeStyle = mix(bod, p.line, 0.22);
      ctx.lineWidth = Math.max(0.7, R * 0.115);
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + al * 0.62, sy + sd * al * 0.02, ex, ey);
      ctx.stroke();
      ctx.fillStyle = p.acc2;
      for (let i = 0; i < 3; i++) {
        const u = 0.45 + i * 0.27;
        ctx.beginPath();
        ctx.arc(sx + (ex - sx) * u + al * 0.10 * (1 - u), sy + (ey - sy) * u, sk * (0.95 - i * 0.16), 0, TAU);
        ctx.fill();
      }
    }
  }

  ctx.save();
  contorno();
  ctx.clip();
  const n = Math.min(3, b.carga ?? 0);
  ctx.fillStyle = p.food;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(-bk * 0.62 + i * R * 0.30, W * 0.34, Math.max(0.7, R * 0.13), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // visión · el ojo único
  const er = R * (0.15 + 0.42 * m.vi), ex = fr * 0.14;
  ctx.fillStyle = p.hi;
  ctx.beginPath(); ctx.arc(ex, 0, er, 0, TAU); ctx.fill();
  ctx.strokeStyle = mix(bod, p.line, 0.55);
  ctx.lineWidth = Math.max(0.4, lw * 0.4);
  ctx.stroke();
  ctx.fillStyle = p.maw;
  ctx.beginPath(); ctx.arc(ex + er * 0.20, 0, er * 0.52, 0, TAU); ctx.fill();
  if (e < 0.42) {
    ctx.fillStyle = bod;
    ctx.beginPath(); ctx.rect(ex - er * 1.1, -er * 1.15, er * 2.2, er * 0.95); ctx.fill();
  }

  // talla · el citostoma, de poro a bocaza con peine de cilios. **Se planta por delante del ojo
  // aunque sobresalga de la membrana**, igual que la boca del pez y por el mismo motivo: buscándole
  // sitio dentro del cuerpo, un protozoo grande y rápido acababa con el citostoma encima del ojo —
  // y aquí es peor que en el pez, porque el ojo es uno y va en el eje, justo donde la boca cruza.
  const mw = Math.min(R * (0.09 + 0.58 * m.ta), W * 0.78);
  let mu = 0.90;
  while (mu > 0.20) {
    const a = Math.atan2(mw, fr * mu);
    if (Math.abs(rad(a) * Math.sin(a)) >= mw) break;
    mu -= 0.05;
  }
  const mx = Math.min(fr * 1.04, Math.max(fr * mu, ex + er * 1.15 + mw * 0.10));
  const curva = R * (0.05 + 0.42 * m.ta) * (0.30 + 0.80 * m.aleta - 0.40 * m.pincho);
  ctx.strokeStyle = p.maw;
  ctx.lineWidth = Math.max(0.5, R * (0.05 + 0.07 * m.ta));
  ctx.beginPath();
  ctx.moveTo(mx - mw * 0.10, -mw);
  ctx.quadraticCurveTo(mx + curva, 0, mx - mw * 0.10, mw);
  ctx.stroke();
  if (m.ta > U_ALTO) {
    ctx.strokeStyle = p.hi;
    ctx.lineWidth = Math.max(0.5, R * 0.055);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      const u = 0.88 - i * 0.30;
      ctx.beginPath();
      ctx.moveTo(mx - mw * 0.08, sd * mw * u);
      ctx.lineTo(mx + mw * 0.34, sd * mw * (u + 0.14));
      ctx.stroke();
    }
  }
  ctx.restore();
};

const protoExtension: Design["extension"] = (g, R) => {
  const m = medidas(g), k = protoCasco(m, R, 1);
  const wob = 1 + (1 - m.sp) * 0.26;
  const tl = R * (0.9 + 2.0 * m.re) * (1 - 0.62 * m.pata);
  const al = R * (0.42 + 1.05 * m.brazo), ll = R * (0.34 + 0.92 * m.pata);
  const spl = m.pincho > 0.02 ? R * (0.18 + 0.72 * m.pincho) : 0;
  const cil = m.aleta > 0.02 ? R * (0.32 + 0.85 * m.aleta) : 0;
  const mw = Math.min(R * (0.09 + 0.58 * m.ta), k.W * 0.78);
  return [
    Math.max(k.fr * wob + spl + cil * 0.9 + R * 0.2, k.bk * wob + tl + R * 0.2,
      k.bk + ll + R * 0.7, k.fr + al + R * 0.3, k.fr * 1.04 + mw * 0.4),
    Math.max(k.W * wob + spl + cil * 0.7 + R * 0.2, k.W * 0.78 + ll * 0.78 + R * 0.5,
      R * (0.15 + 0.42 * m.vi) + R * 0.2, k.W + al * 0.55 + R * 0.3),
  ];
};

// ─── 3 · Cristal ──────────────────────────────────────────────────────────────
//
// Todo rectas y vértices: un dardo de seis vértices con la esquina de popa metida, en trazo que se
// vacía con la energía. **No se redondea nada** — el rombo ancho del empuje bajo y la aguja del
// empuje alto tienen que leerse como cristales, no como cuerpos.
//
// **Contrapartida conocida:** el fiero, insociable y con patas suma tantos apéndices rectos que se
// convierte en una maraña.

function cristalCasco(m: Medidas, R: number) {
  const L = (a: number, b: number) => a + (b - a) * m.sp;
  return {
    fr: R * (0.80 + 1.55 * m.sp), bk: R * (0.92 + 0.10 * m.sp), W: R * (1.30 - 0.62 * m.sp),
    // media silueta: nariz → hombro → esquina de popa → muesca, luego espejada
    perfil: [[1, 0], [L(0.30, 0.02), 1], [-1, L(0.44, 0.34)], [L(-0.42, -0.50), 0]] as [number, number][],
  };
}

const cristalCuerpo: Design["cuerpo"] = (ctx, b, e, p) => {
  const R = b.radio, m = medidas(b.g), k = cristalCasco(m, R);
  const { fr, bk, W } = k;
  const bod = colorCuerpo(p, m.fi, e), lw = Math.max(0.7, R * 0.12);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.transform(b.hx, b.hy, -b.hy, b.hx, 0, 0);
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";

  const pt = (i: number, sd: number): [number, number] =>
    [k.perfil[i][0] >= 0 ? fr * k.perfil[i][0] : bk * k.perfil[i][0], sd * W * k.perfil[i][1]];
  const contorno = () => {
    ctx.beginPath();
    let q = pt(0, 1); ctx.moveTo(q[0], q[1]);
    for (let i = 1; i < k.perfil.length; i++) { q = pt(i, 1); ctx.lineTo(q[0], q[1]); }
    for (let i = k.perfil.length - 2; i >= 0; i--) { q = pt(i, -1); ctx.lineTo(q[0], q[1]); }
    ctx.closePath();
  };

  // visión · antenas que se cierran al acortarse
  const al = R * (0.35 + 2.20 * m.vi), abre = 0.66 - 0.34 * m.vi;
  ctx.strokeStyle = p.acc;
  ctx.lineWidth = Math.max(0.5, lw * 0.55);
  for (const sd of [-1, 1]) {
    const x = fr * 0.20, y = sd * W * 0.48;
    const tx = x + al * Math.cos(abre), ty = y + sd * al * Math.sin(abre);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = p.acc;
    const q = Math.max(0.8, R * 0.14);
    ctx.fillRect(tx - q, ty - q, q * 2, q * 2);
  }

  if (m.pata > 0.02) {
    const ll = R * (0.32 + 0.95 * m.pata), fw = R * (0.20 + 0.36 * m.pata);
    ctx.strokeStyle = mix(bod, p.line, 0.30);
    ctx.lineWidth = Math.max(0.7, R * 0.10);
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
      const bx = -bk * (0.25 + i * 0.45), by = sd * W * (0.70 - i * 0.14);
      const kx = bx - ll * 0.42, ky = sd * (Math.abs(by) + ll * 0.72);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(kx - fw, ky + sd * fw * 0.30); ctx.stroke();
    }
  }

  if (m.pincho > 0.02) {
    const spl = R * (0.20 + 0.70 * m.pincho), a = R * 0.16;
    ctx.fillStyle = mix(bod, p.line, 0.30);
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * TAU, cx = Math.cos(t), cy = Math.sin(t);
      const rr = 1 / Math.hypot(cx / (cx >= 0 ? fr : bk), cy / W);
      ctx.beginPath();
      ctx.moveTo(cx * rr - cy * a, cy * rr + cx * a);
      ctx.lineTo(cx * (rr + spl), cy * (rr + spl));
      ctx.lineTo(cx * rr + cy * a, cy * rr - cx * a);
      ctx.closePath(); ctx.fill();
    }
  }

  if (m.aleta > 0.02) {
    const pl = R * (0.30 + 0.85 * m.aleta);
    ctx.fillStyle = p.acc;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(R * 0.02, sd * W);
      ctx.lineTo(R * 0.02 + pl * 1.15, sd * (W + pl * 0.30));
      ctx.lineTo(-R * 0.30, sd * (W + pl * 0.75));
      ctx.closePath(); ctx.fill();
    }
  }

  // cuerpo · la carcasa se vacía con la energía, así que el hambre se ve en el relleno
  contorno();
  if (e > 0.22) { ctx.fillStyle = mix(bod, p.bg, (1 - e) * 0.75); ctx.fill(); }
  ctx.strokeStyle = bod;
  ctx.lineWidth = lw;
  ctx.stroke();

  // retorno · la quilla engorda
  ctx.strokeStyle = p.acc2;
  ctx.lineWidth = Math.max(0.6, R * (0.05 + 0.19 * m.re));
  ctx.beginPath(); ctx.moveTo(-bk * 0.40, 0); ctx.lineTo(fr * 0.55, 0); ctx.stroke();

  if (m.brazo > 0.02) {
    const aL = R * (0.36 + 1.00 * m.brazo), hw = R * (0.16 + 0.30 * m.brazo);
    for (const sd of [-1, 1]) {
      const sx = fr * 0.30, sy = sd * W * 0.72;
      const mx = sx + aL * 0.52, my = sd * (W * 0.72 + aL * 0.26);
      const ex = mx + aL * 0.46, ey = sd * (Math.abs(my) + aL * 0.44);
      ctx.strokeStyle = mix(bod, p.line, 0.18);
      ctx.lineWidth = Math.max(0.8, R * 0.125);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = p.jaw;
      ctx.lineWidth = Math.max(0.7, R * 0.085);
      for (let f = 0; f < 3; f++) {
        const a = -0.55 + f * 0.55;
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex + hw * Math.cos(a) * 1.15, ey + sd * hw * Math.sin(a + 0.55) * 1.15);
        ctx.stroke();
      }
    }
  }

  const n = Math.min(3, b.carga ?? 0);
  ctx.fillStyle = p.food;
  for (let i = 0; i < n; i++) {
    const q = Math.max(0.8, R * 0.13);
    ctx.fillRect(-bk * 0.40 + i * q * 2.8 - q, W * 0.40 - q, q * 2, q * 2);
  }

  // talla · la pinza frontal, de hendidura a tenaza abierta
  const mo = R * (0.14 + 0.72 * m.ta);
  const ap = 0.12 + 0.34 * m.ta + 0.22 * m.aleta - 0.12 * m.pincho;
  ctx.strokeStyle = p.jaw;
  ctx.lineWidth = Math.max(0.7, R * (0.07 + 0.07 * m.ta));
  for (const sd of [-1, 1]) {
    const ox = fr * 0.86;
    ctx.beginPath();
    ctx.moveTo(ox - mo * 0.30, sd * mo * 0.10);
    ctx.lineTo(ox + mo * Math.cos(ap), sd * mo * Math.sin(ap) * 2.0);
    ctx.stroke();
    if (m.ta > U_ALTO) {
      ctx.beginPath();
      ctx.moveTo(ox + mo * 0.42, sd * mo * 0.42);
      ctx.lineTo(ox + mo * 0.58, sd * mo * 0.06);
      ctx.stroke();
    }
  }
  ctx.restore();
};

const cristalExtension: Design["extension"] = (g, R) => {
  const m = medidas(g), k = cristalCasco(m, R);
  const al = R * (0.35 + 2.20 * m.vi), abre = 0.66 - 0.34 * m.vi;
  const aL = R * (0.36 + 1.00 * m.brazo), ll = R * (0.32 + 0.95 * m.pata);
  const spl = m.pincho > 0.02 ? R * (0.20 + 0.70 * m.pincho) : 0;
  const pl = m.aleta > 0.02 ? R * (0.30 + 0.85 * m.aleta) : 0;
  const mo = R * (0.14 + 0.72 * m.ta);
  return [
    Math.max(k.fr + mo + spl + R * 0.2, k.fr * 0.20 + al * Math.cos(abre) + R * 0.3,
      k.bk + Math.max(spl, ll + R * 0.5, pl + R * 0.4) + R * 0.2, k.fr * 0.30 + aL + R * 0.4),
    Math.max(k.W + spl + R * 0.2, k.W * 0.48 + al * Math.sin(abre) + R * 0.3, k.W + pl * 0.9 + R * 0.2,
      k.W * 0.70 + ll * 0.75 + R * 0.4, k.W * 0.72 + aL * 0.70 + R * 0.4),
  ];
};

// ─── 4 · Instrumento ──────────────────────────────────────────────────────────
//
// **El casco es SIEMPRE un círculo de radio R**, en cualquier valor de empuje: eso es deliberado y
// no se "mejora". Todos los genes cuelgan del disco como piezas acopladas del mismo repertorio
// geométrico, y el empuje vive en la cuña de popa. La energía es un aforo literal — un sector de
// tarta que se vacía.
//
// **Contrapartida conocida:** con treinta a la vez, los arcos de visión y los anillos de
// sociabilidad se superponen y no se sabe qué arco es de quién.

const dialCuerpo: Design["cuerpo"] = (ctx, b, e, p) => {
  const R = b.radio, m = medidas(b.g);
  const bod = colorCuerpo(p, m.fi, 1);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.transform(b.hx, b.hy, -b.hy, b.hx, 0, 0);
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  const disco = () => { ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.closePath(); };

  // empuje · la cuña de propulsión
  const cuna = R * (0.35 + 1.85 * m.sp);
  ctx.fillStyle = p.acc;
  ctx.beginPath();
  ctx.moveTo(-R * 0.86, -R * 0.52); ctx.lineTo(-R * 0.86 - cuna, 0); ctx.lineTo(-R * 0.86, R * 0.52);
  ctx.closePath(); ctx.fill();

  // visión · el arco de barrido. Macizo y nunca punteado: a R = 6 px un punteado se pierde.
  const vr = R * (1.30 + 1.90 * m.vi);
  ctx.strokeStyle = p.acc2;
  ctx.lineWidth = Math.max(1.4, R * 0.16);
  ctx.beginPath(); ctx.arc(0, 0, vr, -1.05, 1.05); ctx.stroke();
  ctx.lineWidth = Math.max(1.2, R * 0.12);
  ctx.beginPath(); ctx.moveTo(R * 0.9, 0); ctx.lineTo(vr, 0); ctx.stroke();

  if (m.aleta > 0.02) {
    ctx.strokeStyle = p.acc;
    ctx.lineWidth = Math.max(0.5, R * (0.06 + 0.10 * m.aleta));
    ctx.beginPath(); ctx.ellipse(0, 0, R * 1.18, R * 1.25, 0, 0, TAU); ctx.stroke();
  }
  if (m.pincho > 0.02) {
    const spl = R * (0.20 + 0.70 * m.pincho);
    ctx.strokeStyle = mix(p.line, p.bg, 0.15);
    ctx.lineWidth = Math.max(0.6, R * 0.085);
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * TAU, ct = Math.cos(t), st = Math.sin(t);
      ctx.beginPath();
      ctx.moveTo(ct * R * 0.95, st * R * 0.95);
      ctx.lineTo(ct * (R + spl), st * (R + spl));
      ctx.stroke();
    }
  }

  // cuerpo · el aforo: la energía es un sector, así que se cuenta en vez de estimarse
  disco();
  ctx.fillStyle = p.bg2;
  ctx.fill();
  ctx.save();
  disco();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R * 1.2, -Math.PI / 2, -Math.PI / 2 + Math.max(0.02, e) * TAU);
  ctx.closePath();
  ctx.fillStyle = bod;
  ctx.fill();
  ctx.restore();
  disco();
  ctx.strokeStyle = p.line;
  ctx.lineWidth = Math.max(0.7, R * 0.11);
  ctx.stroke();

  // retorno · el travesaño. **Perpendicular a propósito:** colineal con la cuña, empuje y retorno
  // se confundirían en un único apéndice trasero.
  const cb = R * (0.30 + 1.95 * m.re);
  ctx.strokeStyle = p.line;
  ctx.lineWidth = Math.max(1.1, R * 0.17);
  ctx.beginPath(); ctx.moveTo(-R * 0.92, -cb); ctx.lineTo(-R * 0.92, cb); ctx.stroke();
  ctx.lineWidth = Math.max(0.9, R * 0.13);
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-R * 0.92, sd * cb); ctx.lineTo(-R * 0.92 + R * 0.30, sd * cb); ctx.stroke();
  }

  if (m.brazo > 0.02) {
    const aL = R * (0.34 + 0.95 * m.brazo), aw = R * (0.24 + 0.30 * m.brazo);
    ctx.fillStyle = p.jaw;
    for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
      if (i === 1 && m.brazo < 0.5) continue;
      const a = sd * (0.62 + i * 0.66), ct = Math.cos(a), st = Math.sin(a), sc = i === 1 ? 0.68 : 1;
      const bx = ct * R, by = st * R;
      ctx.beginPath();
      ctx.moveTo(bx - st * aw * sc, by + ct * aw * sc);
      ctx.lineTo(bx + ct * aL * sc, by + st * aL * sc);
      ctx.lineTo(bx + st * aw * sc, by - ct * aw * sc);
      ctx.closePath(); ctx.fill();
    }
  }

  // talla · el arco de mordida: cuántos dientes y cuánto miden
  const nt = 2 + Math.round(6 * m.ta), tl = R * (0.10 + 0.55 * m.ta);
  ctx.strokeStyle = p.jaw;
  ctx.lineWidth = Math.max(0.5, R * 0.10);
  for (let i = 0; i < nt; i++) {
    const a = nt === 1 ? 0 : -0.72 + (1.44 * i) / (nt - 1);
    const ct = Math.cos(a), st = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(ct * R * 0.96, st * R * 0.96);
    ctx.lineTo(ct * (R + tl), st * (R + tl));
    ctx.stroke();
  }

  const gw = R * (0.30 + 0.42 * m.ta), gy = R * 0.30;
  ctx.strokeStyle = p.line;
  ctx.lineWidth = Math.max(0.5, R * 0.075);
  ctx.beginPath();
  ctx.moveTo(R * 0.32, -gy);
  ctx.quadraticCurveTo(R * 0.32 + gw * (0.30 + 0.95 * m.aleta - 0.50 * m.pincho), 0, R * 0.32, gy);
  ctx.stroke();

  const n = Math.min(3, b.carga ?? 0);
  ctx.fillStyle = p.food;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * 0.80 + i * 0.42;
    ctx.beginPath(); ctx.arc(Math.cos(a) * R * 1.30, Math.sin(a) * R * 1.30, Math.max(0.7, R * 0.15), 0, TAU); ctx.fill();
  }
  ctx.restore();
};

const dialExtension: Design["extension"] = (g, R) => {
  const m = medidas(g);
  const cuna = R * (0.35 + 1.85 * m.sp), vr = R * (1.30 + 1.90 * m.vi);
  const aL = R * (0.34 + 0.95 * m.brazo), cb = R * (0.30 + 1.95 * m.re);
  const spl = m.pincho > 0.02 ? R * (0.20 + 0.70 * m.pincho) : 0;
  const anillo = m.aleta > 0.02 ? R * 1.18 : 0;
  return [
    Math.max(vr + R * 0.2, R * (1.10 + 0.55 * m.ta) + R * 0.2, R + Math.max(spl, cuna - R * 0.14) + R * 0.2,
      anillo + R * 0.2, R + aL + R * 0.3, R * 1.35 + R * 0.2),
    Math.max(vr * Math.sin(1.05) + R * 0.2, R + spl + R * 0.2, R * 1.25 + R * 0.2, R + aL + R * 0.3, cb + R * 0.3),
  ];
};

// ─── El catálogo ──────────────────────────────────────────────────────────────
//
// **Cada diseño trae su mundo y su comida**, porque un bicho de cristal sobre suelo de papel no es
// otro estilo: es un error de material. Dos salen de emparejarlos a mano —el pez nada en el agua
// del esmalte y el protozoo vive en el papel que estrenó el pez—, y los otros dos se quedan con el
// suyo, que es de rectas porque ellos son de rectas.

export const DESIGNS: Design[] = [
  {
    id: "pez",
    nombre: "Pez",
    // Agua fría y bicho de tierra: la rampa del cuerpo es verde oliva y el suelo, azul grisáceo.
    // En verde sobre verde el bicho se hunde en el fondo, que es justo lo que la comida ya hace.
    paleta: (tema) => tema === "dark"
      ? { tema, bg: "#0b1a20", bg2: "#0f2329", home: "#15303a", homeInk: "#2f5764", food: "#efa53c",
          cold: "#69c1ab", mid: "#a8bd7e", hot: "#f0866a", dim: "#39443f", hi: "#f2f7f4",
          line: "#040e12", maw: "#101816", acc: "#e7c46a", acc2: "#e7c46a", jaw: "#f0866a",
          belly: "#d6e5de", fin: "#3f6b60", tinta: "#cfe6ec" }
      : { tema, bg: "#e8eef0", bg2: "#d3dfe3", home: "#c4d3d7", homeInk: "#8ca5aa", food: "#d9852c",
          cold: "#2f6b60", mid: "#6f8a58", hot: "#bd4b34", dim: "#9fadb2", hi: "#fbf8ef",
          line: "#17272e", maw: "#232c29", acc: "#dfae48", acc2: "#dfae48", jaw: "#bd4b34",
          belly: "#f2ecda", fin: "#7fb0b8", tinta: "#17272e" },
    cuerpo: pezCuerpo, extension: pezExtension, comida: bacilo, fondo: sueloPapel,
  },
  {
    id: "protozoo",
    nombre: "Protozoo",
    // El papel que estrenó el pez, con bocados naranjas y pequeños: el protozoo ya tiene el
    // contorno lleno de lóbulos y púas, y un bocado grande le come el borde.
    paleta: (tema) => tema === "dark"
      ? { tema, bg: "#151f1d", bg2: "#1d2a27", home: "#233330", homeInk: "#41564f", food: "#e3a23a",
          cold: "#82a6c0", mid: "#c69a92", hot: "#e0594a", dim: "#4c454b", hi: "#f6ecdc",
          line: "#d9c9b0", maw: "#0c0a0c", acc: "#d9b06a", acc2: "#e3a23a", jaw: "#e0594a",
          belly: "#d6e5de", fin: "#6c5c48", tinta: "#e8e2d6" }
      : { tema, bg: "#f3eee1", bg2: "#e7dfcc", home: "#ded1b3", homeInk: "#bda87f", food: "#bd7418",
          cold: "#4d6272", mid: "#6e5560", hot: "#8d2f27", dim: "#a09781", hi: "#faf6ec",
          line: "#3a322c", maw: "#241d19", acc: "#9a7b3c", acc2: "#bd7418", jaw: "#8d2f27",
          belly: "#f2ecda", fin: "#b09a72", tinta: "#3a322c" },
    cuerpo: protoCuerpo, extension: protoExtension, comida: discoCon(0.78), fondo: sueloVineta,
  },
  {
    id: "cristal",
    nombre: "Cristal",
    paleta: (tema) => tema === "dark"
      ? { tema, bg: "#0e1418", bg2: "#161e24", home: "#1b262d", homeInk: "#3d505b", food: "#48bfae",
          cold: "#a3c2d2", mid: "#a8c0bd", hot: "#ef7b56", dim: "#3b464d", hi: "#f0fafc",
          line: "#0a0f12", maw: "#0a0f12", acc: "#82abbd", acc2: "#e6b346", jaw: "#ef7b56",
          belly: "#dff0f4", fin: "#3d7b8a", tinta: "#cfe6ec" }
      : { tema, bg: "#e7ecef", bg2: "#d4dde3", home: "#c5d0d7", homeInk: "#8ba1ad", food: "#1c6b64",
          cold: "#38566a", mid: "#4f7080", hot: "#ac3d29", dim: "#9aa8b0", hi: "#ffffff",
          line: "#1b262c", maw: "#1b262c", acc: "#4e7386", acc2: "#c1861a", jaw: "#ac3d29",
          belly: "#eef5f7", fin: "#7fb0b8", tinta: "#1b262c" },
    cuerpo: cristalCuerpo, extension: cristalExtension, comida: triangulo, fondo: sueloMotas,
  },
  {
    id: "instrumento",
    nombre: "Instrumento",
    paleta: (tema) => tema === "dark"
      ? { tema, bg: "#0c0e0d", bg2: "#141817", home: "#171d1b", homeInk: "#3a443f", food: "#63b39c",
          cold: "#8fada4", mid: "#b39a86", hot: "#dd5f3e", dim: "#39443f", hi: "#f2f7f4",
          line: "#ccd6d0", maw: "#0c0e0d", acc: "#6e7d76", acc2: "#d6a41f", jaw: "#dd5f3e",
          belly: "#d6e5de", fin: "#3f6b60", tinta: "#ccd6d0" }
      : { tema, bg: "#f4f3ee", bg2: "#e6e4d9", home: "#e0ded1", homeInk: "#a29d88", food: "#3f6f5f",
          cold: "#3d5159", mid: "#6a6f66", hot: "#b03a2b", dim: "#a9a292", hi: "#fbf8ef",
          line: "#1d1d19", maw: "#1d1d19", acc: "#8d8873", acc2: "#3f6f5f", jaw: "#b03a2b",
          belly: "#f2ecda", fin: "#8bb6a5", tinta: "#1d1d19" },
    cuerpo: dialCuerpo, extension: dialExtension, comida: cruz, fondo: sueloRejilla,
  },
];

/**
 * Qué diseño le toca a una semilla. **Sale del mismo número que define el mundo**, así que la
 * palabra que escribes no solo decide qué pasa: decide de qué están hechos los que lo hacen. Y como
 * es el mismo hash, la promesa de la semilla sigue entera — la misma palabra da el mismo mundo con
 * los mismos bichos en cualquier pantalla.
 */
export function designFor(semilla: string): Design {
  return DESIGNS[Math.abs(hashSemilla(semilla)) % DESIGNS.length];
}

/**
 * El giro de un bocado, estable y sin estado: sale de dónde está. Guardarlo en el mundo sería
 * meter en el motor un dato que solo mira el pintado; recalcularlo al azar cada cuadro lo haría
 * bailar. Los bocados que no giran simplemente lo ignoran.
 */
export const giroDe = (x: number, y: number) => ((x * 7919 + y * 104729) % 628) / 100;

/**
 * Dónde cae un valor en la barra de la leyenda, en 0…1. **El fundador en el centro, el p01 y el p99
 * bastante cerca de los extremos pero no en ellos**: fuera de esa ventana sigue habiendo barra, que
 * es donde se pinta el día que a alguien le dé por bajar del p01 o subir del p99. Sin ese margen,
 * un linaje que se saliera de la ventana se quedaría pegado al borde diciendo lo mismo que otro que
 * apenas la roza.
 *
 * Es una sola escala para los seis genes —cada uno con su ventana, pero la misma geometría—, así
 * que dos barras se comparan de un vistazo aunque midan cosas de unidades distintas.
 */
export const MARGEN = 0.12;

/**
 * Dónde cae un valor **dentro de su ventana**, en 0…1: 0 es el p01 y 1 el p99. Sin recortar, porque
 * salirse es justo lo que hay que poder ver — un linaje en 1,2 se ha ido más allá del 1% más alto
 * que llegó a existir en veinte mundos, y eso es una noticia.
 *
 * Es el número que la leyenda enseña en tanto por ciento, y el único de este mundo que se entiende
 * sin saber de qué va: «empujaba como el 50% y ahora como el 63%» dice algo, y «empuje 2,14» no.
 */
export function enVentana(r: Rasgo, v: number): number {
  const [lo, hi] = VENTANA[r];
  return r === "sociabilidad" ? (v - lo) / (hi - lo) : Math.log2(v / lo) / Math.log2(hi / lo);
}

export function posGen(r: Rasgo, v: number): number {
  return clamp(MARGEN + (1 - 2 * MARGEN) * enVentana(r, v), 0, 1);
}
