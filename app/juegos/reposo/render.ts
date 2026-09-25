// La luz, el lienzo y las cajas: lo que comparten el motor y el dibujo de `calle/`. Aquí no se
// dibuja nada.
//
// **La luz son cuatro claves** (noche, amanecer, día, atardecer) interpoladas en OKLCH: en RGB
// el paso del azul al naranja cruza un gris sucio. El cielo recorre toda la claridad y el resto
// la mitad, o el atardecer dejaría la calle en un monocromo naranja donde no se distingue nada.
//
// **La calle no vira con el tema oscuro del sitio:** su color es la hora.

// ── Color ────────────────────────────────────────────────────────────────────

export interface Oklch { l: number; c: number; h: number }

/** OKLCH → sRGB. Fuera de gamut recorta por canal: esta paleta no se acerca al borde. */
export function css(o: Oklch): string {
  const rad = (o.h * Math.PI) / 180;
  const a = o.c * Math.cos(rad), b = o.c * Math.sin(rad);
  const l_ = o.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = o.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = o.l - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const canal = (v: number) => {
    const g = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, g)) * 255);
  };
  return `rgb(${canal(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)} ${
    canal(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)} ${
    canal(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)})`;
}

/** Mezcla dos colores en OKLCH, con el tono por el arco corto. */
export function mezcla(a: Oklch, b: Oklch, t: number): Oklch {
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  return { l: a.l + (b.l - a.l) * t, c: a.c + (b.c - a.c) * t, h: a.h + dh * t };
}

export type Rol = "cielo" | "cieloBajo" | "lejos" | "muro" | "muroAlt" | "sombra"
  | "acera" | "asfalto" | "tinta" | "ventana";
export type Paleta = Record<Rol, string>;

interface Clave { hora: number; colores: Record<Rol, Oklch> }

/** Cada clave, a la hora en que manda del todo; entre dos, se mezclan. */
const CLAVES: Clave[] = [
  { hora: 1, colores: {
    cielo: { l: 0.16, c: 0.04, h: 265 }, cieloBajo: { l: 0.24, c: 0.06, h: 280 },
    lejos: { l: 0.22, c: 0.02, h: 265 }, muro: { l: 0.34, c: 0.02, h: 250 },
    muroAlt: { l: 0.30, c: 0.02, h: 250 }, sombra: { l: 0.20, c: 0.02, h: 255 },
    acera: { l: 0.30, c: 0.01, h: 250 }, asfalto: { l: 0.22, c: 0.01, h: 250 },
    tinta: { l: 0.12, c: 0.02, h: 250 }, ventana: { l: 0.88, c: 0.13, h: 85 } } },
  { hora: 7.5, colores: {
    cielo: { l: 0.72, c: 0.07, h: 40 }, cieloBajo: { l: 0.86, c: 0.10, h: 62 },
    lejos: { l: 0.58, c: 0.03, h: 35 }, muro: { l: 0.68, c: 0.03, h: 50 },
    muroAlt: { l: 0.63, c: 0.03, h: 50 }, sombra: { l: 0.50, c: 0.03, h: 45 },
    acera: { l: 0.64, c: 0.02, h: 60 }, asfalto: { l: 0.48, c: 0.015, h: 50 },
    tinta: { l: 0.28, c: 0.02, h: 40 }, ventana: { l: 0.84, c: 0.08, h: 85 } } },
  { hora: 13, colores: {
    cielo: { l: 0.86, c: 0.06, h: 230 }, cieloBajo: { l: 0.94, c: 0.03, h: 225 },
    lejos: { l: 0.74, c: 0.015, h: 230 }, muro: { l: 0.81, c: 0.02, h: 90 },
    muroAlt: { l: 0.75, c: 0.025, h: 75 }, sombra: { l: 0.64, c: 0.02, h: 85 },
    acera: { l: 0.77, c: 0.008, h: 90 }, asfalto: { l: 0.56, c: 0.006, h: 250 },
    tinta: { l: 0.30, c: 0.01, h: 250 }, ventana: { l: 0.88, c: 0.03, h: 90 } } },
  { hora: 20, colores: {
    cielo: { l: 0.62, c: 0.12, h: 45 }, cieloBajo: { l: 0.74, c: 0.15, h: 58 },
    lejos: { l: 0.46, c: 0.05, h: 35 }, muro: { l: 0.62, c: 0.05, h: 55 },
    muroAlt: { l: 0.56, c: 0.05, h: 50 }, sombra: { l: 0.42, c: 0.04, h: 45 },
    acera: { l: 0.56, c: 0.03, h: 55 }, asfalto: { l: 0.40, c: 0.02, h: 40 },
    tinta: { l: 0.24, c: 0.02, h: 40 }, ventana: { l: 0.87, c: 0.12, h: 85 } } },
];

