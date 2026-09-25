// La ventana: el alzado pintado aparte y pegado al 87 % dentro del hueco, con el marco, la
// repisa y las cortinas delante.
import { PIEZAS, TIENDA, type Caja } from "../render";
import { ALTO, ANCHO, ESC, disco, fino, px, tramar, type Ctx, type Mano } from "./paleta";
import { tienda } from "./objetos";
import { cieloQuieto, sinCielo } from "./alzado";

/** El hueco de la ventana, en píxeles finos, y la transformación que mete la calle dentro. */
export const HUECO = { x: 40, y: 20, w: 560, h: 252 };
const ESCALA = HUECO.w / ANCHO;          // 0,875
const RECORTE_Y = 28;                    // desde qué fila de la calle se ve
/** El canto de arriba de la repisa: donde se apoya lo que vive en ella. */
export const REPISA = HUECO.y + HUECO.h + 14;

/** Un punto de la calle (píxeles finos del alzado) a píxeles finos de la ventana. */
export const aVentana = (x: number, y: number) => ({ x: HUECO.x + x * ESCALA, y: HUECO.y + (y - RECORTE_Y) * ESCALA });

/** Lo mínimo que mide una caja en el lienzo grande, para que ningún objeto baje de 20 px en
 *  escritorio (lo vigila render.test.ts). */
const MINIMO = 30;

/** Lo que en la ventana no va donde en el alzado, en píxeles finos: el coche sube para que el
 *  marco no le corte las ruedas, y el contenedor va a la acera. */
const RECOLOCAR: Record<string, { dy?: number; x?: number; y?: number; w?: number; h?: number }> = {
  coche: { dy: -28 },
  contenedor: { x: 543, y: 204, w: 34, h: 30 },
};

const dentro = (x: number, y: number, w: number, h: number) => {
  const cx = (HUECO.x + (x + w / 2) * ESCALA) * ESC;
  const cy = (HUECO.y + (y + h / 2 - RECORTE_Y) * ESCALA) * ESC;
  const ancho = Math.max(MINIMO, w * ESCALA * ESC), alto = Math.max(MINIMO, h * ESCALA * ESC);
  return { x: cx - ancho / 2, y: cy - alto / 2, w: ancho, h: alto };
};

// El alzado se pinta aparte y se pega escalado sin suavizado: los pinceles trabajan en píxeles
// enteros, y escalando las coordenadas cada detalle caería entre dos.
function pegar(ctx: Ctx, clave: string, pintar: (aux: Ctx) => void) {
  const aux = fino(clave);
  pintar(aux.ctx);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(aux.lienzo, 0, RECORTE_Y, ANCHO, HUECO.h / ESCALA, HUECO.x, HUECO.y, HUECO.w, HUECO.h);
}

/** El local de la tienda, en píxeles finos de la ventana: se pinta a la escala de los objetos
 *  que viven en él, no con el alzado. */
const LOCAL = (() => {
  const c = dentro(TIENDA.x / ESC, TIENDA.y / ESC, TIENDA.w / ESC, TIENDA.h / ESC);
  return { x: Math.round(c.x / ESC), y: Math.round(c.y / ESC), w: Math.round(c.w / ESC), h: Math.round(c.h / ESC) };
})();

/** Las capas de la escena animada: el cielo, y la calle sobre transparente para que lo que
 *  cruza el cielo pase por detrás de los tejados. */
export const cieloVentana = (ctx: Ctx, m: Mano, hora: number) => pegar(ctx, "ventana-cielo", (aux) => cieloQuieto(aux, m, hora));
export function calleVentana(ctx: Ctx, m: Mano) {
  pegar(ctx, "ventana", (aux) => sinCielo(aux, m));
  tienda(ctx, m, LOCAL);
}

/** Pared, marco, cristal y repisa. Lo de encima de la repisa va en `PARTES`, para que el gato
 *  pueda pasar por detrás. */
