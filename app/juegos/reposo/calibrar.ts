// Las cifras que justifican el catálogo de escena.ts — `npx tsx app/juegos/reposo/calibrar.ts`.
//
// **No es un test: no falla, mide.** Fuera del build, como el resto de medidores. Una
// pregunta, y no es de opinión: para un hueco de una hora, un día, una semana, un mes y un
// año, ¿cuántos cambios evidentes hay? El objetivo: ~2 en un día, ~10 en un mes, y que
// siga creciendo con el hueco.
//
// El punto de partida importa —cada objeto tiene su propia fase— así que cada fila es la
// mediana sobre muchos puntos de partida repartidos a lo largo de varios años, no una sola
// muestra que podría caer en un valle o una cresta de algún ciclo.

import { CATALOGO, diferencia, escena, evidentes, ORIGEN_MS, snapshot } from "./escena";

/** PRNG propio del medidor, para el jitter — no hace falta el de escena.ts, que es interno.
 *  Tres rondas de mezcla (splitmix32), no una: con una sola, los índices 0..300 salen
 *  apiñados en el primer quintil y el jitter tira sistemáticamente a huecos cortos. Un
 *  instrumento con el ruido sesgado mide su propio sesgo. */
function rngDe(i: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const SEMILLA = "reposo";
const DIA = 24 * 60 * 60 * 1000;
const MUESTRAS = 300;
// Arranca pegado al origen: los únicos y la obra tienen su ventana activa ahí, y una calle
// que ya lleva jugándose años tendría casi todo eso resuelto de antemano y mediría otra cosa.
const t0 = ORIGEN_MS;

const mediana = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (n: number, d = 1) => n.toFixed(d).padStart(6);
const fila = (xs: (string | number)[]) => console.log(xs.map((x) => String(x).padStart(10)).join(" "));

/** Puntos de partida repartidos en 5 años desde el origen, para que hasta el único más lento
 *  (el banco, más de dos años entre diferencias) tenga sitio de sobra para caer dentro de la muestra. */
const PARTIDAS = Array.from({ length: MUESTRAS }, (_, i) => t0 + Math.floor((i / MUESTRAS) * 5 * 365 * DIA));

/** Un jugador no vuelve al segundo exacto: cada muestra sacude el hueco un ±15% además de
 *  variar el punto de partida. Sin esto, un hueco "de un mes" cae siempre en el mismo punto
 *  de fase de cada ciclo, y ese punto puede ser justo el de una resonancia — el aliasing de
 *  la regla 5, pero como accidente de medir con un solo número exacto en vez de como lección. */
function jitter(ms: number, i: number): number {
  return Math.floor(ms * (0.85 + rngDe(i) * 0.3));
}

function medir(huecoMs: number, partidas: number[] = PARTIDAS) {
  const totales: number[] = [], evidentesN: number[] = [];
  partidas.forEach((desde, i) => {
    const cambios = diferencia(snapshot(escena(SEMILLA, desde)), escena(SEMILLA, desde + jitter(huecoMs, i)));
    totales.push(cambios.length);
    evidentesN.push(evidentes(cambios).length);
  });
  return { total: media(totales), evidentes: media(evidentesN), medEvidentes: mediana(evidentesN) };
}

console.log(`\n## Cambios evidentes: sobre ${MUESTRAS} puntos de partida desde el origen\n`);
fila(["hueco", "media evid.", "mediana evid.", "media total"]);
const HUECOS: [string, number][] = [
  ["1 hora", 60 * 60 * 1000],
  ["1 día", DIA],
  ["1 semana", 7 * DIA],
  ["1 mes", 30 * DIA],
  ["3 meses", 91 * DIA],
  ["1 año", 365 * DIA],
];
for (const [nombre, ms] of HUECOS) {
  const r = medir(ms);
  fila([nombre, fmt(r.evidentes, 2), fmt(r.medEvidentes, 1), fmt(r.total, 2)]);
}
console.log("\nObjetivo: ~2 evidentes en «1 día», ~10 en «1 mes». La mediana importa tanto como la");
console.log("media: si difieren mucho, el ritmo depende de cuándo se empiece a mirar.");

// ── ¿Qué reloj sostiene cada franja? ─────────────────────────────────────────
// Si un solo objeto (el árbol, por su visibilidad alta) explica todo «1 año», el resto del
// catálogo no está aportando nada a esa franja y sobra densidad en otra.
console.log("\n## Probabilidad de que cada objeto haya cambiado, por franja\n");
fila(["objeto", "tipo", ...HUECOS.map(([n]) => n)]);
for (const slot of CATALOGO) {
  const fila_ = HUECOS.map(([, ms]) => {
    const cruces = PARTIDAS.map((desde, i) => {
      const antes = escena(SEMILLA, desde).find((o) => o.id === slot.id)!.nivel;
      const ahora = escena(SEMILLA, desde + jitter(ms, i)).find((o) => o.id === slot.id)!.nivel;
      return antes !== ahora ? 1 : 0;
    });
    return fmt(100 * media(cruces), 0) + "%";
  });
  fila([slot.id.padEnd(11), slot.tipo.padEnd(9), ...fila_]);
}
console.log("\nA leer: qué fracción de los puntos de partida ve cambiado a ese objeto en esa franja.");
console.log("Un cíclico de n escalones no puede superar (n-1)/n por grande que sea el hueco — eso");
console.log("no es un fallo de calibración, es el interruptor de la regla 5.");

// ── ¿Envejece la calle? ──────────────────────────────────────────────────────
// La pregunta que no se puede contestar midiendo solo desde el origen, y la que más pesa: los
// únicos se disparan una vez y los monótonos con techo lo alcanzan, así que ese contenido se
// consume. Lo que quede en pie a los veinte años es el juego que de verdad se juega — medir
// solo el estreno es medir el mejor día de la calle y llamarlo normal.
console.log("\n## La misma calle, medida desde distintos años de su vida (media de evidentes)\n");
fila(["arranca en", "1 día", "1 mes", "1 año", "¿mes < año?"]);
// Cada fila muestrea tres años, no uno: con diferencias espaciadas años, una ventana de un año
// tiene tan pocos dentro que el veredicto lo decide el azar de qué año toque.
for (const anio of [0, 1, 2, 5, 10, 20]) {
  const base = ORIGEN_MS + anio * 365 * DIA;
  const desde = Array.from({ length: MUESTRAS }, (_, i) => base + Math.floor((i / MUESTRAS) * 3 * 365 * DIA));
  const [d, m, a] = [DIA, 30 * DIA, 365 * DIA].map((h) => medir(h, desde).evidentes);
  fila([`año ${anio}`, fmt(d, 2), fmt(m, 2), fmt(a, 2), a - m > 0.5 ? "sí" : "NO"]);
}
console.log("\nA leer: la última columna es el juego entero. Si volver al año no rinde más que volver");
console.log("al mes, el hueco largo ha dejado de pagarse y la calle ha llegado a su estado estacionario.");
