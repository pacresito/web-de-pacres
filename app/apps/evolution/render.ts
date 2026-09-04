// Pintado de evolution en canvas: el mundo entero a escala, la franja de casa, la comida del día
// y cada bicho con su genoma en el cuerpo. Sin React ni estado propio.
//
// **Cada gen tiene una parte del cuerpo, y el color nunca es el único portador de ninguno**: la
// fiereza va en el tono *y* en los brazos, la sociabilidad en los pinchos, el retorno en la cola y
// las patas. La prueba es mirar la escena en escala de grises — si un gen deja de leerse ahí, el
// cambio está mal.
//
// Lo que **no** se pinta: un arco de visión. El motor ve en todas direcciones —alcance ∝ radio del
// otro, que es tamaño angular—, así que un cono frontal dibujaría un mecanismo que no existe. La
// visión va en el tamaño de los ojos, y su alcance se enseña en la leyenda contra el mundo entero.

import { CONFIG, MARCA, RADIO_COMIDA, type Genoma, type Mundo, type Rasgo } from "./engine";

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/**
 * **La ventana de lectura de cada gen: el p01 y el p99 de una simulación de varios mundos.**
 *
 * No son ÷2 y ×2 del fundador. El fundador no tiene por qué estar donde vive la población —y
 * durante mucho tiempo no lo estuvo—, así que anclar en él dejaba la mitad de cada rango sin
 * visitar y los adornos que cuelgan de un umbral (dientes, brazos, patas) fuera de alcance para
 * siempre. Anclando en la población, un extremo del dibujo lo tiene el 1% de los bichos, que es lo
 * que hace que verlo signifique algo.
 *
 * Salen de `convergencia.medir.ts` —20 mundos × 1000 días— y se refrescan corriéndolo otra vez: el
 * fundador es el punto medio de esta tabla, así que moverlo mueve la tabla y viceversa. Un par de
 * pasadas y se asienta.
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
 *
 * La sociabilidad no pasa por aquí: lleva signo y su cero significa "me da igual la compañía", así
 * que estirarla a 0…1 borraría el único punto del gen que quiere decir algo por sí mismo.
 */
const n01 = (r: Rasgo, v: number): number => {
  const [lo, hi] = VENTANA[r];
  return clamp(Math.log2(v / lo) / Math.log2(hi / lo), 0, 1);
};

/**
 * La sociabilidad va en la misma vara que las demás, y **su cero deja de ser el cero físico para
 * ser el fundador**. Cuesta un matiz —un bicho pintado liso no es "me da igual la compañía", es
 * "igual que su tatarabuela"— y a cambio el gen se ve: su recorrido medido es de −0,51 a +0,07, así
 * que a escala de ±1 la población entera se pintaba idéntica.
 */
const n01soc = (s: number): number => {
  const [lo, hi] = VENTANA.sociabilidad;
  return clamp((s - lo) / (hi - lo), 0, 1);
};

/**
 * **El fundador nace liso y todo adorno es una desviación de él.** Los umbrales están a la misma
 * distancia del centro por los dos lados, así que el bicho del primer día no tiene dientes, ni
 * brazos, ni patas, ni pinchos, ni pectorales: lo que se ve encima de un bicho es exactamente lo
 * que le ha pasado a su linaje desde entonces.
 *
 * Es lo que convierte el cuerpo en un display de diferencia y no en una ficha de características,
 * y es lo que hace que mirar el mundo dos veces con cien días de por medio cuente algo.
 */
const DESVIO = 0.12;
const U_DIENTES = 0.5 + DESVIO, U_BRAZOS = 0.5 + DESVIO, U_PATAS = 0.5 + DESVIO;
const U_PINCHOS = 0.5 - DESVIO, U_ALETAS = 0.5 + DESVIO;

// Proporciones de la silueta en radios del propio bicho, aquí arriba porque la leyenda necesita
// saber hasta dónde llega lo que se va a pintar para encajar una fila entera a una sola escala.
const COLA = 2.1;

