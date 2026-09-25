// El grafiti del zócalo: ocho, uno por diferencia, en orden. **Cada uno de otro género que el
// anterior** —letras gordas, firma, plantilla, corazón, tapado—: dos del mismo seguidos solo se
// distinguirían por el matiz.
import { azar, px, type Caja, type Ctx } from "./paleta";
import type { Mano, Pincel } from "./pincel";

const R = Math.round;
/** El rosa del zócalo, el de `fachadas()`. */
const ZOCALO = { l: 0.8, c: 0.05, h: 20 };
/** Cuánto color de pared llevan encima las letras gordas: sin él, gritan más que la calle. */
const VELO = 0.3;

// ── Máscaras: el contorno y el volumen salen de engordar la forma ────────────

type Mascara = Set<number>;
const clave = (x: number, y: number) => (y + 512) * 4096 + (x + 512);
const punto = (c: number): [number, number] => [(c % 4096) - 512, Math.floor(c / 4096) - 512];

function engordar(m: Mascara, r: number): Mascara {
  const o: Mascara = new Set();
  for (const c of m) {
    const [x, y] = punto(c);
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (Math.abs(i) + Math.abs(j) <= r) o.add(clave(x + i, y + j));
  }
  return o;
}
function pintar(ctx: Ctx, m: Mascara, color: string, dx = 0, dy = 0) {
  for (const c of m) { const [x, y] = punto(c); px(ctx, x + dx, y + dy, 1, 1, color); }
}
/** Un dibujo de `#` ampliado `e` veces, con su esquina en (x, y). */
function mapa(filas: string[], x: number, y: number, e: number): Mascara {
  const m: Mascara = new Set();
  filas.forEach((fila, j) => [...fila].forEach((c, i) => {
    if (c === "#") for (let b = 0; b < e; b++) for (let a = 0; a < e; a++) m.add(clave(x + i * e + a, y + j * e + b));
  }));
  return m;
}

// ── Letras gordas ───────────────────────────────────────────────────────────

const GORDAS: Record<string, string[]> = {
  M: ["#..#", "####", "#..#", "#..#", "#..#"], I: ["#", "#", "#", "#", "#"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"], A: [".#.", "#.#", "###", "#.#", "#.#"],
  P: ["##.", "#.#", "##.", "#..", "#.."], Z: ["###", "..#", ".#.", "#..", "###"],
};

/** Throw-up: letras de 3×5 al doble, con contorno, volumen, brillo y el velo de pared. */
function letrasGordas(ctx: Ctx, m: Mano, b: Caja, palabra: string, hue: number) {
  const T = m.tono({ l: 0.58, c: 0.13, h: hue });
  const e = 2, hueco = 1;
  const ancho = [...palabra].reduce((a, l) => a + GORDAS[l][0].length * e + hueco, -hueco);
  const x0 = b.x + R((b.w - ancho) / 2), y0 = b.y + R((b.h - 10) / 2) + 1;
  const forma: Mascara = new Set();
  let x = x0;
  [...palabra].forEach((l, i) => {
    for (const c of mapa(GORDAS[l], x, y0 + R(Math.sin(i * 1.7)), e)) forma.add(c);
    x += GORDAS[l][0].length * e + hueco;
  });
  const volumen = engordar(forma, 2), borde = engordar(forma, 1);
  pintar(ctx, volumen, T[0], 1, 2);
  pintar(ctx, borde, m.F.tinta);
  pintar(ctx, forma, T[4]);
  for (const c of forma) {
    const [cx, cy] = punto(c);
    if (!forma.has(clave(cx, cy + 1))) px(ctx, cx, cy, 1, 1, T[2]);             // sombra de abajo
    else if (!forma.has(clave(cx, cy - 1)) && !forma.has(clave(cx - 1, cy))) px(ctx, cx, cy, 1, 1, m.P.piedra[5]);   // brillo
  }
  const ex = x0 + ancho + 4, ey = y0 - 1;                                       // la estrella
  const estrella = ex < b.x + b.w - 2;
  if (estrella) { px(ctx, ex, ey - 2, 1, 5, m.P.piedra[5]); px(ctx, ex - 2, ey, 5, 1, m.P.piedra[5]); }
  // Solo sobre lo pintado: la pared está en otra capa.
  const pared = m.tono(ZOCALO)[2];
  ctx.save();
  ctx.globalAlpha = VELO;
  pintar(ctx, new Set([...borde, ...[...volumen].map((c) => { const [x, y] = punto(c); return clave(x + 1, y + 2); })]), pared);
  if (estrella) { px(ctx, ex, ey - 2, 1, 5, pared); px(ctx, ex - 2, ey, 5, 1, pared); }
  ctx.restore();
}

// ── La firma ────────────────────────────────────────────────────────────────

/** Trazos de rotulador por letra, en una caja de 1×1 (y hacia abajo). */
const TRAZOS: Record<string, [number, number][][]> = {
  L: [[[0.15, 0], [0, 1], [1, 0.9]]],
  U: [[[0, 0], [0.05, 0.85], [0.5, 1], [0.95, 0.8], [1, 0]]],
  C: [[[1, 0.1], [0.4, 0], [0, 0.5], [0.3, 1], [1, 0.9]]],
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.15, 0.6], [0.9, 0.5]]],
  S: [[[1, 0.1], [0.5, 0], [0, 0.25], [1, 0.7], [0.6, 1], [0, 0.9]]],
  J: [[[0.1, 0.05], [1, 0]], [[0.7, 0], [0.75, 0.85], [0.35, 1], [0, 0.75]]],
  N: [[[0, 1], [0.05, 0], [0.95, 1], [1, 0]]],
};

