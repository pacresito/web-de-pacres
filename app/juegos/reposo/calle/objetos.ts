// Los objetos de la calle con dibujo propio (el grafiti, en `grafiti.ts`) y el local de la tienda.
//
// **Cada nivel cambia algo que se nombra** —la persiana baja, hay otra bici, han pegado otro
// cartel—, no un tamaño: un tamaño que cambia se lee como que el dibujo respira.
import { apoyo, px, tramar, type Caja, type Ctx, type Pieza, type Rampa } from "./paleta";
import type { Mano, Pincel } from "./pincel";
import { grafiti } from "./grafiti";

const R = Math.round;

// ── Utilidades ──────────────────────────────────────────────────────────────

function circulo(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  for (let j = -r; j <= r; j++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - j * j)));
    px(ctx, cx - w, cy + j, w * 2 + 1, 1, color);
  }
}
function anillo(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    px(ctx, R(cx + Math.cos(t) * r), R(cy + Math.sin(t) * r), 1, 1, color);
  }
}
function linea(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, g = 1) {
  const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let s = 0; s <= pasos; s++) px(ctx, R(x0 + ((x1 - x0) * s) / pasos), R(y0 + ((y1 - y0) * s) / pasos), g, g, color);
}
const nivel = (p: Pieza, n: number) => ((n % p.variantes) + p.variantes) % p.variantes;
const fraccion = (p: Pieza, n: number) => nivel(p, n) / (p.variantes - 1);

/** Letras de 3×5 (la N es de 4), para el letrero: solo las que usan sus nombres. */
const LETRAS: Record<string, string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"], B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"], D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"], F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  I: ["###", ".#.", ".#.", ".#.", "###"], L: ["#..", "#..", "#..", "#..", "###"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"], O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."], R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."], T: ["###", ".#.", ".#.", ".#.", ".#."],
  " ": ["..", "..", "..", "..", ".."],
};
function texto(ctx: Ctx, s: string, x: number, y: number, esc: number, color: string) {
  let cx = x;
  for (const l of s) {
    const g = LETRAS[l] ?? LETRAS[" "];
    g.forEach((fila, j) => [...fila].forEach((c, i) => c === "#" && px(ctx, cx + i * esc, y + j * esc, esc, esc, color)));
    cx += (g[0].length + 1) * esc;
  }
}
const anchoTexto = (s: string, esc: number) => [...s].reduce((a, l) => a + ((LETRAS[l] ?? LETRAS[" "])[0].length + 1) * esc, -esc);

/** Una persiana metálica de local, bajada `f` (0 arriba, 1 cerrada), con su cajón arriba. */
function cierre(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number, f: number) {
  const bajada = R(h * f);
  px(ctx, x - 1, y - 3, w + 2, 3, m.P.metal[2]);
  px(ctx, x - 1, y - 3, w + 2, 1, m.P.metal[3]);
  if (bajada <= 0) return;
  for (let j = 0; j < bajada; j++) px(ctx, x, y + j, w, 1, m.P.metal[j % 3 === 2 ? 2 : j % 3 ? 3 : 4]);
  px(ctx, x, y + bajada - 1, w, 1, m.P.metal[1]);
  if (bajada > 3) px(ctx, x + R(w / 2) - 2, y + bajada - 3, 4, 1, m.F.tinta);   // el asa
}

/** Un cristal de tienda: encendido de noche si no está cerrado del todo. */
function lunaDeTienda(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number, encendida: boolean) {
  if (m.noche && encendida) {
    px(ctx, x, y, w, h, m.F.ventana);
    px(ctx, x, y, w, R(h * 0.3), m.P.luz[5]);
  } else {
    px(ctx, x, y, w, h, m.noche ? m.P.metal[0] : m.P.metal[1]);
    for (let j = 0; j < Math.min(w, h) - 2; j += 1) px(ctx, x + w - 3 - j, y + 1 + j, 1, 1, m.P.metal[3]);
  }
}

/** El balcón de la fachada izquierda donde viven la persiana y la cortina: puerta alta con
 *  marco de piedra y barandilla de forja, a la altura de las ventanas del edificio. */
