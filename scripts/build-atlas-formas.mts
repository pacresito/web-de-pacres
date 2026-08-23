// Genera data/atlas/formas.ts (siluetas de los países de Atlas) y data/atlas/mundo.ts (la
// costa del mundo para el globo) desde Natural Earth. Uso puntual:
// `npx tsx scripts/build-atlas-formas.mts`. Recorre solo los países de lib/atlas/paises.ts.
//
// La silueta va NORMALIZADA —cada país llena su caja— para que la forma se lea sin
// distorsión. El tamaño y la ubicación no se pierden: los cuenta el globo que va al lado,
// una ortográfica centrada en el país que se proyecta en el navegador desde mundo.ts.
//
// Tres decisiones viven aquí y no en el render:
//  - Proyección azimutal equivalente de Lambert CENTRADA EN CADA PAÍS. Sin ella, Mercator
//    infla lo polar y Rusia se parte por el antimeridiano; centrada, el corte nunca cae dentro.
//  - Un país se queda con su masa reconocible y suelta lo lejano. Canarias, Guayana, Svalbard
//    y la isla de Pascua caben en la caja, pero comprimen el resto hasta volverlo ilegible.
//  - Simplificación por distancia mínima entre puntos YA PROYECTADOS: al medirse en píxeles de
//    salida, la densidad de detalle es la misma en todos los países.
import fs from "node:fs";
import { PAISES, PAIS_POR_ID } from "../lib/atlas/paises";

const BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const GB = "https://www.geoboundaries.org/api/current/gbOpen"; // solo para los diminutos, ver abajo
const MARGEN_ARRECIFE = 0.3; // grados: cuánto se ensancha la caja del país al buscarle arrecife
const SALIDA = new URL("../data/atlas/formas.ts", import.meta.url);
const SALIDA_MUNDO = new URL("../data/atlas/mundo.ts", import.meta.url);
const CACHE = process.env.ATLAS_CACHE; // carpeta con los geojson ya bajados, para iterar sin red

const R = 6371;        // km
const BOX = 1000;      // lado del lienzo de cada silueta
const PAD = 0.06;      // margen por lado, en fracción de la caja
const TOL = 1.2;       // px: tolerancia de Douglas-Peucker para la silueta
// Natural Earth 1:10m está pensado para verse a escala mundial y a los países diminutos les da
// una miseria de puntos: Mónaco es un dodecágono y Malta y Gozo suman 55 vértices. Normalizados
// a pantalla completa eso no es una costa, es un garabato. Por debajo de este umbral se pide el
// contorno a geoBoundaries, que da 840 puntos para Mónaco y 5.425 para el archipiélago maltés.
const MIN_PUNTOS = 400;
// La costa real de Malta a 24 km es tan dentada que a resolución alta sale ruidosa. Se aplana
// más: lo que hay que reconocer es el contorno de la isla, no cada cala.
const TOL_ALTA = 2.2;
const PASO_GLOBO = 0.35; // grados: paso mínimo de la costa del globo (subpíxel a su tamaño)

// Natural Earth dibuja como Marruecos casi todo el Sáhara Occidental. Se deja tal cual —la
// silueta y el globo salen de fuentes distintas y recortar una sin la otra las descuadra— y en
// su lugar se marca la frontera con una línea dentro de la silueta. El Sáhara español empezaba
// en el paralelo 27°40′N, así que la línea es ese paralelo.
const FRONTERAS: Record<string, number> = { ma: 27 + 40 / 60 };

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
const AJUSTES: Record<string, { cerca?: Cerca; paneles?: [Cerca, Cerca]; tol?: number; arrecife?: boolean; islas?: number; cadena?: boolean }> = {
  bs: { cerca: [-77.5, 25.5, 260] },  // el racimo del noroeste: Andros, Gran Bahama, Ábaco
  ca: { cadena: true },
  es: { islas: 60 },                  // Menorca, Ibiza y Formentera, que la regla relativa suelta
  fm: { paneles: [[151.8, 7.4, 60], [158.2, 6.9, 60]] },   // la laguna de Chuuk y Pohnpei
  id: { cadena: true },               // sin ella no dibuja ni Sumatra ni Papúa
  ki: { paneles: [[172.98, 1.35, 30], [-157.4, 1.9, 60]] }, // Tarawa y Kiritimati
  mh: { arrecife: true, cadena: true }, // las dos hileras de atolones, no solo Majuro
  mv: { arrecife: true, cadena: true }, // los atolones, que son lo que se reconoce, y los 871 km
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
const MAX_KM = 300;         // del polígono mayor

const rad = Math.PI / 180;
type Anillo = [number, number][];
type Poly = Anillo[];
type Geometria = { type: "Polygon"; coordinates: Poly } | { type: "MultiPolygon"; coordinates: Poly[] };
/** En torno a qué punto se recorta una silueta y con cuánto radio, en km. */
type Cerca = [number, number, number];
type Salida = { id: string; nombre: string; d: string; arrecife: string; linea: string; separador: string; ladoKm: number; lon: number; lat: number; puntos: number };
type Pieza = { properties: Record<string, string | number | null>; geometry: Geometria };

// El contorno de alta resolución de un país suelto. Se usa poco —una veintena de los 195— así
// que se pide uno a uno. Devuelve null si no lo hay: entonces manda Natural Earth.
async function contornoAlto(iso3: string): Promise<Poly[] | null> {
  const local = CACHE && `${CACHE}/gb-${iso3}.json`;
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

const cargar = async (nombre: string): Promise<{ features: Pieza[] }> =>
  JSON.parse(CACHE ? fs.readFileSync(`${CACHE}/${nombre}.geojson`, "utf8")
                   : await (await fetch(`${BASE}/${nombre}.geojson`)).text());

const polysDe = (g: Geometria): Poly[] => (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]);

function areaRel(anillo: Anillo): number { // cordón, en grados²: solo compara polígonos entre sí
  let a = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++)
    a += (anillo[j][0] - anillo[i][0]) * (anillo[j][1] + anillo[i][1]);
  return Math.abs(a / 2);
}