function linea(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, g = 1) {
  const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let s = 0; s <= pasos; s++) px(ctx, R(x0 + ((x1 - x0) * s) / pasos), R(y0 + ((y1 - y0) * s) / pasos), g, 1, color);
}

/** Tag: un nombre a rotulador biselado, inclinado, con subrayado, corona y goterones. */
function firma(ctx: Ctx, b: Caja, nombre: string, color: string, semilla: number) {
  const w = 7, h = 13, paso = w + 2, incl = 3;
  const x0 = b.x + R((b.w - nombre.length * paso) / 2), arriba = b.y + R((b.h - h) / 2) - 1, abajo = arriba + h;
  [...nombre].forEach((l, i) => {
    const lx = x0 + i * paso, ly = arriba + R(azar(semilla + i) * 2);
    for (const trazo of TRAZOS[l]) {
      const p = trazo.map(([u, v]) => [lx + u * w + (1 - v) * incl, ly + v * h] as const);
      for (let k = 1; k < p.length; k++) linea(ctx, p[k - 1][0], p[k - 1][1], p[k][0], p[k][1], color, 2);
    }
  });
  const fin = x0 + nombre.length * paso;
  linea(ctx, fin, abajo + 1, x0 + 2, abajo + 4, color, 2);
  linea(ctx, x0 + 2, abajo + 4, x0 - 1, abajo + 1, color);
  for (const [dx, dy] of [[0, 0], [2, -3], [4, 0], [6, -3], [8, 0]]) px(ctx, x0 + incl + dx, arriba - 4 + dy, 1, 1, color);
  for (let d = 0; d < 2; d++) px(ctx, R(x0 + 4 + azar(semilla * 5 + d) * (fin - x0 - 8)), abajo + 3, 1, 2 + R(azar(semilla + d * 7) * 3), color);
}

// ── Plantillas ──────────────────────────────────────────────────────────────

const SILUETAS: Record<string, string[]> = {
  gato: [
    "..#...#.....", "..##.##.....", "..#####.....", ".#######....", ".#.##.##....", ".#######....",
    "..#####....#", "..#####....#", ".#######..#.", ".########.#.", ".#########..", ".##.##.##...",
  ],
  pajaro: [
    "............", "...##.......", "..####......", "..#.###.....", "####.###...#", "..########.#",
    "...#######..", "....#####...", ".....#.#....", ".....#.#....", "....##.##...",
  ],
};

/** Stencil: la silueta y el spray que se escapa por el borde. */
function plantilla(ctx: Ctx, b: Caja, silueta: string[], color: string, semilla: number) {
  const e = 2, w = silueta[0].length * e, h = silueta.length * e;
  const x = b.x + R((b.w - w) / 2), y = b.y + R((b.h - h) / 2) - 1;
  const forma = mapa(silueta, x, y, e);
  for (const c of engordar(forma, 1)) {
    const [cx, cy] = punto(c);
    if (!forma.has(c) && azar(cx * 131 + cy * 7 + semilla) < 0.07) px(ctx, cx, cy, 1, 1, color);
  }
  pintar(ctx, forma, color);
  for (let q = 0; q < 5; q++) px(ctx, x + w + 1 + q, y + h - 1 - (q % 2), 1, 1, color);   // la firma, pequeña
}