function balconera(ctx: Ctx, m: Mano, b: Caja, encendida: boolean) {
  const w = 14, h = 26, x = b.x + R((b.w - w) / 2), y = b.y + b.h - 8 - h;
  px(ctx, x - 2, y - 2, w + 4, h + 3, m.P.piedra[5]);
  lunaDeTienda(ctx, m, x, y, w, h, encendida);
  px(ctx, x + R(w / 2), y, 1, h, m.P.piedra[5]);
  return { x, y, w, h };
}
function barandilla(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number) {
  const b = y + h;
  px(ctx, x - 4, b, w + 8, 2, m.P.piedra[4]);
  px(ctx, x - 4, b + 2, w + 8, 1, m.P.piedra[1]);
  px(ctx, x - 4, b - 8, w + 8, 1, m.F.tinta);
  for (let k = x - 4; k < x + w + 4; k += 2) px(ctx, k, b - 7, 1, 7, m.F.tinta);
}

/** El local de la tienda: marco, puerta y ventana con estantes. Decorado, siempre abierto. */
export function tienda(ctx: Ctx, m: Mano, b: Caja) {
  const madera = m.tono({ l: 0.34, c: 0.06, h: 160 });
  const x0 = b.x + 4, x1 = b.x + b.w - 4, arriba = b.y + 18, suelo = b.y + b.h - 1;
  px(ctx, x0, arriba, x1 - x0, suelo - arriba, madera[2]);
  px(ctx, x0, arriba, x1 - x0, 1, madera[4]);
  const puerta = { x: b.x + 80, y: arriba + 4, w: 16, h: suelo - arriba - 4 };
  const escap = { x: b.x + 102, y: arriba + 4, w: x1 - b.x - 106, h: suelo - arriba - 16 };
  for (const c of [puerta, escap]) {
    px(ctx, c.x - 1, c.y - 1, c.w + 2, c.h + 2, madera[1]);
    lunaDeTienda(ctx, m, c.x, c.y, c.w, c.h, true);
  }
  // Dentro: dos baldas con tarros y botellas.
  for (const k of [0.35, 0.72]) {
    const yb = escap.y + R(escap.h * k);
    px(ctx, escap.x, yb, escap.w, 1, madera[3]);
    for (let i = escap.x + 1; i < escap.x + escap.w - 1; i += 3)
      px(ctx, i, yb - 3 - (i % 2), 2, 3 + (i % 2), [m.P.tela[3], m.P.hoja[3], m.P.luz[3], m.P.metal[3]][i % 4]);
  }
  px(ctx, escap.x - 1, escap.y + escap.h + 1, escap.w + 2, 11, madera[3]);     // el zócalo de madera
  px(ctx, puerta.x + puerta.w - 4, puerta.y + R(puerta.h * 0.5), 2, 3, m.P.luz[4]);   // el tirador
  px(ctx, puerta.x, puerta.y + R(puerta.h * 0.55), puerta.w, 1, madera[1]);
  cierre(ctx, m, puerta.x, puerta.y, puerta.w, puerta.h, 0);
  cierre(ctx, m, escap.x, escap.y, escap.w, escap.h + 12, 0);
  // De noche, la luz de la tienda sale a la acera.
  if (m.noche) {
    tramar(ctx, puerta.x - 8, suelo, escap.x + escap.w - puerta.x + 16, Math.max(0, Math.min(20, m.suelo - suelo)), m.F.ventana, 0.3);
    tramar(ctx, puerta.x - 4, suelo, escap.x + escap.w - puerta.x + 8, 6, m.P.luz[5], 0.45);
  }
}

// ── Los objetos ─────────────────────────────────────────────────────────────

