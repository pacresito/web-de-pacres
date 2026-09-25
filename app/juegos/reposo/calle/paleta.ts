// La maquinaria del pixel art: el lienzo fino, el píxel, el tramado y las rampas de material.
//
// **El color no se calcula por objeto, se elige de una rampa:** cada material tiene unos pocos
// escalones y todo lo que se pinta con él usa esos. Los objetos se distinguen por silueta.
//
// **Las rampas giran el tono:** la sombra va hacia el color del cielo y la luz hacia la fuente
// (el sol, o la ventana de noche). Solo con claridad, se ve plástico.
import {
  LIENZO, css, mezcla, tenir, trama,
  type Ctx, type Luz, type Oklch, type Pieza, type Vista,
} from "./comun";

export {
  ACERA, CAJAS, LIENZO, PIEZAS, SUELO, TIENDA, azar, css, enEscena, esNoche, luzDe, mezcla, tenir, trama,
} from "./comun";
export type { Cajas, Ctx, Luz, Oklch, Pieza, Vista } from "./comun";

// ── El lienzo fino ───────────────────────────────────────────────────────────

/** Un lienzo por clave, reutilizado entre repintados. */
const lienzos = new Map<string, HTMLCanvasElement>();

export interface Fino { ctx: Ctx; ancho: number; alto: number; esc: number; lienzo: HTMLCanvasElement }

/** `esc` son los píxeles del lienzo virtual (1600×900) por píxel de la calle. Se pinta aquí y
 *  se amplía sin suavizado: directo sobre el canvas, cada borde caería a medio píxel. */
export function fino(esc: number, clave = ""): Fino {
  const ancho = Math.round(LIENZO.ancho / esc), alto = Math.round(LIENZO.alto / esc);
  let lienzo = lienzos.get(`${esc}:${clave}`);
  if (!lienzo) {
    lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzos.set(`${esc}:${clave}`, lienzo);
  }
  const ctx = lienzo.getContext("2d") as Ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);
  return { ctx, ancho, alto, esc, lienzo };
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

export interface Caja { x: number; y: number; w: number; h: number }

export const caja = (p: Pieza, esc: number): Caja => ({
  x: Math.round(p.x / esc), y: Math.round(p.y / esc),
  w: Math.max(2, Math.round(p.w / esc)), h: Math.max(2, Math.round(p.h / esc)),
});

// ── Rampas de material ───────────────────────────────────────────────────────

export interface Material { l: number; c: number; h: number }

/** Los materiales de la calle; la claridad la ponen la rampa y la hora. */
export const MATERIALES = {
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

const corta = (o: Oklch, pasos: number): Oklch => ({
  l: Math.round(o.l * pasos) / pasos,
  c: Math.round(o.c * 14) / 14,
  h: Math.round(o.h / 12) * 12,
});

export interface Corte {
  /** Escalones de claridad de la paleta: pocos, más duro. */
  pasos: number;
  /** Cuánto se abre la rampa por arriba y por abajo. */
  recorrido: number;
  /** Cuánto giran el tono la sombra y la luz. */
  giro: number;
}

export const CORTE: Corte = { pasos: 11, recorrido: 0.19, giro: 1 };

/** La rampa de un material bajo la luz de la hora. */
export function rampa(m: Material, L: Luz, corte: Corte = CORTE, n = 5): Rampa {
  const base = tenir(m, L);
  const frio = L.crudo.cielo, calido = L.noche ? L.crudo.ventana : L.crudo.cieloBajo;
  const salida: Rampa = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;            // -0.5 sombra, 0 propio, +0.5 luz
    const hacia = t < 0 ? frio : calido;
    const sesgo = Math.abs(t) * 2 * 0.22 * corte.giro;
    const girado = mezcla(base, hacia, sesgo);
    salida.push(css(corta({ ...girado, l: base.l + t * 2 * corte.recorrido }, corte.pasos)));
  }
  return salida;
}

export type Paleta = Record<Nombre, Rampa>;

export function paleta(L: Luz, corte: Corte = CORTE, n = 5): Paleta {
  const salida = {} as Paleta;
  for (const nombre of Object.keys(MATERIALES) as Nombre[])
    salida[nombre] = rampa(MATERIALES[nombre], L, corte, n);
  return salida;
}

/** Los colores del decorado que no son material: cielo, lejanía, tinta y ventana encendida. */
export interface Fondo { cielo: string[]; lejos: (k: number) => string; tinta: string; ventana: string }

export function fondo(L: Luz, corte: Corte = CORTE, escalones = 7): Fondo {
  const cielo: string[] = [];
  for (let i = 0; i < escalones; i++)
    cielo.push(css(corta(mezcla(L.crudo.cielo, L.crudo.cieloBajo, i / (escalones - 1)), corte.pasos)));
  return {
    cielo,
    // `k` es cuánta neblina: 0 lo de delante, 1 el último tejado.
    lejos: (k: number) => css(corta(mezcla(L.crudo.lejos, L.crudo.cieloBajo, k), corte.pasos)),
    tinta: css(corta({ ...tenir({ l: 0.2, c: 0.03, h: 260 }, L), l: Math.max(0.1, L.crudo.tinta.l - 0.04) }, corte.pasos)),
    ventana: css(corta(L.crudo.ventana, corte.pasos)),
  };
}

// ── El decorado que no cambia ────────────────────────────────────────────────

/** Las alturas de los tejados del fondo, en dos filas. */
export const TEJADOS = {
  lejos: [140, 92, 178, 118, 152, 84, 126, 164, 104, 146],
  cerca: [110, 66, 142, 88, 124, 58, 100],
};

/** Los tres bloques de la calle, en coordenadas del lienzo virtual. */
export const BLOQUES: [number, number, number][] = [[40, 210, 500], [560, 190, 470], [1040, 180, 520]];

/** La sombra de contacto: sin ella, todo flota sobre la acera. */
export function apoyo(ctx: Ctx, b: Caja, color: string) {
  tramar(ctx, b.x - 1, b.y + b.h - 2, b.w + 2, 2, color, 0.55);
  tramar(ctx, b.x - 2, b.y + b.h - 1, b.w + 4, 1, color, 0.3);
}