export function marco(ctx: Ctx, m: Mano) {
  const madera = m.P.madera;
  const habitacion = m.noche ? madera[0] : madera[1];

  // La pared alrededor del hueco.
  px(ctx, 0, 0, ANCHO, HUECO.y, habitacion);
  px(ctx, 0, HUECO.y + HUECO.h, ANCHO, ALTO - HUECO.y - HUECO.h, habitacion);
  px(ctx, 0, 0, HUECO.x, ALTO, habitacion);
  px(ctx, HUECO.x + HUECO.w, 0, ANCHO - HUECO.x - HUECO.w, ALTO, habitacion);

  // El marco: jamba, dintel y crucetas, con luz en el canto de dentro.
  const marco = (x: number, y: number, w: number, h: number) => {
    px(ctx, x, y, w, h, madera[2]);
    px(ctx, x, y, w, 1, madera[3]);
    px(ctx, x, y + h - 1, w, 1, madera[0]);
  };
  marco(HUECO.x - 10, HUECO.y - 10, HUECO.w + 20, 10);
  marco(HUECO.x - 10, HUECO.y + HUECO.h, HUECO.w + 20, 12);
  px(ctx, HUECO.x - 10, HUECO.y, 10, HUECO.h, madera[2]);
  px(ctx, HUECO.x + HUECO.w, HUECO.y, 10, HUECO.h, madera[1]);
  px(ctx, HUECO.x + HUECO.w / 2 - 3, HUECO.y, 6, HUECO.h, madera[2]);      // montante central
  px(ctx, HUECO.x + HUECO.w / 2 - 3, HUECO.y, 1, HUECO.h, madera[3]);
  px(ctx, HUECO.x, HUECO.y + 110, HUECO.w, 5, madera[2]);                  // travesaño
  px(ctx, HUECO.x, HUECO.y + 110, HUECO.w, 1, madera[3]);

  // El cristal: dos brillos en diagonal.
  ctx.save();
  ctx.globalAlpha = m.noche ? 0.1 : 0.16;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 40; j++)
      px(ctx, HUECO.x + 40 + i * 150 + j, HUECO.y + 10 + j, 9, 1, m.P.luz[5]);
  ctx.restore();

  // La repisa. El primer plano va oscuro: si compite con la calle, deja de ser un marco.
  const repisa = REPISA;
  px(ctx, 0, repisa, ANCHO, 10, madera[3]);
  px(ctx, 0, repisa, ANCHO, 2, madera[4]);
  px(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, habitacion);
  // La pared pierde luz al alejarse del hueco.
  tramar(ctx, 0, 0, ANCHO, HUECO.y - 10, madera[0], 0.35);
  tramar(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, madera[0], 0.3);
  if (!m.noche) tramar(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, madera[2], 0.25);
}