const ROLES = Object.keys(CLAVES[0].colores) as Rol[];

export interface Luz {
  /** Los colores ya en css, listos para `fillStyle`. */
  color: Paleta;
  /** Los mismos en OKLCH, que es lo que hace falta para teñir con ellos. */
  crudo: Record<Rol, Oklch>;
  noche: boolean;
}

/** La luz de una hora decimal (13.5 = las 13:30), que cruza la medianoche sin salto. */
export function luzDe(hora: number): Luz {
  const h = ((hora % 24) + 24) % 24;
  let i = CLAVES.length - 1;
  for (let k = 0; k < CLAVES.length; k++) if (h >= CLAVES[k].hora) i = k;
  const a = CLAVES[i], b = CLAVES[(i + 1) % CLAVES.length];
  const tramo = (b.hora - a.hora + 24) % 24;
  const t = tramo === 0 ? 0 : ((h - a.hora + 24) % 24) / tramo;
  const crudo = {} as Record<Rol, Oklch>;
  const color = {} as Paleta;
  for (const rol of ROLES) {
    crudo[rol] = mezcla(a.colores[rol], b.colores[rol], t);
    color[rol] = css(crudo[rol]);
  }
  return { color, crudo, noche: esNoche(h) };
}

export const paletaDe = (hora: number): Paleta => luzDe(hora).color;

/** Tiñe el color de un objeto con la luz del momento, solo un tercio para que dos colores
 *  sigan siendo dos. De noche baja también el croma. */
export function tenir(propio: Oklch, luz: Luz, fuerza = 0.34): Oklch {
  const amb = luz.crudo.cieloBajo;
  return {
    l: propio.l + (amb.l - propio.l) * fuerza,
    c: propio.c * (0.5 + 0.5 * Math.min(1, amb.l + 0.1)),
    h: mezcla(propio, amb, fuerza * 0.3).h,
  };
}

// ── El calendario ────────────────────────────────────────────────────────────
//
// **La estación es escenografía, como la luz:** viste la calle y no cuenta como cambio, así
// que la calle de antes se pinta con la estación de ahora. Si contara, diciembre daría un
// cambio seguro y sería una cita.

export type Estacion = "invierno" | "primavera" | "verano" | "otoño";

export interface Calendario {
  estacion: Estacion;
  /** Del 1 de diciembre al 6 de enero: las luces de la calle. */
  navidad: boolean;
  /** Día del año, 0..365. */
  dia: number;
}

export function estacionDe(mes: number): Estacion {
  return mes === 11 || mes < 2 ? "invierno" : mes < 5 ? "primavera" : mes < 8 ? "verano" : "otoño";
}

export function calendarioDe(fecha: Date): Calendario {
  const mes = fecha.getMonth(), d = fecha.getDate();
  const dia = Math.floor((Date.UTC(fecha.getFullYear(), mes, d) - Date.UTC(fecha.getFullYear(), 0, 1)) / 864e5);
  return { estacion: estacionDe(mes), navidad: mes === 11 || (mes === 0 && d <= 6), dia };
}

/** La hora en el día de las claves, que amanece a las 7 y anochece a las 20:30. En junio el
 *  sol sale a las 6:35 y se pone a las 21:30; en diciembre, a las 8:10 y a las 17:55, en hora
 *  oficial de la costa mediterránea. Se estira el día y la noche encoge, o al revés. */
export function horaSolar(hora: number, dia: number): number {
  const onda = Math.cos((2 * Math.PI * (dia - 172)) / 365);
  const sale = 7.4 - 0.8 * onda, pone = 19.7 + 1.8 * onda;
  const S = 7, P = 20.5;
  const h = ((hora % 24) + 24) % 24;
  if (h >= sale && h < pone) return S + ((h - sale) * (P - S)) / (pone - sale);
  const desde = (h - pone + 24) % 24;
  return (P + (desde * (24 - (P - S))) / (24 - (pone - sale))) % 24;
}

/** Si es de noche: gobierna lo que se enciende o no, como las ventanas y las luces. */
export function esNoche(hora: number): boolean {
  const h = ((hora % 24) + 24) % 24;
  return h < 7 || h >= 20.5;
}

// ── Geometría ────────────────────────────────────────────────────────────────

// Las cajas van en un lienzo virtual de 1600×900 que se escala al canvas real.
export const LIENZO = { ancho: 1600, alto: 900 };

export interface Vista { ancho: number; alto: number; escala: number; dpr: number }

