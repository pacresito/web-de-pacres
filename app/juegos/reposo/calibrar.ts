// Las cifras que justifican el catálogo de escena.ts — `npx tsx app/juegos/reposo/calibrar.ts`.
// No falla: mide. ¿Cuántos cambios evidentes hay tras una hora, un día, un mes, un año? El
// objetivo: ~2 en un día, ~10 en un mes, y que siga creciendo con el hueco. Cada cifra sale de
// muchos puntos de partida, porque cada objeto tiene su fase.

import { CATALOGO, diferencia, escena, evidentes, ORIGEN_MS, snapshot } from "./escena";

/** PRNG del jitter. Tres rondas de mezcla: con una, los índices 0..300 salen apiñados y el
 *  jitter tira a huecos cortos. */
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
// Desde el origen, donde la obra está activa; los años siguientes los mide la última tabla.
const t0 = ORIGEN_MS;

const mediana = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (n: number, d = 1) => n.toFixed(d).padStart(6);
const fila = (xs: (string | number)[]) => console.log(xs.map((x) => String(x).padStart(10)).join(" "));

/** Puntos de partida repartidos en 5 años, para que caigan dentro hasta los únicos más lentos. */
const PARTIDAS = Array.from({ length: MUESTRAS }, (_, i) => t0 + Math.floor((i / MUESTRAS) * 5 * 365 * DIA));

/** Nadie vuelve al segundo exacto: el hueco varía un ±15 %. Exacto, caería siempre en la misma
 *  fase de cada ciclo y mediría una resonancia. */
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
console.log("Un cíclico de n escalones no puede superar (n-1)/n por grande que sea el hueco.");

// ── ¿Envejece la calle? ──────────────────────────────────────────────────────
// Lo que un monótono con techo aporta se consume: lo que cuenta es la calle a los veinte años.
console.log("\n## La misma calle, medida desde distintos años de su vida (media de evidentes)\n");
fila(["arranca en", "1 día", "1 mes", "1 año", "¿mes < año?"]);
// Tres años por fila: con diferencias espaciadas años, uno solo lo decidiría el azar.
for (const anio of [0, 1, 2, 5, 10, 20]) {
  const base = ORIGEN_MS + anio * 365 * DIA;
  const desde = Array.from({ length: MUESTRAS }, (_, i) => base + Math.floor((i / MUESTRAS) * 3 * 365 * DIA));
  const [d, m, a] = [DIA, 30 * DIA, 365 * DIA].map((h) => medir(h, desde).evidentes);
  fila([`año ${anio}`, fmt(d, 2), fmt(m, 2), fmt(a, 2), a - m > 0.5 ? "sí" : "NO"]);
}
console.log("\nA leer: la última columna es el juego entero. Si volver al año no rinde más que volver");
console.log("al mes, el hueco largo ha dejado de pagarse y la calle ha llegado a su estado estacionario.");