function caja(anillos: Anillo[]) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const a of anillos) for (const [x, y] of a) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, x1, y0, y1 };
}

/** Separación en km entre dos cajas; 0 si se tocan o solapan. */
function kmEntre(a: ReturnType<typeof caja>, b: ReturnType<typeof caja>): number {
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

function polysQueSeQuedan(polys: Poly[], suelo = 0, cadena = false): Poly[] {
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
        ? [...dentro].some((j) => kmEntre(cajas[j], cajas[i]) <= MAX_KM)
        : kmEntre(cajas[mayor], cajas[i]) <= MAX_KM;
      if (llega) { dentro.add(i); crece = cadena; }
    }
  }
  return polys.filter((_, i) => dentro.has(i));
}

// Lambert azimutal equivalente centrada en (lon0, lat0), en km. La resta de longitudes entra
// en un coseno, así que el antimeridiano se cruza solo y no hace falta partir nada.
function laea(lon: number, lat: number, lon0: number, lat0: number): [number, number] {
  const f = lat * rad, l = (lon - lon0) * rad, f1 = lat0 * rad;
  const cosc = Math.sin(f1) * Math.sin(f) + Math.cos(f1) * Math.cos(f) * Math.cos(l);
  const k = Math.sqrt(Math.max(0, 2 / (1 + cosc)));
  return [R * k * Math.cos(f) * Math.sin(l),
          R * k * (Math.cos(f1) * Math.sin(f) - Math.sin(f1) * Math.cos(f) * Math.cos(l))];
}

/**
 * Douglas-Peucker: se queda con los puntos que se desvían de la cuerda más que `tol`.
 *
 * No es lo mismo que ralear por distancia. Ralear conserva el ruido —tira puntos intermedios,
 * pero cada diente de la costa sigue ahí—; esto lo aplana, que es lo que se quiere para bajar
 * el detalle de una costa muy dentada sin deformar el contorno que hay que reconocer.
 */
