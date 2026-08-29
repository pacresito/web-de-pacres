// La geometría común de Atlas: qué polígonos componen cada país y cómo se proyectan al lienzo
// de 1000×1000. La comparten `build-atlas-formas.mts`, que traza la silueta, y
// `build-atlas-relieve.mts`, que pinta el relieve dentro de ella.
//
// Vive aparte porque un relieve calculado con una copia de estas cuentas encaja en la silueta
// mientras las dos copias no se separen, y el día que se separen nada falla: la imagen se
// desplaza unos píxeles dentro de un recorte que la disimula.
//
// Tres decisiones viven aquí y no en el render:
//  - Proyección azimutal equivalente de Lambert CENTRADA EN CADA PAÍS. Sin ella, Mercator
//    infla lo polar y Rusia se parte por el antimeridiano; centrada, el corte nunca cae dentro.
//  - Un país se queda con su masa reconocible y suelta lo lejano. Canarias, Guayana, Svalbard
//    y la isla de Pascua caben en la caja, pero comprimen el resto hasta volverlo ilegible.
//  - La silueta va NORMALIZADA —cada país llena su caja— para que la forma se lea sin
//    distorsión. El tamaño y la ubicación no se pierden: los cuenta el globo que va al lado.
import fs from "node:fs";
import { PAISES } from "../lib/atlas/paises";

const BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const GB = "https://www.geoboundaries.org/api/current/gbOpen"; // solo para los diminutos, ver abajo
const CACHE = process.env.ATLAS_CACHE; // carpeta con los geojson ya bajados, para iterar sin red
const MARGEN_ARRECIFE = 0.3; // grados: cuánto se ensancha la caja del país al buscarle arrecife

export const R = 6371;   // km
export const BOX = 1000; // lado del lienzo de cada silueta
export const PAD = 0.06; // margen por lado, en fracción de la caja
const HUECO = 90;        // lo que se aparta cada panel de la línea del medio

export const TOL = 1.2;  // px: tolerancia de Douglas-Peucker para la silueta
// Natural Earth 1:10m está pensado para verse a escala mundial y a los países diminutos les da
// una miseria de puntos: Mónaco es un dodecágono y Malta y Gozo suman 55 vértices. Normalizados
// a pantalla completa eso no es una costa, es un garabato. Por debajo de este umbral se pide el
// contorno a geoBoundaries, que da 840 puntos para Mónaco y 5.425 para el archipiélago maltés.
const MIN_PUNTOS = 400;
// La costa real de Malta a 24 km es tan dentada que a resolución alta sale ruidosa. Se aplana
// más: lo que hay que reconocer es el contorno de la isla, no cada cala.
const TOL_ALTA = 2.2;

