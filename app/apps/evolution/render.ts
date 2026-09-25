// El pintado de evolution: el mundo a escala, la comida y cada bicho con su genoma en el cuerpo.
// Las formas viven en `designs.ts`; aquí solo dónde va cada cosa y en qué orden.

import { DISOLUCION, MARCA, RADIO_COMIDA, edadDe, luzDe, type Bicho, type Config, type Mundo } from "./engine";
import {
  RECORRIDO, canales, clamp, designFor, enrojecer, envejecer, giroDe, mix,
  type Cuerpo, type Design, type Paleta,
} from "./designs";
import { MURO, conMar, huecoDe, lazos, muros, trazarCampo, trazarMundo, type Geometria } from "./formas";

const TAU = Math.PI * 2;

/**
 * El color de la luz mínima, que se multiplica sobre suelo y comida. En oscuro, más claro: el
 * tema ya vive en el suelo del rango y multiplicar lo hundiría todo en el mismo negro.
 */
const CREPUSCULO = { light: "#3c4c60", dark: "#aab6c4" };

/** El charco de luz bajo el que duerme, que crece con la sombra. */
const NIDO = 1.6, NIDO_DIA = 0.18, NIDO_NOCHE = 0.46;

/** Tramos de la dentellada en fracciones del bocado; `ciclo`, en ticks, fija la cadencia del forcejeo. */
const BOCA = { entrada: 0.18, trago: 0.72, ciclo: 12 };

/** El mundo mide lo mismo en cualquier pantalla: la vista escala y centra, nunca estira. */
export type Vista = { escala: number; ox: number; oy: number };

/** `arriba` pega el mundo al borde superior; `tope` es lo que tapan los botones flotantes. */
export function vistaDe(W: number, H: number, ancho: number, alto: number, arriba = false, tope = 0): Vista {
  const h = H - tope;
  const escala = Math.min(W / ancho, h / alto);
  return { escala, ox: (W - ancho * escala) / 2, oy: tope + (arriba ? 0 : (h - alto * escala) / 2) };
}

/** Diámetro en px por debajo del cual un cuerpo pierde sus miembros. */
const CUERPO_LEGIBLE = 14;

/** Escala a la que la cámara sigue a un bicho: la que deja legible al más pequeño (p01 de talla). */
export const ESCALA_SEGUIR = CUERPO_LEGIBLE / (2 * RECORRIDO.talla[0]);

/** La vista siguiendo a un bicho, frenada en los bordes. Si el mundo entero ya cabe, no acerca. */
export function vistaSobre(
  W: number, H: number, ancho: number, alto: number, x: number, y: number, arriba = false, tope = 0,
): Vista {
  if (Math.min(W / ancho, (H - tope) / alto) >= ESCALA_SEGUIR) return vistaDe(W, H, ancho, alto, arriba, tope);
  const e = ESCALA_SEGUIR;
  // En el eje en que el mundo cabe entero no hay nada que seguir. `ini`: donde empieza lo visible.
  const eje = (L: number, lado: number, foco: number, pegado: boolean, ini: number) => {
    const libre = L - ini;
    return lado * e <= libre
      ? ini + (pegado ? 0 : (libre - lado * e) / 2)
      : clamp(ini + libre / 2 - foco * e, L - lado * e, ini);
  };
  return { escala: e, ox: eje(W, ancho, x, false, 0), oy: eje(H, alto, y, arriba, tope) };
}

/** La paleta de una partida. */
export const paletaDe = (semilla: string, tema: "light" | "dark"): Paleta =>
  designFor(semilla).paleta(tema);

/** Suelo y casa, cocidos una vez en un lienzo aparte: son más de mil figuras. */
let cacheFondo: { clave: string; lienzo: HTMLCanvasElement } | null = null;

/** El mar: fuera del mundo en las formas con mar, que no es ni campo ni casa. */
const fueraDe = (p: Paleta) => (p.tema === "dark" ? mix(p.bg, "#000000", 0.55) : mix(p.bg, p.homeInk, 0.55));

