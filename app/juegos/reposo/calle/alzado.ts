// Escena «alzado» — la calle de frente, que es la composición que ya tiene el juego.
//
// Su virtud es la que no se ve hasta comparar: **todo está a la misma distancia**, así que
// todo se lee igual de bien y una caja de toque es un rectángulo honesto. Es la composición
// que menos estorba a la mecánica. Y es también la que menos se parece a un sitio: un alzado
// es un plano de arquitecto, y los planos no dan ganas de volver.
import {
  ACERA, BLOQUES, CAJAS, SUELO, TEJADOS, px, tramar, ventanasDelFondo, type Ctx,
} from "./paleta";
import { ANCHO, ESC, cielo, fundir, type Escena, type Mano } from "./pincel";

const ALTO = 360;
const CIELO = ACERA / ESC, CALLE = SUELO / ESC;

function fondo(ctx: Ctx, m: Mano, hora: number) {
  cielo(ctx, m, hora, CIELO);

  TEJADOS.lejos.forEach((alto, i) => {
    const x = Math.round((i * 178 - 70) / ESC), a = Math.round(alto / ESC);
    px(ctx, x, CIELO - a - 44, Math.round(168 / ESC), a + 44, m.F.lejos(0.62));
  });
  TEJADOS.cerca.forEach((alto, i) => {
    const x = Math.round((i * 252 - 40) / ESC), a = Math.round(alto / ESC), w = Math.round(226 / ESC);
    px(ctx, x, CIELO - a - 36, w, a + 36, m.F.lejos(0.38));
    px(ctx, x, CIELO - a - 36, w, 1, m.F.lejos(0.3));
    for (let c = 0; c < 7; c++)
      for (let f = 0; f < Math.floor(a / 12); f++)
        px(ctx, x + 6 + c * 12, CIELO - a - 26 + f * 12, 5, 7,
          m.noche && (c + f + i) % 4 === 0 ? m.F.ventana : m.F.lejos(0.5));
  });
  tramar(ctx, 0, CIELO - 90, ANCHO, 90, m.F.cielo[m.F.cielo.length - 1], 0.18);

  BLOQUES.forEach(([bx, by, bw], i) => {
    const x = Math.round(bx / ESC), y = Math.round(by / ESC), w = Math.round(bw / ESC);
    const R = i === 1 ? m.P.ladrillo : m.P.muro;
    px(ctx, x, y, w, CIELO - y, R[3]);
    for (let j = y + 6; j < CIELO; j += 5) {
      px(ctx, x, j, w, 1, R[2]);
      for (let k = x + (j % 10 === 0 ? 0 : 6); k < x + w; k += 12) px(ctx, k, j - 2, 1, 2, R[2]);
    }
    px(ctx, x - 4, y, w + 8, 5, R[4]);
    for (let k = x - 4; k < x + w + 4; k += 6) px(ctx, k, y + 5, 3, 2, R[4]);
    px(ctx, x - 4, y + 7, w + 8, 1, R[1]);
    px(ctx, x, CIELO - 18, w, 18, R[2]);
    px(ctx, x, CIELO - 18, w, 1, R[1]);
    px(ctx, m.luzDesde > 0 ? x : x + w - 1, y + 8, 1, CIELO - y - 8, R[1]);
    const canalon = m.luzDesde > 0 ? x + w - 5 : x + 3;
    px(ctx, canalon, y + 7, 2, CIELO - y - 7, R[1]);
    px(ctx, canalon, y + 7, 1, CIELO - y - 7, R[4]);
  });

  ventanasDelFondo((vx, vy, on) => {
    const x = Math.round(vx / ESC), y = Math.round(vy / ESC), w = 18, h = 23;
    px(ctx, x - 2, y - 2, w + 4, h + 4, m.F.tinta);
    px(ctx, x - 1, y - 1, w + 2, h + 2, m.P.muro[4]);
    if (on && m.noche) {
      px(ctx, x, y, w, h, m.F.ventana);
      px(ctx, x, y, w, Math.round(h * 0.45), m.P.luz[5]);
      px(ctx, x + 2, y + h - 9, 6, 9, m.P.tela[2]);
      tramar(ctx, x - 6, y - 6, w + 12, h + 12, m.F.ventana, 0.2);
    } else {
      px(ctx, x, y, w, h, m.P.metal[on ? 2 : 1]);
      px(ctx, x, y, w, Math.round(h * 0.5), m.P.metal[3]);
      if (on) px(ctx, x + 1, y + 1, 5, h - 2, m.P.metal[4]);
    }
    px(ctx, x + Math.floor(w / 2), y, 1, h, m.F.tinta);
    px(ctx, x, y + Math.floor(h / 2), w, 1, m.F.tinta);
    px(ctx, x - 3, y + h, w + 6, 2, m.P.piedra[4]);
    px(ctx, x - 3, y + h + 2, w + 6, 1, m.P.piedra[1]);
  });

  px(ctx, 0, CIELO, ANCHO, CALLE - CIELO, m.P.piedra[3]);
  for (let x = 0; x < ANCHO; x += 22) px(ctx, x, CIELO, 1, CALLE - CIELO, m.P.piedra[2]);
  px(ctx, 0, CIELO + 11, ANCHO, 1, m.P.piedra[2]);
  tramar(ctx, 0, CIELO, ANCHO, 6, m.P.piedra[1], 0.3);
  px(ctx, 0, CALLE - 4, ANCHO, 4, m.P.piedra[4]);
  px(ctx, 0, CALLE - 4, ANCHO, 1, m.P.piedra[5]);
  px(ctx, 0, CALLE, ANCHO, ALTO - CALLE, m.P.asfalto[3]);
  px(ctx, 0, CALLE, ANCHO, 2, m.P.asfalto[0]);
  tramar(ctx, 0, CALLE + 2, ANCHO, ALTO - CALLE - 2, m.P.asfalto[2], 0.3);
  fundir(ctx, 0, ALTO - 40, ANCHO, 40, m.P.asfalto[3], m.P.asfalto[4]);
  for (let x = 16; x < ANCHO; x += 72) px(ctx, x, 324, 38, 3, m.P.asfalto[5]);
  for (let j = 0; j < 8; j++) px(ctx, 291 + j, CALLE + 22 + Math.abs(j - 4), 18 - j * 2, 1, m.P.metal[2]);
}

export const escena: Escena = {
  id: "alzado",
  nombre: "alzado",
  nota: "La de ahora: todo de frente y a la misma distancia. La que mejor sirve a la mecánica y la que menos parece un sitio.",
  cajas: CAJAS,
  suelo: CALLE,
  fondo,
};