// Los archipiélagos del Pacífico y del Índico no los resuelve ninguna regla general: son puñados
// de atolones repartidos por miles de kilómetros, y dibujados enteros dan una constelación de
// motas donde debería haber una silueta. Peor aún, en las fuentes de alta resolución un arrecife
// deshabitado encierra más grados² que la isla de la capital, así que "el polígono mayor" ni
// siquiera apunta al sitio correcto. Aquí se dice a mano en torno a qué punto se recorta y con
// cuánto radio en km: lo que queda es la isla que se reconoce, casi siempre la de la capital.
//
// `tol` sube la simplificación de los diminutos: a 6 km de ancho, el contorno de geoBoundaries
// dibuja los puertos, y un puerto no es lo que hay que reconocer de Nauru.
//
// `paneles` es para los dos que ni recortados dan una silueta: sus dos islas de verdad están a
// miles de kilómetros y a escala real cada una sería una mota. Se dibujan una al lado de la otra
// **con la misma escala** —el tamaño entre ellas sigue siendo verdad— y la línea discontinua del
// medio dice que lo que no está a escala es la distancia. Los paneles van de oeste a este, como
// un mapa; el globo y el punto del minimapa se plantan en el mayor de los dos.
//
// `arrecife` dibuja además el coral de Natural Earth, trazado y sin rellenar. Es para el país
// cuya forma **no es su tierra**: en un archipiélago de atolones la tierra son islotes de dos
// kilómetros repartidos por ochocientos, y a tamaño de silueta eso no es una forma, es polvo. El
// anillo del atolón sí lo es, y es lo que dibuja cualquier mapa del país. Va país a país porque
// el coral solo manda donde el atolón **es** el país: en Australia sería la Gran Barrera pegada
// a un continente, que no es la forma de nada.
//
// **Donde hay coral, gana a `cerca`.** Recortar a un atolón da una silueta limpia, pero de un país
// que no existe: Tuvalu son nueve atolones repartidos por 600 km, no Funafuti solo. El recorte se
// queda para los que no tienen anillo que dibujar.
//
// `islas` baja el suelo de las islas que se quedan a un absoluto en km², para el país al que la
// regla relativa le come las suyas: `MIN_AREA_REL` mide contra el polígono mayor, así que cuanto
// más grande es la masa principal más grande tiene que ser la isla para sobrevivir. También va
// país a país, y no como regla general, porque no hay suelo absoluto que sirva a la vez: el que
// deja pasar Formentera (91 km²) mete 931 islas más en el mundo —Canadá 186, Rusia 112, Chile
// 119—, y una costa fiordo no se lee mejor con doscientos islotes alrededor.
// `cadena` mide `MAX_KM` desde todo lo admitido y no solo desde el polígono mayor, para el país
// que **es** una ristra: medida desde el mayor, una cadena continua se corta por donde la isla
// grande se queda atrás, y el país sale amputado sin que falte ningún salto. Va país a país
// porque el precio es que lo que entra estira el lienzo y **encoge todo lo demás**: a Japón le
// costaría un cuarto del tamaño de sus cuatro islas por traerse Ryukyu, y ahí no compensa.
//
// `salto` sube `MAX_KM` solo para un país, y es lo que necesita el que tiene **dos masas de
// verdad** demasiado lejos la una de la otra. No hay tope general que sirva: subirlo a 600 para
// todos trae la península malaya, sí, pero también pone a Mauricio en un lienzo diez veces más
// grande para dibujarle Rodrigues —99 km²— y a las Marshall uno un 40 % mayor por un km². Lo que
// justifica el salto es cuánta masa entra, no cuánta distancia se salva.
export const AJUSTES: Record<string, { cerca?: Cerca; paneles?: [Cerca, Cerca]; tol?: number; arrecife?: boolean; islas?: number; cadena?: boolean; salto?: number }> = {
  bs: { cerca: [-77.5, 25.5, 260] },  // el racimo del noroeste: Andros, Gran Bahama, Ábaco
  ca: { cadena: true },
  es: { islas: 60 },                  // Menorca, Ibiza y Formentera, que la regla relativa suelta
  fm: { paneles: [[151.8, 7.4, 60], [158.2, 6.9, 60]] },   // la laguna de Chuuk y Pohnpei
  id: { cadena: true },               // sin ella no dibuja ni Sumatra ni Papúa
  ki: { paneles: [[172.98, 1.35, 30], [-157.4, 1.9, 60]] }, // Tarawa y Kiritimati
  mh: { arrecife: true, cadena: true }, // las dos hileras de atolones, no solo Majuro
  mv: { arrecife: true, cadena: true }, // los atolones, que son lo que se reconoce, y los 871 km
  my: { salto: 600 },                 // los 554 km entre la península y Borneo: sin esto, medio país
  nr: { tol: 6 },
  pg: { cadena: true },
  ph: { cadena: true },
  pw: { cerca: [134.5, 7.5, 60] },    // Babeldaob y Koror, no los arrecifes del suroeste
  sb: { cadena: true },
  sc: { cerca: [55.5, -4.6, 60] },    // Mahé, Praslin y La Digue
  to: { cerca: [-175.2, -21.2, 60] }, // Tongatapu
  tv: { arrecife: true, cadena: true }, // los nueve atolones, no solo Funafuti
  vu: { cadena: true },
};

// Se conserva lo que pesa algo Y cae cerca: Gozo, Baleares, Córcega, Sicilia, Cerdeña. Se
// sueltan Canarias, Svalbard, Azores, Madeira, Guayana, Pascua y Hawái.
//
// La cercanía se mide en KILÓMETROS, no en fracción del país. Relativa no funciona: el 25 % de
// la caja de Malta son 5 km y Gozo está a 6, así que la misma regla que suelta Svalbard —a 650
// km de Noruega— soltaba media Malta. En absoluto los dos casos caen donde deben.
const MIN_AREA_REL = 0.002; // frente al polígono mayor
const MAX_KM = 300;         // del polígono mayor, salvo que el país traiga su `salto`

