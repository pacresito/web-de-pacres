// Las cifras que justifican `UMBRALES`: `npx tsx lib/atlas/globo.medir.ts`.
//
// No es un test —no falla, mide— y por eso vive aparte: los números que cita el docstring de
// `enganche` salen de aquí y **se vuelven a sacar cada vez que se mueva un umbral**. Escritos a
// mano se quedan viejos en cuanto alguien toca una constante, y nada lo delata.
//
// El montaje es el de la lupa en el móvil de Pablo, que es el único sitio donde se marca: globo de
// radio 200 pintado a 86vw de un Pixel 8a (354 px), y el centro desviado 20° del país preguntado,
// como lo planta la tarjeta. Determinista: el azar del desvío va con semilla.
import { MUNDO } from "@/data/atlas/mundo";
import { FORMAS } from "@/data/atlas/formas";
import { PAISES } from "./paises";
import { desviar, enganche, gradosEntre, ortografica, UMBRALES, type Proyeccion } from "./globo";

const R = 200;
const LADO_PX = 0.86 * 412;
/** Unidades del viewBox por píxel de pantalla, que es lo que traduce los umbrales. */
const UNIDAD = (R * 2 + 2) / LADO_PX;
// Cuántos desvíos distintos se prueban por país: el globo se planta en un sitio al azar dentro de
// los 20°, y con uno solo la cifra dice tanto del desvío que tocó como del umbral.
const SEMILLAS = 4;

const CON_ANILLO = new Set(MUNDO.map((a) => a.id));
const PUNTOS = Object.entries(FORMAS)
  .filter(([id]) => !CON_ANILLO.has(id))
  .map(([id, f]) => ({ id, lon: f.lon, lat: f.lat }));

/** El globo tal como sale para un país, con la semilla `s` decidiendo hacia dónde se desvía. */
function globoDe(id: string, s: number) {
  const [lon, lat] = desviar(FORMAS[id].lon, FORMAS[id].lat, 20, () => (s + 0.5) / SEMILLAS);
  const proy = ortografica(lon, lat, R);
  return { proy, cercanos: PUNTOS.filter((q) => gradosEntre(lon, lat, q.lon, q.lat) <= 50) };
}

/** Un toque a `dpx` píxeles del punto `[x, y]`, en la dirección `a` de ocho. */
const desde = (x: number, y: number, a: number, dpx: number): [number, number] =>
  [x + Math.cos((a * Math.PI) / 4) * dpx * UNIDAD, y + Math.sin((a * Math.PI) / 4) * dpx * UNIDAD];

/**
 * Los que no tienen forma, fallándoles por cinco píxeles: ocho direcciones por país.
 * Es la prueba de que la cortesía sirve para algo.
 */
function puntosFallandoPorCinco(umbrales = UMBRALES) {
  let cogidos = 0, total = 0;
  for (const p of PUNTOS) for (let s = 0; s < SEMILLAS; s++) {
    const { proy, cercanos } = globoDe(p.id, s);
    const [x, y] = proy(p.lon, p.lat);
    for (let a = 0; a < 8; a++) {
      total++;
      if (enganche(MUNDO, cercanos, proy, desde(x, y, a, 5), UNIDAD, umbrales) === p.id) cogidos++;
    }
  }
  return { cogidos, total };
}

/** Los 195 tocando el sitio exacto del país preguntado: lo que pasa cuando se sabe la respuesta. */
function todosEnSuSitio(umbrales = UMBRALES) {
  let cogidos = 0, total = 0;
  for (const p of PAISES) for (let s = 0; s < SEMILLAS; s++) {
    const { proy, cercanos } = globoDe(p.id, s);
    const [x, y] = proy(FORMAS[p.id].lon, FORMAS[p.id].lat);
    total++;
    if (enganche(MUNDO, cercanos, proy, [x, y], UNIDAD, umbrales) === p.id) cogidos++;
  }
  return { cogidos, total };
}

