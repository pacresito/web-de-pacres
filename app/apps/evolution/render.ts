// El bucle de pintado de evolution: el mundo entero a escala, la comida del día y cada bicho con su
// genoma en el cuerpo. Sin React ni estado propio.
//
// **Aquí no hay ninguna forma.** Todo el vocabulario —cuerpos, comida, suelo y paleta— vive en
// `designs.ts`, y este módulo solo sabe dónde va cada cosa y en qué orden. La semilla elige el
// diseño, así que este bucle tiene que servir igual para un pez de papel y para un instrumento de
// rectas: en cuanto empiece a saber de aletas, el siguiente diseño no cabrá.

import { MARCA, RADIO_COMIDA, edadDe, type Mundo } from "./engine";
import {
  azarFijo, clamp, colorCuerpo, designFor, giroDe,
  type Cuerpo, type Design, type Paleta,
} from "./designs";

export { VENTANA, designFor, enVentana, medidas, posGen, type Cuerpo, type Design, type Paleta } from "./designs";

const TAU = Math.PI * 2;

/**
 * El mundo tiene tamaño fijo y el lienzo no, así que la vista escala y centra en vez de estirar: la
 * semilla promete el mismo mundo en cualquier pantalla, y un mundo que midiera lo que mide la
 * ventana daría partidas distintas en el móvil y en el portátil.
 */
export type Vista = { escala: number; ox: number; oy: number };

export function vistaDe(W: number, H: number, ancho: number, alto: number): Vista {
  const escala = Math.min(W / ancho, H / alto);
  return { escala, ox: (W - ancho * escala) / 2, oy: (H - alto * escala) / 2 };
}

/** La paleta de una partida: la del diseño que le toque a su semilla. */
export const paletaDe = (semilla: string, tema: "light" | "dark"): Paleta =>
  designFor(semilla).paleta(tema);

/**
 * El suelo y la casa, cocidos una sola vez en un lienzo aparte y pegados de un golpe.
 *
 * Son más de mil quinientas figuras entre el grano y el moteado: pintarlas sesenta veces por
 * segundo cuesta más que todos los bichos juntos, y **el grano regenerado por cuadro parpadearía
 * como nieve de televisión**.
 */
let cacheFondo: { clave: string; lienzo: HTMLCanvasElement } | null = null;

function fondoDe(d: Design, p: Paleta, ancho: number, alto: number, casa: number, escala: number, dpr: number): HTMLCanvasElement {
  const w = Math.round(ancho * escala * dpr), h = Math.round(alto * escala * dpr);
  const clave = `${d.id}|${p.tema}|${w}|${h}`;
  if (cacheFondo && cacheFondo.clave === clave) return cacheFondo.lienzo;

  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!;
  const e = escala * dpr;
  c.setTransform(e, 0, 0, e, 0, 0);
  d.fondo(c, ancho, alto, casa, escala, p);

  cacheFondo = { clave, lienzo: cv };
  return cv;
}

// ─── Muestras de leyenda ──────────────────────────────────────────────────────
//
// La leyenda no dibuja bichos: los pide. Todo lo que enseña sale del diseño de la partida, así que
// el día que cambie la forma del bicho, la leyenda cambia con él. Una silueta escrita aparte miente
// en silencio en cuanto alguien toque el pintado del mundo.

/**
 * Un bicho suelto, centrado y a la escala que se le diga. `escala` la fija quien pinta la fila
 * entera y es **la misma para las tres muestras**: si cada celda se ajustara a lo suyo, la fila de
 * la talla enseñaría tres bichos del mismo tamaño, que es justo lo contrario de lo que dice.
 */
export function pintarMuestra(
  ctx: CanvasRenderingContext2D, d: Design, W: number, H: number, dpr: number, p: Paleta,
  b: Cuerpo, escala: number, vigor = 1,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  const e = escala * dpr;
  ctx.setTransform(e, 0, 0, e, (W / 2) * dpr, (H / 2) * dpr);
  d.cuerpo(ctx, { ...b, x: 0, y: 0, hx: 1, hy: 0 }, vigor, p);
}

/**
 * El mundo entero, en un lienzo de `W`×`H` px CSS con `dpr` píxeles de dispositivo por cada uno.
 * El suelo y la casa vienen cocidos; encima solo lo que decide la partida.
 */
