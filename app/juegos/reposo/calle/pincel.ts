// El pincel de «fino»: los nueve arquetipos y el cielo, a 640×360.
//
// **Aquí no hay calle.** Este módulo sabe dibujar un toldo, un árbol o una persiana dentro de
// la caja que le den, y nada más. Dónde van esas cajas y qué hay detrás lo decide la escena
// (`alzado.ts`, `fuga.ts`, `esquina.ts`, `ventana.ts`), que es lo que se está eligiendo ahora.
// Así una composición nueva cuesta una tabla de 24 cajas y un fondo, no otro pincel.
//
// El píxel es el grano de una ilustración, no el protagonista: carpintería en las ventanas,
// neblina entre planos y la luz derramándose sobre la acera. El precio, que es real: cuatro
// veces más superficie que a 320×180 por cada objeto y cada estado.
import type { NivelObjeto } from "../escena";
import {
  apoyo, azar, caja, enEscena, fino, fondo, luzDe, paleta, px, trama, tramar, volcar,
  type Caja, type Cajas, type Ctx, type Fondo, type Paleta, type Pieza, type Vista,
} from "./paleta";

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
}

/** Una escena es una composición: dónde va cada uno de los 24 objetos y qué hay detrás. Los
 *  ids y sus arquetipos no se tocan —son lo que archivan las crónicas—; lo que cambia es la
 *  caja. */
export interface Escena {
  id: string;
  nombre: string;
  nota: string;
  /** Solo la caja: el arquetipo, las variantes y la franja horaria salen del catálogo. */
  cajas: Cajas;
  /** El suelo en píxeles finos, para los derrames de luz. */
  suelo: number;
  fondo: (ctx: Ctx, m: Mano, hora: number) => void;
  /** Lo que tapa a los objetos: el marco de una ventana, una rama, el canto de una mesa. Se
   *  pinta DESPUÉS que ellos — un primer plano que se pintara antes no es un primer plano. */
  primerPlano?: (ctx: Ctx, m: Mano, hora: number) => void;
  /** Si la escena enmarca la calle, dónde cabe: fuera de ahí no se pinta ningún objeto. En
   *  píxeles finos. */
  recorte?: { x: number; y: number; w: number; h: number };
}

export function manoDe(hora: number, suelo: number): Mano {
  const L = luzDe(hora);
  return {
    P: paleta(L, CORTE, N), F: fondo(L, CORTE, 9), noche: L.noche,
    luzDesde: ((hora % 24) + 24) % 24 < 13 ? 1 : -1,
    suelo,
  };
}

/** Transición tramada entre dos tonos: lo que en este medio hace de degradado. */
export function fundir(ctx: Ctx, x: number, y: number, w: number, alto: number, a: string, b: string) {
  px(ctx, x, y, w, alto, a);
  for (let j = 0; j < alto; j++) tramar(ctx, x, y + j, w, 1, b, j / Math.max(1, alto - 1));
}

/** Un resplandor redondo y tramado. **Redondo de verdad:** `tramar` sobre un rectángulo deja
 *  un cuadrado de puntos alrededor del sol, que es exactamente lo que no puede haber en el
 *  cielo — la única forma sin borde de la lámina dibujada con borde. */
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

/** El cielo hasta `horizonte`, con sus bandas tramadas en la costura, sus estrellas, sus nubes
 *  y el astro de la hora. Lo comparten todas las escenas: la luz es del sitio, no del encuadre. */