function fondoDe(
  d: Design, p: Paleta, g: Geometria, escala: number, dpr: number, mx: number, my: number,
): HTMLCanvasElement {
  const { ancho, alto, casa } = g;
  const w = Math.round((ancho + 2 * mx) * escala * dpr), h = Math.round((alto + 2 * my) * escala * dpr);
  const clave = `${d.id}|${p.tema}|${w}|${h}|${mx}|${my}|${g.forma}|${ancho}|${alto}`;
  if (cacheFondo && cacheFondo.clave === clave) return cacheFondo.lienzo;

  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!;
  const e = escala * dpr;
  c.setTransform(e, 0, 0, e, mx * e, my * e);
  const f = 1 / escala, R = ancho / 2;
  // Todo lo que no es campo es casa; el campo, recortado a su forma, va encima.
  d.casa(c, -mx, -my, ancho + mx, alto + my, escala, p);
  if (conMar(g)) {
    c.save();
    c.beginPath();
    c.rect(-mx, -my, ancho + 2 * mx, alto + 2 * my);
    trazarMundo(g, c);
    c.clip("evenodd");
    c.fillStyle = fueraDe(p);
    c.fillRect(-mx, -my, ancho + 2 * mx, alto + 2 * my);
    c.restore();
  }
  c.save();
  c.beginPath();
  trazarCampo(g, c);
  c.clip("evenodd");
  d.suelo(c, ancho, alto, casa, escala, p);
  c.restore();
  d.borde(c, lazos(g, 2.2), casa, escala, p);
  c.strokeStyle = p.homeInk;
  if (conMar(g)) {
    c.lineWidth = 2.5 * f;
    c.beginPath(); trazarMundo(g, c); c.stroke();
  }
  if (g.forma === "donut") {
    c.lineWidth = 1.5 * f;
    c.beginPath(); c.arc(R, R, huecoDe(g), 0, TAU); c.stroke();
  }
  c.lineWidth = MURO.grosor;
  c.lineCap = "round";
  for (const [ax, ay, bx, by] of muros(g)) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
  c.lineCap = "butt";

  cacheFondo = { clave, lienzo: cv };
  return cv;
}

// ─── Muestras de leyenda ──────────────────────────────────────────────────────


/** Un bicho suelto y centrado. `escala` es la misma para toda la fila, o la talla no se vería. */
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

/** La marca del bicho que se mira, en el mundo y en la tira: cuatro esquinas rectas. */
function esquinas(
  ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, color: string, grosor: number,
) {
  const brazo = rad * 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const px = x + sx * rad, py = y + sy * rad;
    ctx.beginPath();
    ctx.moveTo(px - sx * brazo, py); ctx.lineTo(px, py); ctx.lineTo(px, py - sy * brazo);
    ctx.stroke();
  }
}

/** El aspa del muerto de hambre, recta aunque el cuerpo gire. */
function aspa(ctx: CanvasRenderingContext2D, x: number, y: number, radio: number, color: string) {
  const a = radio * 0.78;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.35, radio * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - a, y - a); ctx.lineTo(x + a, y + a);
  ctx.moveTo(x + a, y - a); ctx.lineTo(x - a, y + a);
  ctx.stroke();
  ctx.restore();
}

/** Lo que le queda por verse a un cuerpo, de 1 recién caído a 0 disuelto. */
export const opacidadResto = (restan: number): number => Math.min(1, restan / DISOLUCION);

/** El rojo de la presa: satura donde empieza a hundirse, no al final. */
const enBoca = (c: Config, dep: Bicho): number => (c.ticksPresa > 0 ? 1 - dep.restan / c.ticksPresa : 1);
export const rojoDe = (c: Config, dep: Bicho): number => Math.min(1, enBoca(c, dep) / BOCA.trago);