const rad = Math.PI / 180;
export type Anillo = [number, number][];
export type Poly = Anillo[];
export type Geometria = { type: "Polygon"; coordinates: Poly } | { type: "MultiPolygon"; coordinates: Poly[] };
/** En torno a qué punto se recorta una silueta y con cuánto radio, en km. */
export type Cerca = [number, number, number];
export type Pieza = { properties: Record<string, string | number | null>; geometry: Geometria };
export type Caja = { x0: number; x1: number; y0: number; y1: number };

/** Un panel: los polígonos que lo forman, ya proyectados, y dónde está su centro en la esfera. */
export type Grupo = {
  polys: Poly[];
  coral: Anillo[];
  c: Caja;          // caja en lon/lat de la tierra del grupo
  lon0: number;     // centro de la proyección
  lat0: number;
  proy: Anillo[];   // los anillos exteriores, en km desde el centro
  proyCoral: Anillo[];
  b: Caja;          // caja de lo proyectado, tierra y coral
  area: number;
};

/** Cómo se pasa del plano proyectado del panel al lienzo, y de vuelta a la esfera. */
export type Pincel = {
  px: (x: number) => number;
  py: (y: number) => number;
  /** Del lienzo a lon/lat: lo que necesita quien muestrea una imagen píxel a píxel. */
  lonlat: (px: number, py: number) => [number, number];
};

export type Encuadre = {
  id: string;
  nombre: string;
  grupos: Grupo[];
  pinta: Pincel[];  // uno por grupo, en el mismo orden
  escala: number;   // px del lienzo por km, la misma para todos los paneles
  tol: number;      // la simplificación que le toca a este país
};

const cargarLocal = (nombre: string) => CACHE && `${CACHE}/${nombre}`;

export const cargar = async (nombre: string): Promise<{ features: Pieza[] }> => {
  const local = cargarLocal(`${nombre}.geojson`);
  return JSON.parse(local ? fs.readFileSync(local, "utf8")
                          : await (await fetch(`${BASE}/${nombre}.geojson`)).text());
};

// El contorno de alta resolución de un país suelto. Se usa poco —una veintena de los 195— así
// que se pide uno a uno. Devuelve null si no lo hay: entonces manda Natural Earth.
async function contornoAlto(iso3: string): Promise<Poly[] | null> {
  const local = cargarLocal(`gb-${iso3}.json`);
  try {
    let crudo: string;
    if (local && fs.existsSync(local)) crudo = fs.readFileSync(local, "utf8");
    else {
      const meta = (await (await fetch(`${GB}/${iso3}/ADM0/`)).json()) as { gjDownloadURL?: string };
      if (!meta.gjDownloadURL) return null;
      crudo = await (await fetch(meta.gjDownloadURL)).text();
      if (local) fs.writeFileSync(local, crudo);
    }
    const g = (JSON.parse(crudo) as { features: Pieza[] }).features[0]?.geometry;
    return g ? polysDe(g) : null;
  } catch {
    return null;
  }
}

export const polysDe = (g: Geometria): Poly[] => (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]);

function areaRel(anillo: Anillo): number { // cordón, en grados²: solo compara polígonos entre sí
  let a = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++)
    a += (anillo[j][0] - anillo[i][0]) * (anillo[j][1] + anillo[i][1]);
  return Math.abs(a / 2);
}

export function caja(anillos: Anillo[]): Caja {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const a of anillos) for (const [x, y] of a) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, x1, y0, y1 };
}

/** Separación en km entre dos cajas; 0 si se tocan o solapan. */
function kmEntre(a: Caja, b: Caja): number {
  const dLat = Math.max(0, a.y0 - b.y1, b.y0 - a.y1) * 111;
  const lat = (a.y0 + a.y1 + b.y0 + b.y1) / 4;
  const dLon = Math.max(0, a.x0 - b.x1, b.x0 - a.x1) * 111 * Math.cos(lat * rad);
  return Math.hypot(dLat, dLon);
}

/** Los polígonos que caen dentro del radio de un punto: el recorte de los archipiélagos. */
function recortar(polys: Poly[], [lon, lat, km]: Cerca, nombre: string): Poly[] {
  const punto = { x0: lon, x1: lon, y0: lat, y1: lat };
  const cerca = polys.filter((poly) => kmEntre(punto, caja([poly[0]])) <= km);
  if (!cerca.length) throw new Error(`el recorte de ${nombre} no deja ninguna isla`);
  return cerca;
}

