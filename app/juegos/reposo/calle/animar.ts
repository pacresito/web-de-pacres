// La ventana con vida: la misma escena que `pintarEscena`, partida en capas para que lo que se
// mueve pueda pasar por detrás de lo que no.
//
// **Lo quieto se pinta una vez por minuto; lo vivo, en cada fotograma.** Repintar la calle
// entera doce veces por segundo es tramar cien mil píxeles para mover una nube. Así que el
// cielo, la calle, los objetos y el marco se guardan en lienzos, y cada fotograma solo los
// apila y dibuja entre ellos lo que se mueve. El orden de la pila es la profundidad:
//
//   cielo · nubes, estrellas, avión · calle · humo · objetos (con la ropa, el árbol
//   y la farola pintados en vivo, y el perro entre la acera y la calzada) · tele, pájaro, hoja ·
//   marco · gato, maceta, taza, vapor
//
// Cada hueco entre capas es donde puede ir algo: el perro pasa por detrás del contenedor
// porque se pinta antes que él, y el gato por detrás de la taza por lo mismo.
import type { NivelObjeto } from "../escena";
import {
  PIEZAS, azar, caja, enEscena, fino, px, trama, volcar, type Caja, type Ctx, type Vista,
} from "./paleta";
import { ESC, manoDe, pintarObjeto, type Mano, type Vivo } from "./pincel";
import { vanosObra } from "./edificios";
import { HUECO, PARTES, REPISA, TAZA, aVentana, calleVentana, cieloVentana, escena, marco } from "./ventana";
import { farolaLuz, viento, type Suceso } from "./vida";
import {
  gatoAndando, gatoCabeza, gatoCola, gatoDormido, gatoSentado, pajaroPosado, pajaroVuela, perro,
} from "./bichos";

/** Los objetos del catálogo que se pintan en vivo: se mueven sin cambiar de nivel. */
const EN_VIVO = new Set(["ropa", "arbol", "farola"]);

type Paso =
  | { tipo: "lienzo"; lienzo: HTMLCanvasElement }
  | { tipo: "vivo"; id: string; p: (typeof PIEZAS)[string]; n: number; b: Caja }
  | { tipo: "perro"; donde: "acera" | "contenedor" };

export interface Capas {
  m: Mano;
  cielo: HTMLCanvasElement;
  calle: HTMLCanvasElement;
  pasos: Paso[];
  marco: HTMLCanvasElement;
  /** Las cajas de los 24 en píxeles finos de la ventana, estén o no a esta hora. */
  cajas: Record<string, Caja>;
  nivel: Record<string, number>;
}

export function pintarCapas(niveles: NivelObjeto[], hora: number): Capas {
  const m = manoDe(hora, escena.suelo);
  const cielo = fino(ESC, "capa-cielo");
  cieloVentana(cielo.ctx, m, hora);
  const calle = fino(ESC, "capa-calle");
  calleVentana(calle.ctx, m);

  const cajas: Record<string, Caja> = {};
  for (const [id, p] of Object.entries(PIEZAS)) cajas[id] = caja({ ...p, ...escena.cajas[id] }, ESC);

  const nivel: Record<string, number> = Object.fromEntries(niveles.map((x) => [x.id, x.nivel]));
  const pasos: Paso[] = [];
  let tramo: ReturnType<typeof fino> | null = null, k = 0;
  const cerrar = () => {
    if (!tramo) return;
    tramo.ctx.restore();
    pasos.push({ tipo: "lienzo", lienzo: tramo.lienzo });
    tramo = null;
  };
  for (const { id, p, n } of enEscena(niveles, hora)) {
    const b = cajas[id];
    if (id === "coche" || id === "contenedor") {
      cerrar();
      pasos.push({ tipo: "perro", donde: id === "coche" ? "acera" : "contenedor" });
    }
    if (EN_VIVO.has(id)) {
      cerrar();
      pasos.push({ tipo: "vivo", id, p, n, b });
      continue;
    }
    if (!tramo) {
      tramo = fino(ESC, `capa-objetos-${k++}`);
      recortar(tramo.ctx);
    }
    pintarObjeto(tramo.ctx, m, id, b, p, n);
  }
  cerrar();

  const primer = fino(ESC, "capa-marco");
  marco(primer.ctx, m);
  return { m, cielo: cielo.lienzo, calle: calle.lienzo, pasos, marco: primer.lienzo, cajas, nivel };
}