export function cielo(ctx: Ctx, m: Mano, hora: number, horizonte: number) {
  const n = m.F.cielo.length;
  for (let y = 0; y < horizonte; y++) {
    const v = (y / (horizonte - 1)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(v)), f = v - i;
    px(ctx, 0, y, ANCHO, 1, m.F.cielo[i]);
    if (f > 0.25) tramar(ctx, 0, y, ANCHO, 1, m.F.cielo[i + 1], (f - 0.25) / 0.75);
  }
  if (m.noche)
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(azar(i * 3 + 1) * ANCHO), y = Math.floor(azar(i * 3 + 2) * (horizonte - 40));
      px(ctx, x, y, 1, 1, m.P.luz[azar(i) > 0.55 ? 5 : 4]);
    }
  for (let i = 0; i < 6; i++) {
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

// ── Los nueve arquetipos ─────────────────────────────────────────────────────

export type Pincel = (ctx: Ctx, m: Mano, b: Caja, p: Pieza, n: number) => void;

function cuerpo(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number, R: string[], base = 3) {
  px(ctx, x, y, w, h, R[base]);
  px(ctx, x, y, w, 1, R[Math.min(N - 1, base + 2)]);
  px(ctx, x, y + 1, w, 1, R[Math.min(N - 1, base + 1)]);
  tramar(ctx, x, y + Math.ceil(h * 0.58), w, Math.max(1, Math.floor(h * 0.42) - 1), R[base - 1], 0.6);
  px(ctx, x, y + h - 1, w, 1, R[0]);
  px(ctx, m.luzDesde > 0 ? x : x + w - 1, y + 1, 1, h - 2, R[Math.max(0, base - 2)]);
}

export const PINCELES: Record<string, Pincel> = {
  hueco: (ctx, m, b, p, n) => {
    px(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, m.F.tinta);
    px(ctx, b.x - 1, b.y - 1, b.w + 2, b.h + 2, m.P.madera[2]);
    px(ctx, b.x, b.y, b.w, b.h, m.P.metal[0]);
    const abierto = Math.round((b.h - 2) * (1 - (n % p.variantes) / (p.variantes - 1)));
    if (abierto > 2) {
      px(ctx, b.x, b.y, b.w, abierto, m.noche ? m.F.ventana : m.P.metal[0]);
      if (m.noche) {
        px(ctx, b.x, b.y, b.w, Math.round(abierto * 0.35), m.P.luz[5]);
        tramar(ctx, b.x, b.y, b.w, abierto, m.P.luz[5], 0.25);
        // El derrame sobre la acera: lo que más ambiente da por píxel gastado.
        tramar(ctx, b.x - 8, b.y + abierto, b.w + 16, Math.max(0, Math.min(20, m.suelo - b.y - abierto)), m.F.ventana, 0.3);
        tramar(ctx, b.x - 4, b.y + abierto, b.w + 8, 6, m.P.luz[5], 0.45);
      } else {
        px(ctx, b.x + 1, b.y + 1, b.w - 2, Math.round(abierto * 0.3), m.P.metal[3]);
        tramar(ctx, b.x + 1, b.y + 1, b.w - 2, abierto, m.P.metal[2], 0.25);
      }
      for (let x = b.x + 36; x < b.x + b.w - 2; x += 36) {
        px(ctx, x, b.y, 2, abierto, m.P.madera[2]);
        px(ctx, x, b.y, 1, abierto, m.P.madera[3]);
      }
    }
    const bajada = b.h - abierto;
    if (bajada > 1) {
      px(ctx, b.x, b.y + abierto, b.w, bajada, m.P.metal[3]);
      for (let y = b.y + abierto + 2; y < b.y + b.h; y += 4) {
        px(ctx, b.x, y, b.w, 1, m.P.metal[1]);
        px(ctx, b.x, y + 1, b.w, 1, m.P.metal[4]);
      }
      px(ctx, b.x, b.y + abierto, b.w, 2, m.P.metal[5]);
    }
  },
  banda: (ctx, m, b, p, n) => {
    const t = (n % p.variantes) / (p.variantes - 1);
    const h = Math.max(3, Math.round(b.h * (0.35 + 0.65 * t)));
    const raya = Math.max(4, Math.round(b.w / 24));
    const R = m.P.tela;
    for (let x = b.x; x < b.x + b.w; x += raya * 2) {
      px(ctx, x, b.y, raya, h, R[3]);
      px(ctx, x + raya, b.y, raya, h, R[5]);
    }
    px(ctx, b.x, b.y, b.w, 2, R[4]);
    tramar(ctx, b.x, b.y + h - Math.round(h * 0.4), b.w, Math.round(h * 0.4), R[1], 0.4);
    px(ctx, b.x, b.y + h - 1, b.w, 1, R[0]);
    for (let x = b.x; x < b.x + b.w; x += raya * 2) {
      px(ctx, x + 2, b.y + h, raya, 2, R[2]);
      px(ctx, x + 3, b.y + h + 2, Math.max(1, raya - 2), 1, R[1]);
    }
    if (!m.noche) tramar(ctx, b.x, b.y + h + 3, b.w, 8, m.P.piedra[1], 0.35);
  },
  bulto: (ctx, m, b, p, n) => {
    const v = n % p.variantes;
    // **La altura casi no varía con el nivel, y eso es un arreglo, no un descuido.** Con el
    // rango antiguo (de 0,62 a 1) el mismo objeto se estiraba y encogía al cambiar de nivel, y
    // eso no se lee como «hay otra cosa ahí»: se lee como que el dibujo respira. Lo que
    // distingue un nivel de otro es el material y el remate de arriba.
    const alto = Math.max(4, Math.round(b.h * (0.86 + 0.14 * ((v + 1) / p.variantes))));
    const y = b.y + b.h - alto;
    const R = [m.P.tela, m.P.metal, m.P.madera, m.P.hoja, m.P.ladrillo][v % 5];
    apoyo(ctx, b, m.F.tinta);
    cuerpo(ctx, m, b.x, y, b.w, alto, R);
    if (v % 3 === 1) px(ctx, b.x - 2, y - 2, b.w + 4, 3, R[4]);                      // tapa volada
    if (v % 3 === 2) px(ctx, b.x + Math.round(b.w * 0.2), y - 3, Math.round(b.w * 0.6), 3, R[2]);
  },
  planta: (ctx, m, b, p, n) => {
    const v = Math.min(n, p.variantes - 1) / (p.variantes - 1);
    const cx = b.x + Math.round(b.w / 2), cy = b.y + Math.round(b.h * 0.42);
    const r = Math.max(3, Math.round((b.w / 2) * (0.45 + 0.55 * v)));
    const tronco = Math.max(3, Math.round(b.w * 0.13));
    for (let j = cy; j < b.y + b.h; j++) {
      const ancho = tronco + Math.floor((j - cy) / 14);
      px(ctx, cx - Math.floor(ancho / 2), j, ancho, 1, m.P.madera[2]);
      px(ctx, cx - Math.floor(ancho / 2), j, 1, 1, m.P.madera[3]);
      px(ctx, cx + Math.ceil(ancho / 2) - 1, j, 1, 1, m.P.madera[1]);
    }
    apoyo(ctx, { ...b, x: cx - tronco * 2, w: tronco * 4 }, m.F.tinta);
    const masa = (mx: number, my: number, mr: number, color: string) => disco(ctx, mx, my, mr, color);
    masa(cx, cy - Math.round(r * 0.1), r, m.P.hoja[2]);
    for (let i = 0; i < 16; i++) {
      const a = azar(i * 5 + 1) * Math.PI * 2, d = r * (0.2 + azar(i * 5 + 2) * 0.75);
      const mx = cx + Math.round(Math.cos(a) * d), my = cy + Math.round(Math.sin(a) * d * 0.82);
      const arriba = my < cy - r * 0.2;
      masa(mx, my, Math.max(3, Math.round(r * (0.2 + azar(i * 5 + 3) * 0.2))),
        m.P.hoja[arriba ? 4 : azar(i * 5 + 4) > 0.5 ? 3 : 1]);
    }
    tramar(ctx, cx - r, cy + Math.round(r * 0.15), r * 2, r, m.P.hoja[0], 0.35);
    // Huecos en verde oscuro, no en color de cielo: con el cielo de las ocho, dos círculos
    // naranjas en un árbol son dos naranjas.
    masa(cx + Math.round(r * 0.5), cy + Math.round(r * 0.35), Math.max(2, Math.round(r * 0.14)), m.P.hoja[0]);
    masa(cx - Math.round(r * 0.62), cy - Math.round(r * 0.1), Math.max(2, Math.round(r * 0.1)), m.P.hoja[0]);
  },
  mancha: (ctx, m, b, p, n) => {
    if (n === 0) return;
    const v = n % p.variantes;
    const R = [m.P.tela, m.P.hoja, m.P.luz, m.P.ladrillo][v % 4];
    px(ctx, b.x, b.y, b.w, b.h, R[4]);
    px(ctx, b.x, b.y, b.w, 2, R[5]);
    px(ctx, b.x, b.y + b.h - 2, b.w, 2, R[2]);
    for (let i = 0; i < 4; i++) px(ctx, b.x + 4, b.y + 7 + i * 9, Math.max(2, b.w - 8 - i * 5), 3, R[0]);
    px(ctx, b.x + b.w - 5, b.y, 5, 4, R[1]);     // la esquina despegada
  },
  poste: (ctx, m, b, p, n) => {
    const cx = b.x + Math.round(b.w / 2);
    px(ctx, cx - 2, b.y + 10, 4, b.h - 10, m.F.tinta);
    px(ctx, cx - 2, b.y + 10, 1, b.h - 10, m.P.metal[3]);
    px(ctx, cx - 5, b.y + b.h - 6, 11, 6, m.F.tinta);
    px(ctx, cx - 5, b.y + b.h - 6, 11, 1, m.P.metal[2]);
    for (let i = 0; i < 12; i++) px(ctx, cx - 2 + Math.round(i * 0.5), b.y + 10 - i, 3, 2, m.F.tinta);
    px(ctx, cx + 4, b.y, 14, 5, m.F.tinta);
    if (!m.noche || n % p.variantes === 2) return;
    px(ctx, cx + 5, b.y + 5, 12, 2, m.P.luz[5]);
    // El cono: densidad, no degradado — y con el borde deshilachado, que una cuña de tramado
    // uniforme se lee como una chapa blanca apoyada en la farola.
    const bajo = m.suelo + 12;
    for (let j = 0; j < bajo - b.y - 6; j++) {
      const t = j / (bajo - b.y - 6);
      const ancho = 8 + Math.round(j * 0.9);
      for (let i = 0; i < ancho; i++) {
        const lado = Math.abs(i / (ancho - 1) - 0.5) * 2;
        if (trama(cx + 11 - Math.round(ancho / 2) + i, b.y + 6 + j) < 0.42 * (1 - t) * (1 - lado ** 2))
          px(ctx, cx + 11 - Math.round(ancho / 2) + i, b.y + 6 + j, 1, 1, m.P.luz[5]);
      }
    }
  },
  andamio: (ctx, m, b, p, n) => {
    const fase = Math.min(n, p.variantes - 1);
    const anchoVano = Math.max(10, Math.round(b.w / 6));
    if (fase === p.variantes - 1) {
      const R = m.P.piedra;
      px(ctx, b.x + 12, b.y + 16, b.w - 24, b.h - 16, R[4]);
      px(ctx, b.x + 12, b.y + 16, b.w - 24, 3, R[5]);
      px(ctx, b.x + 12, b.y + 19, b.w - 24, 1, R[2]);
      for (let j = b.y + 24; j < b.y + b.h; j += 6) px(ctx, b.x + 12, j, b.w - 24, 1, R[3]);
      for (let f = 0; f * 43 < b.h - 48; f++)
        for (let c = 0; c * anchoVano < b.w - 36; c++) {
          const x = b.x + 24 + c * anchoVano, y = b.y + 32 + f * 43, on = m.noche && (c + f) % 3 === 0;
          const w = Math.max(6, Math.round(anchoVano * 0.6)), h = Math.max(8, Math.round(w * 1.35));
          px(ctx, x - 1, y - 1, w + 2, h + 2, m.F.tinta);
          px(ctx, x, y, w, h, on ? m.F.ventana : m.P.metal[1]);
          px(ctx, x, y, w, Math.round(h * (on ? 0.38 : 0.5)), on ? m.P.luz[5] : m.P.metal[3]);
        }
      return;
    }
    const alto = Math.round(b.h * (fase / (p.variantes - 1)));
    if (alto > 6) tramar(ctx, b.x + 10, b.y + b.h - alto, b.w - 18, alto, m.P.hoja[2], 0.45);
    for (let x = b.x + 12; x < b.x + b.w - 8; x += Math.max(14, Math.round(b.w / 5))) {
      px(ctx, x, b.y + b.h - alto, 2, alto, m.P.luz[3]);
      px(ctx, x, b.y + b.h - alto, 1, alto, m.P.luz[4]);
    }
    for (let y = b.y + b.h - 2; y > b.y + b.h - alto; y -= 34) {
      px(ctx, b.x + 12, y, b.w - 20, 2, m.P.luz[3]);
      px(ctx, b.x + 12, y - 2, b.w - 20, 2, m.P.madera[3]);
      px(ctx, b.x + 12, y - 3, b.w - 20, 1, m.P.madera[4]);
    }
  },
  tendal: (ctx, m, b, p, n) => {
    for (let x = 0; x < b.w; x++) px(ctx, b.x + x, b.y + Math.round(2 * Math.sin((x / b.w) * Math.PI)), 1, 1, m.F.tinta);
    const cuantas = 1 + (n % p.variantes);
    const paso = (b.w - 8) / p.variantes;
    for (let i = 0; i < cuantas; i++) {
      const x = b.x + 3 + Math.round(i * paso);
      const cuelga = b.y + Math.round(2 * Math.sin(((x - b.x) / b.w) * Math.PI));
      const alto = Math.max(6, Math.round(b.h * 0.42) + ((i + n) % 3) * 4);
      const ancho = Math.max(4, Math.round(paso * 0.8));
      const R = [m.P.tela, m.P.metal, m.P.hoja, m.P.luz][(i + n) % 4];
      px(ctx, x + 3, cuelga, 1, 2, m.F.tinta);
      px(ctx, x, cuelga + 2, ancho, alto, R[3]);
      px(ctx, x, cuelga + 2, 1, alto, R[4]);
      px(ctx, x + ancho - 1, cuelga + 2, 1, alto, R[1]);
      px(ctx, x, cuelga + 2 + alto, ancho, 1, R[0]);
    }
  },
  tinte: (ctx, m, b, p, n) => {
    const v = (n % p.variantes) / (p.variantes - 1);
    if (v === 0) return;
    for (let j = 0; j < b.h; j++)
      tramar(ctx, b.x, b.y + j, b.w, 1, m.P.muro[1], v * (0.18 + 0.45 * (1 - j / b.h)));
    for (let i = 0; i < 14; i++) {      // regueros: la fachada se ensucia por donde corre el agua
      const x = b.x + Math.floor(azar(i * 3 + 1) * b.w), w = 1 + Math.floor(azar(i * 3 + 2) * 3);
      tramar(ctx, x, b.y, w, Math.round(b.h * (0.2 + azar(i * 3 + 3) * 0.7)), m.P.muro[0], 0.2 + 0.3 * v);
    }
  },
};

/** Encima del arquetipo, lo que hace que un bulto sea ese objeto. */
export const DETALLE: Record<string, Pincel> = {
  // El coche no estira: **cada nivel es otro vehículo**, con su altura propia. Estirando uno
  // solo, mover la hora lo inflaba y desinflaba —el coche cambia de nivel cada hora y
  // media— y eso no se lee como «hoy hay aparcada otra cosa», se lee como una avería del
  // dibujo. El nivel 2 es la plaza vacía: el sitio conserva su zona sensible.
  coche: (ctx, m, b, p, n) => {
    const v = n % p.variantes;
    if (v === 2) {                      // se lo llevaron: queda la mancha de aceite
      tramar(ctx, b.x + 10, b.y + b.h - 4, b.w - 20, 4, m.P.asfalto[1], 0.5);
      return;
    }
    const R = [m.P.tela, m.P.metal, m.P.hoja, m.P.ladrillo, m.P.madera][v];
    const forma = [
      { alto: 26, largo: 0.78, capo: 0.22, techo: 0.52 },  // turismo
      { alto: 38, largo: 0.86, capo: 0.14, techo: 0.72 },  // furgoneta
      { alto: 0, largo: 0, capo: 0, techo: 0 },
      { alto: 29, largo: 0.92, capo: 0.18, techo: 0.66 },  // ranchera
      { alto: 26, largo: 0.74, capo: 0.24, techo: 0.5 },   // taxi
    ][v];
    const w = Math.round(b.w * forma.largo), x = b.x + Math.round((b.w - w) / 2);
    const alto = Math.round(forma.alto * (b.h / 49));      // la caja manda: en fuga va más pequeño
    const y = b.y + b.h - alto;
    apoyo(ctx, { x, y, w, h: alto }, m.F.tinta);
    const bajo = Math.round(alto * 0.55);
    px(ctx, x, y + alto - bajo, w, bajo, R[3]);            // cuerpo
    px(ctx, x, y + alto - bajo, w, 1, R[4]);
    const techoW = Math.round(w * forma.techo), techoX = x + Math.round(w * forma.capo);
    px(ctx, techoX, y, techoW, alto - bajo, R[3]);         // cabina
    px(ctx, techoX, y, techoW, 1, R[5]);
    px(ctx, techoX + 2, y + 2, techoW - 4, Math.max(2, alto - bajo - 4), m.noche ? m.P.metal[1] : m.P.metal[4]);
    px(ctx, techoX + Math.round(techoW / 2), y + 2, 1, Math.max(2, alto - bajo - 4), R[2]);
    tramar(ctx, x, y + alto - Math.round(bajo * 0.45), w, Math.round(bajo * 0.45) - 1, R[1], 0.55);
    for (const cx of [x + Math.round(w * 0.2), x + Math.round(w * 0.8)]) {
      const r = Math.max(2, Math.round(alto * 0.22));
      disco(ctx, cx, b.y + b.h - r, r, m.F.tinta);
      disco(ctx, cx, b.y + b.h - r, Math.max(1, r - 2), m.P.metal[2]);
    }
    if (v === 4) px(ctx, techoX + Math.round(techoW * 0.3), y - 3, Math.round(techoW * 0.4), 3, m.P.luz[5]);
    if (m.noche) {
      px(ctx, x + w - 2, y + alto - bajo + 2, 2, 3, m.P.tela[5]);
      px(ctx, x, y + alto - bajo + 2, 2, 3, m.P.luz[5]);
      resplandor(ctx, x - 2, y + alto - bajo + 3, 14, m.P.luz[5], 0.35);
    }
  },
  contenedor: (ctx, m, b, _p, n) => {
    const alto = Math.round(b.h * (0.86 + 0.14 * (((n % 4) + 1) / 4)));
    const y = b.y + b.h - alto;
    px(ctx, b.x - 3, y - 4, b.w + 6, 5, m.P.metal[4]);
    px(ctx, b.x - 3, y - 4, b.w + 6, 1, m.P.metal[5]);
    px(ctx, b.x + Math.round(b.w * 0.36), y - 8, Math.round(b.w * 0.28), 4, m.P.metal[3]);
    for (const cx of [b.x + 6, b.x + b.w - 12]) px(ctx, cx, b.y + b.h - 5, 6, 5, m.F.tinta);
    for (let x = b.x + 4; x < b.x + b.w - 4; x += 10) px(ctx, x, y + 6, 1, Math.max(1, alto - 12), m.P.metal[2]);
  },
  banco: (ctx, m, b) => {
    for (let y = b.y + 3; y < b.y + b.h - 6; y += 5) {
      px(ctx, b.x, y, b.w, 3, m.P.madera[3]);
      px(ctx, b.x, y, b.w, 1, m.P.madera[4]);
      px(ctx, b.x, y + 2, b.w, 1, m.P.madera[1]);
    }
    for (const x of [b.x + 3, b.x + b.w - 7]) {
      px(ctx, x, b.y + 6, 4, b.h - 6, m.F.tinta);
      px(ctx, x, b.y + 6, 1, b.h - 6, m.P.metal[2]);
    }
  },
  papelera: (ctx, m, b) => {
    px(ctx, b.x - 2, b.y + 3, b.w + 4, 3, m.P.metal[4]);
    px(ctx, b.x - 2, b.y + 3, b.w + 4, 1, m.P.metal[5]);
    for (let x = b.x + 1; x < b.x + b.w - 1; x += 3) px(ctx, x, b.y + 7, 2, Math.max(1, b.h - 9), m.P.metal[1]);
    px(ctx, b.x + 2, b.y + b.h - 2, Math.max(1, b.w - 4), 2, m.F.tinta);
  },
  bici: (ctx, m, b) => {
    const r = Math.max(3, Math.round(b.h * 0.29)), y = b.y + b.h - r - 2;
    for (const cx of [b.x + r + 2, b.x + b.w - r - 3]) {
      for (let j = -r; j <= r; j++) {
        const w = Math.round(Math.sqrt(Math.max(0, r * r - j * j)));
        px(ctx, cx - w, y + j, 1, 1, m.F.tinta);
        px(ctx, cx + w, y + j, 1, 1, m.F.tinta);
      }
      px(ctx, cx - 1, y - 1, 2, 2, m.P.metal[3]);
    }
    px(ctx, b.x + r + 2, y - 8, b.w - 2 * r - 5, 2, m.P.tela[4]);
    px(ctx, b.x + Math.round(b.w / 2), y - 8, 2, 8, m.P.tela[4]);
    px(ctx, b.x + b.w - r - 5, y - 12, 2, 5, m.P.metal[2]);
    px(ctx, b.x + b.w - r - 8, y - 13, 8, 2, m.P.metal[2]);
  },
  macetero: (ctx, m, b) => {
    const y = b.y + Math.round(b.h * 0.5);
    for (let j = 0; j < b.h - (y - b.y); j++)
      px(ctx, b.x + 2 + Math.floor(j / 4), y + j, Math.max(2, b.w - 4 - Math.floor(j / 2)), 1, m.P.ladrillo[3]);
    px(ctx, b.x, y - 3, b.w, 4, m.P.ladrillo[4]);
    px(ctx, b.x, y - 3, b.w, 1, m.P.ladrillo[5]);
  },
};

/** Pinta una escena entera. El catálogo pone el arquetipo y las variantes; la escena, la caja. */
export function pintarEscena(ctx: Ctx, vista: Vista, niveles: NivelObjeto[], hora: number, escena: Escena) {
  const m = manoDe(hora, escena.suelo);
  const f = fino(ESC);
  escena.fondo(f.ctx, m, hora);
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
    PINCELES[p.arquetipo](f.ctx, m, b, p, n);
    DETALLE[id]?.(f.ctx, m, b, p, n);
  }
  if (escena.recorte) f.ctx.restore();
  escena.primerPlano?.(f.ctx, m, hora);
  volcar(ctx, vista, f);
}