/** El mundo entero en un lienzo de `W`×`H` px CSS. */
export function pintar(
  ctx: CanvasRenderingContext2D, m: Mundo, d: Design, p: Paleta, v: Vista,
  W: number, H: number, dpr: number, noche = 1, sel: Bicho | null = null,
) {
  const c = m.cfg;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  // Lo que el lienzo enseña más allá del mundo es casa.
  const margen = (lienzo: number, lado: number) => {
    const m = lienzo / v.escala - lado;   // el redondeo del lienzo a píxeles deja décimas: eso no es sobrante
    return m >= 1 ? Math.ceil(m) : 0;
  };
  const mx = margen(W, c.ancho), my = margen(H, c.alto);
  ctx.drawImage(
    fondoDe(d, p, c, v.escala, dpr, mx, my),
    v.ox - mx * v.escala, v.oy - my * v.escala, (c.ancho + 2 * mx) * v.escala, (c.alto + 2 * my) * v.escala,
  );

  const e = v.escala * dpr;
  ctx.setTransform(e, 0, 0, e, v.ox * dpr, v.oy * dpr);

  for (const f of m.comida) {
    ctx.save();
    ctx.translate(f.x, f.y);
    d.comida(ctx, p, giroDe(f.x, f.y));
    ctx.restore();
  }

  // La luz, sobre suelo y comida y no sobre los bichos, que son lo que se mira.
  const sombra = 1 - luzDe(m.t, c);
  if (sombra > 0.01) {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = mix("#ffffff", CREPUSCULO[p.tema], sombra);
    ctx.fillRect(-mx, -my, c.ancho + 2 * mx, c.alto + 2 * my);   // la casa de fuera también anochece
    ctx.globalCompositeOperation = "source-over";
  }

  // El zarpazo, debajo de los vivos.
  for (const z of m.marcas) {
    const k = (m.t - z.t) / MARCA;
    if (k < 0 || k > 1) continue;
    ctx.strokeStyle = p.hot;
    ctx.globalAlpha = 1 - k;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (1 + 3 * k), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Las paletas encanecidas, una por edad y por cuadro.
  const canas = new Map<number, Paleta>();
  const paletaCon = (edad: number): Paleta => {
    let q = canas.get(edad);
    if (!q) canas.set(edad, (q = envejecer(p, edad)));
    return q;
  };

  const brote = Math.min(1, noche / 0.6);

  // Los muertos, donde cayeron y debajo de los vivos, perdiendo opacidad.
  for (const z of m.restos) {
    const b = z.b;
    ctx.globalAlpha = opacidadResto(z.restan);
    const edad = edadDe(m, b);
    d.cuerpo(ctx, { ...b, edad }, clamp(b.reserva / (c.capReserva * b.masa), 0, 1), paletaCon(edad));
    if (b.muerte === "hambre") aspa(ctx, b.x, b.y, b.radio, p.tinta);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = p.hi;
  ctx.globalAlpha = NIDO_DIA + NIDO_NOCHE * sombra;
  for (const b of m.bichos) if (b.dormido) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radio * NIDO, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Lo que alcanza a ver el marcado —con el bocado de vara— y sus esquinas, debajo de los cuerpos.
  if (sel) {
    ctx.save();
    const alcance = sel.vivo ? sel.g.vision * (1 - sombra) * RADIO_COMIDA : 0;
    if (alcance > 1) {
      ctx.strokeStyle = p.acc2;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 0.55;
      ctx.setLineDash([2.5, 2.5]);
      ctx.beginPath(); ctx.arc(sel.x, sel.y, alcance, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    const [ex, ey] = d.extension(sel.g, sel.radio);
    esquinas(ctx, sel.x, sel.y, Math.max(ex, ey) + 2, p.tinta, 0.65);
    ctx.restore();
  }

  // Quién tiene a quién en la boca, indexado por la presa.
  const bocas = new Map<number, Bicho>();
  for (const b of m.bichos) if (b.muerde) bocas.set(b.muerde, b);

  /** En qué punto va la dentellada y el vaivén común a los dos cuerpos. */
  const mordisco = (dep: Bicho) => {
    const k = enBoca(c, dep);
    return { k, sacudon: Math.sin((TAU * k * c.ticksPresa) / BOCA.ciclo) * (1 - k) };
  };

  for (const b of m.bichos) {
    if (b.preso) continue;   // la presa se pinta al final, en su boca
    const lleno = b.reserva / (c.capReserva * b.masa);
    const vigor = clamp(lleno, 0, 1);
    const edad = edadDe(m, b);
    // La cría crece durante la noche, con el anillo del parto.
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
    if (b.muerde) {
      // El tirón del que muerde, en su propio rumbo.
      const { sacudon } = mordisco(b);
      const tiron = sacudon * b.radio * 0.12;
      d.cuerpo(ctx, { ...b, x: b.x + b.hx * tiron, y: b.y + b.hy * tiron, edad }, vigor, paletaCon(edad));
    } else d.cuerpo(ctx, { ...b, edad }, vigor, paletaCon(edad));

    // Lo que pasa de la despensa llena, en un aro por duplicaciones y topado en cuatro vueltas.
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

  // La presa, encima de todo: llega a la boca, se la zarandea atravesada y se hunde.
  for (const b of m.bichos) {
    const dep = b.preso ? bocas.get(b.id) : undefined;
    if (!dep) continue;
    const { k, sacudon } = mordisco(dep);
    const trago = Math.max(0, (k - BOCA.trago) / (1 - BOCA.trago));
    const entrada = Math.min(1, k / BOCA.entrada);
    const hueco = (dep.radio + b.radio * 0.3) * (1 - 0.7 * trago);
    const px = -dep.hy, py = dep.hx;   // el través, que es donde se zarandea y hacia donde mira
    const vaiven = sacudon * b.radio * 0.4 * (1 - trago);
    const bx = dep.x + dep.hx * hueco + px * vaiven, by = dep.y + dep.hy * hueco + py * vaiven;
    const x = b.x + (bx - b.x) * entrada, y = b.y + (by - b.y) * entrada;
    const g = sacudon * 0.45 * (1 - trago);
    const hx = px + dep.hx * g, hy = py + dep.hy * g;
    const norma = Math.sqrt(hx * hx + hy * hy);
    const edad = edadDe(m, b);
    const vigor = clamp(b.reserva / (c.capReserva * b.masa), 0, 1);
    d.cuerpo(ctx, { ...b, x, y, hx: hx / norma, hy: hy / norma, radio: b.radio * (1 - 0.5 * trago), edad },
      vigor, enrojecer(paletaCon(edad), rojoDe(c, dep)));
  }

  // De noche, las crías de cada madre, muertas incluidas.
  if (m.noche) {
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.bg;
    for (const b of [...m.bichos, ...m.restos.map((z) => z.b)]) {
      if (b.hijos <= 0) continue;
      const t = `+${b.hijos}`, x = b.x + b.radio + 2, y = b.y - b.radio - 2;
      ctx.strokeText(t, x, y);
      ctx.fillStyle = p.tinta;
      ctx.fillText(t, x, y);
    }
  }
}

// ─── La tira de población ─────────────────────────────────────────────────────

/** Los colores de la interfaz, leídos del CSS del tema: no son los del mundo. */
export type Tinta = { papel: string; linea: string; linea2: string; ink: string; ink3: string; ink4: string; acento: string };

/** Lo que hace falta para pintar la fila de un gen. */
export type Fila = {
  /** Cada bicho en el eje, en 0…1. */
  cuerpos: Muestra[];
  /** El fundador y la mediana de hoy, en 0…1. */
  eva: number;
  med: number | null;
  /** El recorrido medido, o `null` si el eje ya es ese recorrido. */
  recorrido: [number, number] | null;
  /** Px por unidad de mundo, una para toda la fila. */
  escala: number;
  /** La fila abierta pinta a todos; la cerrada, los dos extremos. */
  enjambre: boolean;
  /** El marcado, por id, o 0. */
  sel: number;
};

/** Un bicho en el eje y cómo se está muriendo: `rojo` la presa, `resto` el cuerpo, `aspa` el hambre. */
export type Muestra = { id: number; t: number; c: Cuerpo; rojo?: number; resto?: number; aspa?: boolean };

/** Dónde quedó pintado cada cuerpo, en px CSS: sale de pintar, y es lo que se pulsa. */
export type Puesto = { id: number; cx: number; cy: number; ancho: number };

const CRESTA = 96;   // puntos de la curva de fondo; más son subpíxeles en una fila de 600 px

/** La curva de la población, suavizada: dice algo aunque el censo sea de cinco. */
function cresta(ts: number[]): number[] {
  const h = new Float64Array(CRESTA);
  for (const t of ts) h[Math.min(CRESTA - 1, Math.floor(t * CRESTA))]++;
  // Tres pasadas de ±2: menos deja dientes y más se come el valle entre dos montones.
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

/** Una fila de la tira: banda del recorrido, curva, fundador, bichos y mediana, en ese orden. */
export function pintarFila(
  ctx: CanvasRenderingContext2D, W: number, H: number, dpr: number,
  d: Design, p: Paleta, t: Tinta, f: Fila,
): Puesto[] {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = t.papel;
  ctx.fillRect(0, 0, W, H);

  const x = (u: number) => u * W;

  if (f.recorrido) {
    ctx.fillStyle = t.linea2;
    ctx.fillRect(x(f.recorrido[0]), 0, x(f.recorrido[1] - f.recorrido[0]), H);
  }

  const vivos = f.cuerpos.filter((s) => s.resto === undefined);
  const ys = cresta(vivos.map((c) => c.t));
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
  vertical(f.eva, t.ink4, 1);

  const muestras = f.enjambre ? f.cuerpos : extremos(vivos);
  const puestos = colocar(muestras, W, H, d, f.escala);
  // Restos debajo, presa encima.
  const capa = (s: Muestra) => (s.resto !== undefined ? 0 : s.rojo !== undefined ? 2 : 1);
  [...puestos].sort((a, b) => capa(a) - capa(b)).forEach(({ c, cx, cy, escala, rojo, resto, aspa: hambre }) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(escala, escala);
    ctx.globalAlpha = resto ?? 1;
    const q = envejecer(p, c.edad ?? 0);
    d.cuerpo(ctx, { ...c, x: 0, y: 0, hx: 1, hy: 0 }, 1, rojo ? enrojecer(q, rojo) : q);
    if (hambre) aspa(ctx, 0, 0, c.radio, p.tinta);
    ctx.restore();
  });

  // El marcado, solo en la fila abierta y encima de todos.
  const marcado = f.enjambre ? puestos.find((q) => q.id === f.sel) : undefined;
  if (marcado) esquinas(ctx, marcado.cx, marcado.cy, marcado.ancho / 2 + 2.5, t.ink, 1);

  if (f.med !== null) vertical(f.med, t.ink, 2, 0.82);

  return puestos.map(({ id, cx, cy, ancho }) => ({ id, cx, cy, ancho }));
}

/** El más bajo y el más alto de hoy. */
function extremos(cs: Muestra[]): Muestra[] {
  if (cs.length <= 2) return cs;
  const s = [...cs].sort((a, b) => a.t - b.t);
  return [s[0], s[s.length - 1]];
}

/** Cada cuerpo busca el primer nivel libre desde abajo: el montón es el reparto. */
function colocar(cs: Muestra[], W: number, H: number, d: Design, escala: number) {
  const orden = [...cs].sort((a, b) => a.t - b.t);
  const niveles: number[] = [];
  const puestos = orden.map((s) => {
    const ancho = Math.max(...d.extension(s.c.g, s.c.radio)) * 2 * escala;
    const cx = Math.min(W - ancho / 2, Math.max(ancho / 2, s.t * W));
    let n = 0;
    while (n < niveles.length && niveles[n] > cx - ancho / 2) n++;
    niveles[n] = cx + ancho / 2 + 0.8;
    return { ...s, cx, n, ancho, escala };
  });

  // El paso vertical se decide después de repartir: el montón se aprieta hasta caber.
  const pisos = Math.max(...puestos.map((p) => p.n)) + 1;
  const alto = Math.max(...puestos.map((p) => p.ancho));
  const paso = pisos <= 1 ? 0 : Math.min(alto * 0.62, (H - 2 - alto) / (pisos - 1));
  return puestos.map((p) => ({ ...p, cy: H - 2 - p.ancho / 2 - p.n * paso }));
}

// ─── Los estratos: la partida entera ──────────────────────────────────────────

/** Lo que hace falta para pintar la franja de un gen en el tiempo. */
export type Estrato = {
  /** Una columna por trozo de partida; cada una suma 1. */
  columnas: Float64Array[];
  medianas: number[];
  hoy: Float64Array;
  eva: number;
};

/** Ancho del perfil de hoy y su separación del mapa. */
const PERFIL = 22, AIRE = 5;

/** Franjas que se promedian a cada lado: sin esto, cada bicho es una raya suelta. */
const SUAVE = 3;

/** Un histograma suavizado y normalizado a su máximo. */
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
 * La franja de un gen: tiempo a lo ancho, escala a lo alto y la población como tinta. Cada columna
 * se normaliza con su propio máximo: se lee la forma del reparto, no el censo.
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

  const tinta = canales(t.ink);
  const img = ctx.createImageData(Math.round(mapa * dpr), Math.round(H * dpr));
  const px = img.data, iw = img.width, ih = img.height;
  const alisadas = e.columnas.map(alisar);
  for (let x = 0; x < iw; x++) {
    const col = alisadas[Math.min(T - 1, Math.floor((x / iw) * T))];
    for (let y = 0; y < ih; y++) {
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

  // La mediana, con un trazo de papel debajo para leerse sobre la banda.
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
