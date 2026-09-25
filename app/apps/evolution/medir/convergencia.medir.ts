// Dónde acaba cada gen al día mil — `npx tsx app/apps/evolution/medir/convergencia.medir.ts`.
// No es un test: mide. Fuera del build.
//
// 1. ¿Converge o abre abanico? La vara es el abanico del día cien: todos parten del mismo fundador.
// 2. El centro de los mundos desarrollados: a dónde se movería el fundador.
// 3. Lo ancha que es una población en un día: el contraste que se ve en pantalla.
// Todo en octavas (unidades en la sociabilidad). Los mundos extintos no cuentan.

import { FUNDADOR, RASGOS, banda, correrDia, REFERENCIA, crearMundo, signado, type Genoma, type Rasgo } from "../engine";
import { DESVIO } from "../designs";

// Cuarenta y ocho mundos: con menos, el centro de fiereza y retorno rebota entre pasadas.
const SEMILLAS = [
  "hola", "pablo", "mar", "brizna", "duna", "carmen", "sal", "raiz",
  "ambar", "liquen", "orilla", "vela", "junco", "greda", "ola", "esparto",
  "cierzo", "aljibe", "retama", "sirena", "cal", "riz", "tomo", "pino",
  "sur", "luz", "ave", "grano", "ceniza", "sombra", "pez", "eco",
  "hilo", "nube", "claudio", "jara", "tomillo", "romero", "salvia", "adelfa",
  "retamo", "mimbre", "olmo", "fresno", "haya", "tejo", "sauco", "encina",
];
const DIAS = 1000;
const CORTES = [100, 250, 500, 750, 1000];   // dónde se mira la mediana para ver si aún se mueve

/** Octavas desde `ref`; en el gen con signo, unidades desde él. */
const esc = (r: Rasgo, x: number, ref: number) => (signado(r) ? x - ref : Math.log2(x / ref));
/** Deshace `esc`: de octavas a valor de gen. */
const desesc = (r: Rasgo, o: number, ref: number) => (signado(r) ? ref + o : ref * 2 ** o);

const ordenar = (xs: number[]) => [...xs].sort((a, b) => a - b);
const cuantil = (xs: number[], q: number) => {
  const s = ordenar(xs);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};
const med = (xs: number[]) => cuantil(xs, 0.5);
/** Dispersión robusta y en las mismas unidades que los datos: medio recorrido del p10 al p90. */
const disp = (xs: number[]) => (cuantil(xs, 0.9) - cuantil(xs, 0.1)) / 2;
const col = (x: string | number, n = 9) => String(x).padStart(n);
const f2 = (x: number) => x.toFixed(2);

type Partida = {
  semilla: string;
  vivo: boolean;
  dias: number;
  censoFinal: number;
  /** Mediana de la población en cada corte, por gen. `null` si ya no quedaba nadie. */
  cortes: Record<Rasgo, (number | null)[]>;
  /** Grosor p10→p90 de la población, mediana de todos los días del mundo. */
  grosor: Record<Rasgo, number>;
  /** Todos los genomas vivos al final: de aquí salen los umbrales. */
  finales: Genoma[];
  /** El valor más bajo y más alto que ha llegado a existir en este mundo, por gen. */
  min: Record<Rasgo, number>;
  max: Record<Rasgo, number>;
};

/** Todos los vivos cada `PASO_MUESTRA` días, de todos los mundos: los cuantiles aguantan al mutante raro. */
const PASO_MUESTRA = 10;
const muestra = {} as Record<Rasgo, number[]>;
for (const r of RASGOS) muestra[r] = [];

console.log(`Midiendo ${SEMILLAS.length} semillas × ${DIAS} días. Tarda.\n`);
console.log([col("semilla", 10), col("días", 6), col("censo", 7)].join(" "));

const partidas: Partida[] = [];
const t0 = Date.now();

