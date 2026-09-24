// Escena «ventana» — la calle vista desde dentro de una casa. Es el encuadre de la referencia.
//
// No es otra calle: es la misma, pintada en un lienzo aparte y pegada dentro del hueco de la
// ventana. Lo que añade son las dos cosas que ningún alzado tiene:
//
// - **Un primer plano.** El marco, la repisa y lo que hay encima tapan a la calle, y eso da
//   profundidad de golpe: hay algo entre el que mira y lo mirado. Es lo que convierte una
//   fachada en un sitio desde el que se mira.
// - **Un dentro y un fuera.** De noche la habitación está más oscura que la calle, así que la
//   calle brilla; de día es al revés y el marco se recorta. El juego trata de volver a mirar
//   un sitio: enmarcarlo con el sitio desde el que se mira no es decoración, es el argumento.
//
// **Y tiene un precio que lo puede tumbar:** la calle se queda en el 87 % y recortada por
// arriba y por abajo. Menos píxeles por objeto justo en el juego que pide distinguir lo que
// cambió, y el borde del hueco se come el cielo alto y el asfalto de delante.
import { fino, px, tramar, type Ctx } from "./paleta";
import { ANCHO, ESC, disco, type Escena, type Mano } from "./pincel";
import { escena as alzado, cieloQuieto, sinCielo } from "./alzado";

const ALTO = 360;
/** El hueco de la ventana, en píxeles finos, y la transformación que mete la calle dentro. */
export const HUECO = { x: 40, y: 20, w: 560, h: 252 };
const ESCALA = HUECO.w / ANCHO;          // 0,875
const RECORTE_Y = 28;                    // desde qué fila de la calle se ve
/** El canto de arriba de la repisa: donde se apoya lo que vive en ella. */
export const REPISA = HUECO.y + HUECO.h + 14;

/** Un punto de la calle (píxeles finos del alzado) a píxeles finos de la ventana. */
export const aVentana = (x: number, y: number) => ({ x: HUECO.x + x * ESCALA, y: HUECO.y + (y - RECORTE_Y) * ESCALA });

/** Lo que mide como mínimo una caja en el lienzo grande. Sale de la regla del plan —el detalle
 *  más pequeño no baja de 20 px en escritorio— deshecha: a 1100 px de ancho la escala es 0,69,
 *  así que 30 unidades del lienzo son esos 20 px. Al enmarcar, el buzón se quedaba en 19,8 y
 *  pasaba a ser un objeto que el jugador no puede señalar sin apuntar con lupa. */
const MINIMO = 30;

/** Lo que en la ventana no va donde en el alzado, en píxeles finos. El coche sube a la mitad
 *  de su carril —a su altura del alzado, el marco le cortaba las ruedas— y el contenedor sale de
 *  mitad de la calzada a la acera, entre la papelera y la cortina. */
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

// La calle se pinta entera en un lienzo aparte y se pega escalada y sin suavizado. Pintarla
// directamente con las coordenadas transformadas no vale: los pinceles trabajan en píxeles
// enteros, y a escala 0,8 cada detalle caería a ocho décimas de píxel.
function pegar(ctx: Ctx, clave: string, pintar: (aux: Ctx) => void) {
  const aux = fino(ESC, clave);
  pintar(aux.ctx);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(aux.lienzo, 0, RECORTE_Y, ANCHO, HUECO.h / ESCALA, HUECO.x, HUECO.y, HUECO.w, HUECO.h);
}

function fondo(ctx: Ctx, m: Mano, hora: number) {
  px(ctx, 0, 0, ANCHO, ALTO, m.noche ? m.P.madera[0] : m.P.madera[1]);
  pegar(ctx, "ventana", (aux) => alzado.fondo(aux, m, hora));
}

/** La escena animada en capas: el cielo sin nubes, y la calle sobre transparente para que lo
 *  que cruza el cielo pase por detrás de los tejados. */
export const cieloVentana = (ctx: Ctx, m: Mano, hora: number) => pegar(ctx, "ventana-cielo", (aux) => cieloQuieto(aux, m, hora));
export const calleVentana = (ctx: Ctx, m: Mano) => pegar(ctx, "ventana", (aux) => sinCielo(aux, m));

/** El marco, la repisa y lo que hay en ella. Va después de los objetos: por eso tapa. */
function primerPlano(ctx: Ctx, m: Mano) {
  marco(ctx, m);
  for (const parte of Object.values(PARTES)) parte(ctx, m);
}

/** Lo fijo del primer plano: pared, marco, cristal y repisa. Lo que hay sobre la repisa va
 *  aparte, en `PARTES`, para que el gato pueda pasar por detrás de la maceta y de la taza. */