function recortar(ctx: Ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(HUECO.x, HUECO.y, HUECO.w, HUECO.h);
  ctx.clip();
}
function enHueco(ctx: Ctx, pintar: () => void) {
  recortar(ctx);
  pintar();
  ctx.restore();
}

export interface Momento {
  /** Segundos. */
  t: number;
  hora: number;
  sucesos: Suceso[];
}

/** Un fotograma: apila las capas y pinta entre ellas lo que se mueve. */
export function componer(ctx: Ctx, vista: Vista, c: Capas, mo: Momento) {
  const f = fino(ESC, "capa-final");
  const g = f.ctx;
  const { m } = c;
  const t = mo.t;
  const v = viento(t);
  const hay = (id: string) => mo.sucesos.find((s) => s.id === id);
  const fase = (s: Suceso) => t - s.inicio;

  g.drawImage(c.cielo, 0, 0);
  enHueco(g, () => {
    if (m.noche) estrellas(g, m, t);
    nubes(g, m, t);
    const av = hay("avion"); if (av) avion(g, m, fase(av), av.variante);
    const ba = hay("bandada"); if (ba) bandada(g, m, fase(ba), ba.variante);
    const fu = hay("fugaz"); if (fu) fugaz(g, m, fase(fu), fu);
  });
  g.drawImage(c.calle, 0, 0);
  enHueco(g, () => {
    humo(g, m, t, v);
  });

  enHueco(g, () => {
    const vivo: Vivo = { t, viento: v, luz: farolaLuz(t) };
    for (const paso of c.pasos) {
      if (paso.tipo === "lienzo") g.drawImage(paso.lienzo, 0, 0);
      else if (paso.tipo === "vivo") pintarObjeto(g, m, paso.id, paso.b, paso.p, paso.n, vivo); else if (paso.donde === "acera") {
        const a = hay("perro-acera"); if (a) perroAcera(g, m, fase(a), a.variante);
        const s = hay("perro-sentado"); if (s) perroSentado(g, m, fase(s), s.variante, c.cajas);
      } else {
        const p = hay("perro-contenedor"); if (p) perroContenedor(g, m, fase(p), p.variante, c.cajas.contenedor);
      }
    }
    const te = hay("tele"); if (te && m.noche) tele(g, m, fase(te), te, c);
    const pa = hay("pajaro"); if (pa) pajaro(g, m, fase(pa), pa.variante, mo.hora, c.cajas);
    const ho = hay("hoja"); if (ho) hoja(g, m, fase(ho), ho.variante, c.cajas.arbol);
  });
  g.drawImage(c.marco, 0, 0);
  if (!m.noche) polvo(g, m, t);
  const cola = hay("gato-cola"); if (cola) gatoColgando(g, m, fase(cola), sitio(cola.variante, 110, 560));
  PARTES.cortina(g, m);
  const si = hay("siesta"); if (si) siesta(g, m, fase(si), si.dur);
  const re = hay("gato-repisa"); if (re) gatoRepisa(g, m, fase(re), re.variante);
  PARTES.planta(g, m);
  PARTES.taza(g, m);
  vapor(g, m, t);
  const bo = hay("gato-borde"); if (bo) gatoBorde(g, m, fase(bo));
  const ab = hay("gato-abajo"); if (ab) asomar(g, m, fase(ab), 22, sitio(ab.variante, 60, 580), 376, 351);

  volcar(ctx, vista, f);
}

// ── Utilidades de movimiento ─────────────────────────────────────────────────

