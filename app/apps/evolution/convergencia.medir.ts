// Dónde acaba cada gen cuando el mundo lleva mil días — `npx tsx app/apps/evolution/convergencia.medir.ts`.
//
// **No es un test: no falla, mide.** Contesta las tres preguntas que deciden cómo se pinta un
// genoma, y que no se pueden contestar a ojo:
//
// 1. **¿Un gen converge o abre abanico?** Los mundos arrancan de fundadores que la semilla ya
//    despeina un ±12%, así que la pregunta se contesta comparando dispersiones: si al día mil los
//    mundos están **más juntos** que sus fundadores, el gen converge y el mundo lo empuja a un
//    sitio; si están más separados, cada partida se queda con el suyo. La razón entre las dos
//    dispersiones es el número, y el ±12% de salida es la vara — sin ella, "están repartidos entre
//    5 y 15" no dice si eso es mucho o poco.
// 2. **Dónde está el centro de los mundos desarrollados**, que es a dónde se movería el fundador.
// 3. **Cuánto mide la población en un día concreto**, que es el contraste que se ve en pantalla
//    entre dos bichos a la vez, y que no es lo mismo que lo anterior ni se mide con ello.
//
// Todo en octavas —los genes mutan multiplicando, así que la distancia natural es log2 y el
// promedio, el geométrico—, salvo la sociabilidad, que lleva signo y vive en unidades.
//
// Un mundo extinto no cuenta para el centro ni para la dispersión: promediar con él mete el sesgo
// de que los que se mueren pronto se mueren de una cosa concreta.

import { RASGOS, banda, correrDia, crearMundo, signado, type Genoma, type Rasgo } from "./engine";

// **Cuarenta y ocho y no veinte**, porque los genes no se dejan fijar igual de bien: `talla` y
// `visión` acaban en el mismo sitio en todos los mundos, pero `fiereza` y `retorno` abren un
// abanico de cinco a diez veces el de partida —cada mundo se queda con el suyo— y veinte muestras
// de ese abanico dan un centro que rebota un tercio de una pasada a la siguiente. Cuesta minutos y
// se corre cuando cambia la física, no cada día.
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
  eva: Genoma;
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

/**
 * Todos los bichos vivos, muestreados cada `PASO_MUESTRA` días y de todos los mundos. Los extremos
 * exactos los da un mundo entero, pero un mínimo absoluto es **un bicho**: el mutante más raro de
 * trescientos mil, y no dice dónde vive nadie. Por eso al lado van los cuantiles de esta muestra,
 * que sí aguantan que el más raro haya sido más raro de lo normal.
 */
const PASO_MUESTRA = 10;
const muestra = {} as Record<Rasgo, number[]>;
for (const r of RASGOS) muestra[r] = [];

console.log(`Midiendo ${SEMILLAS.length} semillas × ${DIAS} días. Tarda.\n`);
console.log([col("semilla", 10), col("días", 6), col("censo", 7)].join(" "));

const partidas: Partida[] = [];
const t0 = Date.now();