for (const s of SEMILLAS) {
  const m = crearMundo(s, REFERENCIA);
  const cortes = {} as Partida["cortes"], grosores = {} as Record<Rasgo, number[]>;
  const min = {} as Record<Rasgo, number>, max = {} as Record<Rasgo, number>;
  for (const r of RASGOS) { cortes[r] = []; grosores[r] = []; min[r] = Infinity; max[r] = -Infinity; }
  let d = 0;
  for (; d < DIAS && !m.extinto; d++) {
    correrDia(m);
    // Con tres bichos los deciles no son deciles: el grosor de ese día no es un dato.
    for (const b of m.bichos) for (const r of RASGOS) {
      const v = b.g[r];
      if (v < min[r]) min[r] = v;
      if (v > max[r]) max[r] = v;
    }
    if ((d + 1) % PASO_MUESTRA === 0) for (const b of m.bichos) for (const r of RASGOS) muestra[r].push(b.g[r]);
    if (m.bichos.length >= 4) {
      for (const r of RASGOS) {
        const b = banda(m.bichos.map((x) => x.g[r]))!;
        grosores[r].push(esc(r, b.hi, b.med) - esc(r, b.lo, b.med));
      }
    }
    if (CORTES.includes(d + 1)) {
      for (const r of RASGOS) {
        const b = banda(m.bichos.map((x) => x.g[r]));
        cortes[r].push(b ? b.med : null);
      }
    }
  }
  // Extinto antes del corte: `null`, para no desalinear la tabla.
  for (const r of RASGOS) while (cortes[r].length < CORTES.length) cortes[r].push(null);
  const grosor = {} as Record<Rasgo, number>;
  for (const r of RASGOS) grosor[r] = grosores[r].length ? med(grosores[r]) : NaN;
  partidas.push({
    semilla: s, vivo: !m.extinto, dias: d, censoFinal: m.bichos.length,
    cortes, grosor, finales: m.extinto ? [] : m.bichos.map((b) => ({ ...b.g })), min, max,
  });
  console.log([s.padEnd(10), col(d, 6), col(m.extinto ? "extinto" : m.bichos.length, 7)].join(" "));
}

const vivas = partidas.filter((p) => p.vivo && p.finales.length >= 4);
console.log(`\n${vivas.length} de ${SEMILLAS.length} llegan vivas al día ${DIAS}. ${((Date.now() - t0) / 1000).toFixed(0)} s.\n`);
if (vivas.length < 4) {
  console.log("Con menos de cuatro mundos vivos no hay dispersión que medir: sube la comida o baja los días.");
  process.exit(0);
}

// ── 1. ¿Converge o abre abanico? Las dos dispersiones en la misma vara ───────
console.log("## ¿Converge o abre abanico? Dispersión entre mundos, pronto y al acabar\n");
console.log([col("gen", 13), col("día " + CORTES[0]), col("día " + DIAS), col("razón"), col("veredicto", 13)].join(" "));
const centro = {} as Record<Rasgo, number>;
for (const r of RASGOS) {
  // Los que no llegaron al primer corte no cuentan en él: una mediana ausente no es un mundo junto.
  const pronto = vivas.map((p) => p.cortes[r][0]).filter((x): x is number => x !== null);
  const fines = vivas.map((p) => p.cortes[r][CORTES.length - 1]!);
  const refP = med(pronto), refF = med(fines);
  const dP = disp(pronto.map((x) => esc(r, x, refP)));
  const dF = disp(fines.map((x) => esc(r, x, refF)));
  centro[r] = refF;
  const razon = dF / dP;
  const v = razon < 0.6 ? "converge" : razon > 1.6 ? "abanico" : "ni una ni otra";
  console.log([r.padEnd(13), col(f2(dP)), col(f2(dF)), col(f2(razon)), col(v, 13)].join(" "));
}
console.log(`\nA leer: **día ${CORTES[0]}** es lo repartidos que están los mundos cuando apenas han salido del`);
console.log("fundador común, y **día 1000** cómo acaban. Razón por debajo de 0,6: el mundo los junta, y poner");
console.log("ahí al fundador deja al gen quieto toda la partida. Por encima de 1,6: cada mundo se queda con el");
console.log("suyo, y el centro es un buen sitio para nacer. En medio, el gen se abre pronto y ahí se queda.\n");

