// Genera data/atlas/formas.ts (siluetas de los países de Atlas) y data/atlas/mundo.ts (la
// costa del mundo para el globo) desde Natural Earth. Uso puntual:
// `npx tsx scripts/build-atlas-formas.mts`. Recorre solo los países de lib/atlas/paises.ts.
//
// Qué polígonos entran y cómo se proyectan lo decide scripts/atlas-geo.mts, compartido con el
// relieve. Aquí queda lo que es de la silueta: el trazado, la frontera interior y el globo.
//
// Dos decisiones viven aquí y no en el render:
//  - Simplificación por distancia mínima entre puntos YA PROYECTADOS: al medirse en píxeles de
//    salida, la densidad de detalle es la misma en todos los países.
//  - La capital sale de aquí ya proyectada al lienzo. Proyectarla en el render sería repetir el
//    encuadre —qué polígonos entran, dónde cae el centro, con qué escala—, y dos copias de esa
//    cuenta se separan sin que falle nada: el punto se iría unos píxeles y nadie lo vería.
import fs from "node:fs";
import { PAISES, PAIS_POR_ID, type Pais } from "../lib/atlas/paises";
import {
  BOX, PAD, type Anillo, type Caja, caja, cargar, encuadres, laea, polysDe,
} from "./atlas-geo.mjs";

const SALIDA = new URL("../data/atlas/formas.ts", import.meta.url);
const SALIDA_MUNDO = new URL("../data/atlas/mundo.ts", import.meta.url);

const PASO_GLOBO = 0.35; // grados: paso mínimo de la costa del globo (subpíxel a su tamaño)

// Natural Earth dibuja como Marruecos casi todo el Sáhara Occidental. Se deja tal cual —la
// silueta y el globo salen de fuentes distintas y recortar una sin la otra las descuadra— y en
// su lugar se marca la frontera con una línea dentro de la silueta. El Sáhara español empezaba
// en el paralelo 27°40′N, así que la línea es ese paralelo.
const FRONTERAS: Record<string, number> = { ma: 27 + 40 / 60 };

// Los tres países que son su propia capital: marcarla no diría nada que la silueta no diga ya,
// y el punto solo taparía el contorno de alta resolución que estos tienen justamente porque a
// esta escala no son más que eso.
const SIN_CAPITAL = new Set(["va", "mc", "sg"]);

// Dónde cae cada capital, en lon/lat. La fuente es la misma que dibuja las formas, pero
// `ADM0CAP` no vale por sí solo: marca la capital **de facto**, así que da Cotonú por Porto-Novo
// y Dar es Salaam por Dodoma, mientras que `paises.ts` guarda la oficial. Manda el nombre, y
// `ADM0CAP` solo decide cuando el nombre no casa —que es siempre por la romanización, Riyadh
// por Riyād o Tashkent por Toshkent, y entonces la única capital que la fuente marca es la
// buena—. Las tres que no están en la fuente las trae `capitalLonLat`.
const ciudades = new Map<string, { p: Record<string, string | number | null>; c: [number, number] }[]>();
for (const f of (await cargar("ne_10m_populated_places") as unknown as
     { features: { properties: Record<string, string | number | null>; geometry: { coordinates: [number, number] } }[] }).features) {
  const iso = String(f.properties.ISO_A2 ?? "").toLowerCase();
  if (!iso || iso === "-99") continue;
  if (!ciudades.has(iso)) ciudades.set(iso, []);
  ciudades.get(iso)!.push({ p: f.properties, c: f.geometry.coordinates });
}

// Sin tildes, sin guiones y en minúsculas: la fuente escribe Yamoussoukro y Sri Jayawardenepura
// Kotte donde `paises.ts` escribe Yamusukro y Sri Jayawardenapura Kotte.
const plano = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function capitalDe(q: Pais): [number, number] {
  if (q.capitalLonLat) return q.capitalLonLat;
  const lista = ciudades.get(q.id) ?? [];
  const quiere = [q.capital, q.capitalCastellana].filter(Boolean).map((n) => plano(String(n)));
  const casa = (x: { p: Record<string, string | number | null> }) =>
    [x.p.NAME, x.p.NAMEASCII, x.p.NAME_ES, x.p.NAME_EN, x.p.NAMEALT, x.p.LS_NAME]
      .filter(Boolean).some((n) => quiere.includes(plano(String(n))));
  const porNombre = lista.find(casa);
  if (porNombre) return porNombre.c;
  const marcadas = lista.filter((x) => x.p.ADM0CAP === 1);
  if (marcadas.length === 1) return marcadas[0].c;
  throw new Error(`no hay coordenada para ${q.capital} (${q.nombre}): ${marcadas.length} candidatas por ADM0CAP y ninguna por nombre. Ponle capitalLonLat en paises.ts.`);
}

