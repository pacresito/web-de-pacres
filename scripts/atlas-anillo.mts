// El anillo de un atolón o un banco, sacado de la batimetría de las teselas terrarium — las
// mismas que ya baja el relieve. Lo usa scripts/atlas-geo.mts para los países cuya forma no es
// su tierra sino la plataforma somera que la sostiene.
//
// Natural Earth trae arrecife y basta donde lo trae entero (Tuvalu, Maldivas, las Marshall).
// Donde no —Tarawa son tres fragmentos sueltos que no cierran nada— la plataforma sí está en la
// batimetría, y una isobata la dibuja.
//
// No importa nada de atlas-geo salvo tipos: recibe la vuelta a la esfera como función. Así no hay
// ciclo entre los dos módulos y la proyección sigue viviendo en un solo sitio.
import fs from "node:fs";
import sharp from "sharp";
import type { Anillo } from "./atlas-geo.mjs";

const TESELAS = process.env.ATLAS_TESELAS ?? ".cache-atlas/teselas";
const FUENTE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const LADO = 256;

// **z10 es el techo, y no por resolución: por encima, terrarium rellena el mar con ceros** y la
// batimetría desaparece sin más aviso que un país rodeado de tierra llana.
const Z = 10;

// Cuánto se ensancha la ventana de muestreo frente a la tierra del panel. El talud de un atolón
// cae lejos de sus islotes, y muestreando solo la caja de la tierra el contorno sale cortado por
// el borde de la ventana — que es un corte inventado, no una forma.
const EXPANDIR = 3;
const N = 400;      // lado de la malla de muestreo
const CERCA_KM = 8; // lo que puede alejarse un tramo de la tierra del país antes de ser un vecino
const AREA_MIN = 4; // km²: por debajo es una mota del modelo, no una plataforma

const rad = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/**
 * Qué anillo lleva cada país, si lleva. `margen` recorta el contorno a la caja de la tierra
 * ensanchada, igual que `MARGEN_ARRECIFE` hace con el coral y por el mismo motivo: la isobata
 * sigue por la dorsal hasta el atolón vecino, cuya tierra no se dibuja, y dejaría un anillo vacío
 * colgando. Es además lo que **deja el arco abierto**: un atolón cerrado a compás es un círculo, y
 * lo que se reconoce de Tarawa es la escuadra, no la circunferencia.
 *
 * `paneles` limita el anillo a los paneles que se dicen; sin él van todos. `mayor` se queda solo
 * con el tramo más largo y `oeste` solo con los que caen a ese lado del centro de la tierra: son
 * para el país al que la isobata le dibuja de verdad más de una línea y solo una hace falta.
 */
export type Anilla = {
  nivel?: number;    // isobata, en metros (negativa)
  sigma?: number;    // desenfoque previo, en celdas de la malla
  margen?: number;   // km que se ensancha la caja de la tierra al recortar
  minKm?: number;    // largo mínimo de un tramo tras recortar
  paneles?: number[];
  mayor?: boolean;
  oeste?: boolean;
};

const POR_DEFECTO = { nivel: -500, sigma: 2, margen: 12, minKm: 20 };

// ── Teselas ────────────────────────────────────────────────────────────────────────────────
// Terrarium: la elevación en metros va empaquetada en el color, R×256 + G + B/256 − 32768.
const enMemoria = new Map<string, Float32Array>();

/** Una tesela de elevación, en metros. La comparte build-atlas-relieve.mts. */
export async function teselaTerrarium(z: number, x: number, y: number): Promise<Float32Array> {
  const clave = `${z}/${x}/${y}`;
  const ya = enMemoria.get(clave);
  if (ya) return ya;
  const archivo = `${TESELAS}/${clave}.png`;
  if (!fs.existsSync(archivo)) {
    const r = await fetch(`${FUENTE}/${clave}.png`);
    if (!r.ok) throw new Error(`tesela ${clave}: HTTP ${r.status}`);
    fs.mkdirSync(`${TESELAS}/${z}/${x}`, { recursive: true });
    fs.writeFileSync(archivo, Buffer.from(await r.arrayBuffer()));
  }
  const { data } = await sharp(archivo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const m = new Float32Array(LADO * LADO);
  for (let i = 0; i < m.length; i++)
    m[i] = data[i * 3] * LADO + data[i * 3 + 1] + data[i * 3 + 2] / LADO - 32768;
  enMemoria.set(clave, m);
  return m;
}

// ── Malla ──────────────────────────────────────────────────────────────────────────────────
function cajaDe(anillos: Anillo[]) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const a of anillos) for (const [x, y] of a) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, x1, y0, y1 };
}

