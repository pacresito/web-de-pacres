// Genera public/atlas/relieve/<iso>-<tema>.webp: el relieve que va dentro de la silueta de
// /juegos/atlas, y data/atlas/relieve.ts con la lista de los países que lo tienen.
// `npx tsx scripts/build-atlas-relieve.mts [iso…]` — sin países, los hace todos y escribe
// la lista; con países, solo esos y sin tocarla, que es como se mira una imagen suelta.
//
// El encuadre —qué polígonos, qué proyección, qué escala— lo da scripts/atlas-geo.mts, el mismo
// que traza la silueta, y la máscara sale del path ya generado en data/atlas/formas.ts: el
// relieve tiene que caer dentro del contorno al píxel.
//
// **El sentido del color va hacia abajo: el nivel del mar es el acento y la cumbre verde
// profundo.** El contorno de un país está casi siempre al nivel del mar, así que pintar la
// altitud hacia el papel dejaría el borde del país en el color de mínimo contraste justo donde
// más falta hace. Invertido, la costa se pinta con el máximo y el relieve le da contraste al
// borde en vez de quitárselo.
import fs from "node:fs";
import sharp from "sharp";
import { BOX, encuadres, type Encuadre } from "./atlas-geo.mjs";
import { teselaTerrarium } from "./atlas-anillo.mjs";
import { FORMAS } from "../data/atlas/formas";

const SALIDA = "public/atlas/relieve";
const LISTA = new URL("../data/atlas/relieve.ts", import.meta.url);

const PX = 512;        // lado del webp
const CALIDAD = 82;

// El dato público es SRTM a 30 m. Por debajo de cuatro celdas por píxel del lienzo se pintaría
// interpolación en vez de medida, así que el país se queda plano. Se lleva por delante a Andorra
// y Liechtenstein, de los más montañosos que hay: es el precio de no inventar.
const MPX_MIN = 120;   // metros por píxel del lienzo de 1000
// Por debajo de este desnivel no hay nada que enseñar: los Países Bajos salen de un solo color.
// El corte se eligió mirándolo, y va donde acaba lo plano de verdad y no donde empieza lo que se
// lee: por encima quedan una docena de países que son solo un rubor —Belarús, Estonia,
// Lituania—, y un rubor no dice mucho pero tampoco estorba, mientras que un país plano pintado
// con el degradado entero sí miente.
const DESNIVEL_MIN = 130; // m

const GAMMA = 2.0;     // cuánto tarda en oscurecer: con 1 el país se apaga desde el primer metro
const K = 0.85;        // peso de la ladera: por encima de 1 la sombra se come la altitud
const VE = 6;          // exageración del hillshade, la misma para todos
const TECHO_MIN = 300; // m: impide que un país de 302 m gaste la paleta en pintar una duna
const P_TECHO = 97;    // percentil del techo. Los máximos crudos son ruido del modelo: el de
const P_ALTO = 99;     // Uruguay da 1.538 m y su cima real son 514
const P_BAJO = 1;
const SIGMA_SOMBRA = 1.2; // px de suavizado antes del hillshade
const SIGMA_ALTURA = 2.0; // y antes de la altitud, que aguanta más sin perder las sierras

const SOL_AZ = 315, SOL_ALT = 45; // el hillshade de toda la vida: sol al noroeste, a media altura

// Dos archivos por país porque aquí el color **es** el dato —el degradado va del acento al verde
// profundo—, así que no vale una máscara gris teñida por CSS.
//
// **El mar es exactamente el acento**, y de ahí no se mueve: el contorno se traza con él, y en
// cuanto la costa deja de ser ese color el perfil se despega del interior como una línea suelta.
// Aplanar el mapa, entonces, solo se puede hacia arriba: subiendo la cumbre. La de aquí está
// cuatro pasos por encima del verde más profundo que aguanta el degradado — se eligió mirándola,
// y lo que compra es que el país no se lea como una mancha oscura; lo que cuesta, que las sierras
// se distingan menos entre sí.
const PALETAS = {
  claro:  { mar: [0x00, 0xb8, 0x7a], cumbre: [0x08, 0x74, 0x55] },
  oscuro: { mar: [0x1f, 0xd8, 0x97], cumbre: [0x0b, 0x83, 0x5f] },
} as const;

const rad = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ── Teselas ────────────────────────────────────────────────────────────────────────────────
// Terrarium: la elevación en metros va empaquetada en el color, R×256 + G + B/256 − 32768.
type Tesela = Float32Array; // 256×256, en metros
const LADO_TESELA = 256;
// La descarga la lleva atlas-anillo.mts, que baja las mismas teselas para trazar la plataforma.
const tesela = teselaTerrarium;