export function marco(ctx: Ctx, m: Mano) {
  const madera = m.P.madera;
  const habitacion = m.noche ? madera[0] : madera[1];

  // Fuera del hueco no hay calle: pared.
  px(ctx, 0, 0, ANCHO, HUECO.y, habitacion);
  px(ctx, 0, HUECO.y + HUECO.h, ANCHO, ALTO - HUECO.y - HUECO.h, habitacion);
  px(ctx, 0, 0, HUECO.x, ALTO, habitacion);
  px(ctx, HUECO.x + HUECO.w, 0, ANCHO - HUECO.x - HUECO.w, ALTO, habitacion);

  // El marco: jamba, dintel y las dos crucetas. La luz de fuera le da por el canto de dentro.
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

  // El cristal: dos brillos en diagonal. Es lo único que dice que hay vidrio.
  ctx.save();
  ctx.globalAlpha = m.noche ? 0.1 : 0.16;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 40; j++)
      px(ctx, HUECO.x + 40 + i * 150 + j, HUECO.y + 10 + j, 9, 1, m.P.luz[5]);
  ctx.restore();

  // La repisa y lo que vive en ella. Todo en silueta: es lo que está más cerca y menos
  // iluminado, y si compite con la calle deja de ser un marco.
  const repisa = REPISA;
  px(ctx, 0, repisa, ANCHO, 10, madera[3]);
  px(ctx, 0, repisa, ANCHO, 2, madera[4]);
  px(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, habitacion);
  // La pared de dentro pierde luz al alejarse del hueco: sin esto es un plano liso de color.
  tramar(ctx, 0, 0, ANCHO, HUECO.y - 10, madera[0], 0.35);
  tramar(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, madera[0], 0.3);
  if (!m.noche) tramar(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, madera[2], 0.25);
}

/** Lo que vive sobre la repisa y la cortina, en el orden en que se tapan. */
export const PARTES: Record<"cortina" | "planta" | "taza", (ctx: Ctx, m: Mano) => void> = {
  // Dos cortinas de lino colgadas de una barra y recogidas con un lazo, una a cada lado:
  // cierran el encuadre y dicen «casa». Los pliegues se calculan por fila sobre el ancho de
  // esa fila, así que convergen en el lazo solos, que es lo que hace que parezca tela.
  cortina: (ctx, m) => {
    const R = m.P.hoja;
    const barra = HUECO.y - 15;
    px(ctx, HUECO.x - 22, barra, HUECO.w + 44, 2, m.F.tinta);
    px(ctx, HUECO.x - 22, barra, HUECO.w + 44, 1, m.P.metal[3]);
    for (const x of [HUECO.x - 24, HUECO.x + HUECO.w + 21]) disco(ctx, x, barra + 1, 2, m.P.metal[3]);
    // Recogidas a media altura y cayendo hasta un poco por debajo de la repisa.
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
          const color = i === w - 1 ? R[0] : pliegue < -0.35 ? R[1] : pliegue > 0.55 ? R[4] : R[3];
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
  // Una planta a la izquierda, contra la luz.
  planta: (ctx, m) => {
    const repisa = REPISA, px0 = MACETA.x;
    px(ctx, px0, repisa - 22, 26, 22, m.P.ladrillo[1]);
    px(ctx, px0, repisa - 22, 26, 2, m.P.ladrillo[2]);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.34, largo = 20 + (i % 3) * 9;
      for (let t = 0; t < largo; t++)
        px(ctx, Math.round(px0 + 13 + Math.cos(a) * t * 0.9), Math.round(repisa - 22 + Math.sin(a) * t), 2, 2,
          m.P.hoja[i % 2 ? 1 : 0]);
    }
  },
  // Una taza a la derecha.
  taza: (ctx, m) => {
    px(ctx, TAZA.x, TAZA.y, TAZA.w, TAZA.h, m.P.metal[1]);
    px(ctx, TAZA.x + TAZA.w - 2, REPISA - 11, 6, 6, m.P.metal[1]);
  },
};

/** Dónde está lo de la repisa, para quien tenga que pasar por detrás o salir de ello. */
export const MACETA = { x: 96, y: REPISA - 22, w: 26, h: 22 };
export const TAZA = { x: ANCHO - 120, y: REPISA - 14, w: 18, h: 14 };

export const escena: Escena = {
  id: "ventana",
  nombre: "desde la ventana",
  nota: "La misma calle, vista desde dentro. Gana primer plano y un dentro/fuera; pierde un 13 % de tamaño y los bordes del encuadre.",
  suelo: 280,
  recorte: HUECO,
  cajas: Object.fromEntries(
    Object.entries(alzado.cajas).map(([id, c]) => {
      const caja = dentro(c.x / ESC, c.y / ESC, c.w / ESC, c.h / ESC), r = RECOLOCAR[id] ?? {};
      return [id, {
        x: r.x !== undefined ? r.x * ESC : caja.x, y: r.y !== undefined ? r.y * ESC : caja.y + (r.dy ?? 0) * ESC,
        w: r.w !== undefined ? r.w * ESC : caja.w, h: r.h !== undefined ? r.h * ESC : caja.h,
      }];
    }),
  ),
  fondo,
  primerPlano,
};