/** La elevación en una ventana cuadrada de km alrededor de la tierra del panel. */
async function malla(tierra: Anillo[], aLonLat: (x: number, y: number) => [number, number]) {
  const b = cajaDe(tierra);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const lado = Math.max(b.x1 - b.x0, b.y1 - b.y0, 10) * EXPANDIR;
  const m = new Float32Array(N * N);
  const total = 2 ** Z * LADO;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const [lon, lat] = aLonLat(cx - lado / 2 + (lado * (i + 0.5)) / N, cy + lado / 2 - (lado * (j + 0.5)) / N);
    const mx = ((((lon / 360 + 0.5) % 1) + 1) % 1) * total;
    const my = (0.5 - Math.log(Math.tan(Math.PI / 4 + (clamp(lat, -85, 85) * rad) / 2)) / (2 * Math.PI)) * total;
    if (my < 0 || my >= total) { m[j * N + i] = -9999; continue; }
    const t = await teselaTerrarium(Z, Math.floor(mx / LADO), Math.floor(my / LADO));
    m[j * N + i] = t[(Math.floor(my) % LADO) * LADO + (Math.floor(mx) % LADO)];
  }
  return { m, cx, cy, lado };
}

/** Gaussiano separable. Los bordes repiten el último valor: no hay nada más allá que promediar. */
function desenfocar(g: Float32Array, sigma: number): Float32Array {
  if (sigma <= 0) return g;
  const r = Math.ceil(sigma * 3), k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) s += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const paso = (a: Float32Array, hor: boolean) => {
    const o = new Float32Array(a.length);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++)
        v += a[(hor ? y : clamp(y + i, 0, N - 1)) * N + (hor ? clamp(x + i, 0, N - 1) : x)] * k[i + r];
      o[y * N + x] = v;
    }
    return o;
  };
  return paso(paso(g, true), false);
}

/**
 * Lo hondo que no se alcanza desde el borde de la ventana es laguna, no mar abierto: se sube por
 * encima del nivel. Sin esto, cada bolsa honda que el modelo deja dentro de la laguna saca su
 * propio anillo interior y el atolón se llena de garabatos.
 */
function taparLagunas(g: Float32Array, nivel: number): Float32Array {
  const fuera = new Uint8Array(N * N);
  const pila: number[] = [];
  for (let i = 0; i < N; i++) for (const k of [i, (N - 1) * N + i, i * N, i * N + N - 1])
    if (g[k] <= nivel && !fuera[k]) { fuera[k] = 1; pila.push(k); }
  while (pila.length) {
    const k = pila.pop()!, x = k % N, y = (k / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx;
      if (!fuera[j] && g[j] <= nivel) { fuera[j] = 1; pila.push(j); }
    }
  }
  const out = Float32Array.from(g);
  for (let k = 0; k < g.length; k++) if (g[k] <= nivel && !fuera[k]) out[k] = nivel + 10;
  return out;
}

