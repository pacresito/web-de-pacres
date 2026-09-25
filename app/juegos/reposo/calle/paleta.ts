// La maquinaria del pixel art: el lienzo fino, el píxel, el tramado, las formas, las rampas de
// material y la mano con la que se pinta cada hora.
//
// **El color no se calcula por objeto, se elige de una rampa:** cada material tiene unos pocos
// escalones y todo lo que se pinta con él usa esos. Los objetos se distinguen por silueta.
//
// **Las rampas giran el tono:** la sombra va hacia el color del cielo y la luz hacia la fuente
// (el sol, o la ventana de noche). Solo con claridad, se ve plástico.
//
// **Los ids no se tocan:** son lo que guarda cada visita. El dibujo se puede rehacer entero;
// al hacerlo, repasar las visibilidades de `escena.ts`.
import type { NivelObjeto } from "../escena";
import {
  LIENZO, PIEZAS, css, horaSolar, luzDe, mezcla, tenir, visible,
  type Caja, type Calendario, type Luz, type Oklch, type Pieza, type Vista,
} from "../render";

export type Ctx = CanvasRenderingContext2D;

/** Píxeles del lienzo virtual (1600×900) por píxel de la calle, que se pinta a 640×360. */
export const ESC = 2.5;
export const ANCHO = LIENZO.ancho / ESC, ALTO = LIENZO.alto / ESC;

export const ACERA = 640; // borde alto de la acera, en el lienzo de 1600×900
export const SUELO = 700; // donde la acera se convierte en asfalto

/** Las piezas que se pintan a esta hora, en orden de profundidad y con su nivel. */
export function enEscena(niveles: NivelObjeto[], hora: number): { id: string; p: Pieza; n: number }[] {
  const nivel = new Map(niveles.map((x) => [x.id, x.nivel]));
  return Object.entries(PIEZAS)
    .filter(([, p]) => visible(p, hora))
    .map(([id, p]) => ({ id, p, n: nivel.get(id) ?? 0 }));
}

/** Matriz de Bayer 4×4 → umbral 0..1: todo el sombreado es densidad de puntos. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const trama = (x: number, y: number) => BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] / 16;

// ── El lienzo fino ───────────────────────────────────────────────────────────

/** Un lienzo por clave, reutilizado entre repintados. */
const lienzos = new Map<string, HTMLCanvasElement>();

export interface Fino { ctx: Ctx; lienzo: HTMLCanvasElement }

/** Un lienzo de la calle a su tamaño real. Se pinta aquí y se amplía sin suavizado: directo
 *  sobre el canvas, cada borde caería a medio píxel. */
export function fino(clave = ""): Fino {
  let lienzo = lienzos.get(clave);
  if (!lienzo) {
    lienzo = document.createElement("canvas");
    lienzo.width = ANCHO;
    lienzo.height = ALTO;
    lienzos.set(clave, lienzo);
  }
  const ctx = lienzo.getContext("2d") as Ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ANCHO, ALTO);
  return { ctx, lienzo };
}

export function volcar(ctx: Ctx, vista: Vista, f: Fino) {
  ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
  ctx.clearRect(0, 0, vista.ancho, vista.alto);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(f.lienzo, 0, 0, vista.ancho, vista.alto);
  ctx.imageSmoothingEnabled = true;
}

export function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/** Tramado de una zona: `v` es cuánto cubre, de 0 a 1. */
export function tramar(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, v: number) {
  if (v <= 0) return;
  ctx.fillStyle = color;
  const x0 = Math.round(x), y0 = Math.round(y);
  for (let j = 0; j < Math.round(h); j++)
    for (let i = 0; i < Math.round(w); i++)
      if (trama(x0 + i, y0 + j) < v) ctx.fillRect(x0 + i, y0 + j, 1, 1);
}

/** Una caja del lienzo virtual en píxeles de la calle. */
export const caja = (c: Caja): Caja => ({
  x: Math.round(c.x / ESC), y: Math.round(c.y / ESC),
  w: Math.max(2, Math.round(c.w / ESC)), h: Math.max(2, Math.round(c.h / ESC)),
});

// ── Formas ───────────────────────────────────────────────────────────────────

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

/** Una línea de `g` píxeles de grueso de un punto a otro. */
export function linea(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string, g = 1) {
  const pasos = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let s = 0; s <= pasos; s++)
    px(ctx, Math.round(x0 + ((x1 - x0) * s) / pasos), Math.round(y0 + ((y1 - y0) * s) / pasos), g, g, color);
}