function simplificar(pts: Anillo, tol: number): Anillo {
  if (pts.length < 3) return pts;
  const dejar = new Uint8Array(pts.length);
  dejar[0] = dejar[pts.length - 1] = 1;
  const pila: [number, number][] = [[0, pts.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop()!;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let peor = -1, dist = tol;
    for (let i = a + 1; i < b; i++) {
      const [px_, py_] = pts[i];
      const d = len === 0
        ? Math.hypot(px_ - ax, py_ - ay)
        : Math.abs(dy * px_ - dx * py_ + bx * ay - by * ax) / len;
      if (d > dist) { dist = d; peor = i; }
    }
    if (peor >= 0) { dejar[peor] = 1; pila.push([a, peor], [peor, b]); }
  }
  return pts.filter((_, i) => dejar[i] === 1);
}

// Ralea una polilínea quedándose con los puntos separados al menos `paso`. Los extremos siempre.
function ralear(a: Anillo, paso: number): Anillo {
  const out: Anillo = [];
  let last: [number, number] | null = null;
  for (let i = 0; i < a.length; i++) {
    const q = a[i];
    if (!last || i === a.length - 1 || Math.hypot(q[0] - last[0], q[1] - last[1]) >= paso) {
      out.push(q); last = q;
    }
  }
  return out;
}

// ¿Cae el punto dentro del polígono? Lanzamiento de rayo, el de toda la vida. Se usa para
// quedarse solo con el trozo de paralelo que pisa el país.
function dentro(punto: [number, number], anillo: Anillo): boolean {
  let d = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > punto[1]) !== (yj > punto[1]) && punto[0] < ((xj - xi) * (punto[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

const g10 = await cargar("ne_10m_admin_0_countries");
const porIso = new Map<string, Pieza>();
for (const f of g10.features) {
  const iso = String(f.properties.ISO_A2_EH ?? f.properties.ISO_A2 ?? "").toLowerCase();
  if (iso && iso !== "-99" && !porIso.has(iso)) porIso.set(iso, f);
}

// El coral, para los países que lo piden en AJUSTES: líneas sueltas en lon/lat, no polígonos —
// un arrecife no encierra nada, es el borde de lo que asoma.
const arrecifes: Anillo[] = JSON.parse(CACHE
  ? fs.readFileSync(`${CACHE}/ne_10m_reefs.geojson`, "utf8")
  : await (await fetch(`${BASE}/ne_10m_reefs.geojson`)).text())
  .features.map((f: { geometry: { coordinates: Anillo } }) => f.geometry.coordinates);

const salida: Salida[] = [];
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
  const grupos = (ajuste?.paneles ?? [null]).map((cerca) => {
    const polys = polysQueSeQuedan(cerca ? recortar(crudo, cerca, p.nombre) : crudo, ajuste?.islas, ajuste?.cadena);
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
  const HUECO = 90; // lo que se aparta cada panel de la línea del medio
  const cajas = grupos.map((_, i) => grupos.length === 1
    ? [PAD * BOX, BOX * (1 - PAD)]
    : i === 0 ? [PAD * BOX, BOX / 2 - HUECO / 2] : [BOX / 2 + HUECO / 2, BOX * (1 - PAD)]);
  const escala = Math.min(...grupos.map(({ b }, i) =>
    Math.min((cajas[i][1] - cajas[i][0]) / (b.x1 - b.x0), (BOX * (1 - 2 * PAD)) / (b.y1 - b.y0))));

  let d = "", arrecife = "", puntos = 0;
  const pinta = grupos.map(({ b }, i) => {
    const cx = (cajas[i][0] + cajas[i][1]) / 2;
    return {
      px: (x: number) => cx + (x - (b.x0 + b.x1) / 2) * escala,
      py: (y: number) => BOX / 2 - (y - (b.y0 + b.y1) / 2) * escala,
    };
  });
  grupos.forEach(({ proy, proyCoral }, i) => {
    const { px, py } = pinta[i];
    const trazo = (a: Anillo) => simplificar(a.map(([x, y]) => [px(x), py(y)] as [number, number]), tol);
    // Redondear al pintar: Math.cos/sin no están fijados por IEEE y Node y el navegador
    // discrepan en el último bit, lo que rompe la hidratación con un error ilegible.
    const eme = (a: Anillo) => "M" + a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
    for (const anillo of proy) {
      const out = trazo(anillo);
      if (out.length < 3) continue;
      d += eme(out) + "Z";
      puntos += out.length;
    }
    // El coral va sin `Z`: es la línea del arrecife tal como viene, y cerrarla inventaría el
    // tramo que la fuente no trae.
    for (const linea of proyCoral) {
      const out = trazo(linea);
      if (out.length < 2) continue;
      arrecife += eme(out);
      puntos += out.length;
    }
  });

  // El país entero, sin paneles ni escala: de aquí sale el largo de la ficha, que es el del país
  // de verdad —los 4.000 km de Kiribati— y no el de lo que se dibuja.
  const mayor = grupos.reduce((a, b) => (b.area > a.area ? b : a));
  const { lon0, lat0, c, polys } = mayor;
  const { px, py } = pinta[grupos.indexOf(mayor)];
  const entero = caja(grupos.flatMap((g) => [...g.polys.map((poly) => poly[0]), ...g.coral])
    .map((a) => a.map(([lon, lat]) => laea(lon, lat, lon0, lat0)) as Anillo));
  const lado = Math.max(entero.x1 - entero.x0, entero.y1 - entero.y0);

  // La línea del medio: solo cuando hay dos paneles, y dice que la distancia entre ellos no está
  // a escala.
  const separador = grupos.length === 1 ? "" : `M${BOX / 2},${PAD * BOX}L${BOX / 2},${BOX * (1 - PAD)}`;

  // La frontera interior, si la hay: se recorre el paralelo en pasos finos, se conserva lo que
  // pisa el país y se proyecta igual que el resto. Sale ligeramente curva, como debe.
  let linea = "";
  const paralelo = FRONTERAS[p.id];
  if (paralelo !== undefined) {
    let trozo: string[] = [];
    const suelta = () => { if (trozo.length > 1) linea += "M" + trozo.join("L"); trozo = []; };
    for (let lon = c.x0; lon <= c.x1; lon += (c.x1 - c.x0) / 600) {
      if (polys.some((poly) => dentro([lon, paralelo], poly[0]))) {
        const [x, y] = laea(lon, paralelo, lon0, lat0);
        trozo.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`);
      } else suelta();
    }
    suelta();
  }

  salida.push({ id: p.id, nombre: p.nombre, d, arrecife, linea, separador, ladoKm: Math.round(lado), lon: lon0, lat: lat0, puntos });
}

const ts = `// GENERADO por scripts/build-atlas-formas.mts — no editar a mano.
// Fuente: Natural Earth 1:10m. Silueta normalizada en un lienzo ${BOX}×${BOX}.

export type Forma = {
  d: string;      // path SVG en un viewBox 0 0 ${BOX} ${BOX}, normalizado
  arrecife: string; // el coral, a trazar sin rellenar y sin cerrar ("" si el país no lo lleva)
  linea: string;  // frontera interior a marcar dentro de la silueta ("" si no hay)
  separador: string; // la línea entre los dos paneles de un país partido ("" si va de una pieza)
  ladoKm: number; // lado mayor real, para la ficha
  lon: number;    // centro: dónde se planta el globo y por dónde va el barrido en S
  lat: number;
};

export const FORMAS: Record<string, Forma> = {
${salida.map((s) => `  ${s.id}: { d: "${s.d}", arrecife: "${s.arrecife}", linea: "${s.linea}", separador: "${s.separador}", ladoKm: ${s.ladoKm}, lon: ${s.lon.toFixed(3)}, lat: ${s.lat.toFixed(3)} },`).join("\n")}
};
`;
fs.mkdirSync(new URL(".", SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, ts);

// La costa del mundo, una sola vez, en lon/lat: la ortográfica de cada globo se calcula en el
// navegador. Precalcular 195 globos sería el mismo mundo 195 veces.
const g50 = await cargar("ne_50m_admin_0_countries");
// Cada anillo lleva el país al que pertenece, así el globo resalta el suyo sin que haya que
// repetir su contorno en formas.ts. Los que 1:110m no trae —los diminutos— se pintan como punto
// desde su lon/lat, que es exactamente lo que son a esta escala.
const costa: { id: string; r: number[][] }[] = [];
for (const f of g50.features) {
  const iso = String(f.properties.ISO_A2_EH ?? f.properties.ISO_A2 ?? "").toLowerCase();
  const id = PAIS_POR_ID.has(iso) ? iso : "";
  for (const poly of polysDe(f.geometry)) {
    // Una isla más pequeña que el paso de muestreo no llega a un píxel del globo: son cientos
    // de anillos que solo pesan. Las que son un país entero se pintan como punto, igual que
    // los microestados que 1:50m tampoco trae.
    const b = caja([poly[0]]);
    if (Math.max(b.x1 - b.x0, b.y1 - b.y0) < PASO_GLOBO * 2) continue;
    const r = ralear(poly[0], PASO_GLOBO);
    if (r.length >= 3) costa.push({ id, r: r.map(([lon, lat]) => [+lon.toFixed(1), +lat.toFixed(1)]) });
  }
}
const conAnillo = new Set(costa.filter((c) => c.id).map((c) => c.id));
const soloPunto = PAISES.filter((p) => !conAnillo.has(p.id)).map((p) => p.nombre);

fs.writeFileSync(SALIDA_MUNDO, `// GENERADO por scripts/build-atlas-formas.mts — no editar a mano.
// Fuente: Natural Earth 1:50m. Costa del mundo en lon/lat; la ortográfica se hace en el render.
// \`id\` es el país de Atlas al que pertenece el anillo, o "" si no es ninguno.

export const MUNDO: { id: string; r: number[][] }[] = ${JSON.stringify(costa)};
`);

for (const s of salida.sort((a, b) => b.ladoKm - a.ladoKm))
  console.log(`  ${s.nombre.padEnd(10)} ${String(s.ladoKm).padStart(5)} km  ${String(s.puntos).padStart(4)} puntos`);
console.log(`\nsin anillo en 1:50m (se pintan como punto): ${soloPunto.join(", ") || "ninguno"}`);
console.log(`formas.ts ${(fs.statSync(SALIDA).size / 1024).toFixed(0)} KB · mundo.ts ${(fs.statSync(SALIDA_MUNDO).size / 1024).toFixed(0)} KB (${costa.length} anillos)`);