/** Un punto entre `a` y `b` a partir de una variante de las mil: por dónde asoma el gato. */
const sitio = (variante: number, a: number, b: number) => Math.round(a + ((variante % 1000) / 999) * (b - a));
const suave = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
/** De `a` a `b` entre los segundos `t0` y `t1`, con arranque y frenada. */
const tramoDe = (s: number, t0: number, t1: number, a: number, b: number) => a + (b - a) * suave((s - t0) / (t1 - t0));

// ── El cielo ─────────────────────────────────────────────────────────────────

/** Nubes a la deriva, cada una a su velocidad: la más lenta tarda más de una hora en cruzar. */
function nubes(g: Ctx, m: Mano, t: number) {
  const ancho = HUECO.w;
  for (let i = 0; i < 6; i++) {
    const w = 26 + Math.floor(azar(i * 9 + 3) * 56);
    const vel = 0.1 + azar(i * 9 + 8) * 0.22;              // píxeles por segundo
    const vuelta = ancho + 2 * w;
    const x0 = ((azar(i * 9 + 1) * vuelta + vel * t) % vuelta + vuelta) % vuelta;
    const cx = HUECO.x - w + x0, cy = HUECO.y + 2 + Math.floor(azar(i * 9 + 2) * 26);
    for (let k = 0; k < 4; k++) {
      const dx = Math.floor((azar(i * 9 + 4 + k) - 0.5) * w), dy = Math.floor(azar(i * 9 + 5 + k) * 5);
      const rw = Math.floor(w * (0.3 + azar(i * 9 + 6 + k) * 0.35)), rh = 3 + Math.floor(azar(i * 9 + 7 + k) * 4);
      px(g, cx + dx, cy + dy, rw, rh, m.F.cielo[Math.max(0, 2 - k)]);
      px(g, cx + dx, cy + dy, rw, 1, m.F.cielo[0]);
    }
  }
}

/** Estrellas en la franja de cielo que se ve. Cada una respira a su ritmo. */
function estrellas(g: Ctx, m: Mano, t: number) {
  for (let i = 0; i < 34; i++) {
    const x = HUECO.x + Math.floor(azar(i * 3 + 101) * HUECO.w), y = HUECO.y + 1 + Math.floor(azar(i * 3 + 102) * 36);
    const brillo = azar(i * 3 + 103);
    const onda = Math.sin(t * (0.5 + azar(i + 7) * 1.4) + i * 5.1);
    if (onda < -0.75 && brillo < 0.7) continue;           // se apaga un momento
    const fuerte = brillo > 0.8 && onda > 0.55;
    px(g, x, y, 1, 1, m.P.luz[fuerte || onda > 0.3 ? 5 : 4]);
    if (fuerte) {
      px(g, x - 1, y, 1, 1, m.P.luz[3]); px(g, x + 1, y, 1, 1, m.P.luz[3]);
      px(g, x, y - 1, 1, 1, m.P.luz[3]); px(g, x, y + 1, 1, 1, m.P.luz[3]);
    }
  }
}

function avion(g: Ctx, m: Mano, s: number, variante: number) {
  const dir = variante ? -1 : 1;
  const x = dir > 0 ? HUECO.x - 10 + s * 12.5 : HUECO.x + HUECO.w + 10 - s * 12.5;
  const y = HUECO.y + 7 + variante * 5 - s * 0.06;
  if (m.noche) {
    if (Math.floor(s * 1.1) % 2 === 0) px(g, x, y, 1, 1, m.P.tela[5]);
    if (s % 1.6 < 0.12) px(g, x + dir * 2, y, 1, 1, m.P.luz[5]);
    return;
  }
  // La estela: larga, fina y deshaciéndose por detrás.
  for (let i = 3; i < 90; i++) {
    const xx = Math.round(x - dir * i), yy = Math.round(y + i * 0.06);
    if (trama(xx, yy) < 0.9 * (1 - i / 90)) px(g, xx, yy, 1, 1, m.F.cielo[m.F.cielo.length - 1]);
  }
  px(g, x - 1, y, 3, 1, m.P.piedra[5]);
}

