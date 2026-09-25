// El pincel: los arquetipos, los objetos con dibujo propio y el cielo, a 640×360.
//
// **Aquí no hay calle:** cada pincel dibuja su objeto dentro de la caja que le den. Dónde van
// las cajas y qué hay detrás lo decide la escena (`alzado.ts`, `ventana.ts`).
import type { NivelObjeto } from "../escena";
import {
  apoyo, azar, caja, calendarioDe, enEscena, fino, fondo, horaSolar, luzDe, paleta, px, rampa, trama, tramar, volcar,
  type Caja, type Cajas, type Calendario, type Ctx, type Fondo, type Material, type Paleta, type Pieza, type Rampa,
  type Vista,
} from "./paleta";
import { edificioObra, pinturaObra } from "./edificios";
import { OBJETOS } from "./objetos";

export const ESC = 2.5;
export const ANCHO = 640, ALTO = 360;
export const CORTE = { pasos: 14, recorrido: 0.17, giro: 1.1 };
export const N = 6; // escalones por rampa

export interface Mano {
  P: Paleta;
  F: Fondo;
  noche: boolean;
  /** De qué lado viene la luz: decide dónde va el filo claro y dónde el canto oscuro. */
  luzDesde: number;
  /** Dónde está el suelo en píxeles finos. Lo usan los charcos de luz, no la geometría. */
  suelo: number;
  /** La rampa de un material que no está en la paleta, bajo la luz de la hora. */
  tono: (m: Material) => Rampa;
  /** La estación y la Navidad: visten la calle sin tocar ningún nivel. */
  cal: Calendario;
  /** La hora del sol, que es la de la luz: en diciembre anochece a las seis. */
  solar: number;
}

/** Una composición: dónde va cada objeto y qué hay detrás. */
export interface Escena {
  id: string;
  /** Solo la caja: lo demás sale del catálogo. */
  cajas: Cajas;
  /** El suelo en píxeles finos, para los derrames de luz. */
  suelo: number;
  fondo: (ctx: Ctx, m: Mano, hora: number) => void;
  /** Lo que tapa a los objetos, como el marco de la ventana: se pinta después de ellos. */
  primerPlano?: (ctx: Ctx, m: Mano, hora: number) => void;
  /** Si la escena enmarca la calle, dónde cabe, en píxeles finos. */
  recorte?: { x: number; y: number; w: number; h: number };
}

/** `hora` es la del reloj; la luz sale de la del sol en ese día del año. */
export function manoDe(hora: number, suelo: number, cal: Calendario): Mano {
  const solar = horaSolar(hora, cal.dia);
  const L = luzDe(solar);
  return {
    P: paleta(L, CORTE, N), F: fondo(L, CORTE, 9), noche: L.noche,
    luzDesde: solar < 13 ? 1 : -1,
    suelo,
    tono: (m) => rampa(m, L, CORTE, N),
    cal, solar,
  };
}

/** Transición tramada entre dos tonos: lo que en este medio hace de degradado. */
export function fundir(ctx: Ctx, x: number, y: number, w: number, alto: number, a: string, b: string) {
  px(ctx, x, y, w, alto, a);
  for (let j = 0; j < alto; j++) tramar(ctx, x, y + j, w, 1, b, j / Math.max(1, alto - 1));
}

/** Un resplandor redondo y tramado: `tramar` sobre un rectángulo dejaría un cuadrado. */
export function resplandor(ctx: Ctx, cx: number, cy: number, radio: number, color: string, fuerza: number) {
  for (let j = -radio; j <= radio; j++)
    for (let i = -radio; i <= radio; i++) {
      const d = Math.sqrt(i * i + j * j) / radio;
      if (d <= 1 && trama(cx + i, cy + j) < fuerza * (1 - d) ** 1.7) px(ctx, cx + i, cy + j, 1, 1, color);
    }
}

export function disco(ctx: Ctx, cx: number, cy: number, r: number, color: string, dx = 0, dy = 0) {
  for (let j = -r; j <= r; j++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)));
    if (w > 0) px(ctx, cx - w + dx, cy + j + dy, w * 2 + 1, 1, color);
  }
}

/** El cielo hasta `horizonte`, con el astro de la hora. Sin nubes ni estrellas cuando las pinta
 *  la animación. */