// ── 2. El centro de los mundos desarrollados ─────────────────────────────────
console.log("## Dónde acaban los mundos, y el fundador que eso propone\n");
console.log([col("gen", 13), col("fundador"), col("p10"), col("centro"), col("p90"), col("mueve")].join(" "));
for (const r of RASGOS) {
  const fines = vivas.map((p) => p.cortes[r][CORTES.length - 1]!);
  console.log([r.padEnd(13), col(f2(FUNDADOR[r])), col(f2(cuantil(fines, 0.1))), col(f2(centro[r])),
    col(f2(cuantil(fines, 0.9))), col(f2(esc(r, centro[r], FUNDADOR[r])))].join(" "));
}
console.log("\nA leer: **centro** es el fundador que propone la medida, y **mueve** cuánto hay que moverlo desde");
console.log("el de hoy, en octavas (unidades en la sociabilidad). Un gen que converge y a la vez pide moverse");
console.log("mucho es el que más gana con el cambio: hoy nace lejos de donde va a vivir.\n");

// ── 3. El contraste que se ve en pantalla: dentro de un día, no entre mundos ─
console.log("## Grosor de la población en un día, contra el abanico entre mundos\n");
console.log([col("gen", 13), col("grosor"), col("abanico"), col("razón")].join(" "));
for (const r of RASGOS) {
  const g = med(vivas.map((p) => p.grosor[r]));
  const fines = vivas.map((p) => p.cortes[r][CORTES.length - 1]!);
  const a = 2 * disp(fines.map((x) => esc(r, x, centro[r])));
  console.log([r.padEnd(13), col(f2(g)), col(f2(a)), col(f2(a / (g || 1)))].join(" "));
}
console.log("\nA leer: **grosor** es el p10→p90 de la población en un día cualquiera —el contraste entre dos");
console.log("bichos de la misma pantalla— y **abanico**, lo que separa a dos mundos distintos. La escala visual");
console.log("de un gen tiene que caber las dos, y la razón dice cuánto se pisan: si el abanico es cinco veces");
console.log("el grosor, una escala que enseñe el abanico deja a los vecinos indistinguibles.\n");

// ── 4. ¿Sigue moviéndose al final? ───────────────────────────────────────────
console.log("## La mediana en el camino — octavas desde el fundador\n");
for (const r of RASGOS) {
  console.log(`${r}`);
  console.log([col("semilla", 10), ...CORTES.map((d) => col("d" + d, 8))].join(" "));
  for (const p of vivas) {
    console.log([p.semilla.padEnd(10), ...p.cortes[r].map((x) =>
      col(x === null ? "—" : esc(r, x, FUNDADOR[r]).toFixed(2), 8))].join(" "));
  }
  console.log("");
}
console.log("A leer: una columna que crece y luego baja es un gen que fluctúa, y ese cumple la regla 1 por la");
console.log("vía buena. Una que sigue subiendo en el último tramo es un mundo al que le faltan días, no un gen");
console.log("que se haya asentado.\n");

// ── 5. La población del día 1000, sobre individuos: un umbral marca bichos ──
console.log(`## Todos los bichos vivos al día ${DIAS}, por cuantiles — de aquí salen los umbrales\n`);
const todos = vivas.flatMap((p) => p.finales);
console.log(`${todos.length} bichos de ${vivas.length} mundos.\n`);
console.log([col("gen", 13), col("p01"), col("p25"), col("p50"), col("p75"), col("p99")].join(" "));
for (const r of RASGOS) {
  const xs = todos.map((g) => g[r]);
  console.log([r.padEnd(13), ...[0.01, 0.25, 0.5, 0.75, 0.99].map((q) => col(f2(cuantil(xs, q))))].join(" "));
}
console.log("\nA leer: un adorno que quiera marcar al cuarto más fiero se pone en el p75 de la fiereza, y no en");
console.log("un número redondo. Y son cuantiles del **recorrido**: la escala con la que se pinta es otra cosa, y");
console.log("sale de la sección siguiente.\n");