function bandada(g: Ctx, m: Mano, s: number, variante: number) {
  const dir = variante ? -1 : 1;
  for (let i = 0; i < 6; i++) {
    const retraso = Math.abs(i - 2) * 0.5 + azar(i + 40) * 0.3;
    const x = dir > 0 ? HUECO.x - 12 + (s - retraso) * 44 : HUECO.x + HUECO.w + 12 - (s - retraso) * 44;
    const y = HUECO.y + 10 + Math.abs(i - 2) * 3 + Math.sin(s * 2 + i) * 1.5 + variante * 6;
    pajaroVuela(g, x, y, s + i * 0.37, m.F.tinta);
  }
}

function fugaz(g: Ctx, m: Mano, s: number, su: Suceso) {
  const x0 = HUECO.x + 60 + azar(Math.floor(su.inicio)) * (HUECO.w - 120), y0 = HUECO.y + 3;
  const k = Math.min(1, s / 0.9);
  for (let i = 0; i < 10; i++) {
    const q = k - i * 0.03;
    if (q < 0) break;
    const vivo = s < 1.3 ? 1 : 1 - (s - 1.3) / 0.7;
    if (azar(i + Math.floor(s * 20)) > vivo) continue;
    px(g, x0 - q * 50, y0 + q * 22, 1, 1, m.P.luz[i < 2 ? 5 : i < 5 ? 4 : 3]);
  }
}

/** Una chimenea en el tejado del bloque del medio, y su humo, que se va con el viento. */
function humo(g: Ctx, m: Mano, t: number, v: number) {
  const base = aVentana(372, 76);
  const x = Math.round(base.x), y = Math.round(base.y);
  px(g, x, y - 7, 5, 7, m.P.ladrillo[2]);
  px(g, x, y - 7, 1, 7, m.P.ladrillo[3]);
  px(g, x - 1, y - 8, 7, 2, m.P.metal[1]);
  const color = m.noche ? m.P.metal[2] : m.P.piedra[4];
  const cada = 1.1, vida = 16;
  for (let i = Math.floor((t - vida) / cada) + 1; i * cada <= t; i++) {
    const a = t - i * cada;
    const px0 = x + 2 + a * (0.3 + v * 1.6) + Math.sin(a * 0.8 + i) * 1.2;
    const py0 = y - 10 - a * 1.7;
    const r = Math.min(4, 1 + Math.floor(a * 0.2));
    const dens = 0.6 * (1 - a / vida);
    for (let j = -r; j <= r; j++)
      for (let k = -r; k <= r; k++)
        if (k * k + j * j <= r * r && trama(Math.round(px0) + k, Math.round(py0) + j + (i % 4)) < dens)
          px(g, Math.round(px0) + k, Math.round(py0) + j, 1, 1, color);
  }
}

// ── La calle ─────────────────────────────────────────────────────────────────

/** La línea de la acera por donde pisa el perro: delante de todo lo de la acera y detrás de
 *  lo que está aparcado. La acera va de la fila 256 a la 280 del alzado. */
const ACERA_PERRO = Math.round(aVentana(0, 270).y);

function perroAcera(g: Ctx, m: Mano, s: number, variante: number) {
  const dir: 1 | -1 = variante ? -1 : 1;
  const desde = dir > 0 ? HUECO.x - 14 : HUECO.x + HUECO.w + 14, hasta = dir > 0 ? HUECO.x + HUECO.w + 14 : HUECO.x - 14;
  // Trota, se para a olisquear a mitad de camino y sigue.
  const para = 0.42 + azar(variante + 60) * 0.2, vel = 17;
  const total = Math.abs(hasta - desde), t1 = (total * para) / vel, t2 = t1 + 7;
  let x: number, postura: "anda" | "huele" = "anda";
  if (s < t1) x = desde + dir * s * vel;
  else if (s < t2) { x = desde + dir * total * para; postura = "huele"; }
  else x = desde + dir * (total * para + (s - t2) * vel);
  perro(g, m, x, ACERA_PERRO, dir, s, postura, s * 9);
}