export function cielo(ctx: Ctx, m: Mano, hora: number, horizonte: number, conNubes = true) {
  const n = m.F.cielo.length;
  for (let y = 0; y < horizonte; y++) {
    const v = (y / (horizonte - 1)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(v)), f = v - i;
    px(ctx, 0, y, ANCHO, 1, m.F.cielo[i]);
    if (f > 0.25) tramar(ctx, 0, y, ANCHO, 1, m.F.cielo[i + 1], (f - 0.25) / 0.75);
  }
  if (m.noche && conNubes)
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(azar(i * 3 + 1) * ANCHO), y = Math.floor(azar(i * 3 + 2) * (horizonte - 40));
      px(ctx, x, y, 1, 1, m.P.luz[azar(i) > 0.55 ? 5 : 4]);
    }
  for (let i = 0; i < (conNubes ? 6 : 0); i++) {
    const cx = Math.floor(azar(i * 9 + 1) * ANCHO), cy = 14 + Math.floor(azar(i * 9 + 2) * (horizonte * 0.45));
    const w = 40 + Math.floor(azar(i * 9 + 3) * 70);
    for (let k = 0; k < 4; k++) {
      const dx = Math.floor((azar(i * 9 + 4 + k) - 0.5) * w), dy = Math.floor(azar(i * 9 + 5 + k) * 6);
      const rw = Math.floor(w * (0.3 + azar(i * 9 + 6 + k) * 0.35)), rh = 4 + Math.floor(azar(i * 9 + 7 + k) * 5);
      px(ctx, cx + dx, cy + dy, rw, rh, m.F.cielo[Math.max(0, 2 - k)]);
      px(ctx, cx + dx, cy + dy, rw, 1, m.F.cielo[0]);
    }
  }

  const h = ((hora % 24) + 24) % 24;
  const dia = h > 6.5 && h < 20.5;
  const t = dia ? (h - 6.5) / 14 : ((h + 24 - 20.5) % 24) / 10;
  const cx = Math.round(24 + t * (ANCHO - 48));
  const cy = Math.round(horizonte - 30 - Math.sin(Math.PI * t) * (horizonte * 0.6));
  const r = dia ? 13 : 11;
  resplandor(ctx, cx, cy, r + 26, m.P.luz[5], dia ? 0.5 : 0.35);
  disco(ctx, cx, cy, r, m.P.luz[dia ? 5 : 4]);
  if (!dia) disco(ctx, cx, cy, r - 2, m.F.cielo[1], 5, -2);
}

// ── El árbol ────────────────────────────────────────────────────────────────

/** El color de la copa según la estación. En otoño, además, motas rojizas por encima. */
function follaje(m: Mano, est: Calendario["estacion"]): Rampa {
  if (est === "primavera") return m.tono({ l: 0.56, c: 0.14, h: 135 });
  if (est === "otoño") return m.tono({ l: 0.58, c: 0.12, h: 68 });
  return m.P.hoja;
}

/** El tronco desde el suelo hasta `arranque`, ensanchándose al bajar. Devuelve su grosor. */
function fuste(ctx: Ctx, m: Mano, b: Caja, cx: number, arranque: number): number {
  const tronco = Math.max(2, Math.round(b.w * 0.09)), pie = b.y + b.h, lado = m.luzDesde;
  for (let j = arranque; j < pie; j++) {
    const ancho = tronco + Math.floor((j - arranque) / 18) + (j > pie - 3 ? 2 : 0);
    const x0 = cx - Math.floor(ancho / 2);
    px(ctx, x0, j, ancho, 1, m.P.madera[2]);
    px(ctx, lado > 0 ? x0 : x0 + ancho - 1, j, 1, 1, m.P.madera[3]);
    px(ctx, lado > 0 ? x0 + ancho - 1 : x0, j, 1, 1, m.P.madera[1]);
    if ((j * 7) % 11 === 0) px(ctx, x0 + 1, j, 1, 2, m.P.madera[1]);              // corteza
  }
  return tronco;
}

/** Un trazo de `grueso` píxeles de un punto a otro. */
function trazo(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, grueso: number, color: string) {
  const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let s = 0; s <= pasos; s++)
    px(ctx, Math.round(x0 + ((x1 - x0) * s) / pasos), Math.round(y0 + ((y1 - y0) * s) / pasos), grueso, grueso, color);
}

/** Las luces de Navidad, que de noche parpadean. `k` las distingue. */
function bombilla(ctx: Ctx, m: Mano, x: number, y: number, k: number, vivo?: Vivo) {
  const color = [m.P.tela, m.P.luz, m.P.hoja, m.tono({ l: 0.6, c: 0.12, h: 250 })][k % 4];
  const apagada = m.noche && vivo && Math.sin(vivo.t * 1.7 + k * 2.3) < -0.6;
  px(ctx, x, y, 1, 1, m.noche && !apagada ? color[5] : color[3]);
}

/** El árbol sin hoja: las ramas se abren en horquillas, cada vez más finas, hasta las
 *  puntas. Por Navidad, con luces. */
function ramaje(ctx: Ctx, m: Mano, cx: number, arranque: number, r: number, vivo?: Vivo) {
  const puntas: [number, number][] = [];
  const rama = (x: number, y: number, ang: number, largo: number, prof: number, k: number) => {
    const x1 = x + Math.cos(ang) * largo, y1 = y + Math.sin(ang) * largo;
    trazo(ctx, x, y, x1, y1, prof >= 3 ? 2 : 1, prof >= 2 ? m.P.madera[2] : m.P.madera[1]);
    if (prof === 0) { puntas.push([Math.round(x1), Math.round(y1)]); return; }
    const abre = 0.28 + azar(k * 7 + 1) * 0.3;
    rama(x1, y1, ang - abre, largo * 0.74, prof - 1, k * 2 + 1);
    rama(x1, y1, ang + abre * 0.8, largo * 0.7, prof - 1, k * 2 + 2);
  };
  [-2.35, -1.95, -1.57, -1.2, -0.8].forEach((ang, i) =>
    rama(cx + (i - 2), arranque, ang + (azar(i + 90) - 0.5) * 0.2, r * 0.42, 4, i + 1));
  if (m.cal.navidad) puntas.forEach(([x, y], i) => i % 2 === 0 && bombilla(ctx, m, x, y, i, vivo));
}