export const OBJETOS: Record<string, Pincel> = {
  // Persiana alicantina, cada nivel un poco más bajada.
  persiana: (ctx, m, b, p, n) => {
    const f = fraccion(p, n);
    const v = balconera(ctx, m, b, f < 1);
    const baja = R(v.h * f);
    const lama = m.tono({ l: 0.5, c: 0.08, h: 150 });
    for (let j = 0; j < baja; j++) px(ctx, v.x - 1, v.y + j, v.w + 2, 1, lama[j % 2 ? 2 : 3]);
    // El rollo: arriba si está subida, en el bajo si está bajada.
    px(ctx, v.x - 1, v.y + Math.max(0, baja - 2), v.w + 2, 3, lama[1]);
    px(ctx, v.x - 1, v.y + Math.max(0, baja - 2), v.w + 2, 1, lama[4]);
    px(ctx, v.x + 2, v.y - 2, 1, Math.max(2, baja + 1), m.P.piedra[2]);         // las cuerdas
    px(ctx, v.x + v.w - 3, v.y - 2, 1, Math.max(2, baja + 1), m.P.piedra[2]);
    barandilla(ctx, m, v.x, v.y, v.w, v.h);
  },
  // Toldo de balcón a rayas, que cuelga de una barra y baja más o menos.
  cortina: (ctx, m, b, p, n) => {
    const t = 0.25 + 0.75 * fraccion(p, n);
    const v = balconera(ctx, m, b, true);
    barandilla(ctx, m, v.x, v.y, v.w, v.h);
    const largo = R((v.h + 2) * t), x0 = v.x - 4, ancho = v.w + 8;
    px(ctx, x0 - 1, v.y - 4, ancho + 2, 2, m.F.tinta);
    for (let i = 0; i < ancho; i++) {
      const raya = Math.floor(i / 3) % 2 ? m.P.piedra[5] : m.P.tela[3];
      px(ctx, x0 + i, v.y - 2, 1, largo, raya);
      if (i % 3 === 0) px(ctx, x0 + i, v.y - 2, 1, largo, Math.floor(i / 3) % 2 ? m.P.piedra[4] : m.P.tela[2]);
    }
    for (let i = 0; i < ancho; i += 4) px(ctx, x0 + i, v.y - 2 + largo, 3, 1, m.P.tela[2]);   // el faldón
    tramar(ctx, x0, v.y - 2 + largo - 3, ancho, 3, m.P.tela[1], 0.3);
  },
  grafiti,
  // Un cartel pegado: papel con una ilustración, dos líneas de texto, celo y una esquina rota.
  cartel: (ctx, m, b, _p, n) => {
    if (n === 0) return;
    const w = Math.min(22, b.w - 6), h = Math.min(30, b.h - 6);
    const x = b.x + R((b.w - w) / 2), y = b.y + R((b.h - h) / 2);
    const T = [m.P.tela, m.P.luz, m.P.hoja, m.tono({ l: 0.55, c: 0.12, h: 250 })][n % 4];
    px(ctx, x + 1, y + 1, w, h, m.P.muro[1]);                                    // sombra
    px(ctx, x, y, w, h, m.P.piedra[5]);
    px(ctx, x + 2, y + 2, w - 4, R(h * 0.55), T[3]);
    const cx = x + R(w / 2), cy = y + 2 + R(h * 0.27);
    if (n % 3 === 0) circulo(ctx, cx, cy, 4, T[5]);                              // un sol
    else if (n % 3 === 1) { px(ctx, cx - 5, cy + 2, 10, 4, T[1]); px(ctx, cx - 2, cy - 3, 4, 5, T[1]); }   // una guitarra, o casi
    else for (let k = 0; k < 3; k++) circulo(ctx, cx - 4 + k * 4, cy + (k % 2) * 2, 2, T[5]);
    px(ctx, x + 3, y + R(h * 0.62), w - 6, 2, m.F.tinta);
    px(ctx, x + 3, y + R(h * 0.62) + 4, w - 10, 1, m.P.metal[2]);
    px(ctx, x + 3, y + R(h * 0.62) + 7, w - 8, 1, m.P.metal[2]);
    px(ctx, x - 1, y - 1, 4, 2, m.P.piedra[4]);                                  // celo
    px(ctx, x + w - 3, y + h - 1, 4, 2, m.P.piedra[4]);
    for (let k = 0; k < 4; k++) px(ctx, x + w - 4 + k, y, 4 - k, 1, m.P.muro[3]);   // la esquina arrancada
  },
  // El buzón amarillo de correos, con su boca; con el tiempo, pegatinas y una firma.
  buzon: (ctx, m, b, p, n) => {
    const v = nivel(p, n);
    const w = 11, h = 14, x = b.x + R((b.w - w) / 2), suelo = b.y + b.h - 1, y = suelo - h - 3;
    const A = m.P.luz;
    apoyo(ctx, { x, y, w, h: h + 3 }, m.F.tinta);
    px(ctx, x + 3, suelo - 3, w - 6, 3, m.P.metal[1]);                           // la pata
    px(ctx, x - 1, y - 1, w + 2, h + 2, m.F.tinta);
    px(ctx, x, y, w, h, A[3]);
    px(ctx, x, y, w, 2, A[4]);
    px(ctx, x + w - 2, y + 2, 2, h - 2, A[2]);
    px(ctx, x + 2, y + 4, w - 4, 1, m.F.tinta);                                  // la boca
    px(ctx, x + 3, y + 8, w - 6, 3, m.tono({ l: 0.45, c: 0.1, h: 255 })[3]);     // el escudo azul
    if (v >= 1) { px(ctx, x + 1, y + 11, 3, 2, m.P.tela[4]); px(ctx, x + 6, y + 1, 2, 2, m.P.hoja[4]); }
    if (v === 2) for (let k = 0; k < 4; k++) px(ctx, x + 1 + k * 2, y + 6 + (k % 2), 2, 1, m.F.tinta);
  },
  // El escaparate: pan y pasteles, y su cierre, que baja con el nivel.
  escaparate: (ctx, m, b, p, n) => {
    const f = fraccion(p, n);
    const madera = m.tono({ l: 0.34, c: 0.06, h: 160 });
    const x = b.x + 2, y = b.y + 8, w = b.w - 4, h = b.h - 20;
    px(ctx, x - 2, y - 2, w + 4, h + 4, madera[1]);
    lunaDeTienda(ctx, m, x, y, w, h, f < 1);
    for (const [k, fila] of [[0.42, 0], [0.85, 1]] as const) {
      const yb = y + R(h * k);
      px(ctx, x, yb, w, 1, madera[3]);
      for (let i = x + 2; i < x + w - 4; i += 7) {
        if (fila === 0) { circulo(ctx, i + 2, yb - 3, 2, m.P.madera[4]); px(ctx, i + 1, yb - 4, 2, 1, m.P.madera[5]); }   // panes
        else { px(ctx, i, yb - 4, 5, 4, m.P.piedra[5]); px(ctx, i, yb - 5, 5, 1, m.P.tela[4]); }                         // pasteles
      }
    }
    px(ctx, x - 2, y + h + 2, w + 4, 10, madera[3]);
    px(ctx, x - 2, y + h + 2, w + 4, 1, madera[4]);
    cierre(ctx, m, x, y, w, h, f);
  },
  // El letrero de la tienda: cada nivel, otro nombre y otros colores.
  letrero: (ctx, m, b, p, n) => {
    const v = nivel(p, n);
    const nombres = ["CAFE", "BAR PEPE", "PANADERIA", "TAPAS", "BODEGA"];
    const colores: [Rampa, Rampa][] = [
      [m.tono({ l: 0.34, c: 0.06, h: 160 }), m.P.piedra], [m.P.tela, m.P.piedra], [m.P.piedra, m.P.madera],
      [m.tono({ l: 0.45, c: 0.1, h: 250 }), m.P.luz], [m.P.metal, m.P.luz],
    ];
    const [fondo, letra] = colores[v];
    const nombre = nombres[v], esc = 2, claro = fondo === m.P.piedra;
    const w = Math.min(b.w - 4, anchoTexto(nombre, esc) + 16), x = b.x + R((b.w - w) / 2), y = b.y + 3, h = b.h;
    px(ctx, x - 1, y - 1, w + 2, h + 2, m.F.tinta);
    px(ctx, x, y, w, h, fondo[claro ? 5 : 2]);
    px(ctx, x, y, w, 1, fondo[claro ? 5 : 4]);
    texto(ctx, nombre, x + R((w - anchoTexto(nombre, esc)) / 2), y + R((h - 10) / 2), esc, letra[letra === m.P.madera ? 1 : 5]);
  },
  // El toldo de la tienda: rayas, faldón de ondas y la sombra que deja. Sale más o menos.
  toldo: (ctx, m, b, p, n) => {
    const t = fraccion(p, n);
    const largo = Math.max(3, R(b.h * (0.3 + 0.7 * t)));
    const x = b.x + 2, w = b.w - 4;
    if (!m.noche) tramar(ctx, x, b.y + largo + 3, w, 8, m.F.tinta, 0.2);
    for (let i = 0; i < w; i++) {
      const blanco = Math.floor(i / 7) % 2 === 1;
      px(ctx, x + i, b.y, 1, largo, blanco ? m.P.piedra[5] : m.P.tela[3]);
    }
    px(ctx, x, b.y, w, 1, m.F.tinta);
    tramar(ctx, x, b.y + 1, w, 2, m.P.tela[1], 0.35);                            // la parte de arriba, en sombra
    for (let i = 0; i < w; i += 7) {                                             // el faldón de ondas
      const blanco = Math.floor(i / 7) % 2 === 1;
      px(ctx, x + i, b.y + largo, 7, 2, blanco ? m.P.piedra[4] : m.P.tela[2]);
      px(ctx, x + i + 1, b.y + largo + 2, 5, 1, blanco ? m.P.piedra[4] : m.P.tela[2]);
    }
    for (const bx of [x, x + w - 1]) linea(ctx, bx, b.y - 2, bx, b.y + largo, m.F.tinta);   // los brazos
  },
  // Las mesas de la terraza del bar, con sus sillas. Cada nivel, otra disposición.
  mesas: (ctx, m, b, p, n) => {
    const v = nivel(p, n), suelo = b.y + b.h - 1;
    const mesa = (x: number, mantel: boolean) => {
      px(ctx, x - 5, suelo - 9, 11, 2, mantel ? m.P.tela[4] : m.P.metal[4]);
      if (mantel) px(ctx, x - 5, suelo - 7, 11, 2, m.P.tela[3]);
      px(ctx, x, suelo - 7, 1, 7, m.P.metal[1]);
      px(ctx, x - 2, suelo - 1, 5, 1, m.P.metal[1]);
    };
    const silla = (x: number, dir: 1 | -1) => {
      px(ctx, x - 2, suelo - 5, 5, 1, m.P.madera[3]);
      px(ctx, dir > 0 ? x - 2 : x + 2, suelo - 11, 1, 6, m.P.madera[2]);
      px(ctx, x - 2, suelo - 4, 1, 4, m.P.metal[1]);
      px(ctx, x + 2, suelo - 4, 1, 4, m.P.metal[1]);
    };
    const juego = (x: number, mantel = false) => { silla(x - 9, 1); mesa(x, mantel); silla(x + 9, -1); };
    const cx = b.x + R(b.w / 2);
    if (v === 0) juego(cx);
    else if (v === 1) { juego(cx - 17); juego(cx + 17); }
    else if (v === 2) { juego(cx - 17, true); juego(cx + 17, true); }
    else if (v === 3) { juego(cx - 22); mesa(cx, false); juego(cx + 22); }
    else {                                             // recogidas: sillas apiladas, mesas de canto y cadena
      for (let k = 0; k < 5; k++) {
        const y = suelo - 5 - k * 3;
        px(ctx, cx - 14, y, 7, 1, m.P.madera[k % 2 ? 2 : 3]);
        px(ctx, cx - 14, y - 6, 1, 6, m.P.madera[2]);
      }
      for (const lx of [cx - 14, cx - 8]) px(ctx, lx, suelo - 4, 1, 4, m.P.metal[1]);
      for (let k = 0; k < 3; k++) {
        px(ctx, cx + 2 + k * 4, suelo - 13, 2, 13, m.P.metal[4 - (k % 2)]);
        px(ctx, cx + 2 + k * 4, suelo - 13, 2, 1, m.P.metal[5]);
      }
      for (let i = cx - 15; i < cx + 14; i += 2) px(ctx, i, suelo - 8 + (i % 4 ? 0 : 1), 1, 1, m.F.tinta);   // la cadena
      px(ctx, cx + 13, suelo - 9, 2, 3, m.P.luz[3]);                                 // el candado
    }
  },
  // La sombrilla de la terraza: cerrada, o abierta en uno de cuatro colores.
  sombrilla: (ctx, m, b, p, n) => {
    const v = nivel(p, n), cx = b.x + R(b.w / 2), suelo = b.y + b.h - 1, alto = b.y + 6;
    px(ctx, cx - 3, suelo - 1, 7, 2, m.P.metal[1]);
    px(ctx, cx, alto, 1, suelo - alto, m.P.metal[2]);
    if (v === 0) {
      for (let j = 0; j < 20; j++) px(ctx, cx - R(2 * (1 - Math.abs(j - 10) / 12)), alto + 2 + j, R(4 * (1 - Math.abs(j - 10) / 12)) + 1, 1, m.P.tela[2]);
      return;
    }
    const T = [m.P.tela, m.P.hoja, m.P.luz, m.tono({ l: 0.55, c: 0.1, h: 250 })][v - 1];
    const ancho = R(b.w / 2) + 2;
    for (let j = 0; j < 8; j++) {
      const w = R(ancho * (0.25 + 0.75 * (j / 7)));
      for (let i = -w; i <= w; i++) px(ctx, cx + i, alto + j, 1, 1, Math.floor((i + 40) / 6) % 2 ? T[3] : m.P.piedra[5]);
    }
    px(ctx, cx - ancho, alto + 7, 2 * ancho + 1, 1, T[1]);
    for (let i = -ancho; i < ancho; i += 4) px(ctx, cx + i, alto + 8, 3, 1, T[2]);
    px(ctx, cx - 1, alto - 1, 3, 1, m.P.metal[3]);
  },
  // Junto a la terraza: la pizarra del menú, dos jardineras, una estufa de exterior, los
  // barriles de cerveza o el arcón de los helados.
  terraza: (ctx, m, b, p, n) => {
    const v = nivel(p, n), suelo = b.y + b.h - 1, cx = b.x + R(b.w / 2);
    if (v === 0) {
      linea(ctx, cx - 6, suelo, cx - 3, suelo - 16, m.P.madera[2], 2);
      linea(ctx, cx + 6, suelo, cx + 3, suelo - 16, m.P.madera[2], 2);
      px(ctx, cx - 6, suelo - 15, 12, 11, m.P.madera[2]);
      px(ctx, cx - 5, suelo - 14, 10, 9, m.F.tinta);
      for (let k = 0; k < 3; k++) px(ctx, cx - 4, suelo - 12 + k * 3, 4 + ((k * 3) % 5), 1, m.P.piedra[5]);
    } else if (v === 1) {
      for (const x of [cx - 10, cx + 3]) {
        px(ctx, x, suelo - 5, 9, 5, m.P.ladrillo[3]);
        px(ctx, x, suelo - 5, 9, 1, m.P.ladrillo[4]);
        for (let k = 0; k < 9; k += 2) px(ctx, x + k, suelo - 9 - (k % 3), 2, 4 + (k % 3), m.P.hoja[k % 4 ? 3 : 2]);
      }
    } else if (v === 3) {
      for (const [x, y] of [[cx - 10, 0], [cx + 1, 0], [cx - 5, 9]]) {
        px(ctx, x - 1, suelo - y - 9, 11, 9, m.F.tinta);
        px(ctx, x, suelo - y - 8, 9, 8, m.P.metal[4]);
        px(ctx, x, suelo - y - 8, 2, 8, m.P.metal[5]);
        px(ctx, x + 7, suelo - y - 8, 2, 8, m.P.metal[2]);
        for (const k of [2, 5]) px(ctx, x, suelo - y - 8 + k, 9, 1, m.P.metal[1]);   // los aros
      }
    } else if (v === 4) {
      const A = m.tono({ l: 0.55, c: 0.13, h: 250 });
      px(ctx, cx - 12, suelo - 13, 24, 13, m.F.tinta);
      px(ctx, cx - 11, suelo - 12, 22, 12, m.P.piedra[5]);
      px(ctx, cx - 11, suelo - 12, 22, 3, A[3]);                                  // la tapa
      px(ctx, cx - 11, suelo - 12, 22, 1, A[4]);
      px(ctx, cx - 5, suelo - 7, 10, 4, m.P.tela[3]);                              // el cartel de los helados
      circulo(ctx, cx, suelo - 5, 1, m.P.luz[5]);
      px(ctx, cx - 11, suelo - 2, 22, 2, m.P.piedra[3]);
      for (const lx of [cx - 11, cx + 9]) px(ctx, lx, suelo - 1, 2, 1, m.F.tinta);
    } else {
      px(ctx, cx - 3, suelo - 2, 7, 2, m.P.metal[1]);
      px(ctx, cx, suelo - 20, 1, 18, m.P.metal[2]);
      px(ctx, cx - 6, suelo - 22, 13, 2, m.P.metal[3]);
      px(ctx, cx - 4, suelo - 23, 9, 1, m.P.metal[4]);
      if (m.noche) px(ctx, cx - 1, suelo - 19, 3, 3, m.P.tela[5]);
    }
  },
  // La bici atada a la farola: roja, azul con cesta, ninguna (queda el candado), verde con
  // sillita, o vuelve la azul, pero le han robado la rueda de delante.
  bici: (ctx, m, b, p, n) => {
    const v = nivel(p, n), suelo = b.y + b.h - 1;
    if (v === 2) {
      px(ctx, b.x + b.w - 8, suelo - 12, 1, 5, m.P.metal[3]);
      anillo(ctx, b.x + b.w - 8, suelo - 6, 2, m.F.tinta);
      return;
    }
    const azul = m.tono({ l: 0.55, c: 0.12, h: 250 })[4];
    const color = [m.P.tela[4], azul, "", m.P.hoja[4], azul][v];
    const r = 6, y = suelo - r, xa = b.x + r + 1, xb = b.x + b.w - r - 2;
    for (const cx of v === 4 ? [xa] : [xa, xb]) {
      anillo(ctx, cx, y, r, m.F.tinta);
      anillo(ctx, cx, y, r - 1, m.P.metal[2]);
      px(ctx, cx, y, 1, 1, m.P.metal[4]);
    }
    const pedal = { x: xa + R((xb - xa) * 0.42), y }, sillin = { x: xa + R((xb - xa) * 0.35), y: y - 9 }, manillar = { x: xb - 3, y: y - 10 };
    linea(ctx, xa, y, sillin.x, sillin.y, color);
    linea(ctx, xa, y, pedal.x, pedal.y, color);
    linea(ctx, pedal.x, pedal.y, sillin.x, sillin.y, color);
    linea(ctx, pedal.x, pedal.y, manillar.x, manillar.y + 2, color);
    linea(ctx, sillin.x, sillin.y + 1, manillar.x, manillar.y + 2, color);
    linea(ctx, manillar.x, manillar.y, xb, y, color);
    px(ctx, sillin.x - 2, sillin.y - 1, 5, 1, m.F.tinta);
    px(ctx, manillar.x - 1, manillar.y - 1, 4, 1, m.F.tinta);
    if (v === 1 || v === 4) px(ctx, manillar.x + 1, manillar.y, 5, 4, m.P.madera[3]);   // la cesta
    if (v === 3) px(ctx, xa - 2, sillin.y - 1, 5, 4, m.P.luz[3]);                  // la sillita
  },
  // El puesto del mercado: toldillo a rayas y mesa, con cajas de fruta, cubos de flores, o
  // quesos en la mesa y embutido colgado del toldillo.
  puesto: (ctx, m, b, p, n) => {
    const v = nivel(p, n), suelo = b.y + b.h - 1, x = b.x + 3, w = b.w - 6;
    const mesa = suelo - 12, techo = b.y + 3;
    for (const px0 of [x + 1, x + w - 2]) px(ctx, px0, techo, 1, suelo - techo, m.P.metal[2]);
    for (let i = 0; i < w; i++) px(ctx, x + i, techo, 1, 5, Math.floor(i / 5) % 2 ? m.P.piedra[5] : m.P.hoja[3]);
    for (let i = 0; i < w; i += 5) px(ctx, x + i, techo + 5, 4, 1, Math.floor(i / 5) % 2 ? m.P.piedra[4] : m.P.hoja[2]);
    px(ctx, x, mesa, w, 2, m.P.madera[4]);
    px(ctx, x, mesa + 2, w, 10, m.P.madera[2]);
    for (let k = x + 2; k < x + w - 2; k += 5) px(ctx, k, mesa + 3, 1, 8, m.P.madera[1]);
    for (let c = 0; c < 4; c++) {
      const cx = x + 3 + c * R((w - 6) / 4), ancho = R((w - 6) / 4) - 2;
      if (v === 0) {
        px(ctx, cx, mesa - 4, ancho, 4, m.P.madera[3]);
        const fruta = [m.P.luz[4], m.P.tela[4], m.P.hoja[4], m.tono({ l: 0.5, c: 0.12, h: 320 })[4]][c];
        for (let k = 0; k < ancho; k += 2) px(ctx, cx + k, mesa - 6 + (k % 4 ? 0 : 1), 2, 2, fruta);
      } else if (v === 2) {
        const queso = m.tono({ l: 0.8, c: 0.1, h: 88 });
        px(ctx, cx, mesa - 4, ancho, 4, queso[2]);                                 // la rueda de queso
        px(ctx, cx, mesa - 4, ancho, 1, queso[4]);
        px(ctx, cx + ancho - 3, mesa - 4, 3, 4, queso[5]);                         // el corte
        for (let k = 1; k < ancho - 1; k += 3) {                                   // chorizos colgando
          px(ctx, cx + k, techo + 6, 1, 2, m.P.madera[1]);
          px(ctx, cx + k - 1, techo + 8, 2, 6 + (k % 2) * 2, m.P.tela[1]);
        }
      } else {
        px(ctx, cx + 1, mesa - 5, ancho - 2, 5, m.P.metal[3]);
        const flor = [m.P.tela[5], m.P.luz[5], m.P.piedra[5], m.tono({ l: 0.7, c: 0.12, h: 330 })[4]][c];
        for (let k = 1; k < ancho - 1; k += 2) {
          px(ctx, cx + k, mesa - 10, 1, 5, m.P.hoja[2]);
          px(ctx, cx + k - 1, mesa - 11 - (k % 3), 2, 2, flor);
        }
      }
    }
  },
  // La papelera de la calle: vacía, con una bolsa asomando o desbordada.
  papelera: (ctx, m, b, p, n) => {
    const v = nivel(p, n), suelo = b.y + b.h - 1, cx = b.x + R(b.w / 2);
    px(ctx, cx - 1, suelo - 14, 2, 14, m.P.metal[1]);
    const w = 10, h = 11, x = cx - 5, y = suelo - 17;
    px(ctx, x - 1, y - 1, w + 2, h + 2, m.F.tinta);
    px(ctx, x, y, w, h, m.P.metal[3]);
    for (let k = x + 1; k < x + w; k += 2) px(ctx, k, y + 2, 1, h - 3, m.P.metal[2]);
    px(ctx, x - 1, y, w + 2, 2, m.P.metal[4]);
    if (v >= 1) { circulo(ctx, cx, y - 1, 3, m.P.piedra[5]); px(ctx, cx - 1, y - 5, 2, 2, m.P.piedra[4]); }
    if (v === 2) for (let k = 0; k < 3; k++) px(ctx, cx - 7 + k * 5, suelo - 1, 3, 1, [m.P.piedra[5], m.P.tela[4], m.P.luz[4]][k]);
  },
  // El banco: de listones, de metal o de piedra.
  banco: (ctx, m, b, p, n) => {
    const v = nivel(p, n), suelo = b.y + b.h - 1, x = b.x + 2, w = b.w - 4;
    apoyo(ctx, { x, y: suelo - 12, w, h: 13 }, m.F.tinta);
    if (v === 0) {
      for (const lx of [x + 3, x + w - 5]) { px(ctx, lx, suelo - 14, 2, 14, m.F.tinta); }
      for (const y of [suelo - 14, suelo - 11]) { px(ctx, x, y, w, 2, m.P.madera[3]); px(ctx, x, y, w, 1, m.P.madera[4]); }
      px(ctx, x, suelo - 6, w, 2, m.P.madera[3]);
      px(ctx, x, suelo - 6, w, 1, m.P.madera[4]);
    } else if (v === 1) {
      px(ctx, x, suelo - 7, w, 2, m.P.metal[3]);
      px(ctx, x, suelo - 7, w, 1, m.P.metal[5]);
      for (let k = x; k < x + w; k += 3) px(ctx, k, suelo - 14, 1, 7, m.P.metal[2]);
      px(ctx, x, suelo - 14, w, 1, m.P.metal[3]);
      for (const lx of [x + 1, x + w - 3]) px(ctx, lx, suelo - 5, 2, 5, m.P.metal[1]);
    } else {
      px(ctx, x + 2, suelo - 7, w - 4, 7, m.P.piedra[3]);
      px(ctx, x, suelo - 8, w, 2, m.P.piedra[4]);
      px(ctx, x, suelo - 8, w, 1, m.P.piedra[5]);
      px(ctx, x + 2, suelo - 2, w - 4, 2, m.P.piedra[2]);
    }
  },
};