for (const s of SEMILLAS) {
  const m = crearMundo(s);
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
  // Un mundo que se extingue antes de un corte no tiene mediana allí: se rellena con `null` para
  // que la tabla no desalinee las columnas de los que sí llegaron.
  for (const r of RASGOS) while (cortes[r].length < CORTES.length) cortes[r].push(null);
  const grosor = {} as Record<Rasgo, number>;
  for (const r of RASGOS) grosor[r] = grosores[r].length ? med(grosores[r]) : NaN;
  partidas.push({
    semilla: s, eva: { ...m.eva }, vivo: !m.extinto, dias: d, censoFinal: m.bichos.length,
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

// ── 1. ¿Converge o abre abanico? ─────────────────────────────────────────────
//
// Las dos dispersiones se miden **en la misma vara** —octavas alrededor de la mediana del grupo—,
// así que la razón entre ellas es adimensional y comparable entre genes.
console.log("## ¿Converge o abre abanico? Dispersión entre mundos, al empezar y al acabar\n");
console.log([col("gen", 13), col("evas"), col("día " + DIAS), col("razón"), col("veredicto", 13)].join(" "));
const centro = {} as Record<Rasgo, number>;
for (const r of RASGOS) {
  const evas = vivas.map((p) => p.eva[r]);
  const fines = vivas.map((p) => p.cortes[r][CORTES.length - 1]!);
  const refE = med(evas), refF = med(fines);
  const dE = disp(evas.map((x) => esc(r, x, refE)));
  const dF = disp(fines.map((x) => esc(r, x, refF)));
  centro[r] = refF;
  const razon = dF / dE;
  const v = razon < 0.6 ? "converge" : razon > 1.6 ? "abanico" : "ni una ni otra";
  console.log([r.padEnd(13), col(f2(dE)), col(f2(dF)), col(f2(razon)), col(v, 13)].join(" "));
}
console.log("\nA leer: **evas** es lo despeinados que salen los veinte fundadores (la semilla los mueve un ±12%)");
console.log("y **día 1000** lo repartidos que acaban los veinte mundos. Razón por debajo de 0,6: el mundo los");
console.log("junta, y poner ahí al fundador deja al gen quieto toda la partida. Por encima de 1,6: cada mundo");
console.log("se queda con el suyo, y el centro es un buen sitio para nacer. En medio, la semilla manda tanto");
console.log("como el mundo.\n");

// ── 2. El centro de los mundos desarrollados ─────────────────────────────────
console.log("## Dónde acaban los mundos, y el fundador que eso propone\n");
console.log([col("gen", 13), col("eva hoy"), col("p10"), col("centro"), col("p90"), col("mueve")].join(" "));
for (const r of RASGOS) {
  const fines = vivas.map((p) => p.cortes[r][CORTES.length - 1]!);
  const evaHoy = med(vivas.map((p) => p.eva[r]));
  console.log([r.padEnd(13), col(f2(evaHoy)), col(f2(cuantil(fines, 0.1))), col(f2(centro[r])),
    col(f2(cuantil(fines, 0.9))), col(f2(esc(r, centro[r], evaHoy)))].join(" "));
}
console.log("\nA leer: **centro** es el fundador que propone la medida, y **mueve** cuánto hay que moverlo desde");
console.log("el de hoy, en octavas (unidades en la sociabilidad). Un gen que converge y a la vez pide moverse");
console.log("mucho es el que más gana con el cambio: hoy nace lejos de donde va a vivir.\n");

// ── 3. El contraste que se ve en pantalla ────────────────────────────────────
//
// Es otra cosa que lo anterior y se confunde fácil: entre mundos puede haber un abanico enorme y
// dentro de un día, ninguno. Lo que decide si dos bichos a la vez se distinguen es esto.
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
console.log("## La mediana en el camino — octavas desde el fundador de cada mundo\n");
for (const r of RASGOS) {
  console.log(`${r}`);
  console.log([col("semilla", 10), ...CORTES.map((d) => col("d" + d, 8))].join(" "));
  for (const p of vivas) {
    console.log([p.semilla.padEnd(10), ...p.cortes[r].map((x) =>
      col(x === null ? "—" : esc(r, x, p.eva[r]).toFixed(2), 8))].join(" "));
  }
  console.log("");
}
console.log("A leer: una columna que crece y luego baja es un gen que fluctúa, y ese cumple la regla 1 por la");
console.log("vía buena. Una que sigue subiendo en el último tramo es un mundo al que le faltan días, no un gen");
console.log("que se haya asentado.\n");

// ── 5. La población entera del día 1000, para poner los umbrales ─────────────
//
// Sobre bichos y no sobre medianas de mundo: un umbral marca individuos, así que la fracción que
// marca se lee en la distribución de individuos. Todos los mundos vivos juntos.
console.log(`## Todos los bichos vivos al día ${DIAS}, por cuantiles — de aquí salen los umbrales\n`);
const todos = vivas.flatMap((p) => p.finales);
console.log(`${todos.length} bichos de ${vivas.length} mundos.\n`);
console.log([col("gen", 13), col("p01"), col("p25"), col("p50"), col("p75"), col("p99")].join(" "));
for (const r of RASGOS) {
  const xs = todos.map((g) => g[r]);
  console.log([r.padEnd(13), ...[0.01, 0.25, 0.5, 0.75, 0.99].map((q) => col(f2(cuantil(xs, q))))].join(" "));
}
console.log("\nA leer: un adorno que quiera marcar al cuarto más fiero se pone en el p75 de la fiereza, y no en");
console.log("un número redondo. La escala visual de cada gen se centra en su p50 y su medio ancho sale de");
console.log("cuánto se quiera enseñar: hasta el p05/p95 llena la escala con el 90% de la población.\n");

// ── 6. La escala visual que proponen estas cifras ────────────────────────────
console.log("## Propuesta de escala visual, centrada en la población y no en el fundador\n");
console.log([col("gen", 13), col("centro"), col("±oct"), col("÷ extremo"), col("× extremo")].join(" "));
for (const r of RASGOS) {
  const xs = todos.map((g) => g[r]);
  const c = cuantil(xs, 0.5);
  // Medio ancho que deja el 90% de los bichos dentro y todavía margen para el abanico entre mundos.
  const fines = vivas.map((p) => p.cortes[r][CORTES.length - 1]!);
  const semi = Math.max(
    Math.abs(esc(r, cuantil(xs, 0.05), c)), Math.abs(esc(r, cuantil(xs, 0.95), c)),
    disp(fines.map((x) => esc(r, x, c))) * 1.5,
  );
  console.log([r.padEnd(13), col(f2(c)), col(f2(semi)), col(f2(desesc(r, -semi, c))), col(f2(desesc(r, semi, c)))].join(" "));
}
console.log("\nA leer: es una propuesta, no un veredicto — el medio ancho sale de que quepan el 90% de los bichos");
console.log("y vez y media el abanico entre mundos, lo que sea mayor. Un gen que converja pedirá una escala");
console.log("estrecha, y no pasa nada porque no sea la misma que la de al lado: lo que tiene que coincidir es");
console.log("la escala de un gen entre la leyenda y el panel, no la de dos genes distintos.");

// ── 7. El fundador que proponen los extremos ────────────────────────────────
//
// Lo que pidió Pablo: el punto medio entre lo más bajo y lo más alto que ha llegado a existir.
// **En octavas**, que es donde vive un gen que muta multiplicando — la media aritmética de 1 y 16
// es 8,5 y la que parte el recorrido por la mitad es 4.
//
// Al lado, la misma cuenta sobre el p01 y el p99 de todos los bichos muestreados. Los dos deberían
// dar casi lo mismo; si no lo dan, el extremo absoluto es un mutante suelto y el fundador estaría
// saliendo de una anécdota en vez de una población.
console.log("\n## El fundador que proponen los extremos\n");
console.log(`Extremos sobre todos los mundos vivos; cuantiles sobre ${muestra[RASGOS[0]].length} bichos muestreados cada ${PASO_MUESTRA} días.\n`);
console.log([col("gen", 13), col("mín"), col("máx"), col("medio"), col("p01"), col("p99"), col("medio p"), col("eva hoy")].join(" "));
for (const r of RASGOS) {
  const lo = Math.min(...vivas.map((p) => p.min[r])), hi = Math.max(...vivas.map((p) => p.max[r]));
  const medio = signado(r) ? (lo + hi) / 2 : Math.sqrt(lo * hi);
  const q1 = cuantil(muestra[r], 0.01), q99 = cuantil(muestra[r], 0.99);
  const medioQ = signado(r) ? (q1 + q99) / 2 : Math.sqrt(q1 * q99);
  console.log([r.padEnd(13), col(f2(lo)), col(f2(hi)), col(f2(medio)), col(f2(q1)), col(f2(q99)),
    col(f2(medioQ)), col(f2(med(vivas.map((p) => p.eva[r]))))].join(" "));
}
console.log("\nA leer: **medio** es el punto medio en octavas entre el mínimo y el máximo que han existido, y");
console.log("**medio p** el mismo punto entre el p01 y el p99. Si los dos se parecen, el fundador propuesto se");
console.log("sostiene; si el primero se va mucho del segundo, lo está fijando un solo mutante.");