/** Elevación bilineal en (lon, lat) al zoom z. Fuera de rango, nivel del mar. */
function elevacion(teselas: Map<string, Tesela>, z: number, lon: number, lat: number): number {
  const n = 2 ** z;
  const f = clamp(lat, -85.05, 85.05) * rad;
  // Web Mercator, en píxeles del mundo entero. El módulo cierra el antimeridiano: Rusia lo cruza
  // y sin él pediría la fila entera de teselas para llegar a Chukotka.
  const mx = (((lon / 360 + 0.5) % 1) + 1) % 1 * n * LADO_TESELA;
  const my = (0.5 - Math.log(Math.tan(Math.PI / 4 + f / 2)) / (2 * Math.PI)) * n * LADO_TESELA;
  const x0 = Math.floor(mx - 0.5), y0 = Math.floor(my - 0.5);
  const fx = mx - 0.5 - x0, fy = my - 0.5 - y0;
  const en = (x: number, y: number) => {
    const total = n * LADO_TESELA;
    if (y < 0 || y >= total) return 0;
    const xx = ((x % total) + total) % total;
    const t = teselas.get(`${z}/${Math.floor(xx / LADO_TESELA)}/${Math.floor(y / LADO_TESELA)}`);
    return t ? t[(y % LADO_TESELA) * LADO_TESELA + (xx % LADO_TESELA)] : 0;
  };
  return (en(x0, y0) * (1 - fx) + en(x0 + 1, y0) * fx) * (1 - fy)
       + (en(x0, y0 + 1) * (1 - fx) + en(x0 + 1, y0 + 1) * fx) * fy;
}

/** Las teselas que toca el muestreo, para pedirlas antes y muestrear sin esperar a la red. */
function teselasDe(z: number, lon: number, lat: number): string {
  const n = 2 ** z;
  const f = clamp(lat, -85.05, 85.05) * rad;
  const tx = Math.floor((((lon / 360 + 0.5) % 1) + 1) % 1 * n);
  const ty = clamp(Math.floor((0.5 - Math.log(Math.tan(Math.PI / 4 + f / 2)) / (2 * Math.PI)) * n), 0, n - 1);
  return `${z}/${tx}/${ty}`;
}

// ── Imagen ─────────────────────────────────────────────────────────────────────────────────

/** Gaussiano separable. Los bordes repiten el último píxel: no hay nada más allá que promediar. */
function desenfocar(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  let suma = 0;
  for (let i = -r; i <= r; i++) suma += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= suma;
  const paso = (a: Float32Array, horizontal: boolean) => {
    const out = new Float32Array(a.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0;
      for (let i = -r; i <= r; i++) {
        const xx = horizontal ? clamp(x + i, 0, w - 1) : x;
        const yy = horizontal ? y : clamp(y + i, 0, h - 1);
        v += a[yy * w + xx] * k[i + r];
      }
      out[y * w + x] = v;
    }
    return out;
  };
  return paso(paso(src, true), false);
}

function percentil(ordenado: Float32Array, p: number): number {
  if (!ordenado.length) return 0;
  return ordenado[clamp(Math.round((p / 100) * (ordenado.length - 1)), 0, ordenado.length - 1)];
}

const zenit = (90 - SOL_ALT) * rad;
const azimut = ((360 - SOL_AZ + 90) % 360) * rad;
const NEUTRO = Math.cos(zenit); // lo que devuelve el hillshade en llano: ahí no altera el tono

type Medida = { z: number; teselas: number; techo: number; desnivel: number; pintado: boolean };