// ── El corazón ──────────────────────────────────────────────────────────────

const CORAZON = [
  ".###...###.", "#####.#####", "###########", "###########", ".#########.",
  "..#######..", "...#####...", "....###....", ".....#.....",
];
const MENUDAS: Record<string, string[]> = {
  P: ["##.", "#.#", "##.", "#..", "#.."], C: [".##", "#..", "#..", "#..", ".##"], "+": ["...", ".#.", "###", ".#.", "..."],
};
const MORADO = { l: 0.6, c: 0.15, h: 350 };

function corazon(ctx: Ctx, m: Mano, b: Caja) {
  const T = m.tono(MORADO);
  const e = 3, w = CORAZON[0].length * e, h = CORAZON.length * e;
  const x = b.x + R((b.w - w) / 2), y = b.y + R((b.h - h) / 2);
  const forma = mapa(CORAZON, x, y, e);
  // Solo el trazo del spray: lo que tiene forma a dos píxeles por todos lados es muro.
  const lleno = (cx: number, cy: number) =>
    [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [1, -1], [-1, 1]].every(([i, j]) => forma.has(clave(cx + i, cy + j)));
  for (const c of forma) { const [cx, cy] = punto(c); if (!lleno(cx, cy)) px(ctx, cx, cy, 1, 1, T[2]); }
  px(ctx, x + R(w / 2), y + h, 1, 4, T[2]);                                      // chorreón de la punta
  let ix = x + R((w - 11) / 2);
  for (const l of "P+C") { pintar(ctx, mapa(MENUDAS[l], ix, y + 7, 1), m.F.tinta); ix += 4; }
  // La flecha que lo atraviesa.
  linea(ctx, x - 5, y + h - 4, x + w + 4, y + 2, m.F.tinta);
  px(ctx, x + w + 2, y + 1, 3, 1, m.F.tinta); px(ctx, x + w + 4, y + 1, 1, 3, m.F.tinta);
  px(ctx, x - 6, y + h - 5, 1, 2, m.F.tinta); px(ctx, x - 4, y + h - 3, 1, 2, m.F.tinta);
}

// ── Tapado ──────────────────────────────────────────────────────────────────

/** Tapado con pintura del zócalo más limpia que la pared; asoma el corazón de debajo. */
function tapado(ctx: Ctx, m: Mano, b: Caja) {
  const Z = m.tono(ZOCALO);
  const x = b.x + 6, y = b.y + 7, w = b.w - 12, h = b.h - 14;
  px(ctx, x, y, w, h, Z[3]);
  for (let i = 0; i < w; i += 3) px(ctx, x + i, y - 1, 2 + R(azar(i * 11)), 1, Z[3]);
  for (let i = 0; i < w; i += 4) px(ctx, x + i, y + h, 3, 1 + R(azar(i * 17)), Z[3]);
  for (let j = 2; j < h - 1; j += 4) px(ctx, x + 1 + R(azar(j) * 6), y + j, R(w * (0.4 + azar(j * 7) * 0.5)), 1, Z[4]);   // los brochazos
  px(ctx, x + w, y + 8, 2, 5, m.tono(MORADO)[2]);
}

// ── La lista ────────────────────────────────────────────────────────────────

const LISTA: ((ctx: Ctx, m: Mano, b: Caja) => void)[] = [
  (ctx, m, b) => letrasGordas(ctx, m, b, "MIRA", 250),
  (ctx, m, b) => firma(ctx, b, "LUCAS", m.P.tela[1], 11),
  (ctx, m, b) => plantilla(ctx, b, SILUETAS.gato, m.tono({ l: 0.45, c: 0.14, h: 25 })[1], 3),
  corazon,
  tapado,
  (ctx, m, b) => letrasGordas(ctx, m, b, "PAZ", 200),
  (ctx, m, b) => firma(ctx, b, "JUAN", m.tono({ l: 0.4, c: 0.12, h: 260 })[1], 29),
  (ctx, m, b) => plantilla(ctx, b, SILUETAS.pajaro, m.F.tinta, 7),
];

/** El nivel 0 es la pared limpia; tras el octavo vuelve el primero. */
export const grafiti: Pincel = (ctx, m, b, _p, n) => {
  if (n > 0) LISTA[(n - 1) % LISTA.length](ctx, m, b);
};
