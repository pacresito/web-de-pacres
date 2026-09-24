// Los edificios de la calle: los dos bloques del fondo y el que deja la obra al terminarse.
// Mediterráneos: estuco de color, aleros de teja, postigos en algunas ventanas y macetas.
//
// **Lo que los edificios no pueden mover:** los objetos que viven en las fachadas —la
// persiana, la cortina, el grafiti, el cartel, el buzón y la tienda con su letrero y su
// toldo—. Tienen caja fija y son lo que el juego compara; aquí se dibuja la pared de detrás y
// se abren ventanas donde no los pisan (`libre`). Tampoco se mueve cuáles se encienden de
// noche ni qué lleva cada ventana: sale de la posición, no del azar del momento.
//
// Todo va en píxeles finos del alzado (640×360) salvo la obra, que es un objeto y se pinta
// dentro de su caja en la ventana. El tercer bloque del alzado no se pinta: detrás de la obra
// queda cielo y los tejados lejanos, que es el aire que le hacía falta a la calle.
import { BLOQUES, CAJAS, azar, px, tramar, type Caja, type Ctx, type Rampa } from "./paleta";
import type { Mano } from "./pincel";

const ESC = 2.5;
const SUELO = 256;                                       // pie de las fachadas: la acera
const R = Math.round;

export interface Vano { x: number; y: number; w: number; h: number; encendida: boolean }

// ── Dónde no se puede abrir una ventana ─────────────────────────────────────