async function pintar(e: Encuadre, mpxLienzo: number): Promise<Medida> {
  // El zoom que iguala la resolución de la imagen, no la del lienzo: pedir cuatro veces más
  // datos de los que caben en 512 px es descargar detalle para tirarlo.
  const mpx = mpxLienzo * (BOX / PX);
  const lat0 = e.grupos.reduce((a, g) => (g.area > a.area ? g : a)).lat0;
  const z = clamp(Math.round(Math.log2((156543.03 * Math.cos(lat0 * rad)) / mpx)), 0, 13);

  // De cada píxel de la imagen a lon/lat. Con dos paneles, cada mitad del lienzo es el suyo.
  const pincel = (px: number) => e.pinta[e.pinta.length > 1 && px >= BOX / 2 ? 1 : 0];
  const esfera = new Float64Array(PX * PX * 2);
  const hacenFalta = new Set<string>();
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const bx = ((x + 0.5) * BOX) / PX, by = ((y + 0.5) * BOX) / PX;
    const [lon, lat] = pincel(bx).lonlat(bx, by);
    esfera[(y * PX + x) * 2] = lon;
    esfera[(y * PX + x) * 2 + 1] = lat;
    hacenFalta.add(teselasDe(z, lon, lat));
  }

  const teselas = new Map<string, Tesela>();
  const claves = [...hacenFalta];
  for (let i = 0; i < claves.length; i += 8)
    await Promise.all(claves.slice(i, i + 8).map(async (c) => {
      const [tz, tx, ty] = c.split("/").map(Number);
      teselas.set(c, await tesela(tz, tx, ty));
    }));

  const crudo = new Float32Array(PX * PX);
  for (let i = 0; i < PX * PX; i++)
    // El mar a cero: la batimetría de la fuente metería en la costa una pendiente que no se ve
    // y que el hillshade convertiría en un halo alrededor del país.
    crudo[i] = Math.max(0, elevacion(teselas, z, esfera[i * 2], esfera[i * 2 + 1]));

  const mascara = (await sharp(Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${PX}" height="${PX}">`
    + `<path d="${FORMAS[e.id].d}" fill="#fff" fill-rule="evenodd"/></svg>`))
    .ensureAlpha().raw().toBuffer());

  const altura = desenfocar(crudo, PX, PX, SIGMA_ALTURA);
  const dentro: number[] = [];
  for (let i = 0; i < PX * PX; i++) if (mascara[i * 4 + 3] > 128) dentro.push(altura[i]);
  const ordenado = Float32Array.from(dentro).sort();
  const techo = Math.max(TECHO_MIN, percentil(ordenado, P_TECHO));
  const desnivel = percentil(ordenado, P_ALTO) - percentil(ordenado, P_BAJO);
  const medida = { z, teselas: teselas.size, techo, desnivel, pintado: false };
  if (desnivel < DESNIVEL_MIN) return medida;

  const sombreado = desenfocar(crudo, PX, PX, SIGMA_SOMBRA);
  const tono = new Float32Array(PX * PX);
  for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
    const en = (i: number, j: number) => sombreado[clamp(j, 0, PX - 1) * PX + clamp(i, 0, PX - 1)];
    const dx = ((en(x + 1, y) - en(x - 1, y)) / (2 * mpx)) * VE;
    const dy = ((en(x, y - 1) - en(x, y + 1)) / (2 * mpx)) * VE;
    const pendiente = Math.atan(Math.hypot(dx, dy));
    const cara = Math.atan2(dy, -dx);
    const luz = Math.cos(zenit) * Math.cos(pendiente)
              + Math.sin(zenit) * Math.sin(pendiente) * Math.cos(azimut - cara);
    // La ladera entra como modulación **alrededor** del tono de altitud, no como una resta:
    // restándola se apaga el país entero y las sierras dejan de distinguirse una a una.
    tono[y * PX + x] = clamp(
      (altura[y * PX + x] / techo) ** GAMMA + (NEUTRO - luz) * K, 0, 1);
  }

  fs.mkdirSync(SALIDA, { recursive: true });
  for (const [nombre, { mar, cumbre }] of Object.entries(PALETAS)) {
    const rgba = Buffer.alloc(PX * PX * 4);
    for (let i = 0; i < PX * PX; i++) {
      const t = tono[i];
      for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.round(mar[c] + (cumbre[c] - mar[c]) * t);
      rgba[i * 4 + 3] = mascara[i * 4 + 3];
    }
    await sharp(rgba, { raw: { width: PX, height: PX, channels: 4 } })
      .webp({ quality: CALIDAD }).toFile(`${SALIDA}/${e.id}-${nombre}.webp`);
  }
  return { ...medida, pintado: true };
}

// ── Corrida ────────────────────────────────────────────────────────────────────────────────

const pedidos = process.argv.slice(2);
const todos = await encuadres();
const conRelieve: string[] = [];
let kb = 0;

for (const e of todos) {
  if (pedidos.length && !pedidos.includes(e.id)) continue;
  const mpxLienzo = 1000 / e.escala;
  const arranque = Date.now();
  if (mpxLienzo < MPX_MIN) {
    console.log(`  ${e.nombre.padEnd(22)} plano · ${mpxLienzo.toFixed(0)} m/px, menos de cuatro celdas SRTM`);
    continue;
  }
  const m = await pintar(e, mpxLienzo);
  if (!m.pintado) {
    console.log(`  ${e.nombre.padEnd(22)} plano · desnivel ${m.desnivel.toFixed(0)} m`);
    continue;
  }
  conRelieve.push(e.id);
  const peso = ["claro", "oscuro"].reduce((n, t) => n + fs.statSync(`${SALIDA}/${e.id}-${t}.webp`).size, 0) / 1024;
  kb += peso;
  console.log(`  ${e.nombre.padEnd(22)} z${m.z} · ${String(m.teselas).padStart(3)} teselas · techo ${String(Math.round(m.techo)).padStart(5)} m · desnivel ${String(Math.round(m.desnivel)).padStart(5)} m · ${peso.toFixed(0)} KB · ${((Date.now() - arranque) / 1000).toFixed(1)} s`);
}

console.log(`\n${conRelieve.length} con relieve · ${(kb / 1024).toFixed(2)} MB`);

if (!pedidos.length) {
  fs.writeFileSync(LISTA, `// GENERADO por scripts/build-atlas-relieve.mts — no editar a mano.
// Los países que tienen relieve en public/atlas/relieve/. Los demás se pintan planos: sin esta
// lista, la única forma de saberlo sería un 404 por país.

export const CON_RELIEVE = new Set([${conRelieve.map((i) => `"${i}"`).join(", ")}]);
`);
  console.log(`data/atlas/relieve.ts ${(fs.statSync(LISTA).size / 1024).toFixed(1)} KB`);
}