/** El área de un anillo en km². `areaRel` va en grados², que solo sirve para comparar entre sí. */
function km2De(anillo: Anillo, grados: number): number {
  const c = caja([anillo]);
  return grados * 111 * 111 * Math.cos(((c.y0 + c.y1) / 2) * rad);
}

function polysQueSeQuedan(polys: Poly[], suelo = 0, cadena = false, max = MAX_KM): Poly[] {
  if (polys.length === 1) return polys;
  const areas = polys.map((p) => areaRel(p[0]));
  const mayor = areas.indexOf(Math.max(...areas));
  const cajas = polys.map((p) => caja([p[0]]));
  const pesa = (i: number) =>
    areas[i] >= areas[mayor] * MIN_AREA_REL || (suelo > 0 && km2De(polys[i][0], areas[i]) >= suelo);
  // `MAX_KM` se mide desde el polígono mayor; con `cadena`, desde todo lo ya admitido, así que
  // la distancia se recorre a saltos y una ristra de islas entra entera.
  const dentro = new Set([mayor]);
  for (let crece = true; crece; ) {
    crece = false;
    for (let i = 0; i < polys.length; i++) {
      if (dentro.has(i) || !pesa(i)) continue;
      const llega = cadena
        ? [...dentro].some((j) => kmEntre(cajas[j], cajas[i]) <= max)
        : kmEntre(cajas[mayor], cajas[i]) <= max;
      if (llega) { dentro.add(i); crece = cadena; }
    }
  }
  return polys.filter((_, i) => dentro.has(i));
}

// Lambert azimutal equivalente centrada en (lon0, lat0), en km. La resta de longitudes entra
// en un coseno, así que el antimeridiano se cruza solo y no hace falta partir nada.
export function laea(lon: number, lat: number, lon0: number, lat0: number): [number, number] {
  const f = lat * rad, l = (lon - lon0) * rad, f1 = lat0 * rad;
  const cosc = Math.sin(f1) * Math.sin(f) + Math.cos(f1) * Math.cos(f) * Math.cos(l);
  const k = Math.sqrt(Math.max(0, 2 / (1 + cosc)));
  return [R * k * Math.cos(f) * Math.sin(l),
          R * k * (Math.cos(f1) * Math.sin(f) - Math.sin(f1) * Math.cos(f) * Math.cos(l))];
}

/** La vuelta de `laea`: de km desde el centro a lon/lat. */
export function laeaInv(x: number, y: number, lon0: number, lat0: number): [number, number] {
  const rho = Math.hypot(x, y) / R;
  if (rho === 0) return [lon0, lat0];
  const c = 2 * Math.asin(Math.min(1, rho / 2)), f1 = lat0 * rad;
  const sc = Math.sin(c), cc = Math.cos(c);
  const lat = Math.asin(cc * Math.sin(f1) + ((y / R) * sc * Math.cos(f1)) / rho);
  const lon = lon0 + Math.atan2((x / R) * sc, rho * cc * Math.cos(f1) - (y / R) * sc * Math.sin(f1)) / rad;
  return [lon, lat / rad];
}