export type Paleta = {
  tema: "light" | "dark";
  bg: string; bg2: string;
  home: string; homeInk: string;
  food: string;
  /** Rampa del cuerpo, recorrida por la fiereza: frío → medio → cálido. */
  cold: string; mid: string; hot: string;
  /** A dónde se apaga un cuerpo sin energía. No es gris: es el fondo tragándoselo. */
  dim: string;
  hi: string; line: string; maw: string; acc: string; jaw: string; belly: string; fin: string;
  /** Relleno del disco de visión de la leyenda. Tenue: es alcance, no un cuerpo. */
  alcance: string;
  /** Para lo poco que se escribe encima del mundo: los hijos de cada madre al anochecer. */
  tinta: string;
};

/**
 * Dos paletas propias, una por tema. Aquí el color **es** el dato: no puede virar con la cascada
 * de tokens como la UI genérica, o el mismo genoma diría cosas distintas en claro y en oscuro.
 */
export function paletaDe(tema: "light" | "dark"): Paleta {
  return tema === "dark"
    ? {
        tema, bg: "#151f1d", bg2: "#1d2a27", home: "#233330", homeInk: "#41564f", food: "#e6785a",
        cold: "#69c1ab", mid: "#a8bd7e", hot: "#f0866a", dim: "#39443f", hi: "#f2f7f4",
        line: "#0d1413", maw: "#101816", acc: "#e7c46a", jaw: "#f0866a", belly: "#d6e5de",
        fin: "#3f6b60", alcance: "rgba(150,180,120,0.10)", tinta: "#dbe8e3",
      }
    : {
        tema, bg: "#f3eee1", bg2: "#e7dfcc", home: "#ded1b3", homeInk: "#bda87f", food: "#cb5c3f",
        cold: "#2f6b60", mid: "#6f8a58", hot: "#bd4b34", dim: "#a9a292", hi: "#fbf8ef",
        line: "#26332f", maw: "#232c29", acc: "#dfae48", jaw: "#bd4b34", belly: "#f2ecda",
        fin: "#8bb6a5", alcance: "rgba(90,130,60,0.10)", tinta: "#26332f",
      };
}

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mezcla dos `#rrggbb`. No hay otro formato en la parte de la paleta que se mezcla. */
function mix(a: string, b: string, t: number): string {
  const A = hex(a), B = hex(b);
  const c = (i: number) => Math.round(clamp(A[i] + (B[i] - A[i]) * t, 0, 255)).toString(16).padStart(2, "0");
  return `#${c(0)}${c(1)}${c(2)}`;
}

/** El color del cuerpo: la fiereza recorre la rampa y la energía lo apaga hacia el fondo. */
const colorCuerpo = (p: Paleta, fi: number, e: number) =>
  mix(fi < 0.5 ? mix(p.cold, p.mid, fi * 2) : mix(p.mid, p.hot, (fi - 0.5) * 2), p.dim, (1 - e) * 0.42);

/**
 * El mundo tiene tamaño fijo y el lienzo no, así que la vista escala y centra en vez de estirar:
 * la semilla promete el mismo mundo en cualquier pantalla, y un mundo que midiera lo que mide la
 * ventana daría partidas distintas en el móvil y en el portátil.
 */
export type Vista = { escala: number; ox: number; oy: number };

export function vistaDe(W: number, H: number, ancho: number, alto: number): Vista {
  const escala = Math.min(W / ancho, H / alto);
  return { escala, ox: (W - ancho * escala) / 2, oy: (H - alto * escala) / 2 };
}

/** Lo que hace falta para pintar un bicho, venga del mundo o de una muestra de leyenda. */
export type Cuerpo = {
  x: number; y: number; hx: number; hy: number;
  /** Radio dibujado. No es `g.talla`: una cría crece desde nada durante su primera noche. */
  radio: number;
  /** Bocados encima, que se pintan sobre el vientre. */
  carga?: number;
  g: Genoma;
};

