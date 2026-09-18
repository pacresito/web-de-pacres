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
// **Y tiene un precio que lo puede tumbar:** la calle se queda en el 80 % y recortada por
// arriba y por abajo. Menos píxeles por objeto justo en el juego que pide distinguir lo que
// cambió, y el borde del hueco se come el cielo alto y el asfalto de delante.
import { fino, px, tramar, type Ctx } from "./paleta";
import { ANCHO, ESC, disco, resplandor, type Escena, type Mano } from "./pincel";
import { escena as alzado } from "./alzado";

const ALTO = 360;
/** El hueco de la ventana, en píxeles finos, y la transformación que mete la calle dentro. */
const HUECO = { x: 40, y: 20, w: 560, h: 252 };
const ESCALA = HUECO.w / ANCHO;          // 0,8
const RECORTE_Y = 28;                    // desde qué fila de la calle se ve

/** Lo que mide como mínimo una caja en el lienzo grande. Sale de la regla del plan —el detalle
 *  más pequeño no baja de 20 px en escritorio— deshecha: a 1100 px de ancho la escala es 0,69,
 *  así que 30 unidades del lienzo son esos 20 px. Al enmarcar, el buzón se quedaba en 19,8 y
 *  pasaba a ser un objeto que el jugador no puede señalar sin apuntar con lupa. */
const MINIMO = 30;

const dentro = (x: number, y: number, w: number, h: number) => {
  const cx = (HUECO.x + (x + w / 2) * ESCALA) * ESC;
  const cy = (HUECO.y + (y + h / 2 - RECORTE_Y) * ESCALA) * ESC;
  const ancho = Math.max(MINIMO, w * ESCALA * ESC), alto = Math.max(MINIMO, h * ESCALA * ESC);
  return { x: cx - ancho / 2, y: cy - alto / 2, w: ancho, h: alto };
};

function fondo(ctx: Ctx, m: Mano, hora: number) {
  // La calle se pinta entera en un lienzo aparte y se pega escalada y sin suavizado. Pintarla
  // directamente con las coordenadas transformadas no vale: los pinceles trabajan en píxeles
  // enteros, y a escala 0,8 cada detalle caería a ocho décimas de píxel.
  const aux = fino(ESC, "ventana");
  alzado.fondo(aux.ctx, m, hora);

  const habitacion = m.noche ? m.P.madera[0] : m.P.madera[1];
  px(ctx, 0, 0, ANCHO, ALTO, habitacion);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(aux.lienzo, 0, RECORTE_Y, ANCHO, HUECO.h / ESCALA, HUECO.x, HUECO.y, HUECO.w, HUECO.h);
}

/** El marco, la repisa y lo que hay en ella. Va después de los objetos: por eso tapa. */
function primerPlano(ctx: Ctx, m: Mano) {
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
  // Una cortina recogida a un lado: cierra el encuadre por arriba y dice «casa» sin ocupar.
  for (let j = 0; j < 96; j++) {
    const ancho = 26 + Math.round(14 * Math.sin((j / 96) * Math.PI));
    px(ctx, HUECO.x - 6, HUECO.y - 6 + j, ancho, 1, m.P.tela[j % 7 < 3 ? 1 : 2]);
  }

  // El cristal: dos brillos en diagonal. Es lo único que dice que hay vidrio.
  ctx.save();
  ctx.globalAlpha = m.noche ? 0.1 : 0.16;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 40; j++)
      px(ctx, HUECO.x + 40 + i * 150 + j, HUECO.y + 10 + j, 9, 1, m.P.luz[5]);
  ctx.restore();

  // La repisa y lo que vive en ella. Todo en silueta: es lo que está más cerca y menos
  // iluminado, y si compite con la calle deja de ser un marco.
  const repisa = HUECO.y + HUECO.h + 14;
  px(ctx, 0, repisa, ANCHO, 10, madera[3]);
  px(ctx, 0, repisa, ANCHO, 2, madera[4]);
  px(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, habitacion);
  // La pared de dentro pierde luz al alejarse del hueco: sin esto es un plano liso de color.
  tramar(ctx, 0, 0, ANCHO, HUECO.y - 10, madera[0], 0.35);
  tramar(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, madera[0], 0.3);

  // Una planta a la izquierda, contra la luz.
  const px0 = 96;
  px(ctx, px0, repisa - 22, 26, 22, m.P.ladrillo[1]);
  px(ctx, px0, repisa - 22, 26, 2, m.P.ladrillo[2]);
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.34, largo = 20 + (i % 3) * 9;
    for (let t = 0; t < largo; t++)
      px(ctx, Math.round(px0 + 13 + Math.cos(a) * t * 0.9), Math.round(repisa - 22 + Math.sin(a) * t), 2, 2,
        m.P.hoja[i % 2 ? 1 : 0]);
  }
  // Una taza a la derecha, y de noche el flexo encendido: la luz de dentro que justifica que
  // el resto de la habitación esté en sombra.
  px(ctx, ANCHO - 120, repisa - 14, 18, 14, m.P.metal[1]);
  px(ctx, ANCHO - 104, repisa - 11, 6, 6, m.P.metal[1]);
  if (m.noche) {
    px(ctx, ANCHO - 62, repisa - 46, 4, 46, m.P.metal[0]);
    px(ctx, ANCHO - 74, repisa - 54, 28, 10, m.P.metal[0]);
    disco(ctx, ANCHO - 60, repisa - 44, 3, m.P.luz[5]);
    resplandor(ctx, ANCHO - 60, repisa - 40, 54, m.P.luz[5], 0.4);
  } else {
    tramar(ctx, 0, repisa + 10, ANCHO, ALTO - repisa - 10, madera[2], 0.25);
  }
}

export const escena: Escena = {
  id: "ventana",
  nombre: "desde la ventana",
  nota: "La misma calle, vista desde dentro. Gana primer plano y un dentro/fuera; pierde un 20 % de tamaño y los bordes del encuadre.",
  suelo: 280,
  recorte: HUECO,
  cajas: Object.fromEntries(
    Object.entries(alzado.cajas).map(([id, c]) => [id, dentro(c.x / ESC, c.y / ESC, c.w / ESC, c.h / ESC)]),
  ),
  fondo,
  primerPlano,
};
