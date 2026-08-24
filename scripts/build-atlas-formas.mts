// Genera data/atlas/formas.ts (siluetas de los países de Atlas) y data/atlas/mundo.ts (la
// costa del mundo para el globo) desde Natural Earth. Uso puntual:
// `npx tsx scripts/build-atlas-formas.mts`. Recorre solo los países de lib/atlas/paises.ts.
//
// Qué polígonos entran y cómo se proyectan lo decide scripts/atlas-geo.mts, compartido con el
// relieve. Aquí queda lo que es de la silueta: el trazado, la frontera interior y el globo.
//
// Una decisión vive aquí y no en el render:
//  - Simplificación por distancia mínima entre puntos YA PROYECTADOS: al medirse en píxeles de
//    salida, la densidad de detalle es la misma en todos los países.
import fs from "node:fs";
import { PAISES, PAIS_POR_ID } from "../lib/atlas/paises";
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

type Salida = { id: string; nombre: string; d: string; arrecife: string; linea: string; separador: string; ladoKm: number; lon: number; lat: number; puntos: number };

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

const salida: Salida[] = [];
for (const { id, nombre, grupos, pinta, tol } of await encuadres()) {
  let d = "", arrecife = "", puntos = 0;
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

  salida.push({ id, nombre, d, arrecife, linea, separador, ladoKm: Math.round(lado), lon: lon0, lat: lat0, puntos });
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