/** Recién podado: el tronco y los muñones, y en cuanto no es invierno, los brotes. */
function podado(ctx: Ctx, m: Mano, b: Caja, est: Calendario["estacion"], vivo?: Vivo) {
  const cx = b.x + Math.round(b.w / 2), arranque = b.y + Math.round(b.h * 0.5);
  const tronco = fuste(ctx, m, b, cx, arranque);
  const brote = follaje(m, est);
  [-2.4, -1.95, -1.2, -0.75].forEach((ang, i) => {
    const largo = b.w * (0.14 + azar(i + 70) * 0.05);
    const x0 = cx + Math.round((i - 1.5) * (tronco / 3));
    const x1 = Math.round(x0 + Math.cos(ang) * largo), y1 = Math.round(arranque + Math.sin(ang) * largo);
    trazo(ctx, x0, arranque, x1, y1, 2, m.P.madera[2]);
    disco(ctx, x1, y1, 2, m.P.madera[2]);                                             // el muñón
    px(ctx, x1 - 1, y1 - 2, 2, 1, m.P.madera[3]);
    if (est === "invierno") { if (m.cal.navidad) bombilla(ctx, m, x1, y1 - 3, i, vivo); return; }
    for (let k = 0; k < 6; k++) {                                                     // las varas nuevas
      const a = -Math.PI / 2 + (azar(i * 9 + k) - 0.5) * 1.3, l = 5 + Math.round(azar(i * 9 + k + 4) * 7);
      const xt = x1 + Math.cos(a) * l, yt = y1 - 2 + Math.sin(a) * l;
      trazo(ctx, x1, y1 - 2, xt, yt, 1, brote[2]);
      for (let h = 2; h < l; h += 3) px(ctx, Math.round(x1 + Math.cos(a) * h) + (h % 2 ? 1 : -1), Math.round(y1 - 2 + Math.sin(a) * h), 1, 1, brote[4]);
    }
  });
  apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
  if (est === "otoño") hojarasca(ctx, m, cx, b.y + b.h, b.w * 0.3);
}

/** Las hojas caídas en la acera, al pie del árbol. */
function hojarasca(ctx: Ctx, m: Mano, cx: number, pie: number, r: number) {
  const colores = [m.P.ladrillo[4], m.tono({ l: 0.62, c: 0.12, h: 72 })[3], m.P.ladrillo[3]];
  for (let k = 0; k < 26; k++) {
    const x = Math.round(cx + (azar(k + 500) - 0.5) * r * 2.6), y = pie - 2 + Math.round(azar(k + 520) * 4);
    px(ctx, x, y, 2, 1, colores[k % 3]);
  }
}

// ── Los arquetipos ──────────────────────────────────────────────────────────

/** Lo que mueve a un objeto sin cambiarlo de nivel: el viento, el parpadeo de la farola. */
export interface Vivo {
  /** Segundos: la fase de los vaivenes. */
  t: number;
  /** 0 calma, 1 ráfaga. */
  viento: number;
  /** 1 la farola luce entera, 0 está apagada en mitad de un parpadeo. */
  luz: number;
}

export type Pincel = (ctx: Ctx, m: Mano, b: Caja, p: Pieza, n: number, vivo?: Vivo) => void;

