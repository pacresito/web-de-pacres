// Escena «alzado»: la calle de frente, todo a la misma distancia. Es lo que la ventana enmarca.
import { ACERA, CAJAS, SUELO, TEJADOS, px, tramar, type Ctx } from "./paleta";
import { fachadas } from "./edificios";
import { ANCHO, ESC, cielo, fundir, type Escena, type Mano } from "./pincel";

const ALTO = 360;
const CIELO = ACERA / ESC, CALLE = SUELO / ESC;

function fondo(ctx: Ctx, m: Mano, hora: number) {
  cielo(ctx, m, hora, CIELO);
  sinCielo(ctx, m);
}

/** El cielo solo, sin nubes ni estrellas: lo que la escena animada deja quieto por detrás. */
export function cieloQuieto(ctx: Ctx, m: Mano, hora: number) {
  cielo(ctx, m, hora, CIELO, false);
}

/** Todo lo que no es cielo, sobre transparente: lo que se mueva en el cielo pasa por detrás. */
export function sinCielo(ctx: Ctx, m: Mano) {
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

  fachadas(ctx, m);

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
  // La raya del centro y el paso de cebra delante de la tienda, más ancho al acercarse.
  for (let x = 16; x < ANCHO; x += 44) px(ctx, x, 309, 24, 2, m.P.asfalto[5]);
  for (let y = CALLE + 4, k = 0; y < ALTO - 6; y += 6, k++) {
    const abre = Math.round(k * 1.5);
    px(ctx, 318 - abre, y, 84 + 2 * abre, 3, m.P.asfalto[5]);
    px(ctx, 318 - abre, y + 3, 84 + 2 * abre, 1, m.P.asfalto[4]);
  }
  for (let j = 0; j < 8; j++) px(ctx, 291 + j, CALLE + 22 + Math.abs(j - 4), 18 - j * 2, 1, m.P.metal[2]);
}

export const escena: Escena = {
  id: "alzado",
  cajas: CAJAS,
  suelo: CALLE,
  fondo,
};