/** Todos los países, con sus polígonos elegidos y proyectados y su sitio en el lienzo. */
export async function encuadres(): Promise<Encuadre[]> {
  const g10 = await cargar("ne_10m_admin_0_countries");
  const porIso = new Map<string, Pieza>();
  for (const f of g10.features) {
    const iso = String(f.properties.ISO_A2_EH ?? f.properties.ISO_A2 ?? "").toLowerCase();
    if (iso && iso !== "-99" && !porIso.has(iso)) porIso.set(iso, f);
  }

  // El coral, para los países que lo piden en AJUSTES: líneas sueltas en lon/lat, no polígonos —
  // un arrecife no encierra nada, es el borde de lo que asoma.
  const arrecifes: Anillo[] = (await cargar("ne_10m_reefs") as unknown as
    { features: { geometry: { coordinates: Anillo } }[] }).features.map((f) => f.geometry.coordinates);

  const salida: Encuadre[] = [];
  for (const p of PAISES) {
    const feat = porIso.get(p.id);
    if (!feat) throw new Error(`Natural Earth no trae ${p.nombre} (${p.id})`);
    if (feat.properties.NAME_ES !== p.nombre)
      console.warn(`  aviso  ${p.id}: NAME_ES="${feat.properties.NAME_ES}" y paises.ts dice "${p.nombre}"`);

    let crudo = polysDe(feat.geometry);
    let tol = TOL;
    const puntosNE = crudo.reduce((n, poly) => n + poly.flat().length, 0);
    if (puntosNE < MIN_PUNTOS) {
      const iso3 = String(feat.properties.ISO_A3_EH ?? feat.properties.ISO_A3 ?? "");
      const alto = iso3 && (await contornoAlto(iso3));
      if (alto) {
        console.log(`  ${p.nombre}: ${puntosNE} puntos en Natural Earth, ${alto.reduce((n, q) => n + q.flat().length, 0)} en geoBoundaries`);
        crudo = alto;
        tol = TOL_ALTA;
      }
    }
    const ajuste = AJUSTES[p.id];
    if (ajuste?.tol) tol = ajuste.tol;
    if (ajuste?.cerca) crudo = recortar(crudo, ajuste.cerca, p.nombre);

    // Un grupo por panel, o uno solo con todo el país. Solo el anillo exterior de cada polígono:
    // los agujeros de una fuente de alta resolución son dársenas y puertos, y en una silueta que
    // se memoriza son manchas blancas sin significado.
    const grupos: Grupo[] = (ajuste?.paneles ?? [null]).map((cerca) => {
      const polys = polysQueSeQuedan(cerca ? recortar(crudo, cerca, p.nombre) : crudo, ajuste?.islas, ajuste?.cadena, ajuste?.salto);
      const anillos = polys.map((poly) => poly[0]);
      const c = caja(anillos);
      const lon0 = (c.x0 + c.x1) / 2, lat0 = (c.y0 + c.y1) / 2;
      // El coral de la caja del país, ensanchada: el anillo del atolón asoma bastante por fuera del
      // islote que lo corona. Se exige la línea **entera** dentro para no cortar un arrecife por el
      // borde de la caja y dejar medio anillo suelto flotando.
      const coral = !ajuste?.arrecife ? [] : arrecifes.filter((linea) => linea.every(([lon, lat]) =>
        lon >= c.x0 - MARGEN_ARRECIFE && lon <= c.x1 + MARGEN_ARRECIFE &&
        lat >= c.y0 - MARGEN_ARRECIFE && lat <= c.y1 + MARGEN_ARRECIFE));
      const proyectar = (a: Anillo) => a.map(([lon, lat]) => laea(lon, lat, lon0, lat0)) as Anillo;
      const proy = anillos.map(proyectar), proyCoral = coral.map(proyectar);
      return { polys, coral, c, lon0, lat0, proy, proyCoral, b: caja([...proy, ...proyCoral]),
               area: anillos.reduce((n, a) => n + areaRel(a), 0) };
    });

    // Los paneles comparten escala: la que hace caber al que peor lo tiene. El tamaño de uno frente
    // al otro sigue siendo verdad — lo único que se falsea es la distancia, y de eso avisa la línea.
    const cajas = grupos.map((_, i) => grupos.length === 1
      ? [PAD * BOX, BOX * (1 - PAD)]
      : i === 0 ? [PAD * BOX, BOX / 2 - HUECO / 2] : [BOX / 2 + HUECO / 2, BOX * (1 - PAD)]);
    const escala = Math.min(...grupos.map(({ b }, i) =>
      Math.min((cajas[i][1] - cajas[i][0]) / (b.x1 - b.x0), (BOX * (1 - 2 * PAD)) / (b.y1 - b.y0))));

    const pinta: Pincel[] = grupos.map(({ b, lon0, lat0 }, i) => {
      const cx = (cajas[i][0] + cajas[i][1]) / 2, mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
      return {
        px: (x) => cx + (x - mx) * escala,
        py: (y) => BOX / 2 - (y - my) * escala,
        lonlat: (px, py) => laeaInv(mx + (px - cx) / escala, my + (BOX / 2 - py) / escala, lon0, lat0),
      };
    });

    salida.push({ id: p.id, nombre: p.nombre, grupos, pinta, escala, tol });
  }
  return salida;
}