export const PINCELES: Record<string, Pincel> = {
  // La copa, o el árbol entero si `caduca`: su nivel 0 es el recién podado, y a partir de ahí
  // crece. La estación le cambia el color, y en invierno lo deja en las ramas.
  planta: (ctx, m, b, p, n, vivo) => {
    const est = p.caduca ? m.cal.estacion : "verano";
    if (p.caduca && n === 0) return podado(ctx, m, b, est, vivo);
    const v = p.caduca ? (n - 1) / (p.variantes - 2) : Math.min(n, p.variantes - 1) / (p.variantes - 1);
    const cx = b.x + Math.round(b.w / 2), cy = b.y + Math.round(b.h * 0.42), pie = b.y + b.h;
    const r = Math.max(3, Math.round((b.w / 2) * (0.45 + 0.55 * v)));
    const lado = m.luzDesde;
    const arranque = cy + Math.round(r * 0.35);
    const tronco = fuste(ctx, m, b, cx, arranque);
    if (est === "invierno") {
      ramaje(ctx, m, cx, arranque, r, vivo);
      apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
      return;
    }
    for (const [dx, dy] of [[-0.5, -0.15], [0.45, -0.3], [0.05, -0.5]])
      for (let s = 0; s <= 10; s++) {
        const t = s / 10;
        px(ctx, Math.round(cx + dx * r * t), Math.round(arranque + (dy * r - r * 0.35) * t), t < 0.5 ? 2 : 1, 2, m.P.madera[2]);
      }
    apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
    // El viento mece la copa, cada racimo con su fase: en bloque parece una pegatina.
    const mecer = (i: number, my: number) => vivo
      ? Math.round(vivo.viento * 2.2 * Math.max(0.2, (cy + r * 0.3 - my) / r) * Math.sin(vivo.t * 1.3 + i * 1.7) + vivo.viento * 0.8)
      : 0;
    // La copa se pinta por capas —sombra, medio tono, luz— y no racimo a racimo, para que se
    // lea como una masa y no como un montón de bolas.
    const racimos: [number, number, number][] = [
      [0, -0.3, 0.6], [-0.48, 0, 0.5], [0.48, -0.05, 0.5], [-0.25, 0.32, 0.46], [0.3, 0.3, 0.46],
      [-0.05, -0.62, 0.42], [0.5, -0.45, 0.36], [-0.52, -0.42, 0.36], [0.05, 0.1, 0.5],
    ];
    const pos = racimos.map(([dx, dy, dr], i) => {
      const my = cy + Math.round(dy * r * 0.9);
      return { x: cx + Math.round(dx * r) + mecer(i, my), y: my, r: Math.max(2, Math.round(dr * r)) };
    });
    const H = follaje(m, est);
    pos.forEach((q) => disco(ctx, q.x, q.y, q.r + 1, H[1]));
    // El borde deshilachado: hojas sueltas alrededor de cada racimo.
    pos.forEach((q, i) => {
      for (let k = 0; k < 10; k++) {
        const a = azar(i * 40 + k) * Math.PI * 2;
        px(ctx, Math.round(q.x + Math.cos(a) * (q.r + 2)), Math.round(q.y + Math.sin(a) * (q.r + 2)), 1, 1, H[azar(i * 40 + k + 7) > 0.5 ? 1 : 2]);
      }
    });
    for (const q of pos) disco(ctx, q.x + lado, q.y - 1, Math.max(1, q.r - 1), H[2]);
    for (const q of pos) if (q.y < cy + r * 0.2) disco(ctx, q.x + lado * Math.round(q.r * 0.35), q.y - Math.round(q.r * 0.35), Math.max(1, Math.round(q.r * 0.5)), H[3]);
    pos.forEach((q, i) => {                                                           // brillos sueltos
      if (q.y > cy) return;
      for (let k = 0; k < 4; k++)
        px(ctx, q.x + lado * Math.round(azar(i * 9 + k) * q.r * 0.7), q.y - Math.round(azar(i * 9 + k + 3) * q.r * 0.7), 1, 1, H[4]);
    });
    // Dos huecos oscuros: sin ellos la copa es una piedra.
    disco(ctx, cx + Math.round(r * 0.35), cy + Math.round(r * 0.3), Math.max(1, Math.round(r * 0.1)), H[0]);
    disco(ctx, cx - Math.round(r * 0.45), cy - Math.round(r * 0.05), Math.max(1, Math.round(r * 0.08)), H[0]);
    if (est === "primavera" || est === "otoño") {                                     // en flor, o virando al rojo
      const motas = est === "primavera"
        ? [m.tono({ l: 0.68, c: 0.17, h: 350 })[3], m.tono({ l: 0.68, c: 0.17, h: 350 })[4]]
        : [m.tono({ l: 0.5, c: 0.14, h: 38 })[2], m.tono({ l: 0.5, c: 0.14, h: 38 })[3]];
      pos.forEach((q, i) => {
        for (let k = 0; k < 7; k++) {
          const a = azar(i * 50 + k + 300) * Math.PI * 2, d = azar(i * 50 + k + 301) * q.r;
          px(ctx, Math.round(q.x + Math.cos(a) * d), Math.round(q.y + Math.sin(a) * d), 1, 1, motas[k % 3 ? 0 : 1]);
        }
      });
    }
    if (est === "otoño") hojarasca(ctx, m, cx, pie, r);
  },
  // La farola, un modelo por nivel: brazo curvo, fernandina o LED. Las tres tienen la cabeza en
  // (cx + 4 … cx + 18, b.y), donde se posa el pájaro.
  poste: (ctx, m, b, p, n, vivo) => {
    const v = n % p.variantes;
    const cx = b.x + Math.round(b.w / 2);
    const color = [m.F.tinta, m.tono({ l: 0.3, c: 0.05, h: 160 })[1], m.P.metal[3]][v];
    const brillo = [m.P.metal[3], m.tono({ l: 0.3, c: 0.05, h: 160 })[3], m.P.metal[5]][v];
    let foco: { x: number; y: number };
    if (v === 0) {                                  // brazo curvo con la cabeza de chapa
      px(ctx, cx - 2, b.y + 10, 4, b.h - 10, color);
      px(ctx, cx - 2, b.y + 10, 1, b.h - 10, brillo);
      for (let i = 0; i < 12; i++) px(ctx, cx - 2 + Math.round(i * 0.5), b.y + 10 - i, 3, 2, color);
      px(ctx, cx + 4, b.y, 14, 5, color);
      foco = { x: cx + 11, y: b.y + 5 };
    } else if (v === 1) {                           // fernandina: fuste con anillos, voluta y farol
      px(ctx, cx - 2, b.y + 8, 3, b.h - 8, color);
      px(ctx, cx - 2, b.y + 8, 1, b.h - 8, brillo);
      for (const k of [0.25, 0.55]) px(ctx, cx - 3, b.y + Math.round(b.h * k), 5, 2, color);
      px(ctx, cx - 4, b.y + b.h - 10, 7, 10, color);                            // la basa
      px(ctx, cx - 1, b.y + 8, 13, 2, color);                                   // el brazo recto
      for (let i = 0; i < 5; i++) px(ctx, cx + 1 + i, b.y + 10 + Math.round(Math.sin(i) * 1.5), 1, 1, color);   // la voluta
      px(ctx, cx + 8, b.y, 9, 2, color);                                        // el sombrerete
      px(ctx, cx + 9, b.y + 2, 7, 8, color);                                    // el farol
      px(ctx, cx + 10, b.y + 3, 5, 6, m.noche ? m.P.luz[5] : m.P.metal[4]);
      px(ctx, cx + 12, b.y + 3, 1, 6, color);
      px(ctx, cx + 10, b.y + 10, 5, 1, color);
      foco = { x: cx + 12, y: b.y + 10 };
    } else {                                        // de LED: fuste recto y cabeza plana
      px(ctx, cx - 1, b.y + 2, 3, b.h - 2, color);
      px(ctx, cx - 1, b.y + 2, 1, b.h - 2, brillo);
      px(ctx, cx - 3, b.y + b.h - 4, 7, 4, m.P.metal[2]);
      px(ctx, cx + 1, b.y + 1, 4, 1, color);
      px(ctx, cx + 3, b.y, 17, 3, m.P.metal[2]);
      px(ctx, cx + 3, b.y, 17, 1, brillo);
      px(ctx, cx + 5, b.y + 3, 13, 1, m.noche ? m.P.metal[5] : m.P.metal[4]);
      foco = { x: cx + 11, y: b.y + 4 };
    }
    if (!m.noche) return;
    const luz = vivo?.luz ?? 1;
    if (v === 0) px(ctx, cx + 5, b.y + 5, 12, 2, luz > 0.5 ? m.P.luz[5] : m.P.metal[2]);
    if (luz <= 0) return;
    // El cono, con el borde deshilachado: uniforme parece una chapa. El LED alumbra más blanco.
    const tinte = v === 2 ? m.P.metal[5] : m.P.luz[5];
    const bajo = m.suelo + 12, largo = bajo - foco.y;
    for (let j = 0; j < largo; j++) {
      const t = j / largo;
      const ancho = 8 + Math.round(j * 0.9);
      for (let i = 0; i < ancho; i++) {
        const lado = Math.abs(i / (ancho - 1) - 0.5) * 2;
        const x = foco.x - Math.round(ancho / 2) + i, y = foco.y + j;
        if (trama(x, y) < 0.42 * luz * (1 - t) * (1 - lado ** 2)) px(ctx, x, y, 1, 1, tinte);
      }
    }
  },
  // La rehabilitación, en ciclos de tres: andamio sobre la fachada vieja, lona sobre la nueva
  // y el edificio acabado de otro color.
  andamio: (ctx, m, b, p, n) => {
    const v = ((n % p.variantes) + p.variantes) % p.variantes, fase = v % 3;
    if (fase === 2) return edificioObra(ctx, m, b, pinturaObra(v));
    edificioObra(ctx, m, b, pinturaObra(fase === 0 ? (v + 8) % 9 : v + 1));
    const x0 = b.x + 8, x1 = b.x + b.w - 8, arriba = b.y + 6, abajo = b.y + b.h;
    const paso = Math.round((x1 - x0) / 6);
    if (fase === 1) {                                                         // la lona, casi opaca
      const malla = m.tono({ l: 0.5, c: 0.07, h: 160 });
      tramar(ctx, x0, arriba, x1 - x0, abajo - arriba, malla[2], 0.8);
      tramar(ctx, x0, arriba, x1 - x0, abajo - arriba, malla[3], 0.35);
      const cartel = { x: x0 + Math.round((x1 - x0) / 2) - 26, y: arriba + 30, w: 52, h: 16 };
      px(ctx, cartel.x, cartel.y, cartel.w, cartel.h, m.P.piedra[5]);
      px(ctx, cartel.x, cartel.y, cartel.w, 4, m.tono({ l: 0.45, c: 0.12, h: 255 })[3]);
      px(ctx, cartel.x + 4, cartel.y + 7, cartel.w - 8, 2, m.F.tinta);
      px(ctx, cartel.x + 4, cartel.y + 11, cartel.w - 20, 1, m.P.metal[2]);
    }
    for (let x = x0; x <= x1; x += paso) {                                    // los pies derechos
      px(ctx, x, arriba, 2, abajo - arriba, m.P.luz[3]);
      px(ctx, x, arriba, 1, abajo - arriba, m.P.luz[4]);
    }
    for (let y = abajo - 2; y > arriba; y -= 34) {                            // las plataformas
      px(ctx, x0, y, x1 - x0 + 2, 2, m.P.luz[3]);
      px(ctx, x0, y - 2, x1 - x0 + 2, 2, m.P.madera[3]);
      px(ctx, x0, y - 3, x1 - x0 + 2, 1, m.P.madera[4]);
      if (fase === 0)                                                         // las cruces, que la lona tapa
        for (let x = x0; x + paso <= x1; x += paso * 2)
          for (let k = 0; k < paso; k++) px(ctx, x + k, y - 3 - Math.round((k * 30) / paso), 1, 1, m.P.luz[2]);
    }
  },
  tendal: (ctx, m, b, p, n, vivo) => {
    // Con viento, el cable bota y cada prenda se aparta más cuanto más abajo.
    const bote = vivo ? 1 + 0.35 * vivo.viento * Math.sin(vivo.t * 1.1) : 1;
    const flecha = (x: number) => Math.round(2 * bote * Math.sin((x / b.w) * Math.PI));
    for (let x = 0; x < b.w; x++) px(ctx, b.x + x, b.y + flecha(x), 1, 1, m.F.tinta);
    const cuantas = 1 + (n % p.variantes);
    const paso = (b.w - 8) / p.variantes;
    for (let i = 0; i < cuantas; i++) {
      const x = b.x + 3 + Math.round(i * paso);
      const cuelga = b.y + flecha(x - b.x);
      const alto = Math.max(6, Math.round(b.h * 0.42) + ((i + n) % 3) * 4);
      const ancho = Math.max(4, Math.round(paso * 0.8));
      const R = [m.P.tela, m.P.metal, m.P.hoja, m.P.luz][(i + n) % 4];
      const vuelo = vivo
        ? vivo.viento * (2.2 + 1.6 * Math.sin(vivo.t * (1.5 + 0.2 * i) + i * 1.3)) + 0.7 * Math.sin(vivo.t * 0.7 + i)
        : 0;
      px(ctx, x + 3, cuelga, 1, 2, m.F.tinta);
      for (let j = 0; j <= alto; j++) {
        const dx = Math.round(vuelo * (j / alto) ** 1.3);
        if (j === alto) { px(ctx, x + dx, cuelga + 2 + j, ancho, 1, R[0]); break; }
        px(ctx, x + dx, cuelga + 2 + j, ancho, 1, R[3]);
        px(ctx, x + dx, cuelga + 2 + j, 1, 1, R[4]);
        px(ctx, x + dx + ancho - 1, cuelga + 2 + j, 1, 1, R[1]);
      }
    }
  },
};