/** Ajusta el canvas a su tamaño en pantalla y al `dpr` real, sin el que se ve borroso. */
export function vistaDe(canvas: HTMLCanvasElement, anchoCSS: number, dpr: number): Vista {
  const escala = anchoCSS / LIENZO.ancho;
  const alto = LIENZO.alto * escala;
  canvas.width = Math.round(anchoCSS * dpr);
  canvas.height = Math.round(alto * dpr);
  canvas.style.width = `${anchoCSS}px`;
  canvas.style.height = `${alto}px`;
  return { ancho: anchoCSS, alto, escala, dpr };
}

type Arquetipo = "hueco" | "banda" | "bulto" | "planta" | "mancha" | "poste" | "andamio" | "tendal";

interface Pieza {
  x: number; y: number; w: number; h: number;
  arquetipo: Arquetipo;
  /** Dibujos distintos; el nivel entra módulo esto. Si el objeto tiene estados contados, uno
   *  por estado. */
  variantes: number;
  /** Horas en las que se pinta. Fuera de ellas su nivel sigue corriendo: quien entra siempre
   *  a la misma hora no lo ve cambiar. */
  franja?: [number, number];
  /** Pierde la hoja en invierno y cambia de color con la estación. */
  caduca?: boolean;
}

/** Sitio y forma de cada objeto de escena.ts, en orden de profundidad. */
export const PIEZAS: Record<string, Pieza> = {
  // Fachada izquierda (portal y viviendas)
  persiana:   { x: 96,   y: 300, w: 92,  h: 108, arquetipo: "hueco",   variantes: 5 },
  cortina:    { x: 232,  y: 300, w: 92,  h: 108, arquetipo: "banda",   variantes: 5 },
  ropa:       { x: 360,  y: 316, w: 132, h: 76,  arquetipo: "tendal",  variantes: 4, franja: [8, 21] },
  grafiti:    { x: 96,   y: 494, w: 150, h: 90,  arquetipo: "mancha",  variantes: 8 },
  cartel:     { x: 296,  y: 478, w: 118, h: 124, arquetipo: "mancha",  variantes: 4 },
  buzon:      { x: 430,  y: 584, w: 40,  h: 56,  arquetipo: "bulto",   variantes: 3 },

  // La tienda (su local es decorado: `TIENDA`)
  escaparate: { x: 620,  y: 470, w: 160, h: 150, arquetipo: "hueco",   variantes: 5 },
  letrero:    { x: 596,  y: 386, w: 398, h: 44,  arquetipo: "banda",   variantes: 5 },
  toldo:      { x: 596,  y: 430, w: 398, h: 52,  arquetipo: "banda",   variantes: 5 },
  mesas:      { x: 700,  y: 576, w: 190, h: 64,  arquetipo: "bulto",   variantes: 5, franja: [11, 24] },
  sombrilla:  { x: 830,  y: 470, w: 130, h: 170, arquetipo: "banda",   variantes: 5, franja: [11, 24] },
  terraza:    { x: 900,  y: 580, w: 104, h: 60,  arquetipo: "bulto",   variantes: 5, franja: [11, 24] },

  // Fachada derecha y la obra
  obra:       { x: 1040, y: 180, w: 500, h: 460, arquetipo: "andamio", variantes: 9 },
  macetero:   { x: 1064, y: 566, w: 70,  h: 74,  arquetipo: "planta",  variantes: 5 },
  puesto:     { x: 1170, y: 568, w: 180, h: 112, arquetipo: "bulto",   variantes: 3, franja: [6, 14] },
  papelera:   { x: 1392, y: 570, w: 40,  h: 70,  arquetipo: "bulto",   variantes: 3 },

  // Acera y calzada
  arbol:      { x: 470,  y: 300, w: 200, h: 340, arquetipo: "planta",  variantes: 8, caduca: true },
  farola:     { x: 1010, y: 250, w: 60,  h: 390, arquetipo: "poste",   variantes: 3 },
  banco:      { x: 90,   y: 586, w: 150, h: 54,  arquetipo: "bulto",   variantes: 3 },
  // Atada a la farola.
  bici:       { x: 992,  y: 588, w: 96,  h: 52,  arquetipo: "bulto",   variantes: 5 },
  coche:      { x: 180,  y: 706, w: 330, h: 122, arquetipo: "bulto",   variantes: 5 },
  contenedor: { x: 1110, y: 700, w: 190, h: 116, arquetipo: "bulto",   variantes: 5 },
};

/** El local de la tienda: decorado fijo, siempre abierto. */
export const TIENDA = { x: 580, y: 430, w: 430, h: 210 };

/** Dónde vive cada objeto en una composición: es lo único que una escena puede mover. */
export type Cajas = Record<string, { x: number; y: number; w: number; h: number }>;

/** Las cajas del catálogo, que son también las del alzado. */
export const CAJAS: Cajas = Object.fromEntries(
  Object.entries(PIEZAS).map(([id, p]) => [id, { x: p.x, y: p.y, w: p.w, h: p.h }]),
);