// ── 6. La escala de pintado (`SEMI`) ─────────────────────────────────────────
// Centrada en el fundador y simétrica: el radio que deja dentro al 90% de los bichos de la
// sección 7. Lo de fuera se recorta.
console.log("## Propuesta de escala de pintado, centrada en el fundador\n");
console.log([col("gen", 13), col("fundador"), col("±oct"), col("÷ extremo"), col("× extremo"),
  col("sale−"), col("sale+"), col("p25"), col("p50"), col("p75"), col("adorno−"), col("adorno+")].join(" "));
for (const r of RASGOS) {
  const F = FUNDADOR[r];
  const ds = muestra[r].map((v) => esc(r, v, F));
  const semi = cuantil(ds.map(Math.abs), 0.9);
  const t = (d: number) => Math.min(1, Math.max(0, 0.5 + d / (2 * semi)));
  const frac = (f: (d: number) => boolean) => (100 * ds.filter(f).length) / ds.length;
  console.log([r.padEnd(13), col(f2(F)), col(f2(semi)), col(f2(desesc(r, -semi, F))), col(f2(desesc(r, semi, F))),
    col(frac((d) => d < -semi).toFixed(0) + "%"), col(frac((d) => d > semi).toFixed(0) + "%"),
    ...[0.25, 0.5, 0.75].map((q) => col(t(esc(r, cuantil(muestra[r], q), F)).toFixed(2))),
    col(frac((d) => t(d) < 0.5 - DESVIO).toFixed(0) + "%"),
    col(frac((d) => t(d) > 0.5 + DESVIO).toFixed(0) + "%")].join(" "));
}
console.log("\nA leer: **±oct** es el medio ancho propuesto, y **sale−/sale+** qué recorta cada lado — suman el");
console.log("10% por construcción, así que lo que dicen es de qué lado está la cola. **p25 · p50 · p75** son los");
console.log("cuartiles ya en la escala, de 0 a 1: un p50 lejos del 0,50 es un fundador que no vive donde vive la");
console.log("población, y unos cuartiles que caben en un tercio de la escala son escala de sobra. **adorno−** y");
console.log("**adorno+**, la fracción de bichos que cruza cada umbral: los que se pintan con pala o con brazo, con");
console.log("pincho o con aleta. Uno que pase de la mitad es un adorno que ha dejado de decir nada.");

// ── 7. El fundador que proponen los extremos (`RECORRIDO`) ───────────────────
// El punto medio en octavas entre lo más bajo y lo más alto, y lo mismo sobre p01 y p99: si no
// coinciden, el extremo absoluto es un mutante suelto.
console.log("\n## El fundador que proponen los extremos\n");
console.log(`Extremos sobre todos los mundos vivos; cuantiles sobre ${muestra[RASGOS[0]].length} bichos muestreados cada ${PASO_MUESTRA} días.\n`);
console.log([col("gen", 13), col("mín"), col("máx"), col("medio"), col("p01"), col("p99"), col("medio p"), col("fundador")].join(" "));
for (const r of RASGOS) {
  const lo = Math.min(...vivas.map((p) => p.min[r])), hi = Math.max(...vivas.map((p) => p.max[r]));
  const medio = signado(r) ? (lo + hi) / 2 : Math.sqrt(lo * hi);
  const q1 = cuantil(muestra[r], 0.01), q99 = cuantil(muestra[r], 0.99);
  const medioQ = signado(r) ? (q1 + q99) / 2 : Math.sqrt(q1 * q99);
  console.log([r.padEnd(13), col(f2(lo)), col(f2(hi)), col(f2(medio)), col(f2(q1)), col(f2(q99)),
    col(f2(medioQ)), col(f2(FUNDADOR[r]))].join(" "));
}
console.log("\nA leer: **medio** es el punto medio en octavas entre el mínimo y el máximo que han existido, y");
console.log("**medio p** el mismo punto entre el p01 y el p99. Si los dos se parecen, el fundador propuesto se");
console.log("sostiene; si el primero se va mucho del segundo, lo está fijando un solo mutante.");