function perroSentado(g: Ctx, m: Mano, s: number, variante: number, cajas: Record<string, Caja>) {
  const junto = variante ? cajas.farola : cajas.banco;
  const sitio = junto.x + Math.round(junto.w / 2) + (variante ? -14 : 10);
  const dir: 1 | -1 = variante ? 1 : -1;
  const desde = dir > 0 ? HUECO.x - 14 : HUECO.x + HUECO.w + 14, hasta = dir > 0 ? HUECO.x + HUECO.w + 14 : HUECO.x - 14;
  const vel = 16;
  const llega = Math.abs(sitio - desde) / vel;
  const sale = 59 - Math.abs(hasta - sitio) / (vel * 2);
  if (s < llega) return perro(g, m, desde + dir * s * vel, ACERA_PERRO, dir, s, "anda", s * 9);
  if (s < sale) {
    const q = s - llega;
    const rasca = q > 12 && q < 16;
    return perro(g, m, sitio, ACERA_PERRO, q > 20 && q < 26 ? (-dir as 1 | -1) : dir, s, rasca ? "rasca" : "sentado");
  }
  perro(g, m, sitio + dir * (s - sale) * vel * 2, ACERA_PERRO, dir, s, "anda", s * 12);
}

/** Asoma la cabeza por un lado del contenedor —el izquierdo o el derecho—, husmea y vuelve. */
function perroContenedor(g: Ctx, m: Mano, s: number, variante: number, b: Caja) {
  // Detrás del contenedor quiere decir más lejos, así que más arriba: con los pies a su altura
  // el marco de la ventana le cortaría las patas.
  const suelo = b.y + 13;
  const dir: 1 | -1 = variante ? 1 : -1;
  const oculto = variante ? b.x + b.w - 12 : b.x + 12, fuera = variante ? b.x + b.w + 2 : b.x - 2;
  const x = s < 3 ? tramoDe(s, 0, 3, oculto, fuera) : s < 20 ? fuera + (s > 9 && s < 13 ? dir * 3 : 0) : tramoDe(s, 20, 24, fuera, oculto);
  perro(g, m, x, suelo, dir, s, s > 6 && s < 9 ? "huele" : "anda", 0);
}

/** Una ventana encendida del edificio de la derecha con la tele puesta —azul, a cortes— o con
 *  una luz cálida que tiembla. Solo titila: cuáles están encendidas no cambia nunca. Si la obra
 *  no ha acabado no hay edificio, y no hay tele. */
function tele(g: Ctx, m: Mano, s: number, su: Suceso, c: Capas) {
  const obra = PIEZAS.obra;
  if ((c.nivel.obra ?? 0) < obra.variantes - 1) return;
  const f = c.cajas.farola;
  // Las que no tapa la farola ni la cortina de la derecha.
  const libres = vanosObra(c.cajas.obra).filter((v) => v.encendida
    && v.x + v.w < HUECO.x + HUECO.w - 44 && v.y > HUECO.y
    && (v.x + v.w < f.x || v.x > f.x + f.w || v.y + v.h < f.y));
  if (!libres.length) return;
  const v = libres[su.variante % libres.length];
  // Se enciende y se apaga poco a poco, no de golpe.
  const entra = Math.min(1, s / 2, (su.dur - s) / 2);
  let color: string, dens: number;
  if (su.variante % 3 !== 2) {
    const corte = Math.floor(s / 0.9 + azar(Math.floor(s / 7) + su.variante) * 3);
    color = azar(corte * 3 + 1) < 0.55 ? m.P.metal[5] : m.P.luz[4];
    dens = 0.25 + azar(corte * 3 + 2) * 0.45 + (azar(Math.floor(s * 8)) - 0.5) * 0.1;
  } else {
    color = m.P.metal[1];
    dens = 0.12 + 0.12 * Math.sin(s * 7.3) * Math.sin(s * 2.1) + (azar(Math.floor(s * 10) + 5) < 0.08 ? 0.2 : 0);
  }
  dens *= entra;
  for (let j = 1; j < v.h - 1; j++)
    for (let i = 1; i < v.w - 1; i++)
      if (trama(v.x + i, v.y + j) < dens) px(g, v.x + i, v.y + j, 1, 1, color);
}