/** Las medidas de un cuerpo, que necesitan a la vez el dibujo y quien calcula cuánto ocupa. */
function medidas(g: Genoma, R: number, e: number) {
  const ta = n01("talla", g.talla), sp = n01("empuje", g.empuje), vi = n01("vision", g.vision);
  const fi = n01("fiereza", g.fiereza), re = n01("retorno", g.retorno), so = n01soc(g.sociabilidad);
  const fr = R * (0.95 + 0.80 * sp), bk = R * (0.88 + 0.10 * sp);
  const W = R * (1.20 - 0.54 * sp) * (0.86 + 0.14 * e);
  return {
    ta, sp, vi, fi, re,
    fr, bk, W,
    brazo: Math.max(0, (fi - U_BRAZOS) / (1 - U_BRAZOS)),
    pata: Math.max(0, (re - U_PATAS) / (1 - U_PATAS)),
    pincho: Math.max(0, (U_PINCHOS - so) / U_PINCHOS),
    aleta: Math.max(0, (so - U_ALETAS) / (1 - U_ALETAS)),
    // Proa cónica (bala si corre) y popa superelíptica (ladrillo si no).
    pa: 1 + 3.2 * (1 - sp), pb: 0.32 + 0.95 * sp, q: 2.2 + (1 - sp) * 3.8,
  };
}

/**
 * Un bicho, con el morro en +x y el origen en el centro del cuerpo. Quien llama pone la posición y
 * el rumbo.
 *
 * · talla → radio del cuerpo y tamaño de la boca (el grande abre bocaza con dientes: se come al
 *   pequeño) · empuje → casco, de ladrillo achatado a bala afilada · visión → tamaño de los ojos
 * · fiereza → tono, y brazos con mano para robar · sociabilidad → corona de pinchos si es negativa,
 *   pectorales si es positiva · retorno → caudal ahorquillada, y patas que le encogen la cola
 *
 * El `vigor` —reserva sobre lo que le cabe, en [0,1]— lo calcula quien llama: pintar una muestra de
 * leyenda no tiene por qué saber de despensas, y quien pinta el mundo sí.
 */