/** ¿Cae este toque dentro de este anillo? El mismo test que usa el enganche. */
function dentro(pts: [number, number, boolean][], tx: number, ty: number) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > ty) !== (yj > ty) && tx < ((xj - xi) * (ty - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

/**
 * Toques repartidos por dentro de un país: cuántos se lleva él y cuántos le roba un punto.
 * Es lo que mide el mordisco, y por eso se pide también el peor caso a mano.
 */
function toquesDentroDe(id: string, proy: Proyeccion, cercanos: typeof PUNTOS, umbrales = UMBRALES) {
  let suyos = 0, total = 0;
  for (const anillo of MUNDO.filter((a) => a.id === id)) {
    const pts = anillo.r.map(([lo, la]) => proy(lo, la));
    if (!pts.some(([, , v]) => v)) continue;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    // Rejilla de 12×12 sobre la caja del anillo; fuera del polígono no cuenta.
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
      const tx = x0 + ((i + 0.5) / 12) * (x1 - x0), ty = y0 + ((j + 0.5) / 12) * (y1 - y0);
      if (!dentro(pts, tx, ty) || Math.hypot(tx, ty) > R) continue;
      total++;
      if (enganche(MUNDO, cercanos, proy, [tx, ty], UNIDAD, umbrales) === id) suyos++;
    }
  }
  return { suyos, total };
}

/** Lo mismo para todos los que se dibujan: cuánto de su propia superficie conservan. */
function dentroDeTodos(umbrales = UMBRALES) {
  let suyos = 0, total = 0;
  for (const p of PAISES) {
    if (!CON_ANILLO.has(p.id)) continue;
    const { proy, cercanos } = globoDe(p.id, 0);
    const r = toquesDentroDe(p.id, proy, cercanos, umbrales);
    suyos += r.suyos; total += r.total;
  }
  return { suyos, total };
}

const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}%`;
const de = (n: number, total: number) => `${String(n).padStart(3)}/${total}`;
const linea = (que: string, n: number, total: number) =>
  console.log(`  ${que.padEnd(46)} ${de(n, total)}  (${pct(n, total)})`);

/** El lado mayor de un país en píxeles de pantalla, con el globo centrado en él. */
function ladoDe(id: string) {
  const { proy } = globoDe(id, 0);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const a of MUNDO.filter((a) => a.id === id)) for (const [lo, la] of a.r) {
    const [x, y, v] = proy(lo, la);
    if (!v) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return x1 < x0 ? 0 : Math.max(x1 - x0, y1 - y0) / UNIDAD;
}

const chicos = PAISES.filter((p) => CON_ANILLO.has(p.id) && ladoDe(p.id) < 16).length;
console.log(`Globo de radio ${R} pintado a ${LADO_PX.toFixed(0)} px · ${PUNTOS.length} países sin contorno` +
            ` · ${chicos + PUNTOS.length} de ${PAISES.length} miden menos de 16 px\n`);

/** Lo que conserva un país concreto de su propia superficie, promediando sus desvíos. */
function conserva(id: string, umbrales = UMBRALES) {
  let suyos = 0, total = 0;
  for (let s = 0; s < SEMILLAS; s++) {
    const { proy, cercanos } = globoDe(id, s);
    const r = toquesDentroDe(id, proy, cercanos, umbrales);
    suyos += r.suyos; total += r.total;
  }
  return pct(suyos, total);
}

// El radio de cortesía. Suiza es el peor caso —el punto de Liechtenstein vive dentro— y por eso
// va aparte: es quien paga lo que se le regala a los que no tienen forma.
console.log(`El radio de cortesía (hoy ${UMBRALES.gracia} px)`);
for (const gracia of [0, 5, 6, 10]) {
  const u = { ...UMBRALES, gracia };
  const p = puntosFallandoPorCinco(u), s = todosEnSuSitio(u);
  console.log(`  radio ${String(gracia).padStart(2)} px:` +
              ` sin forma fallando por 5 px ${de(p.cogidos, p.total)}` +
              ` · el preguntado en su sitio ${de(s.cogidos, s.total)}` +
              ` · Suiza conserva ${conserva("ch", u)}`);
}

console.log(`\nEl mordisco (hoy un ${UMBRALES.mordisco}º del lado del país de debajo)`);
for (const mordisco of [1, 3, 5, 8]) {
  const u = { ...UMBRALES, mordisco };
  const p = puntosFallandoPorCinco(u);
  console.log(`  un ${String(mordisco).padStart(2)}º:` +
              ` sin forma fallando por 5 px ${de(p.cogidos, p.total)}` +
              ` · Suiza conserva ${conserva("ch", u)} · Italia ${conserva("it", u)}`);
}

// Las dos perillas juntas, que es como hay que mirarlas: el radio decide cuánto se regala y el
// mordisco a quién no se le puede quitar, así que subir uno cambia lo que conviene en el otro.
console.log("\nLas dos juntas (sin forma / Suiza / Italia)");
console.log("            " + [1, 3, 5, 8, 12].map((m) => `mordisco ${String(m).padStart(2)}`.padEnd(22)).join(""));
for (const gracia of [5, 6, 7, 10]) {
  const fila = [1, 3, 5, 8, 12].map((mordisco) => {
    const u = { gracia, cerca: UMBRALES.cerca, mordisco };
    const p = puntosFallandoPorCinco(u);
    return `${de(p.cogidos, p.total)} ${conserva("ch", u).padStart(5)} ${conserva("it", u).padStart(5)}`.padEnd(22);
  });
  console.log(`  radio ${String(gracia).padStart(2)}  ` + fila.join(""));
}

console.log("\nCon los umbrales de hoy");
const hoy = { p: puntosFallandoPorCinco(), s: todosEnSuSitio(), d: dentroDeTodos() };
linea("los que no tienen forma, fallando por 5 px", hoy.p.cogidos, hoy.p.total);
linea("el país preguntado, tocando su sitio", hoy.s.cogidos, hoy.s.total);
linea("un toque dentro de un país se lo lleva él", hoy.d.suyos, hoy.d.total);
