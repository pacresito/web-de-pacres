// La geometría del mundo, que sortea la semilla: dónde está casa, por dónde se anda y qué tapa la
// vista.
// - caja: rectángulo con casa en todo el perímetro.
// - donut: casa alrededor de un hueco central; cuanto más lejos de casa, más suelo.
// - barrera: la caja partida por un muro con un paso en medio.
// - trebol: disco con casa en el borde, partido en tres salas por una «Y» con plaza central.
// - islas: dos cajas iguales en el mar, con una fundadora idéntica en cada una.
//
// Lo que corre en el tick solo usa `+ - * /` y `sqrt`; lo de pintar va al final.

import { sig, unidad, type Azar } from "./azar";

export const FORMAS = ["caja", "donut", "barrera", "trebol", "islas"] as const;
export type Forma = (typeof FORMAS)[number];

/** Lo que la geometría lee de la configuración. `ancho` y `alto` son la caja que la contiene. */
export type Geometria = { forma: Forma; ancho: number; alto: number; casa: number };

/** Medidas en las que la comida del día se come entera (`medir/formas.medir.ts`). */
export const MEDIDAS: Record<Forma, { ancho: number; alto: number }> = {
  caja: { ancho: 288, alto: 200 },
  donut: { ancho: 240, alto: 240 },
  barrera: { ancho: 288, alto: 200 },
  trebol: { ancho: 215, alto: 215 },
  islas: { ancho: 312, alto: 200 },
};

/** Radio del hueco del donut, en fracción del diámetro. */
export const HUECO = 0.16;
export const MURO = { grosor: 4, paso: 32 };
/** Radio de la plaza del trébol: entre punta y punta deja un paso como el de la barrera. */
export const PLAZA = 20;
/** El mar entre las dos islas. */
export const MAR = 24;

export const huecoDe = (g: Geometria): number => g.ancho * HUECO;
const redonda = (g: Geometria) => g.forma === "donut" || g.forma === "trebol";
/** Con mar: lo de fuera del mundo no es casa. */
export const conMar = (g: Geometria) => g.forma === "donut" || g.forma === "islas";

const anchoIsla = (g: Geometria) => (g.ancho - MAR) / 2;

/** La isla de un punto, 0 o 1; en las demás formas, 0. Cada isla es su propia población. */
export const isla = (g: Geometria, x: number): number => (g.forma === "islas" && x > g.ancho / 2 ? 1 : 0);

/** Inicio y ancho de la isla `i`; en las demás formas, la caja entera. */
const tramo = (g: Geometria, i: number): [number, number] =>
  g.forma === "islas" ? [i ? g.ancho - anchoIsla(g) : 0, anchoIsla(g)] : [0, g.ancho];

/** Los muros como segmentos: los de la barrera y la «Y» del trébol. */
export function muros(g: Geometria): [number, number, number, number][] {
  const R = g.ancho / 2;
  if (g.forma === "barrera") {
    const p0 = g.alto / 2 - MURO.paso / 2, p1 = g.alto / 2 + MURO.paso / 2;
    return [[R, 0, R, p0], [R, p1, R, g.alto]];
  }
  if (g.forma === "trebol") {
    const s = Math.sqrt(3) / 2;
    return ([[0, 1], [-s, -0.5], [s, -0.5]] as const).map(([dx, dy]) =>
      [R + dx * PLAZA, R + dy * PLAZA, R + dx * R, R + dy * R]);
  }
  return [];
}