// ── Isolínea ───────────────────────────────────────────────────────────────────────────────
/** Marching squares: los segmentos de la isolínea, en celdas de la malla. */
function segmentos(g: Float32Array, nivel: number): [number, number, number, number][] {
  const seg: [number, number, number, number][] = [];
  const cortar = (a: [number, number], va: number, b: [number, number], vb: number): [number, number] => {
    const t = clamp((nivel - va) / (vb - va), 0, 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const v = [g[j * N + i], g[j * N + i + 1], g[(j + 1) * N + i + 1], g[(j + 1) * N + i]];
    const p: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    const c = v.map((x) => (x > nivel ? 1 : 0));
    if (c[0] === c[1] && c[1] === c[2] && c[2] === c[3]) continue;
    // Los cuatro lados, en orden: arriba, derecha, abajo, izquierda.
    const lado = [
      c[0] !== c[1] ? cortar(p[0], v[0], p[1], v[1]) : null,
      c[1] !== c[2] ? cortar(p[1], v[1], p[2], v[2]) : null,
      c[2] !== c[3] ? cortar(p[2], v[2], p[3], v[3]) : null,
      c[3] !== c[0] ? cortar(p[3], v[3], p[0], v[0]) : null,
    ];
    const vivos = lado.map((l, k) => (l ? k : -1)).filter((k) => k >= 0);
    // Con dos cortes sale un segmento; con cuatro es una silla y se unen los lados contiguos.
    if (vivos.length === 2) seg.push([...lado[vivos[0]]!, ...lado[vivos[1]]!] as [number, number, number, number]);
    else if (vivos.length === 4) {
      seg.push([...lado[0]!, ...lado[1]!] as [number, number, number, number]);
      seg.push([...lado[2]!, ...lado[3]!] as [number, number, number, number]);
    }
  }
  return seg;
}

/** Encadena los segmentos sueltos en polilíneas, uniendo por extremos coincidentes. */
function cadenas(seg: [number, number, number, number][]): Anillo[] {
  const clave = (x: number, y: number) => `${x.toFixed(4)},${y.toFixed(4)}`;
  const porPunto = new Map<string, number[]>();
  seg.forEach(([x0, y0, x1, y1], k) => {
    for (const c of [clave(x0, y0), clave(x1, y1)]) {
      if (!porPunto.has(c)) porPunto.set(c, []);
      porPunto.get(c)!.push(k);
    }
  });
  const usado = new Uint8Array(seg.length);
  const salida: Anillo[] = [];
  for (let k0 = 0; k0 < seg.length; k0++) {
    if (usado[k0]) continue;
    usado[k0] = 1;
    const linea: Anillo = [[seg[k0][0], seg[k0][1]], [seg[k0][2], seg[k0][3]]];
    for (const haciaElFinal of [true, false]) {
      for (;;) {
        const p = haciaElFinal ? linea[linea.length - 1] : linea[0];
        const sig = (porPunto.get(clave(p[0], p[1])) ?? []).find((k) => !usado[k]);
        if (sig === undefined) break;
        usado[sig] = 1;
        const [x0, y0, x1, y1] = seg[sig];
        const otro: [number, number] = clave(x0, y0) === clave(p[0], p[1]) ? [x1, y1] : [x0, y0];
        if (haciaElFinal) linea.push(otro); else linea.unshift(otro);
      }
    }
    if (linea.length >= 4) salida.push(linea);
  }
  return salida;
}

// ── Filtros ────────────────────────────────────────────────────────────────────────────────
const areaDe = (a: Anillo) => {
  let s = 0;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) s += (a[j][0] - a[i][0]) * (a[j][1] + a[i][1]);
  return Math.abs(s / 2);
};
const largoDe = (a: Anillo) =>
  a.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) : 0), 0);

/** Recorta a la caja de la tierra ensanchada, partiendo el tramo que se sale. */
function recortar(anillos: Anillo[], tierra: Anillo[], margen: number, minKm: number): Anillo[] {
  const b = cajaDe(tierra);
  const dentro = ([x, y]: [number, number]) =>
    x >= b.x0 - margen && x <= b.x1 + margen && y >= b.y0 - margen && y <= b.y1 + margen;
  const out: Anillo[] = [];
  for (const a of anillos) {
    let run: Anillo = [];
    for (const p of a) {
      if (dentro(p)) run.push(p);
      else { if (largoDe(run) >= minKm) out.push(run); run = []; }
    }
    if (largoDe(run) >= minKm) out.push(run);
  }
  return out;
}

/**
 * El anillo de un panel, en km desde su centro: un juego de anillos como los del coral, listo
 * para entrar en la caja del encuadre ANTES de escalar. Calculado después, un contorno más ancho
 * que el encuadre sale cortado por el borde del lienzo.
 */
export async function anilloDelPanel(
  tierra: Anillo[],
  aLonLat: (x: number, y: number) => [number, number],
  a: Anilla,
): Promise<Anillo[]> {
  const { nivel, sigma, margen, minKm } = { ...POR_DEFECTO, ...a };
  const { m, cx, cy, lado } = await malla(tierra, aLonLat);
  const campo = taparLagunas(desenfocar(m, sigma), nivel);
  const aKm = ([x, y]: [number, number]): [number, number] =>
    [cx - lado / 2 + (x / (N - 1)) * lado, cy + lado / 2 - (y / (N - 1)) * lado];

  const puntos = tierra.flat();
  let lineas = cadenas(segmentos(campo, nivel)).map((l) => l.map(aKm)).filter((l) => {
    const cerrada = Math.hypot(l[0][0] - l[l.length - 1][0], l[0][1] - l[l.length - 1][1]) < (lado / N) * 2;
    if (cerrada ? areaDe(l) < AREA_MIN : largoDe(l) < Math.sqrt(AREA_MIN) * 4) return false;
    // El contorno del fondo no sabe de fronteras: fuera el que no abraza tierra del país.
    return l.some(([x, y]) => puntos.some(([p, q]) => Math.hypot(x - p, y - q) < CERCA_KM));
  });
  lineas = recortar(lineas, tierra, margen, minKm);
  if (a.oeste) {
    const b = cajaDe(tierra), medio = (b.x0 + b.x1) / 2;
    lineas = lineas.filter((l) => l.reduce((n, p) => n + p[0], 0) / l.length < medio);
  }
  if (a.mayor && lineas.length) lineas = [lineas.reduce((x, y) => (largoDe(y) > largoDe(x) ? y : x))];
  return lineas;
}