function pajaro(g: Ctx, m: Mano, s: number, variante: number, hora: number, cajas: Record<string, Caja>) {
  const hayRopa = hora >= 8 && hora < 21;
  let px0: number, py0: number;
  if (variante === 0 && hayRopa) {
    const b = cajas.ropa;
    px0 = b.x + b.w - 5;
    py0 = b.y + Math.round(2 * Math.sin(((px0 - b.x) / b.w) * Math.PI)) - 1;
  } else {
    const b = cajas.farola;
    px0 = b.x + Math.round(b.w / 2) + 12;
    py0 = b.y - 1;
  }
  const llegar = 3.5, irse = 36;
  if (s < llegar) {
    const q = s / llegar;
    return pajaroVuela(g, px0 - 90 * (1 - q), py0 - 50 * (1 - q) ** 2, s, m.F.tinta);
  }
  if (s > irse) {
    const q = (s - irse) / 4;
    return pajaroVuela(g, px0 + 110 * q, py0 - 60 * q * q - 2, s, m.F.tinta);
  }
  const q = s - llegar;
  const salto = Math.floor(q / 5) % 3 === 1 ? 2 : 0;
  const dir: 1 | -1 = Math.floor(q / 7) % 2 ? -1 : 1;
  pajaroPosado(g, m, px0 - salto, py0, dir, Math.sin(q * 3) > 0.7);
}

function hoja(g: Ctx, m: Mano, s: number, variante: number, b: Caja) {
  const cx = b.x + b.w / 2 + (variante - 1) * b.w * 0.18;
  const cy = b.y + b.h * 0.35;
  const suelo = b.y + b.h + 4 + variante * 2;
  const cae = 11;
  const q = Math.min(1, s / cae);
  const x = cx + Math.sin(s * 1.6) * 5 + q * 10;
  const y = s < cae ? cy + (suelo - cy) * q : suelo;
  if (s > cae + 3 && Math.floor(s * 6) % 2) return;      // se la lleva el aire: parpadea y se va
  // Da vueltas al caer: plana es una raya de tres, de canto un punto de dos.
  const plana = s >= cae || Math.sin(s * 3.2) > 0;
  if (plana) { px(g, x, y, 3, 1, m.P.ladrillo[4]); px(g, x + 1, y - 1, 1, 1, m.P.ladrillo[2]); }
  else px(g, x + 1, y - 1, 1, 2, m.P.ladrillo[4]);
}

// ── Dentro ───────────────────────────────────────────────────────────────────

/** Motas de polvo que cruzan el sol que entra por la ventana. Van delante del marco —están en
 *  la habitación— y se ven sobre la pared oscura. */
function polvo(g: Ctx, m: Mano, t: number) {
  for (let i = 0; i < 18; i++) {
    const x = 70 + azar(i * 5 + 201) * 520 + Math.sin(t * (0.05 + azar(i + 9) * 0.06) + i) * 26;
    const y = 180 + azar(i * 5 + 202) * 170 + Math.sin(t * (0.04 + azar(i + 19) * 0.05) + i * 2) * 18 - ((t * 0.6 + i * 40) % 60);
    if (Math.sin(t * 0.5 + i * 2.7) < 0.35) continue;
    px(g, x, y, 1, 1, m.P.luz[5]);
  }
}

/** El vapor del café: dos hilos que ondulan y se deshacen al subir. La trama sube con el
 *  tiempo, y eso es lo que hace que parezca que fluye. */
function vapor(g: Ctx, m: Mano, t: number) {
  const fuerza = 0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 420);
  const color = m.noche ? m.P.luz[3] : m.P.piedra[5];
  for (let hilo = 0; hilo < 2; hilo++) {
    const x0 = TAZA.x + 4 + hilo * 8;
    for (let j = 0; j < 30; j++) {
      const y = TAZA.y - 1 - j;
      const x = Math.round(x0 + Math.sin(j * 0.26 - t * 1.4 + hilo * 2.1) * (0.4 + j * 0.09));
      const d = fuerza * 0.85 * (1 - j / 30) ** 1.3;
      if (trama(x, y + Math.floor(t * 7)) < d) px(g, x, y, 1, 1, color);
      if (j > 8 && j < 22 && trama(x + 1, y + Math.floor(t * 7) + 2) < d * 0.5) px(g, x + 1, y, 1, 1, color);
    }
  }
}

