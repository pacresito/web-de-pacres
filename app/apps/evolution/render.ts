// El bucle de pintado de evolution: el mundo entero a escala, la comida del día y cada bicho con su
// genoma en el cuerpo. Sin React ni estado propio.
//
// **Aquí no hay ninguna forma.** Todo el vocabulario —cuerpos, comida, suelo y paleta— vive en
// `designs.ts`, y este módulo solo sabe dónde va cada cosa y en qué orden. La semilla elige el
// diseño, así que este bucle tiene que servir igual para un pez de papel y para un instrumento de
// rectas: en cuanto empiece a saber de aletas, el siguiente diseño no cabrá.

import { MARCA, RADIO_COMIDA, edadDe, luzDe, type Mundo } from "./engine";
import {
  azarFijo, clamp, colorCuerpo, designFor, envejecer, giroDe, mix,
  type Cuerpo, type Design, type Paleta,
} from "./designs";

export { ESCALA, RECORRIDO, designFor, enRecorrido, medidas, posGen, type Cuerpo, type Design, type Paleta } from "./designs";

const TAU = Math.PI * 2;

/**
 * Lo que queda de luz al ras del suelo, y **el mismo para los cuatro mundos**: el material lo pone
 * cada diseño, pero el sol es uno. Se multiplica sobre lo pintado —de blanco a mediodía a este al
 * alba y al ocaso—, que es lo que hace la luz de verdad: apagar en proporción. Un velo opaco
 * encima, en cambio, arrastra los dos temas hacia el mismo gris y borra de qué está hecho el mundo.
 *
 * **Dos, porque el tema oscuro ya vive en el suelo del rango.** Multiplicar conserva las
 * proporciones, no las distancias, y las suyas son de dos dígitos: con el factor del claro, el
 * suelo, la rejilla y el grano caen todos dentro del mismo negro y la mitad final del día se pinta
 * en un rectángulo vacío. Le toca el mismo día con menos recorrido, y lo que lleva el ritmo ahí
 * son los nidos, que aclaran en vez de apagar.
 *
 * Ninguno llega a negro: el mundo se sigue mirando con poca luz — la partida arranca parada en el
 * tick 0, que es el alba, y las crías nacen de noche.
 */
const CREPUSCULO = { light: "#3c4c60", dark: "#aab6c4" };

/**
 * El hoyo del que duerme: un charco de luz bajo el cuerpo, **encima del velo y debajo del bicho**.
 * Es lo que evita que el ocaso se lea como un mundo que se vacía —el campo se apaga y la
 * población entera se queda quieta en la orilla, y sin esto no hay nada que diga que sigue ahí— y
 * a la vez no le toca al cuerpo ni un canal, que los tiene todos ocupados en decir genes y años.
 *
 * Crece con la sombra porque es cuando hace falta: a mediodía se ve a todo el mundo y un charco
 * por bicho sería un adorno más compitiendo con los que sí dicen algo.
 */