type Salida = { id: string; nombre: string; d: string; arrecife: string; linea: string; separador: string; capital: [number, number] | null; ladoKm: number; lon: number; lat: number; puntos: number };

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

/**
 * Lo que separa un punto del contorno más cercano, en unidades del lienzo. Va con el aviso
 * porque sin ella los dos fallos que lo disparan se confunden: una capital costera que la
 * simplificación deja dos unidades fuera del agua no es lo mismo que una que cae en otro sitio
 * porque su mitad del país no se dibuja.
 */
function aLaCosta(p: [number, number], anillos: Anillo[]): number {
  let min = Infinity;
  for (const a of anillos) for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [x1, y1] = a[j], [x2, y2] = a[i];
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / l2));
    min = Math.min(min, Math.hypot(p[0] - (x1 + t * dx), p[1] - (y1 + t * dy)));
  }
  return min;
}

const salida: Salida[] = [];
for (const { id, nombre, grupos, pinta, tol } of await encuadres()) {
  let d = "", arrecife = "", puntos = 0;
  const trazados: Anillo[] = [];
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
      trazados.push(out);
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

  // La capital, proyectada al lienzo. Va en el panel donde cae —no en el mayor— porque Tarawa es
  // la capital de Kiribati y se dibuja en la mitad pequeña; se elige midiéndola contra la caja
  // lon/lat de cada grupo, que es lo único que distingue un panel de otro.
  //
  // **Se comprueba contra lo trazado y no contra el polígono de la fuente**: la simplificación
  // adelgaza los atolones hasta dejar la capital en el agua —Tarawa Sur es el caso— y ahí el
  // punto queda flotando sin que falle nada. El aviso es todo lo que se puede hacer desde aquí:
  // moverlo sería mentir sobre dónde está.
  let capital: [number, number] | null = null;
  const pais = PAIS_POR_ID.get(id)!;
  if (!SIN_CAPITAL.has(id)) {
    const [lonCap, latCap] = capitalDe(pais);
    const lejos = ({ c: b }: (typeof grupos)[number]) =>
      Math.hypot(Math.max(0, b.x0 - lonCap, lonCap - b.x1), Math.max(0, b.y0 - latCap, latCap - b.y1));
    const suyo = grupos.reduce((a, b) => (lejos(b) < lejos(a) ? b : a));
    const pincel = pinta[grupos.indexOf(suyo)];
    const [kx, ky] = laea(lonCap, latCap, suyo.lon0, suyo.lat0);
    const punto: [number, number] = [+pincel.px(kx).toFixed(1), +pincel.py(ky).toFixed(1)];
    if (!trazados.some((anillo) => dentro(punto, anillo)))
      console.warn(`  aviso  ${id}: ${pais.capital} cae fuera de la silueta, a ${aLaCosta(punto, trazados).toFixed(0)} del contorno`);
    capital = punto;
  }

  // La frontera interior, si la hay: se recorre el paralelo en pasos finos, se conserva lo que
  // pisa el país y se proyecta igual que el resto. Sale ligeramente curva, como debe.
  let linea = "";
  const paralelo = FRONTERAS[id];
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

  salida.push({ id, nombre, d, arrecife, linea, separador, capital, ladoKm: Math.round(lado), lon: lon0, lat: lat0, puntos });
}

const ts = `// GENERADO por scripts/build-atlas-formas.mts — no editar a mano.
// Fuente: Natural Earth 1:10m. Silueta normalizada en un lienzo ${BOX}×${BOX}.

export type Forma = {
  d: string;      // path SVG en un viewBox 0 0 ${BOX} ${BOX}, normalizado
  arrecife: string; // el coral, a trazar sin rellenar y sin cerrar ("" si el país no lo lleva)
  linea: string;  // frontera interior a marcar dentro de la silueta ("" si no hay)
  separador: string; // la línea entre los dos paneles de un país partido ("" si va de una pieza)
  capital: [number, number] | null; // dónde marcarla en el lienzo; null en los que son su capital
  ladoKm: number; // lado mayor real, para la ficha
  lon: number;    // centro: dónde se planta el globo y por dónde va el barrido en S
  lat: number;
};

export const FORMAS: Record<string, Forma> = {
${salida.map((s) => `  ${s.id}: { d: "${s.d}", arrecife: "${s.arrecife}", linea: "${s.linea}", separador: "${s.separador}", capital: ${s.capital ? `[${s.capital[0]}, ${s.capital[1]}]` : "null"}, ladoKm: ${s.ladoKm}, lon: ${s.lon.toFixed(3)}, lat: ${s.lat.toFixed(3)} },`).join("\n")}
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
    const b: Caja = caja([poly[0]]);
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