const SUELO_REPISA = REPISA + 1;

/** Hacia dónde mira mientras está asomado, y cuándo parpadea: a ratos, y una vez despacio,
 *  que en un gato es cariño. */
const mirada = (s: number) => [0, -1, -1, 0, 1, 1, 0][Math.floor(s / 3) % 7];
const parpadeo = (s: number) => s % 5.3 > 4.9 || (s > 9 && s < 10.2);

/** Por el borde de abajo: está en el suelo, debajo de lo que se ve, y se incorpora a mirar. */
function asomar(g: Ctx, m: Mano, s: number, dur: number, cx: number, oculta: number, fuera: number) {
  const cy = s < 2.5 ? tramoDe(s, 0, 2.5, oculta, fuera) : s > dur - 2.5 ? tramoDe(s, dur - 2.5, dur, fuera, oculta) : fuera;
  gatoCabeza(g, m, cx, cy, mirada(s), parpadeo(s), "abajo");
}

/** Por la derecha, sobre la repisa: viene a por la taza y se lo piensa. */
function gatoBorde(g: Ctx, m: Mano, s: number) {
  const cx = s < 2.5 ? tramoDe(s, 0, 2.5, 664, 628) : s > 17.5 ? tramoDe(s, 17.5, 20, 628, 664) : 628;
  gatoCabeza(g, m, cx, REPISA - 17, -1, s % 4.7 > 4.4, "derecha");
}

function gatoColgando(g: Ctx, m: Mano, s: number, x: number) {
  const largo = s < 3 ? tramoDe(s, 0, 3, 0, 46) : s > 31 ? tramoDe(s, 31, 34, 46, 0) : 46;
  gatoCola(g, m, x, largo, s);
}

/** Entra por un lado, se sienta a mirar la calle un rato y se va por el otro. */
function gatoRepisa(g: Ctx, m: Mano, s: number, variante: number) {
  const dir: 1 | -1 = variante ? 1 : -1;
  const desde = dir > 0 ? -30 : 670, sitio = variante ? 420 : 250;
  const vel = 38;
  const llega = Math.abs(sitio - desde) / vel, sale = llega + 44;
  if (s < llega) return gatoAndando(g, m, desde + dir * s * vel, SUELO_REPISA, s * 7, dir, s);
  if (s < sale) {
    const q = s - llega;
    const giro = q > 12 && q < 16 ? -1 : q > 27 && q < 30 ? 1 : 0;
    return gatoSentado(g, m, sitio, SUELO_REPISA, s, giro, dir > 0 ? -1 : 1);
  }
  gatoAndando(g, m, sitio + dir * (s - sale) * vel, SUELO_REPISA, s * 7, dir, s);
}

/** La siesta: llega, se sienta, se hace una bola y duerme casi un cuarto de hora. Al final se
 *  despierta, se sienta un momento y se va. */
function siesta(g: Ctx, m: Mano, s: number, dur: number) {
  const sitio = 440, desde = 670, vel = 30;
  const llega = (desde - sitio) / vel;
  if (s < llega) return gatoAndando(g, m, desde - s * vel, SUELO_REPISA, s * 6, -1, s);
  if (s < llega + 4) return gatoSentado(g, m, sitio, SUELO_REPISA, s, 0, 1);
  const despierta = dur - 18;
  if (s < despierta) return gatoDormido(g, m, sitio, SUELO_REPISA, s);
  if (s < despierta + 4) return gatoSentado(g, m, sitio, SUELO_REPISA, s, s - despierta > 2 ? 1 : 0, 1);
  gatoAndando(g, m, sitio - (s - despierta - 4) * 38, SUELO_REPISA, s * 7, -1, s);
}