/** Los objetos que no son un arquetipo con un adorno encima sino un dibujo entero suyo. */
export const PROPIOS: Record<string, Pincel> = {
  ...OBJETOS,
  // Cada nivel es otro vehículo, con su forma: turismo, furgoneta, plaza vacía, ranchera, taxi.
  coche: (ctx, m, b, p, n) => {
    const v = n % p.variantes;
    if (v === 2) return;
    // alto: de las ruedas al techo · chapa: qué parte del alto es carrocería · capo y maletero:
    // lo que sobresale de la cabina por delante y por detrás · luna y zaga: cuánto se inclinan
    // el parabrisas y la luna trasera (píxeles por fila).
    const forma = [
      { alto: 24, largo: 0.8, chapa: 0.5, capo: 0.27, maletero: 0.17, luna: 1.3, zaga: 0.9 },  // turismo
      { alto: 37, largo: 0.7, chapa: 0.5, capo: 0.12, maletero: 0.01, luna: 0.35, zaga: 0 },    // furgoneta
      { alto: 0, largo: 0, chapa: 0, capo: 0, maletero: 0, luna: 0, zaga: 0 },
      { alto: 26, largo: 0.92, chapa: 0.52, capo: 0.22, maletero: 0.04, luna: 1.1, zaga: 0.2 }, // ranchera
      { alto: 24, largo: 0.78, chapa: 0.5, capo: 0.27, maletero: 0.17, luna: 1.3, zaga: 0.9 },  // taxi
    ][v];
    const R = [m.P.tela, m.P.metal, m.P.tela, m.P.hoja, m.P.piedra][v];
    const esc = b.h / 43;
    const L = Math.round(b.w * forma.largo), x0 = b.x + Math.round((b.w - L) / 2);
    const suelo = b.y + b.h - 1, alto = Math.round(forma.alto * esc);
    const chapa = Math.round(alto * forma.chapa), cabina = alto - chapa;
    const rueda = Math.max(3, Math.round(5 * esc));
    const base = suelo - Math.round(rueda * 0.7);          // bajo de la carrocería
    // La silueta como filas [y, desde, hasta]: así el contorno sale de dilatarla un píxel.
    const filas: [number, number, number][] = [];
    for (let j = 0; j < chapa; j++) {
      const hueco = j === 0 ? 2 : j === 1 || j === chapa - 1 ? 1 : 0;
      filas.push([base - chapa + j, x0 + hueco, x0 + L - 1 - hueco]);
    }
    const c0 = x0 + Math.round(L * forma.maletero), c1 = x0 + L - 1 - Math.round(L * forma.capo);
    for (let k = 0; k < cabina; k++) {
      const desdeAbajo = cabina - k;
      filas.push([base - chapa - cabina + k, c0 + Math.round(forma.zaga * desdeAbajo), c1 - Math.round(forma.luna * desdeAbajo)]);
    }
    tramar(ctx, x0 - 2, suelo - 1, L + 4, 2, m.F.tinta, 0.55);                // sombra en el suelo
    for (const [y, a, z] of filas) px(ctx, a - 1, y - 1, z - a + 3, 3, m.F.tinta);
    const ruedas = [x0 + Math.round(L * 0.2), x0 + Math.round(L * 0.8)];
    for (const cx of ruedas) disco(ctx, cx, suelo - rueda, rueda + 1, m.F.tinta);
    for (const [y, a, z] of filas) px(ctx, a, y, z - a + 1, 1, R[3]);
    // Luz en el hombro de la chapa y en el techo, sombra en los bajos.
    px(ctx, x0 + 2, base - chapa, L - 4, 1, R[5]);
    px(ctx, x0 + 1, base - chapa + 1, L - 2, 1, R[4]);
    px(ctx, x0 + 1, base - 2, L - 2, 2, R[1]);
    const techo = filas[chapa];
    px(ctx, techo[1], techo[0], techo[2] - techo[1] + 1, 1, R[4]);
    // Las ventanillas: la cabina por dentro, con el montante en medio. La furgoneta solo
    // lleva cristal delante: detrás es carga.
    const cristal = m.noche ? m.P.metal[1] : m.P.metal[4];
    const medio = Math.round((c0 + c1) / 2);
    for (let k = 1; k < cabina - 1; k++) {
      const [y, a, z] = filas[chapa + k];
      const desde = v === 1 ? Math.round(a + (z - a) * 0.62) : a + 1;
      if (z - 1 > desde) px(ctx, desde, y, z - desde - 1, 1, cristal);
    }
    if (!m.noche) for (let k = 1; k < cabina - 1; k++) {                       // reflejo en diagonal
      const [y, , z] = filas[chapa + k];
      px(ctx, z - 3 - k, y, 1, 1, m.P.metal[5]);
    }
    if (v !== 1) px(ctx, medio, base - chapa - cabina + 1, 2, cabina, R[3]);
    // Puerta, tirador y las ruedas con su tapacubos.
    px(ctx, medio, base - chapa + 2, 1, chapa - 4, R[1]);
    px(ctx, medio + 3, base - chapa + 3, 2, 1, R[5]);
    px(ctx, medio - 5, base - chapa + 3, 2, 1, R[5]);
    for (const cx of ruedas) {
      disco(ctx, cx, suelo - rueda, rueda, m.P.asfalto[0]);
      disco(ctx, cx, suelo - rueda, Math.max(1, rueda - 2), m.P.metal[3]);
    }
    // Faros: delante claro, detrás rojo. Sin halo tramado: de noche basta con que luzcan.
    px(ctx, x0 + L - 2, base - chapa + 2, 2, 2, m.noche ? m.P.luz[5] : m.P.luz[3]);
    px(ctx, x0, base - chapa + 2, 1, 2, m.P.tela[m.noche ? 5 : 4]);
    if (v === 4) {                                                             // el taxi
      px(ctx, medio - 3, base - chapa - cabina - 3, 7, 3, m.F.tinta);
      px(ctx, medio - 2, base - chapa - cabina - 2, 5, 2, m.P.luz[m.noche ? 5 : 4]);
      px(ctx, x0 + 2, base - Math.round(chapa / 2), L - 4, 1, m.P.tela[4]);
    }
  },
  // El contenedor: el nivel es el color —vidrio, papel, orgánico, plástico— y el último, el de
  // plástico con bolsas al lado. Casi tan alto como ancho: más bajo parece una maceta.
  contenedor: (ctx, m, b, p, n) => {
    const v = n % p.variantes;
    const R = [m.P.hoja, m.tono({ l: 0.5, c: 0.12, h: 250 }), m.P.madera, m.tono({ l: 0.74, c: 0.15, h: 92 }), m.tono({ l: 0.74, c: 0.15, h: 92 })][v];
    const suelo = b.y + b.h - 1;
    const alto = Math.round(b.h * (0.88 + 0.03 * v)), w = Math.min(b.w - 6, Math.round(alto * 1.25));
    const x0 = b.x + Math.round((b.w - w) / 2), y0 = suelo - alto;
    const tapa = 5, pie = 4;                              // lo que ocupan la tapa y las ruedas
    const cuba = alto - tapa - pie;
    tramar(ctx, x0 - 2, suelo - 1, w + 4, 2, m.F.tinta, 0.55);
    // Ruedas, por debajo de la cuba.
    for (const cx of [x0 + 5, x0 + w - 6]) {
      disco(ctx, cx, suelo - 2, 2, m.F.tinta);
      px(ctx, cx, suelo - 2, 1, 1, m.P.metal[2]);
    }
    // La cuba: contorno, color, luz a un lado y sombra al otro; se estrecha un píxel abajo.
    const yc = y0 + tapa;
    px(ctx, x0 - 1, yc, w + 2, cuba + 1, m.F.tinta);
    for (let j = 0; j < cuba; j++) {
      const a = j > cuba - 4 ? 1 : 0;
      px(ctx, x0 + a, yc + j, w - 2 * a, 1, R[3]);
    }
    px(ctx, x0 + 1, yc, 2, cuba - 1, R[4]);
    px(ctx, x0 + w - 3, yc, 2, cuba - 1, R[1]);
    px(ctx, x0, yc, w, 2, R[1]);                                                 // sombra de la tapa
    px(ctx, x0, yc + cuba - 3, w, 2, R[2]);
    for (let x = x0 + 6; x < x0 + w - 5; x += 7) px(ctx, x, yc + 4, 1, cuba - 8, R[2]);
    px(ctx, x0 + Math.round(w / 2) - 4, yc + cuba - 1, 8, 2, m.F.tinta);         // pedal
    // Asas a los lados.
    px(ctx, x0 - 3, yc + 3, 3, 2, m.F.tinta);
    px(ctx, x0 + w, yc + 3, 3, 2, m.F.tinta);
    // La tapa, abombada: cada fila un poco más corta que la de debajo.
    const filas = [[3, 0], [1, 1], [0, 2], [-1, 3], [-2, 4]];
    for (const [hueco, j] of filas) px(ctx, x0 + hueco - 1, y0 + j - 1, w - 2 * hueco + 2, 1, m.F.tinta);
    for (const [hueco, j] of filas) px(ctx, x0 + hueco, y0 + j, w - 2 * hueco, 1, j === 0 ? R[4] : j === 4 ? R[1] : R[2]);
    px(ctx, x0 - 3, y0 + 4, w + 6, 1, m.F.tinta);
    if (v === 4) {                                                               // las bolsas
      for (const [bx, r] of [[x0 - 3, 4], [x0 + 3, 3], [x0 + w + 1, 4]] as const) {
        disco(ctx, bx, suelo - r, r + 1, m.F.tinta);
        disco(ctx, bx, suelo - r, r, m.P.asfalto[1]);
        px(ctx, bx - 1, suelo - r * 2 - 1, 2, 2, m.P.asfalto[2]);                 // el nudo
        px(ctx, bx - 1, suelo - r - 1, 1, 1, m.P.metal[3]);                       // el brillo del plástico
      }
    }
  },
};