const EN_FACHADA = ["persiana", "cortina", "grafiti", "cartel", "buzon", "comercio", "escaparate", "letrero", "toldo"];
const OCUPADO: Caja[] = EN_FACHADA.map((id) => {
  const c = CAJAS[id];
  return { x: c.x / ESC, y: c.y / ESC, w: c.w / ESC, h: c.h / ESC };
});
const libre = (x: number, y: number, w: number, h: number) =>
  !OCUPADO.some((o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y);

const bloque = (i: number) => {
  const [bx, by, bw] = BLOQUES[i];
  return { x: R(bx / ESC), y: R(by / ESC), w: R(bw / ESC) };
};

/** Encendida de noche o no: fija para cada hueco de cada fachada. */
const enciende = (semilla: number) => azar(semilla * 7919 + 17) < 0.36;

// ── Piezas ──────────────────────────────────────────────────────────────────

/** Un paño de estuco: color liso con algo de grano, y la humedad que sube por el pie. */
function estuco(ctx: Ctx, x: number, y: number, w: number, h: number, T: Rampa, semilla: number) {
  px(ctx, x, y, w, h, T[3]);
  for (let i = 0; i < (w * h) / 40; i++) {
    const r = azar(semilla + i * 3);
    px(ctx, x + Math.floor(azar(semilla + i * 3 + 1) * w), y + Math.floor(azar(semilla + i * 3 + 2) * h), 1, 1, T[r < 0.5 ? 2 : 4]);
  }
  tramar(ctx, x, y + h - 10, w, 10, T[2], 0.25);
}

/** Luz en un canto, sombra en el otro y la bajante del lado de la sombra. */
function cantos(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number, T: Rampa) {
  px(ctx, m.luzDesde > 0 ? x : x + w - 1, y, 1, h, T[4]);
  px(ctx, m.luzDesde > 0 ? x + w - 1 : x, y, 1, h, T[1]);
  const bajante = m.luzDesde > 0 ? x + w - 5 : x + 3;
  px(ctx, bajante, y, 2, h, m.P.metal[2]);
  px(ctx, bajante, y, 1, h, m.P.metal[4]);
}

/** El alero de teja que remata cada edificio. */
function alero(ctx: Ctx, m: Mano, x: number, y: number, w: number) {
  const teja = m.P.ladrillo;
  px(ctx, x - 6, y - 3, w + 12, 3, teja[2]);
  for (let k = x - 6; k < x + w + 6; k += 4) {
    px(ctx, k, y, 3, 2, teja[3]);
    px(ctx, k, y, 1, 2, teja[4]);
    px(ctx, k + 1, y + 2, 1, 1, teja[1]);
  }
  px(ctx, x - 6, y - 4, w + 12, 1, teja[4]);
}

/** Lo que asoma por el tejado, repartido a lo ancho para que nada se pise. */
function tejado(ctx: Ctx, m: Mano, x: number, y: number, w: number, cosas: ("chimenea" | "antena")[], semilla: number) {
  cosas.forEach((cosa, i) => {
    const cx = x + R((w * (i + 0.5)) / cosas.length + (azar(semilla + i * 7) - 0.5) * 10);
    if (cosa === "chimenea") {
      px(ctx, cx, y - 9, 5, 9, m.P.ladrillo[2]);
      px(ctx, cx, y - 9, 1, 9, m.P.ladrillo[3]);
      px(ctx, cx - 1, y - 10, 7, 2, m.P.metal[1]);
    } else {
      px(ctx, cx, y - 16, 1, 16, m.F.tinta);
      for (let k = 0; k < 3; k++) px(ctx, cx - 4 + k, y - 15 + k * 3, 9 - 2 * k, 1, m.F.tinta);
    }
  });
}

/** El cristal de un hueco: de noche, encendido o a oscuras; de día, con el reflejo del cielo. */
function cristal(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number, on: boolean) {
  if (m.noche && on) {
    px(ctx, x, y, w, h, m.F.ventana);
    px(ctx, x, y, w, R(h * 0.4), m.P.luz[5]);
    px(ctx, x + 1, y + h - Math.min(8, h - 2), Math.max(2, R(w * 0.3)), Math.min(8, h - 2), m.P.tela[2]);
    return;
  }
  px(ctx, x, y, w, h, m.noche ? m.P.metal[0] : m.P.metal[1]);
  px(ctx, x, y, w, R(h * 0.35), m.noche ? m.P.metal[1] : m.P.metal[3]);
  if (!m.noche) for (let j = 0; j < Math.min(w, h) - 2; j++) px(ctx, x + w - 2 - j, y + 1 + j, 1, 1, m.P.metal[4]);
}

/** Una maceta en el alféizar, cada una la suya: geranios de tres colores, un cactus, hierbas
 *  o una hiedra que cuelga; y el tiesto de barro, azul o blanco. */
export function maceta(ctx: Ctx, m: Mano, x: number, y: number, w: number, semilla: number) {
  const tipo = Math.floor(azar(semilla * 3 + 1) * 6);
  const tiesto = [m.P.ladrillo, m.tono({ l: 0.5, c: 0.09, h: 245 }), m.P.piedra][Math.floor(azar(semilla * 3 + 2) * 3)];
  const ancho = Math.max(3, Math.min(w, 4 + Math.floor(azar(semilla * 3 + 3) * (w - 3))));
  const x0 = x + Math.floor((w - ancho) / 2);
  const flor = [m.P.tela[5], m.tono({ l: 0.75, c: 0.12, h: 350 })[4], m.P.piedra[5]][tipo % 3];
  if (tipo === 3) {                                                            // cactus
    px(ctx, x0 + R(ancho / 2) - 1, y - 6, 2, 6, m.P.hoja[3]);
    px(ctx, x0 + R(ancho / 2) - 3, y - 4, 1, 2, m.P.hoja[3]);
    px(ctx, x0 + R(ancho / 2) + 2, y - 5, 1, 2, m.P.hoja[3]);
  } else if (tipo === 4) {                                                     // hierbas
    for (let k = x0; k < x0 + ancho; k++) px(ctx, k, y - 2 - ((k * 7) % 3), 1, 2 + ((k * 7) % 3), m.P.hoja[k % 2 ? 4 : 2]);
  } else if (tipo === 5) {                                                     // hiedra que cae
    px(ctx, x0, y - 2, ancho, 2, m.P.hoja[2]);
    for (let k = x0; k < x0 + ancho; k += 2) px(ctx, k, y + 2, 1, 2 + ((k * 5) % 4), m.P.hoja[3]);
  } else {                                                                     // geranios
    px(ctx, x0, y - 3, ancho, 3, m.P.hoja[2]);
    for (let k = x0; k < x0 + ancho; k += 2) px(ctx, k, y - 4 - (k % 3 === 0 ? 1 : 0), 1, 1, flor);
  }
  px(ctx, x0, y, ancho, 2, tiesto[3]);
  px(ctx, x0, y, ancho, 1, tiesto[4]);
}

/** Una ventana: marco claro, cristal y alféizar. Según la semilla lleva postigos abiertos,
 *  un balconcillo de forja o nada, y a veces una maceta. Casi nunca todo a la vez: una
 *  fachada con todos los adornos en todas las ventanas es un escaparate de adornos. */
function ventana(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number, semilla: number, C: Rampa,
  cuantosPostigos: number, on = enciende(semilla)) {
  const r = azar(semilla * 5 + 11);
  const conPostigos = r < cuantosPostigos, conBalcon = !conPostigos && r > 0.78;
  if (conPostigos) {
    const hoja = Math.max(3, R(w / 2));
    for (const sx of [x - hoja - 1, x + w + 1]) {
      px(ctx, sx, y, hoja, h, C[3]);
      for (let j = y + 2; j < y + h - 1; j += 2) px(ctx, sx + 1, j, hoja - 2, 1, C[2]);
      px(ctx, sx, y, 1, h, C[4]);
    }
  }
  px(ctx, x - 1, y - 1, w + 2, h + 2, m.P.piedra[5]);
  cristal(ctx, m, x, y, w, h, on);
  px(ctx, x + R(w / 2), y, 1, h, m.P.piedra[5]);
  px(ctx, x - 2, y + h + 1, w + 4, 2, m.P.piedra[4]);
  px(ctx, x - 2, y + h + 3, w + 4, 1, m.P.piedra[1]);
  if (conBalcon) {
    const b = y + h + 1;
    px(ctx, x - 3, b - 6, w + 6, 1, m.F.tinta);
    for (let k = x - 3; k < x + w + 3; k += 2) px(ctx, k, b - 5, 1, 5, m.F.tinta);
  }
  if (azar(semilla * 5 + 12) < 0.45) maceta(ctx, m, x, y + h - 1, w, semilla);
}

/** Un portal: puerta de madera con montante y escalón. */
function portal(ctx: Ctx, m: Mano, x: number, y: number, w: number, h: number) {
  px(ctx, x - 2, y - 2, w + 4, h + 2, m.P.piedra[4]);
  px(ctx, x, y, w, h, m.P.madera[2]);
  for (let k = x + 2; k < x + w - 1; k += 3) px(ctx, k, y + 8, 1, h - 10, m.P.madera[1]);
  px(ctx, x, y, w, 6, m.noche ? m.F.ventana : m.P.metal[2]);
  px(ctx, x, y, 2, 2, m.P.piedra[4]);
  px(ctx, x + w - 2, y, 2, 2, m.P.piedra[4]);
  px(ctx, x + w - 4, y + R(h * 0.55), 2, 1, m.P.luz[3]);
  px(ctx, x - 3, y + h - 1, w + 6, 1, m.P.piedra[2]);
}

/** Las ventanas de un bloque en rejilla, saltándose lo que pisaría un objeto de la fachada. */
function rejilla(x0: number, cols: number, paso: number, filas: number[], w: number, h: number,
  cb: (x: number, y: number, fila: number, col: number) => void) {
  filas.forEach((y, f) => {
    for (let c = 0; c < cols; c++) {
      const x = x0 + R(c * paso);
      if (libre(x - 4, y - 5, w + 8, h + 8)) cb(x, y, f, c);
    }
  });
}

// ── Los edificios ───────────────────────────────────────────────────────────

/** Los dos bloques del fondo, sobre el lienzo del alzado. */
export function fachadas(ctx: Ctx, m: Mano) {
  const rosa = m.tono({ l: 0.8, c: 0.05, h: 20 }), ocre = m.tono({ l: 0.78, c: 0.085, h: 82 });
  const verde = m.tono({ l: 0.45, c: 0.08, h: 150 }), azul = m.tono({ l: 0.5, c: 0.09, h: 245 });

  const I = bloque(0);
  tejado(ctx, m, I.x, I.y - 4, I.w, ["chimenea", "antena", "chimenea"], 71);
  estuco(ctx, I.x, I.y, I.w, SUELO - I.y, rosa, 21);
  px(ctx, I.x, 198, I.w, SUELO - 198, rosa[2]);                               // zócalo pintado
  px(ctx, I.x, 198, I.w, 1, rosa[1]);
  rejilla(I.x + 10, 7, 27.5, [96, 134, 172], 11, 18, (x, y, f, c) => ventana(ctx, m, x, y, 11, 18, f * 10 + c, verde, 0.3));
  portal(ctx, m, 102, 208, 14, 48);
  cantos(ctx, m, I.x, I.y, I.w, SUELO - I.y, rosa);
  alero(ctx, m, I.x, I.y, I.w);

  const C = bloque(1);
  tejado(ctx, m, C.x, C.y - 4, C.w, ["antena", "chimenea"], 83);
  estuco(ctx, C.x, C.y, C.w, SUELO - C.y, ocre, 22);
  rejilla(C.x + 13, 6, 30, [88, 122], 11, 18, (x, y, f, c) => ventana(ctx, m, x, y, 11, 18, 100 + f * 10 + c, azul, 0.45));
  cantos(ctx, m, C.x, C.y, C.w, SUELO - C.y, ocre);
  alero(ctx, m, C.x, C.y, C.w);
}

/** El edificio de la obra: tres plantas y bajo, y la rejilla de huecos que da `vanosObra`.
 *  Ocupa lo mismo que ocupaba la obra terminada de antes. */
function medidasObra(b: Caja) {
  const x = b.x + 12, y = b.y + 14, w = b.w - 24, h = b.h - 14;
  const bajo = 30, planta = R((h - bajo - 8) / 3);
  const cols = 5, paso = w / cols, vw = 11, vh = Math.min(20, planta - 12);
  const vanos: Vano[] = [];
  for (let f = 0; f < 3; f++)
    for (let c = 0; c < cols; c++)
      vanos.push({
        x: R(x + paso * c + (paso - vw) / 2), y: y + 8 + f * planta + 7, w: vw, h: vh,
        encendida: enciende(900 + f * 10 + c),
      });
  return { x, y, w, h, bajo, vanos };
}

export const vanosObra = (b: Caja) => medidasObra(b).vanos;

export function edificioObra(ctx: Ctx, m: Mano, b: Caja) {
  const E = medidasObra(b);
  const blanco = m.tono({ l: 0.9, c: 0.012, h: 95 }), azul = m.tono({ l: 0.5, c: 0.09, h: 245 });
  tejado(ctx, m, E.x, E.y - 4, E.w, ["chimenea", "antena", "chimenea"], 91);
  estuco(ctx, E.x, E.y, E.w, E.h, blanco, 24);
  px(ctx, E.x, E.y + E.h - E.bajo, E.w, E.bajo, azul[4]);                      // zócalo añil
  px(ctx, E.x, E.y + E.h - E.bajo, E.w, 1, azul[3]);
  E.vanos.forEach((v, i) => ventana(ctx, m, v.x, v.y, v.w, v.h, 900 + i, azul, 0.4, v.encendida));
  portal(ctx, m, E.x + R(E.w / 2) - 6, E.y + E.h - 26, 12, 26);
  cantos(ctx, m, E.x, E.y, E.w, E.h, blanco);
  alero(ctx, m, E.x, E.y, E.w);
}