export function pintar(
  ctx: CanvasRenderingContext2D, m: Mundo, d: Design, p: Paleta, v: Vista,
  W: number, H: number, dpr: number, noche = 1,
) {
  const c = m.cfg;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(fondoDe(d, p, c.ancho, c.alto, c.casa, v.escala, dpr), v.ox, v.oy, c.ancho * v.escala, c.alto * v.escala);

  const e = v.escala * dpr;
  ctx.setTransform(e, 0, 0, e, v.ox * dpr, v.oy * dpr);

  for (const f of m.comida) {
    ctx.save();
    ctx.translate(f.x, f.y);
    d.comida(ctx, p, giroDe(f.x, f.y));
    ctx.restore();
  }

  // Las muertes, debajo de los vivos. Comido es un anillo que se abre —el zarpazo— y el hambre es
  // el cuerpo apagándose y encogiendo. El que se quedó fuera al anochecer no está aquí: no muere,
  // así que se sigue pintando vivo donde le pilló la noche.
  for (const z of m.marcas) {
    const k = (m.t - z.t) / MARCA;
    if (k < 0 || k > 1) continue;
    if (z.causa === "vejez") {
      // La vejez mata al cerrar el día, con el reloj del mundo parado: su marca no puede contar
      // ticks como las otras dos, así que se apaga con la noche — a la vez que crecen las crías.
      ctx.globalAlpha = (1 - noche) * 0.7;
      ctx.fillStyle = colorCuerpo(p, z.edad, 0);
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (z.causa === "comido") {
      ctx.strokeStyle = p.hot;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + 3 * k), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.fillStyle = colorCuerpo(p, z.edad, 0);
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 - 0.65 * k), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Una cría no aparece hecha: durante la primera parte de la noche crece desde nada hasta su
  // tamaño, con el anillo del parto abriéndose a su alrededor. Es lo único que se anima aquí, y se
  // anima porque nacer es justo lo que no se veía.
  const brote = Math.min(1, noche / 0.6);
  for (const b of m.bichos) {
    // La despensa llena va con la masa, así que el vigor de cada uno se mide contra la suya: un
    // grande a medio gas y un pequeño a medio gas se pintan igual de apagados, que es lo justo.
    const lleno = b.reserva / (c.capReserva * b.masa);
    const vigor = clamp(lleno, 0, 1);
    // La edad va en el cuerpo y no en el `Bicho`: se deriva del día, así que guardarla obligaría a
    // repasar la población entera cada amanecer para que no mintiera.
    const edad = edadDe(m, b);
    if (b.recien && m.noche) {
      if (brote > 0.02) d.cuerpo(ctx, { ...b, radio: b.radio * brote, edad }, vigor, p);
      if (brote < 1) {
        ctx.strokeStyle = p.acc;
        ctx.globalAlpha = 1 - brote;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radio * (0.5 + 2.5 * brote), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    d.cuerpo(ctx, { ...b, edad }, vigor, p);

    // **La despensa no tiene techo, y sin esto no se veía**: quien lleva una semana ahorrando se
    // pintaba igual que quien acaba de comer, y su camada de veintidós parecía salida de la nada.
    // Lo que pasa del lleno se cuenta en un aro alrededor, **por duplicaciones**: el récord medido
    // son cincuenta y nueve despensas y el aro mide once píxeles, así que en lineal la primera
    // vuelta se comería las otras cincuenta y ocho. Topado en cuatro, que de ahí para arriba ya
    // solo dice "riquísimo".
    if (lleno > 1) {
      const vueltas = Math.min(4, 1 + Math.log2(lleno));
      const parcial = vueltas % 1;
      ctx.strokeStyle = p.acc;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 0.9 + 0.6 * Math.floor(vueltas - 1);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radio + 2.4, -Math.PI / 2, -Math.PI / 2 + TAU * (parcial || 1));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // De noche, lo único que se escribe encima del mundo: cuántas crías ha puesto cada madre, al lado
  // del montón que acaba de aparecer a su alrededor.
  if (m.noche) {
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.bg;
    for (const b of m.bichos) {
      if (b.hijos <= 0) continue;
      const t = `+${b.hijos}`, x = b.x + b.radio + 2, y = b.y - b.radio - 2;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = p.tinta;
      ctx.fillText(t, x, y);
    }
  }
}

/** Sin uso fuera de aquí, pero el mundo lo necesita para saber cuánto ocupa un bocado. */
export { RADIO_COMIDA, azarFijo };