/** La cortina y lo que vive sobre la repisa. */
export const PARTES: Record<"cortina" | "planta" | "taza", (ctx: Ctx, m: Mano) => void> = {
  // Dos cortinas recogidas con un lazo. Los pliegues se calculan sobre el ancho de cada fila,
  // así que convergen solos en el lazo.
  cortina: (ctx, m) => {
    const R = m.P.hoja;
    const barra = HUECO.y - 15;
    px(ctx, HUECO.x - 22, barra, HUECO.w + 44, 2, m.F.tinta);
    px(ctx, HUECO.x - 22, barra, HUECO.w + 44, 1, m.P.metal[3]);
    for (const x of [HUECO.x - 24, HUECO.x + HUECO.w + 21]) disco(ctx, x, barra + 1, 2, m.P.metal[3]);
    const lazo = HUECO.y + 128, fin = REPISA + 20;
    for (const lado of [-1, 1]) {
      const borde = lado < 0 ? HUECO.x - 12 : HUECO.x + HUECO.w + 12;       // el canto que va pegado a la jamba
      for (let y = barra + 2; y < fin; y++) {
        let ancho: number;
        if (y < lazo) ancho = 44 - 32 * ((y - barra) / (lazo - barra)) ** 1.6;
        else ancho = 12 + 16 * ((y - lazo) / (fin - lazo)) ** 0.7;
        const w = Math.round(ancho);
        for (let i = 0; i < w; i++) {
          const u = i / w, x = lado < 0 ? borde + i : borde - 1 - i;
          const pliegue = Math.sin(u * Math.PI * 4.5 + 0.6);
          // Los dos cantos en el verde más oscuro: el que cae libre y el recto de la jamba.
          const color = i === w - 1 || i === 0 ? R[0] : pliegue < -0.35 ? R[1] : pliegue > 0.55 ? R[4] : R[3];
          px(ctx, x, y, 1, 1, color);
        }
        if (y === fin - 1) px(ctx, lado < 0 ? borde : borde - w, y, w, 1, R[0]);   // el bajo
      }
      // El lazo que la recoge.
      const lx = lado < 0 ? borde - 1 : borde - 17;
      px(ctx, lx, lazo - 2, 18, 5, m.F.tinta);
      px(ctx, lx + 1, lazo - 1, 16, 3, m.P.tela[3]);
      px(ctx, lx + 1, lazo - 1, 16, 1, m.P.tela[4]);
    }
  },
  // Una cinta en su maceta de barro, con las hojas arqueadas y el filo de arriba iluminado.
  planta: (ctx, m) => {
    const { x, y, w, h } = MACETA, cx = x + Math.round(w / 2);
    const barro = m.P.ladrillo;
    for (let j = 3; j < h; j++) {                                               // se estrecha al bajar
      const hueco = Math.round((j / h) * 3);
      px(ctx, x + hueco, y + j, w - 2 * hueco, 1, barro[1]);
      px(ctx, x + hueco, y + j, 2, 1, barro[2]);
      px(ctx, x + w - hueco - 2, y + j, 2, 1, barro[0]);
    }
    px(ctx, x - 1, y, w + 2, 4, barro[2]);                                      // el borde
    px(ctx, x - 1, y, w + 2, 1, barro[3]);
    px(ctx, x - 1, y + 3, w + 2, 1, barro[0]);
    px(ctx, x + 1, y - 1, w - 2, 1, m.P.madera[0]);                             // la tierra
    const hojas = [[-2.7, 30], [-2.35, 38], [-2.0, 27], [-1.75, 34], [-1.45, 24], [-1.2, 36], [-0.9, 29], [-0.55, 33], [-0.3, 22]];
    hojas.forEach(([a, largo], i) => {
      const x0 = cx + (i - 4) * 1.2;
      for (let t = 0; t < largo; t++) {
        const hx = Math.round(x0 + Math.cos(a) * t), hy = Math.round(y - 1 + Math.sin(a) * t + 0.022 * t * t);
        const g = t < largo * 0.6 ? 2 : 1;
        px(ctx, hx, hy, g, g, m.P.hoja[i % 2 ? 1 : 0]);
        if (t % 2 === 0 && t > 3) px(ctx, hx, hy - 1, 1, 1, m.P.hoja[m.noche ? 1 : 2]);   // el filo encendido
      }
    });
  },
  // Una taza de loza con café y el asa hueca.
  taza: (ctx, m) => {
    const { x, y, w, h } = TAZA;
    const loza = m.noche ? [m.P.piedra[0], ...m.P.piedra.slice(0, -1)] : m.P.piedra;   // de noche, un tono más apagada
    px(ctx, x - 1, y - 1, w + 2, h + 1, m.F.tinta);
    px(ctx, x, y, w, h - 1, loza[2]);
    px(ctx, x + 1, y + 1, 2, h - 3, loza[3]);                                    // la luz de la ventana
    px(ctx, x + w - 3, y + 1, 2, h - 3, loza[1]);
    px(ctx, x, y, w, 1, loza[4]);                                                // el borde
    px(ctx, x + 1, y + 1, w - 2, 1, m.P.madera[0]);                              // el café
    px(ctx, x + 2, y + h - 1, w - 4, 1, loza[1]);                                // el culo, más estrecho
    // El asa: un anillo, con el hueco por el que se ve la pared.
    px(ctx, x + w, y + 2, 5, 8, m.F.tinta);
    px(ctx, x + w, y + 3, 4, 6, loza[2]);
    px(ctx, x + w, y + 5, 2, 2, m.noche ? m.P.madera[0] : m.P.madera[1]);
  },
};

/** Dónde está lo de la repisa, para el gato y el vapor. */
const MACETA = { x: 96, y: REPISA - 22, w: 26, h: 22 };
export const TAZA = { x: ANCHO - 120, y: REPISA - 14, w: 18, h: 14 };

/** Dónde va cada objeto en la ventana, en el lienzo virtual. */
export const CAJAS_VENTANA: Record<string, Caja> = Object.fromEntries(
  Object.entries(PIEZAS).map(([id, c]) => {
    const caja = dentro(c.x / ESC, c.y / ESC, c.w / ESC, c.h / ESC), r = RECOLOCAR[id] ?? {};
    return [id, {
      x: r.x !== undefined ? r.x * ESC : caja.x, y: r.y !== undefined ? r.y * ESC : caja.y + (r.dy ?? 0) * ESC,
      w: r.w !== undefined ? r.w * ESC : caja.w, h: r.h !== undefined ? r.h * ESC : caja.h,
    }];
  }),
);

/** El suelo de la calle en la ventana, en píxeles finos: hasta donde llegan los charcos de luz. */
export const SUELO_VENTANA = 280;