export function pintarCuerpo(ctx: CanvasRenderingContext2D, b: Cuerpo, vigor: number, p: Paleta) {
  const R = b.radio, e = vigor, g = b.g;
  const m = medidas(g, R, e);
  const { fr, bk, W } = m;
  const bod = colorCuerpo(p, m.fi, e);
  const aleta = mix(bod, p.fin, 0.5);

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.transform(b.hx, b.hy, -b.hy, b.hx, 0, 0);   // rotar por el rumbo: sin ángulos ni trigonometría
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const front = (u: number) => W * Math.pow(Math.max(0, 1 - Math.pow(u, m.pa)), m.pb);
  const borde = (t: number): [number, number] => {
    const tt = ((t % TAU) + TAU) % TAU, ct = Math.cos(tt), st = Math.sin(tt), sg = Math.sign(st) || 1;
    if (ct >= 0) return [fr * ct, sg * front(ct)];
    const k = 2 / m.q;
    return [bk * Math.sign(ct) * Math.abs(ct) ** k, sg * W * Math.abs(st) ** k];
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
  ctx.closePath();
  ctx.fill();

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

  // sociabilidad + · las pectorales del que busca compañía. Se retiran a popa cuando hay brazos con
  // los que chocar, y el hombro se adelanta: cada pieza cede solo cuando la otra existe.
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

  // Sombra de papel: el mismo contorno corrido. Va solidaria al cuerpo —rota con él—, así que no
  // promete una luz global que el mundo no tiene.
  ctx.save();
  ctx.translate(-R * 0.06, R * 0.10);
  contorno();
  ctx.fillStyle = mix(bod, p.line, 0.28);
  ctx.fill();
  ctx.restore();

  contorno();
  ctx.fillStyle = bod;
  ctx.fill();

  // fiereza · los brazos con los que se roba el bocado
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

  // Vientre claro y los bocados encima, recortados al cuerpo.
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

  // talla · la boca, de bocadito a bocaza con dientes. **Se planta por delante de los ojos aunque
  // sobresalga del contorno**: buscándole sitio dentro del morro, un bicho grande y rápido acababa
  // con los dientes encima de los ojos y sin cara que mirar.
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
  if (m.ta > U_DIENTES) {
    const t = (m.ta - U_DIENTES) / (1 - U_DIENTES);
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

  // visión · los ojos. Se bajan los párpados por debajo de 0,4 de reserva: es el gesto que dice que
  // a este le queda poco, y se lee antes que el color apagándose.
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
}

/**
 * Hasta dónde llega, en unidades de mundo, lo que `pintarCuerpo` acaba de dibujar. Lo usa la
 * leyenda para encajar las tres muestras de una fila **a una sola escala** — ajustando cada celda
 * a lo suyo, la fila de la talla enseñaría tres bichos del mismo tamaño, que es lo contrario de lo
 * que esa fila dice.
 */
export function extensionCuerpo(g: Genoma, radio: number): [number, number] {
  const m = medidas(g, radio, 1);
  const cola = m.bk + radio * (0.50 + COLA * 0.48 * m.re) * (1 - 0.55 * m.pata) * 1.92;
  const pincho = m.pincho > 0.02 ? radio * (0.14 + 0.62 * m.pincho) : 0;
  const brazo = radio * (0.34 + 0.95 * m.brazo), pata = radio * (0.30 + 0.85 * m.pata);
  const fl = radio * (0.34 + 0.86 * m.aleta);
  const mw = radio * (0.10 + 0.62 * m.ta);
  return [
    Math.max(m.fr * 1.02 + mw * 0.6, cola + pincho, m.bk * 0.52 + pata + radio * 0.6,
      m.fr * 0.28 + brazo + radio * 0.5, m.fr + pincho),
    Math.max(m.W + pincho, m.W + fl * 0.66, m.W * 0.78 + brazo * 0.62 + radio * 0.4,
      m.W * 0.70 + pata * 0.68 + radio * 0.4),
  ];
}

// ─── El mundo ─────────────────────────────────────────────────────────────────

/** PRNG propio del pintado, de semilla fija. No toca el del motor: aquí nada decide nada. */
function azarFijo(s: number) {
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * El suelo, la franja de casa y su borde, cocidos una sola vez en un lienzo aparte.
 *
 * **El grano no puede regenerarse cada cuadro** —parpadearía como nieve de televisión— y son mil
 * seiscientas figuras: pintarlas sesenta veces por segundo cuesta más que todos los bichos juntos.
 *
 * La franja es de **un solo tono**, y su borde interior una línea ondulada: casa es una orilla, no
 * un marco. La línea media —donde de verdad se está a salvo— no se pinta: quien juega la aprende
 * viendo que ahí dejan de cazarse, y dibujarla convertía el mundo en un plano.
 */
let cacheFondo: { clave: string; lienzo: HTMLCanvasElement } | null = null;

function fondoDe(p: Paleta, ancho: number, alto: number, escala: number, dpr: number): HTMLCanvasElement {
  const w = Math.round(ancho * escala * dpr), h = Math.round(alto * escala * dpr);
  const clave = `${p.tema}|${w}|${h}`;
  if (cacheFondo && cacheFondo.clave === clave) return cacheFondo.lienzo;

  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!;
  const e = escala * dpr;
  c.setTransform(e, 0, 0, e, 0, 0);
  const azar = azarFijo(3);

  c.fillStyle = p.bg;
  c.fillRect(0, 0, ancho, alto);

  // Grano de papel: lo que despega el suelo de un color plano sin dibujar nada que signifique algo.
  c.fillStyle = mix(p.bg, p.bg2, 0.9);
  c.globalAlpha = 0.5;
  for (let i = 0; i < 480; i++) {
    const s = (1 + azar() * 2.2) / escala;
    c.fillRect(azar() * ancho, azar() * alto, s, s * 0.7);
  }
  c.globalAlpha = 1;

  const casa = CONFIG.casa;
  c.fillStyle = p.home;
  c.beginPath();
  c.rect(0, 0, ancho, alto);
  c.rect(casa, casa, ancho - casa * 2, alto - casa * 2);
  c.fill("evenodd");

  // Moteado, solo dentro de la franja: casa tiene textura de arena y el suelo no.
  c.fillStyle = p.homeInk;
  for (let i = 0; i < 1100; i++) {
    const x = azar() * ancho, y = azar() * alto;
    if (x > casa && x < ancho - casa && y > casa && y < alto - casa) continue;
    c.globalAlpha = 0.25 + azar() * 0.5;
    c.beginPath(); c.arc(x, y, (0.6 + azar() * 1.5) / escala, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;

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

  cacheFondo = { clave, lienzo: cv };
  return cv;
}

/** Un bocado: disco macizo con halo, que es lo que lo despega del suelo sin engordarlo. */
function pintarComida(ctx: CanvasRenderingContext2D, x: number, y: number, p: Paleta) {
  const r = RADIO_COMIDA;
  ctx.save();
  ctx.translate(x, y);
  const gr = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.35);
  gr.addColorStop(0, p.food);
  gr.addColorStop(1, mix(p.food, p.bg, 1));
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, TAU); ctx.fill();
  ctx.fillStyle = p.food;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fill();
  ctx.restore();
}

// ─── Muestras de leyenda ──────────────────────────────────────────────────────
//
// La leyenda no dibuja bichos: los pide. Todo lo que enseña sale de `pintarCuerpo` y de las
// constantes del motor, así que el día que cambie la forma del bicho, la leyenda cambia con él.
// Una silueta escrita aparte miente en silencio en cuanto alguien toque el pintado del mundo.

function lienzoMuestra(ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Paleta) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Un bicho suelto, centrado y a la escala que se le diga. `escala` la fija quien pinta la fila
 * entera y es **la misma para las tres muestras**: si cada celda se ajustara a lo suyo, la fila de
 * la talla enseñaría tres bichos del mismo tamaño, que es justo lo contrario de lo que dice.
 */
export function pintarMuestra(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Paleta,
  g: Genoma, radio: number, escala: number, vigor = 1,
) {
  lienzoMuestra(ctx, W, H, dpr, p);
  const e = escala * dpr;
  ctx.setTransform(e, 0, 0, e, (W / 2) * dpr, (H / 2) * dpr);
  pintarCuerpo(ctx, { x: 0, y: 0, hx: 1, hy: 0, radio, g }, vigor, p);
}

/**
 * La visión, contra el mundo entero: el rectángulo del mundo a escala, el bicho en el centro y el
 * disco hasta donde detecta un bocado. Dos discos, el del fundador y el de la población de ahora.
 *
 * Es la única forma de contestar la pregunta que importa de este gen, que no es cuánto vale sino
 * cuánto vale **comparado con el mundo**: si un bicho ve el mundo entero, moverse no es una
 * decisión; si no ve nada, todo es paseo aleatorio.
 */
export function pintarAlcance(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, p: Paleta,
  ancho: number, alto: number, radio: number, visionEva: number, visionHoy: number | null,
) {
  lienzoMuestra(ctx, W, H, dpr, p);
  const escala = Math.min((W - 2) / ancho, (H - 2) / alto);
  const e = escala * dpr;
  ctx.setTransform(e, 0, 0, e, ((W - ancho * escala) / 2) * dpr, ((H - alto * escala) / 2) * dpr);
  const fino = 1 / escala;

  ctx.fillStyle = p.home;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.fillStyle = p.bg;
  ctx.fillRect(CONFIG.casa, CONFIG.casa, ancho - CONFIG.casa * 2, alto - CONFIG.casa * 2);
  ctx.strokeStyle = p.homeInk;
  ctx.lineWidth = fino;
  ctx.strokeRect(0, 0, ancho, alto);

  const cx = ancho / 2, cy = alto / 2;
  const disco = (v: number, relleno: boolean, guiones: boolean) => {
    ctx.beginPath();
    ctx.arc(cx, cy, v * RADIO_COMIDA, 0, TAU);
    if (relleno) { ctx.fillStyle = p.alcance; ctx.fill(); }
    ctx.setLineDash(guiones ? [4 * fino, 4 * fino] : []);
    ctx.strokeStyle = p.food;
    ctx.lineWidth = fino * (guiones ? 1 : 1.6);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  disco(visionEva, false, true);
  if (visionHoy !== null) disco(visionHoy, true, false);

  ctx.fillStyle = p.line;
  ctx.beginPath(); ctx.arc(cx, cy, Math.max(radio, 1.5 * fino), 0, TAU); ctx.fill();
}

/**
 * El mundo entero, en un lienzo de `W`×`H` px CSS con `dpr` píxeles de dispositivo por cada uno.
 * El suelo y la casa vienen cocidos de `fondoDe`; encima solo lo que decide la partida.
 */
export function pintar(ctx: CanvasRenderingContext2D, m: Mundo, p: Paleta, v: Vista, W: number, H: number, dpr: number, noche = 1) {
  const c = m.cfg;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(fondoDe(p, c.ancho, c.alto, v.escala, dpr), v.ox, v.oy, c.ancho * v.escala, c.alto * v.escala);

  const e = v.escala * dpr;
  ctx.setTransform(e, 0, 0, e, v.ox * dpr, v.oy * dpr);

  for (const f of m.comida) pintarComida(ctx, f.x, f.y, p);

  // Las muertes, debajo de los vivos. Comido es un anillo que se abre —el zarpazo— y el hambre es
  // el cuerpo apagándose y encogiendo. El que se quedó fuera al anochecer no está aquí: no muere,
  // así que se sigue pintando vivo donde le pilló la noche.
  for (const z of m.marcas) {
    const k = (m.t - z.t) / MARCA;
    if (k < 0 || k > 1) continue;
    if (z.causa === "comido") {
      const [zr, zg, zb] = hex(p.hot);
      ctx.strokeStyle = `rgba(${zr},${zg},${zb},${(1 - k).toFixed(2)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + 3 * k), 0, TAU); ctx.stroke();
      continue;
    }
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.fillStyle = colorCuerpo(p, n01("fiereza", z.fiereza), 0);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 - 0.65 * k), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Una cría no aparece hecha: durante la primera parte de la noche crece desde nada hasta su
  // tamaño, con el anillo del parto abriéndose a su alrededor. Es lo único que se anima aquí, y se
  // anima porque nacer es justo lo que no se veía.
  const brote = Math.min(1, noche / 0.6);
  for (const b of m.bichos) {
    // La despensa llena va con la masa, así que el vigor de cada uno se mide contra la suya: un
    // grande a medio gas y un pequeño a medio gas se pintan igual de apagados, que es lo justo.
    const lleno = b.reserva / (c.capReserva * b.masa);
    const vigor = clamp(lleno, 0, 1);
    if (b.recien && m.noche) {
      if (brote > 0.02) pintarCuerpo(ctx, { ...b, radio: b.radio * brote }, vigor, p);
      if (brote < 1) {
        ctx.strokeStyle = p.acc;
        ctx.globalAlpha = 1 - brote;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radio * (0.5 + 2.5 * brote), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    pintarCuerpo(ctx, b, vigor, p);

    // **La despensa no tiene techo, y sin esto no se veía**: quien lleva una semana ahorrando se
    // pintaba igual que quien acaba de comer, y su camada de veintidós parecía salida de la nada.
    // Lo que pasa del lleno se cuenta en un aro alrededor, **por duplicaciones**: el récord medido
    // son cincuenta y nueve despensas y el aro mide once píxeles, así que en lineal la primera
    // vuelta se comería las otras cincuenta y ocho. Topado en cuatro, que de ahí para arriba ya
    // solo dice "riquísimo".
    if (lleno > 1) {
      const vueltas = Math.min(4, 1 + Math.log2(lleno));
      const parcial = vueltas % 1;
      ctx.strokeStyle = p.acc;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 0.9 + 0.6 * Math.floor(vueltas - 1);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radio + 2.4, -Math.PI / 2, -Math.PI / 2 + TAU * (parcial || 1));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // De noche, lo único que se escribe encima del mundo: cuántas crías ha puesto cada madre, al lado
  // del montón que acaba de aparecer a su alrededor.
  if (m.noche) {
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.bg;
    for (const b of m.bichos) {
      if (b.hijos <= 0) continue;
      const t = `+${b.hijos}`, x = b.x + b.radio + 2, y = b.y - b.radio - 2;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = p.tinta;
      ctx.fillText(t, x, y);
    }
  }
}