/** Distancia al cuadrado de un punto a un segmento, y el punto más cercano. */
function alSegmento(x: number, y: number, ax: number, ay: number, bx: number, by: number): [number, number, number] {
  const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy;
  let t = l2 > 1e-12 ? ((x - ax) * sx + (y - ay) * sy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * sx, cy = ay + t * sy, dx = x - cx, dy = y - cy;
  return [dx * dx + dy * dy, cx, cy];
}

function lejosDeMuros(g: Geometria, x: number, y: number, m: number): boolean {
  const lim = MURO.grosor / 2 + m;
  for (const [ax, ay, bx, by] of muros(g)) if (alSegmento(x, y, ax, ay, bx, by)[0] < lim * lim) return false;
  return true;
}

/**
 * Dirección a casa y distancia a su pared: la del mundo, o la del hueco en el donut. Los muros no
 * son casa, y el camino recto a ella no cruza ninguno.
 */
export function haciaCasa(g: Geometria, x: number, y: number): [number, number, number] {
  if (redonda(g)) {
    const R = g.ancho / 2, ex = x - R, ey = y - R, r = Math.sqrt(ex * ex + ey * ey);
    if (g.forma === "trebol") return r < 1e-9 ? [1, 0, R] : [ex / r, ey / r, R - r];
    return r < 1e-9 ? [1, 0, 0] : [-ex / r, -ey / r, r - huecoDe(g)];
  }
  const [x0, w] = tramo(g, isla(g, x));
  const izq = x - x0, der = x0 + w - x, arr = y, aba = g.alto - y;
  let d = izq, dx = -1, dy = 0;
  if (der < d) { d = der; dx = 1; dy = 0; }
  if (arr < d) { d = arr; dx = 0; dy = -1; }
  if (aba < d) { d = aba; dx = 0; dy = 1; }
  return [dx, dy, d];
}

export const enFranja = (g: Geometria, x: number, y: number): boolean => haciaCasa(g, x, y)[2] < g.casa;

export type Movil = { x: number; y: number; hx: number; hy: number };

/** Refleja el rumbo sobre la normal `n` si apunta hacia el lado `s`. */
function reflejar(b: Movil, nx: number, ny: number, s: number) {
  const p = b.hx * nx + b.hy * ny;
  if (p * s > 0) { b.hx -= 2 * p * nx; b.hy -= 2 * p * ny; }
}

function contraMuro(b: Movil, ax: number, ay: number, bx: number, by: number, lim: number) {
  const m = lim + MURO.grosor / 2;
  const [d2, cx, cy] = alSegmento(b.x, b.y, ax, ay, bx, by);
  if (d2 >= m * m) return;
  let nx: number, ny: number;
  if (d2 < 1e-12) {
    const sx = bx - ax, sy = by - ay, l = Math.sqrt(sx * sx + sy * sy);
    nx = -sy / l; ny = sx / l;
  } else {
    const d = Math.sqrt(d2);
    nx = (b.x - cx) / d; ny = (b.y - cy) / d;
  }
  b.x = cx + nx * m; b.y = cy + ny * m;
  reflejar(b, nx, ny, -1);
}

/** Paredes y muros: el cuerpo se para tangente a ellos, a `lim` del centro, y el rumbo rebota. */
export function chocar(g: Geometria, b: Movil, lim: number) {
  if (redonda(g)) {
    const R = g.ancho / 2, ex = b.x - R, ey = b.y - R, r = Math.sqrt(ex * ex + ey * ey);
    if (r > R - lim) {
      const nx = ex / r, ny = ey / r;
      b.x = R + nx * (R - lim); b.y = R + ny * (R - lim);
      reflejar(b, nx, ny, 1);
    } else if (g.forma === "donut") {
      const H = huecoDe(g);
      if (r < H + lim) {
        const nx = r > 1e-9 ? ex / r : 1, ny = r > 1e-9 ? ey / r : 0;
        b.x = R + nx * (H + lim); b.y = R + ny * (H + lim);
        reflejar(b, nx, ny, -1);
      }
    }
  } else {
    const [x0, w] = tramo(g, isla(g, b.x));
    let x = b.x, y = b.y;
    if (x < x0 + lim) { x = x0 + lim; b.hx = Math.abs(b.hx); }
    else if (x > x0 + w - lim) { x = x0 + w - lim; b.hx = -Math.abs(b.hx); }
    if (y < lim) { y = lim; b.hy = Math.abs(b.hy); }
    else if (y > g.alto - lim) { y = g.alto - lim; b.hy = -Math.abs(b.hy); }
    b.x = x; b.y = y;
  }
  for (const [ax, ay, bx, by] of muros(g)) contraMuro(b, ax, ay, bx, by, lim);
}

const giro = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** Si desde `a` se ve `b`: muros, hueco y mar tapan la vista. */
export function seVe(g: Geometria, ax: number, ay: number, bx: number, by: number): boolean {
  if (g.forma === "islas") return isla(g, ax) === isla(g, bx);
  for (const [px, py, qx, qy] of muros(g)) {
    if (giro(px, py, qx, qy, ax, ay) * giro(px, py, qx, qy, bx, by) < 0 &&
        giro(ax, ay, bx, by, px, py) * giro(ax, ay, bx, by, qx, qy) < 0) return false;
  }
  if (g.forma === "donut") {
    const R = g.ancho / 2, H = huecoDe(g);
    return alSegmento(R, R, ax, ay, bx, by)[0] >= H * H;
  }
  return true;
}

/** Un punto al azar en la línea media de casa, lejos de los muros; `i` elige isla. */
export function puntoEnCasa(g: Geometria, azar: Azar, i = 0): [number, number] {
  const v = g.casa / 2;
  for (;;) {
    let p: [number, number];
    if (redonda(g)) {
      const R = g.ancho / 2, [ux, uy] = unidad(azar);
      const r = g.forma === "trebol" ? R - v : huecoDe(g) + v;
      p = [R + ux * r, R + uy * r];
    } else {
      const [x0, w] = tramo(g, i % 2);
      let d = sig(azar) * (2 * (w + g.alto));
      if (d < w) p = [x0 + d, v];
      else if ((d -= w) < g.alto) p = [x0 + w - v, d];
      else if ((d -= g.alto) < w) p = [x0 + w - d, g.alto - v];
      else p = [x0 + v, d - w];
    }
    if (lejosDeMuros(g, p[0], p[1], v)) return p;
  }
}

/** Un bocado al azar, a `margen` de casa y a `r` de toda pared. El `k`-ésimo cae en la isla `k % 2`. */
export function puntoComida(g: Geometria, margen: number, r: number, azar: Azar, k = 0): [number, number] {
  if (g.forma === "caja" || g.forma === "islas") {
    const [x0, w] = tramo(g, k % 2);
    return [x0 + margen + sig(azar) * (w - 2 * margen), margen + sig(azar) * (g.alto - 2 * margen)];
  }
  for (;;) {
    const x = sig(azar) * g.ancho, y = sig(azar) * g.alto;
    if (haciaCasa(g, x, y)[2] <= margen) continue;
    if (g.forma === "donut") {
      const R = g.ancho / 2, ex = x - R, ey = y - R;
      if (ex * ex + ey * ey > (R - r) * (R - r)) continue;
    }
    if (lejosDeMuros(g, x, y, r)) return [x, y];
  }
}

// ─── Para pintar: aquí sí hay trigonometría ──────────────────────────────────

/** Un punto de la orilla del campo, con la normal que apunta a casa. */
export type PuntoOrilla = { x: number; y: number; nx: number; ny: number };

function lazoCaja(x0: number, y0: number, x1: number, y1: number, paso: number): PuntoOrilla[] {
  const lazo: PuntoOrilla[] = [];
  for (let x = x0; x < x1; x += paso) lazo.push({ x, y: y0, nx: 0, ny: -1 });
  for (let y = y0; y < y1; y += paso) lazo.push({ x: x1, y, nx: 1, ny: 0 });
  for (let x = x1; x > x0; x -= paso) lazo.push({ x, y: y1, nx: 0, ny: 1 });
  for (let y = y1; y > y0; y -= paso) lazo.push({ x: x0, y, nx: -1, ny: 0 });
  return lazo;
}

/** La orilla entre el campo y casa, muestreada cada `paso`: una lista de lazos cerrados. */
export function lazos(g: Geometria, paso: number): PuntoOrilla[][] {
  if (redonda(g)) {
    const R = g.ancho / 2, s = g.forma === "trebol" ? 1 : -1;
    const r = g.forma === "trebol" ? R - g.casa : huecoDe(g) + g.casa;
    const n = Math.max(12, Math.round((2 * Math.PI * r) / paso));
    const lazo: PuntoOrilla[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, cx = Math.cos(a), cy = Math.sin(a);
      lazo.push({ x: R + cx * r, y: R + cy * r, nx: s * cx, ny: s * cy });
    }
    return [lazo];
  }
  const k = g.casa;
  return (g.forma === "islas" ? [0, 1] : [0]).map((i) => {
    const [x0, w] = tramo(g, i);
    return lazoCaja(x0 + k, k, x0 + w - k, g.alto - k, paso);
  });
}

/** El trazo del campo, para recortar el suelo. */
export function trazarCampo(g: Geometria, c: CanvasRenderingContext2D) {
  const R = g.ancho / 2;
  if (g.forma === "trebol") { c.moveTo(R + R - g.casa, R); c.arc(R, R, R - g.casa, 0, 2 * Math.PI); return; }
  if (g.forma === "donut") {
    c.moveTo(R + R, R); c.arc(R, R, R, 0, 2 * Math.PI);
    const r = huecoDe(g) + g.casa;
    c.moveTo(R + r, R); c.arc(R, R, r, 0, 2 * Math.PI, true);
    return;
  }
  for (const i of g.forma === "islas" ? [0, 1] : [0]) {
    const [x0, w] = tramo(g, i);
    c.rect(x0 + g.casa, g.casa, w - 2 * g.casa, g.alto - 2 * g.casa);
  }
}

/** El trazo del mundo en las formas con mar. */
export function trazarMundo(g: Geometria, c: CanvasRenderingContext2D) {
  const R = g.ancho / 2;
  if (g.forma === "donut") { c.moveTo(R + R, R); c.arc(R, R, R, 0, 2 * Math.PI); return; }
  for (const i of [0, 1]) { const [x0, w] = tramo(g, i); c.rect(x0, 0, w, g.alto); }
}