const NIDO = 1.6, NIDO_DIA = 0.18, NIDO_NOCHE = 0.46;

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
  d.cuerpo(ctx, { ...b, x: 0, y: 0, hx: 1, hy: 0 }, vigor, envejecer(p, b.edad ?? 0));
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

  // **La luz del día, sobre el suelo y sobre la comida y no sobre los bichos.** Es donde de verdad
  // pasa: lo que el crepúsculo apaga es lo que hay que ver —`vision · luz` es el alcance del ojo,
  // así que un bocado al ocaso ya no lo ve nadie— y el cuerpo, que es lo que se está mirando, no
  // puede perder legibilidad tres veces al día.
  const sombra = 1 - luzDe(m.t, c);
  if (sombra > 0.01) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = mix("#ffffff", CREPUSCULO[p.tema], sombra);
    ctx.fillRect(0, 0, c.ancho, c.alto);
    ctx.globalCompositeOperation = "source-over";
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
  // Las paletas encanecidas se reparten dentro del cuadro: la edad solo toma `vida + 1` valores, así
  // que un mundo de treinta bichos pide once y no treinta. Muere con el cuadro — una caché que le
  // sobreviviera habría que invalidarla al cambiar de tema y de diseño, y no vale lo que cuesta.
  const canas = new Map<number, Paleta>();
  const paletaCon = (edad: number): Paleta => {
    let q = canas.get(edad);
    if (!q) canas.set(edad, (q = envejecer(p, edad)));
    return q;
  };

  const brote = Math.min(1, noche / 0.6);
  ctx.fillStyle = p.hi;
  ctx.globalAlpha = NIDO_DIA + NIDO_NOCHE * sombra;
  for (const b of m.bichos) if (b.dormido) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radio * NIDO, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const b of m.bichos) {
    // La despensa llena va con la masa, así que el vigor de cada uno se mide contra la suya: un
    // grande a medio gas y un pequeño a medio gas se pintan igual de apagados, que es lo justo.
    const lleno = b.reserva / (c.capReserva * b.masa);
    const vigor = clamp(lleno, 0, 1);
    // La edad va en el cuerpo y no en el `Bicho`: se deriva del día, así que guardarla obligaría a
    // repasar la población entera cada amanecer para que no mintiera.
    const edad = edadDe(m, b);
    if (b.recien && m.noche) {
      if (brote > 0.02) d.cuerpo(ctx, { ...b, radio: b.radio * brote, edad }, vigor, paletaCon(edad));
      if (brote < 1) {
        ctx.strokeStyle = p.acc;
        ctx.globalAlpha = 1 - brote;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radio * (0.5 + 2.5 * brote), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    d.cuerpo(ctx, { ...b, edad }, vigor, paletaCon(edad));

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

// ─── La tira de población ─────────────────────────────────────────────────────

/**
 * Los colores de la interfaz, que **no son los del mundo**: la tira es cromo de la página y vive
 * en el papel del tema terminal, mientras que los cuerpos que pinta encima llevan la paleta de su
 * partida. Se leen del CSS una vez por repintado en vez de escribirse aquí, que es lo que hace que
 * el tema oscuro no necesite una segunda tabla.
 */
export type Tinta = { papel: string; linea: string; linea2: string; ink: string; ink3: string; ink4: string; acento: string };

/** Lo que hace falta para pintar la fila de un gen. */
export type Fila = {
  /** Dónde cae en el eje cada bicho vivo, ya en 0…1, y el cuerpo que le corresponde. */
  cuerpos: { t: number; c: Cuerpo }[];
  /** El fundador y la mediana de hoy, en el mismo 0…1. */
  eva: number;
  med: number | null;
  /** El recorrido medido del gen en otros mundos, en el mismo 0…1, o `null` si el eje ya es ese
   *  recorrido — ahí la banda saldría igual en las seis filas y no diría nada. */
  recorrido: [number, number] | null;
  /** Px por unidad de mundo. **Una sola para la fila**: si cada cuerpo se ajustara a su celda,
   *  la fila de la talla enseñaría a todo el mundo del mismo tamaño. */
  escala: number;
  /** Con el enjambre entero o con dos muestras: la fila que se mira y las cinco que no. */
  enjambre: boolean;
};

const CRESTA = 96;   // puntos de la curva de fondo; más son subpíxeles en una fila de 600 px

/**
 * La curva de la población, suavizada. **Es el mismo bulto que el enjambre**, no un segundo dato:
 * está para que la fila siga diciendo algo cuando el censo es de cinco bichos y el enjambre es una
 * anécdota, y para que el hueco de una población partida en dos se vea también en la fila pequeña.
 */
function cresta(ts: number[]): number[] {
  const h = new Float64Array(CRESTA);
  for (const t of ts) h[Math.min(CRESTA - 1, Math.floor(t * CRESTA))]++;
  // Tres pasadas de media móvil de ±2: menos deja los dientes del censo y más se come el valle
  // que separa dos montones, que es justo lo que la curva tiene que enseñar.
  const v = Array.from(h);
  for (let k = 0; k < 3; k++) {
    const w = v.slice();
    for (let i = 0; i < CRESTA; i++) {
      let s = 0, n = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(CRESTA - 1, i + 2); j++) { s += w[j]; n++; }
      v[i] = s / n;
    }
  }
  const max = Math.max(...v);
  return max > 0 ? v.map((x) => x / max) : v;
}

/**
 * Una fila de la tira: la banda del recorrido, la curva de la población, las dos verticales y los
 * bichos encima. **Los bichos son los del mundo** —los pinta el diseño de la partida—, que es lo
 * que hace que el que se mira aquí y el que anda por el lienzo sean el mismo animal.
 */
export function pintarFila(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number,
  d: Design, p: Paleta, t: Tinta, f: Fila,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = t.papel;
  ctx.fillRect(0, 0, W, H);

  const x = (u: number) => u * W;

  // La banda del recorrido medido va sin cifra ni etiqueta a propósito: es contexto —hasta dónde
  // llega este gen en otros mundos—, y numerarla sería una segunda vara sobre el mismo eje.
  if (f.recorrido) {
    ctx.fillStyle = t.linea2;
    ctx.fillRect(x(f.recorrido[0]), 0, x(f.recorrido[1] - f.recorrido[0]), H);
  }

  const ys = cresta(f.cuerpos.map((c) => c.t));
  ctx.beginPath();
  for (let i = 0; i < CRESTA; i++) {
    const px = +((i + 0.5) / CRESTA * W).toFixed(2), py = +(H - 1 - ys[i] * (H - 4)).toFixed(2);
    if (i === 0) ctx.moveTo(0, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = t.ink4;
  ctx.lineWidth = 1;
  ctx.stroke();

  const vertical = (u: number, color: string, ancho: number, alfa = 1) => {
    ctx.globalAlpha = alfa;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x(u)) - ancho / 2, 0, ancho, H);
    ctx.globalAlpha = 1;
  };
  // El fundador va debajo de los cuerpos: es la referencia quieta, y no pasa nada porque un bicho
  // se le ponga delante. La mediana va encima, al final — es lo que se viene a mirar, y en la fila
  // del enjambre el montón se la comía entera.
  vertical(f.eva, t.ink4, 1);

  const muestras = f.enjambre ? f.cuerpos : extremos(f.cuerpos);
  colocar(muestras, W, H, d, f.escala).forEach(({ c, cx, cy, escala }) => {
    // El lienzo ya está en píxeles CSS por el `setTransform` de arriba, así que aquí no se vuelve
    // a multiplicar por `dpr`: hacerlo colocaba a toda la población fuera del borde derecho.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(escala, escala);
    d.cuerpo(ctx, { ...c, x: 0, y: 0, hx: 1, hy: 0 }, 1, envejecer(p, c.edad ?? 0));
    ctx.restore();
  });

  if (f.med !== null) vertical(f.med, t.ink, 2, 0.82);
}

/**
 * Las dos muestras de una fila que no se mira: **el más flojo y el más fuerte de la población de
 * hoy**, no dos valores inventados. Con censo de uno sale uno solo, que es lo correcto — el primer
 * día del mundo hay una bicha y enseñar dos sería mentir sobre el censo.
 */
function extremos(cs: { t: number; c: Cuerpo }[]): { t: number; c: Cuerpo }[] {
  if (cs.length <= 2) return cs;
  const s = [...cs].sort((a, b) => a.t - b.t);
  return [s[0], s[s.length - 1]];
}

/**
 * Dónde se pinta cada cuerpo. Se ordenan por el eje y cada uno busca **el primer nivel libre desde
 * abajo**, así que el montón crece donde se amontonan y el hueco de una población partida en dos
 * se queda vacío hasta arriba. Apilar por densidad calculada daría la misma silueta sin decir qué
 * bicho es cada bulto.
 */
function colocar(cs: { t: number; c: Cuerpo }[], W: number, H: number, d: Design, escala: number) {
  const orden = [...cs].sort((a, b) => a.t - b.t);
  const niveles: number[] = [];
  const puestos = orden.map(({ t, c }) => {
    const ancho = Math.max(...d.extension(c.g, c.radio)) * 2 * escala;
    const cx = Math.min(W - ancho / 2, Math.max(ancho / 2, t * W));
    let n = 0;
    while (n < niveles.length && niveles[n] > cx - ancho / 2) n++;
    niveles[n] = cx + ancho / 2 + 0.8;
    return { c, cx, n, ancho, escala };
  });

  // **El montón se aprieta hasta caber, no se corta por arriba.** Cuántos niveles hacen falta no se
  // sabe hasta haberlos repartido —depende de lo junta que esté la población ese día—, así que el
  // paso vertical se decide después: con sitio de sobra los cuerpos no se tocan, y en el día que
  // treinta caigan en la misma franja se solapan, que es lo que hace un montón de verdad.
  const pisos = Math.max(...puestos.map((p) => p.n)) + 1;
  const alto = Math.max(...puestos.map((p) => p.ancho));
  const paso = pisos <= 1 ? 0 : Math.min(alto * 0.62, (H - 2 - alto) / (pisos - 1));
  return puestos.map((p) => ({ ...p, cy: H - 2 - p.ancho / 2 - p.n * paso }));
}

// ─── Los estratos: la partida entera ──────────────────────────────────────────

/** Lo que hace falta para pintar la franja de un gen a lo largo del tiempo. */
export type Estrato = {
  /** Una columna por trozo de partida, cada una con sus `bins` fracciones que suman 1. */
  columnas: Float64Array[];
  /** La mediana de cada columna, ya en 0…1 de la escala del gen. */
  medianas: number[];
  /** El reparto de hoy, para el perfil de la derecha. */
  hoy: Float64Array;
  /** El fundador de la partida, en el mismo 0…1. */
  eva: number;
};

/** Ancho del perfil de hoy, pegado al borde derecho, y el aire que lo separa del mapa. */
const PERFIL = 22, AIRE = 5;

/**
 * Franjas a cada lado que se promedian antes de pintar. **Sin esto el mapa sale rayado**: con
 * veinte bichos repartidos en ciento veintiocho franjas, cada bicho es una raya negra suelta con
 * hueco a los lados, y lo que se lee es el censo y no la forma. Con ±3 la banda es continua y el
 * valle que separa dos montones —lo único que el panel está para enseñar— sigue estando.
 */
const SUAVE = 3;

/** Un histograma suavizado y normalizado a su propio máximo, en 0…1. */
function alisar(c: Float64Array): Float64Array {
  const n = c.length, v = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let suma = 0, cuenta = 0;
    for (let j = Math.max(0, i - SUAVE); j <= Math.min(n - 1, i + SUAVE); j++) { suma += c[j]; cuenta++; }
    v[i] = suma / cuenta;
  }
  let tope = 0;
  for (const x of v) if (x > tope) tope = x;
  if (tope > 0) for (let i = 0; i < n; i++) v[i] /= tope;
  return v;
}

/**
 * La franja de un gen: el tiempo a lo ancho, la escala del gen a lo alto y **la población como
 * tinta** —cuanto más oscuro, más gente en esa franja ese día—. Encima, la mediana en el tiempo y
 * la horizontal del fundador; a la derecha, el reparto de hoy de pie.
 *
 * **Cada columna se normaliza con su propio máximo** y no con el de la partida: si no, los primeros
 * días —cuando la población es de tres bichos y todos caen en la misma franja— salen negros y el
 * resto de la partida, gris claro. Lo que se lee aquí es la forma del reparto en cada momento, no
 * cuánta gente había: eso lo dice el censo.
 */
export function pintarEstrato(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number, t: Tinta, e: Estrato,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = t.papel;
  ctx.fillRect(0, 0, W, H);

  const mapa = Math.max(20, W - PERFIL - AIRE);
  const T = e.columnas.length;
  if (T === 0) return;

  const tinta = rgb(t.ink);
  const img = ctx.createImageData(Math.round(mapa * dpr), Math.round(H * dpr));
  const px = img.data, iw = img.width, ih = img.height;
  // Se alisa una vez por columna de datos y no una por columna de píxeles: con la partida
  // comprimida a mil columnas, lo segundo es alisar mil veces lo mismo.
  const alisadas = e.columnas.map(alisar);
  for (let x = 0; x < iw; x++) {
    const col = alisadas[Math.min(T - 1, Math.floor((x / iw) * T))];
    for (let y = 0; y < ih; y++) {
      // La escala del gen sube: la franja de arriba es el valor alto, como en cualquier eje.
      const bin = Math.min(col.length - 1, Math.max(0, Math.floor((1 - (y + 0.5) / ih) * col.length)));
      const a = Math.pow(col[bin], 0.85) * 0.95;
      if (a <= 0.01) continue;
      const o = (y * iw + x) * 4;
      px[o] = tinta[0]; px[o + 1] = tinta[1]; px[o + 2] = tinta[2]; px[o + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const y = (u: number) => +(H * (1 - u)).toFixed(2);

  ctx.save();
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = t.ink4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y(e.eva) + 0.5);
  ctx.lineTo(W, y(e.eva) + 0.5);
  ctx.stroke();
  ctx.restore();

  // La mediana lleva un trazo del papel por debajo: sobre el negro de una franja llena, una línea
  // fina de color se pierde entera y es la única curva que hay que poder seguir de un vistazo.
  const linea = () => {
    ctx.beginPath();
    e.medianas.forEach((m, i) => {
      const cx = T === 1 ? mapa / 2 : (i / (T - 1)) * mapa;
      if (i) ctx.lineTo(cx, y(m)); else ctx.moveTo(cx, y(m));
    });
    ctx.stroke();
  };
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.7; ctx.strokeStyle = t.papel; ctx.lineWidth = 3; linea();
  ctx.globalAlpha = 1; ctx.strokeStyle = t.acento; ctx.lineWidth = 1.4; linea();

  const hoy = alisar(e.hoy);
  ctx.fillStyle = t.ink3;
  for (let k = 0; k < H; k++) {
    const bin = Math.min(hoy.length - 1, Math.max(0, Math.floor((1 - (k + 0.5) / H) * hoy.length)));
    ctx.fillRect(W - PERFIL, k, Math.max(0.4, hoy[bin] * PERFIL), 1);
  }
  ctx.strokeStyle = t.linea;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mapa + 0.5, 0);
  ctx.lineTo(mapa + 0.5, H);
  ctx.stroke();
}

/** `#rrggbb` a sus tres canales. Los tokens del tema vienen así del CSS. */
function rgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