/** Lo que se pinta encima del arquetipo: la maceta del macetero. */
export const DETALLE: Record<string, Pincel> = {
  macetero: (ctx, m, b) => {
    const y = b.y + Math.round(b.h * 0.5);
    for (let j = 0; j < b.h - (y - b.y); j++)
      px(ctx, b.x + 2 + Math.floor(j / 4), y + j, Math.max(2, b.w - 4 - Math.floor(j / 2)), 1, m.P.ladrillo[3]);
    px(ctx, b.x, y - 3, b.w, 4, m.P.ladrillo[4]);
    px(ctx, b.x, y - 3, b.w, 1, m.P.ladrillo[5]);
  },
};

/** Un objeto: su dibujo propio, o su arquetipo y encima lo que lo hace ese objeto. */
export function pintarObjeto(ctx: Ctx, m: Mano, id: string, b: Caja, p: Pieza, n: number, vivo?: Vivo) {
  if (PROPIOS[id]) return PROPIOS[id](ctx, m, b, p, n, vivo);
  PINCELES[p.arquetipo](ctx, m, b, p, n, vivo);
  DETALLE[id]?.(ctx, m, b, p, n, vivo);
}

/** Pinta una escena entera. `hora` es la del reloj, y `fecha` pone la estación. */
export function pintarEscena(ctx: Ctx, vista: Vista, niveles: NivelObjeto[], hora: number, fecha: Date, escena: Escena) {
  const m = manoDe(hora, escena.suelo, calendarioDe(fecha));
  const f = fino(ESC);
  escena.fondo(f.ctx, m, m.solar);
  if (escena.recorte) {
    f.ctx.save();
    f.ctx.beginPath();
    f.ctx.rect(escena.recorte.x, escena.recorte.y, escena.recorte.w, escena.recorte.h);
    f.ctx.clip();
  }
  for (const { id, p, n } of enEscena(niveles, hora)) {
    const c = escena.cajas[id];
    if (!c) continue;
    const b = caja({ ...p, ...c }, ESC);
    pintarObjeto(f.ctx, m, id, b, p, n);
  }
  if (escena.recorte) f.ctx.restore();
  escena.primerPlano?.(f.ctx, m, m.solar);
  volcar(ctx, vista, f);
}