// ── Rampas de material ───────────────────────────────────────────────────────

export interface Material { l: number; c: number; h: number }

/** Los materiales de la calle; la claridad la ponen la rampa y la hora. */
const MATERIALES = {
  muro:     { l: 0.62, c: 0.035, h: 62 },
  ladrillo: { l: 0.52, c: 0.085, h: 38 },
  piedra:   { l: 0.60, c: 0.014, h: 92 },
  madera:   { l: 0.44, c: 0.075, h: 58 },
  hoja:     { l: 0.46, c: 0.125, h: 148 },
  metal:    { l: 0.50, c: 0.022, h: 250 },
  tela:     { l: 0.56, c: 0.130, h: 25 },
  asfalto:  { l: 0.40, c: 0.010, h: 250 },
  luz:      { l: 0.86, c: 0.140, h: 85 },
} satisfies Record<string, Material>;

export type Nombre = keyof typeof MATERIALES;
/** Los escalones de un material, del más oscuro al más claro. */
export type Rampa = string[];

const CORTE = {
  /** Escalones de claridad de la paleta: pocos, más duro. */
  pasos: 14,
  /** Cuánto se abre la rampa por arriba y por abajo. */
  recorrido: 0.17,
  /** Cuánto giran el tono la sombra y la luz. */
  giro: 1.1,
};
/** Escalones de cada rampa y del degradado del cielo. */
const N = 6, N_CIELO = 9;

const corta = (o: Oklch): Oklch => ({
  l: Math.round(o.l * CORTE.pasos) / CORTE.pasos,
  c: Math.round(o.c * 14) / 14,
  h: Math.round(o.h / 12) * 12,
});

/** La rampa de un material bajo la luz de la hora. */
function rampa(m: Material, L: Luz): Rampa {
  const base = tenir(m, L);
  const frio = L.crudo.cielo, calido = L.noche ? L.crudo.ventana : L.crudo.cieloBajo;
  const salida: Rampa = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) - 0.5;            // -0.5 sombra, 0 propio, +0.5 luz
    const hacia = t < 0 ? frio : calido;
    const sesgo = Math.abs(t) * 2 * 0.22 * CORTE.giro;
    const girado = mezcla(base, hacia, sesgo);
    salida.push(css(corta({ ...girado, l: base.l + t * 2 * CORTE.recorrido })));
  }
  return salida;
}

export type Paleta = Record<Nombre, Rampa>;

function paleta(L: Luz): Paleta {
  const salida = {} as Paleta;
  for (const nombre of Object.keys(MATERIALES) as Nombre[])
    salida[nombre] = rampa(MATERIALES[nombre], L);
  return salida;
}

/** Los colores del decorado que no son material: cielo, lejanía, tinta y ventana encendida. */
export interface Fondo { cielo: string[]; lejos: (k: number) => string; tinta: string; ventana: string }

function fondo(L: Luz): Fondo {
  const cielo: string[] = [];
  for (let i = 0; i < N_CIELO; i++)
    cielo.push(css(corta(mezcla(L.crudo.cielo, L.crudo.cieloBajo, i / (N_CIELO - 1)))));
  return {
    cielo,
    // `k` es cuánta neblina: 0 lo de delante, 1 el último tejado.
    lejos: (k: number) => css(corta(mezcla(L.crudo.lejos, L.crudo.cieloBajo, k))),
    tinta: css(corta({ ...tenir({ l: 0.2, c: 0.03, h: 260 }, L), l: Math.max(0.1, L.crudo.tinta.l - 0.04) })),
    ventana: css(corta(L.crudo.ventana)),
  };
}

// ── La mano ──────────────────────────────────────────────────────────────────

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

/** `hora` es la del reloj; la luz sale de la del sol en ese día del año. */
export function manoDe(hora: number, suelo: number, cal: Calendario): Mano {
  const solar = horaSolar(hora, cal.dia);
  const L = luzDe(solar);
  return {
    P: paleta(L), F: fondo(L), noche: L.noche,
    luzDesde: solar < 13 ? 1 : -1,
    suelo,
    tono: (m) => rampa(m, L),
    cal, solar,
  };
}

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

/** La sombra de contacto: sin ella, todo flota sobre la acera. */
export function apoyo(ctx: Ctx, b: Caja, color: string) {
  tramar(ctx, b.x - 1, b.y + b.h - 2, b.w + 2, 2, color, 0.55);
  tramar(ctx, b.x - 2, b.y + b.h - 1, b.w + 4, 1, color, 0.3);
}
