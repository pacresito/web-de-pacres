// Las cifras que justifican las constantes del motor — `npx tsx app/apps/evolution/costes.medir.ts`.
//
// **No es un test: no falla, mide.** Fuera del build, como el resto de medidores. Cuatro
// preguntas, y ninguna es de opinión:
//
// 1. ¿La población se sostiene sin extinguirse siempre, y por debajo del techo que fija la comida?
// 2. ¿Se asienta cada gen, o hay alguno mejor cuanto más alto (la regla 1, que invalida el modelo)?
// 3. ¿Qué selecciona la escasez, y qué la abundancia?
// 4. ¿Cuánto dura un día, y cuánto hay que mirar para ver una generación?

import {
  CONFIG, RASGOS, correrDia, crearMundo, masaDe, resumen,
  type Bicho, type Config, type Rasgo,
} from "./engine";

const SEMILLAS = ["hola", "pablo", "claudio", "mar", "brizna", "raiz", "sal", "duna"];
const DIAS = 120;

const mediana = (xs: number[]): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—").padStart(8);
const fila = (xs: (string | number)[]) => console.log(xs.map((x) => String(x).padStart(8)).join(" "));

/** Corre varias semillas y devuelve censo, ticks por día y dónde acabó cada gen. */
function correr(cfg: Partial<Config>, dias = DIAS) {
  const censos: number[] = [], ticks: number[] = [], presa: number[] = [], genes: Record<string, number[]> = {};
  for (const r of RASGOS) genes[r] = [];
  let vivas = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s, cfg);
    let suma = 0;
    for (let d = 0; d < dias && !m.extinto; d++) { correrDia(m); suma += m.duracion; }
    if (m.extinto || m.bichos.length < 3) continue;
    vivas++;
    const r = resumen(m);
    censos.push(r.censo);
    ticks.push(suma / Math.max(1, m.dia));
    // Qué parte de las muertes las causa otro bicho: en 0, la fiereza no la mira nadie.
    const muertes = m.cuenta.hambre + m.cuenta.fuera + m.cuenta.comidos;
    presa.push(muertes ? (100 * m.cuenta.comidos) / muertes : 0);
    for (const g of RASGOS) genes[g].push(r.medianas[g]);
  }
  return { vivas, de: SEMILLAS.length, censo: mediana(censos), ticks: mediana(ticks), presa: mediana(presa), genes };
}

// ── 1. ¿Se sostiene la población, y con qué cantidad de comida? ───────────────
console.log("\n## Comida por día: población y supervivencia\n");
fila(["comidas", "vivas", "censo", "ticks/día", "%presa", "empuje", "talla", "vision", "retorno"]);
for (const comidas of [70, 150, 300, 600]) {
  const r = correr({ comidas });
  fila([comidas, `${r.vivas}/${r.de}`, fmt(r.censo, 0), fmt(r.ticks, 0), fmt(r.presa, 0),
    fmt(mediana(r.genes.empuje)), fmt(mediana(r.genes.talla)), fmt(mediana(r.genes.vision), 1),
    fmt(mediana(r.genes.retorno))]);
}
console.log("\nA leer: el techo teórico es tantos bichos como bocados. Un censo pegado al techo es un mundo");
console.log("sin hambre; uno muy por debajo, un mundo donde volver a casa es el problema y no encontrar comida.");

// ── 2. La regla 1: ningún gen mejor cuanto más alto ──────────────────────────
// **Con la población mezclada, no con clones.** Arrancar un mundo entero con el gen a ×3 y ver
// dónde acaba no mide selección: mide si ese fundador es viable —con el empuje a ×0,3 se
// extinguían las ocho semillas y la casilla no decía nada— y encima deja fuera a los genes que
// solo significan algo frente a otro, que es justo la fiereza. Aquí media población arranca con
// el gen bajo y media con el alto, en el mismo mundo, compitiendo entre sí.
//
// **Y un solo abanico no basta: hay que saber antes cuáles de sus extremos son habitables.** Un
// duelo entre un valor viable y uno letal no mide selección, mide viabilidad, y deja al
// superviviente pegado a su extremo con toda la pinta de un gen sin techo. Por eso se mide
// primero qué valores sostienen un mundo de clones, y el duelo cuyo extremo cae fuera de esa
// ventana ni se corre.
//
// **La posición se lee en escala logarítmica**, porque los genes mutan multiplicando: el punto
// neutro de una deriva sin dirección es la media geométrica del abanico, no la aritmética.
//
// Es la sección cara del medidor —la ventana son ocho mundos de clones por gen, y cada duelo son
// 300 días— y por eso corre menos días la parte que solo tiene que distinguir vivo de muerto.
console.log("\n## Ningún gen puede ser mejor cuanto más alto\n");

/** Múltiplos del fundador que se barren; cada duelo enfrenta un valor con el que va dos más allá. */
const ESCALA = [1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 16];
// **El veredicto de un duelo ya está a los 100 días**, comprobado en `fiereza` y `retorno`: los seis
// abanicos dicen lo mismo que a 300 y la posición se mueve menos de 0,1. Los dos grupos compiten
// desde el primer día y la cosa se decide pronto. Lo que sí necesitaría 300 es ver derivar a una
// población **homogénea**, que al día 100 todavía no se ha separado de su arranque — pero eso no es
// lo que esta sección pregunta.
const DIAS_DUELO = 100;
const DIAS_VIABLE = 100;

/** La talla arrastra radio, masa y despensa; los demás genes no tocan el cuerpo. */
function fijar(b: Bicho, r: Rasgo, v: number) {
  b.g[r] = v;
  if (r === "talla") { b.radio = v; b.masa = masaDe(v); b.reserva = CONFIG.capReserva * b.masa; }
}

/** Semillas que sostienen un mundo entero de clones con el gen en `v`. */
function viables(r: Rasgo, v: number): number {
  let n = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s);
    for (const b of m.bichos) fijar(b, r, v);
    for (let d = 0; d < DIAS_VIABLE && !m.extinto; d++) correrDia(m);
    if (!m.extinto && m.bichos.length >= 3) n++;
  }
  return n;
}

/** Media población abajo y media arriba, en el mismo mundo. Devuelve dónde acabó la mediana. */
function duelo(r: Rasgo, bajo: number, alto: number) {
  const fin: number[] = [];
  let vivas = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s);
    m.bichos.forEach((b, i) => fijar(b, r, i % 2 ? alto : bajo));
    for (let d = 0; d < DIAS_DUELO && !m.extinto; d++) correrDia(m);
    if (m.extinto || m.bichos.length < 3) continue;
    vivas++;
    fin.push(resumen(m).medianas[r]);
  }
  const f = mediana(fin);
  return { f, pos: Math.log(f / bajo) / Math.log(alto / bajo), vivas };
}

const MITAD = SEMILLAS.length / 2;
for (const r of RASGOS) {
  if (r === "sociabilidad") continue;   // el único con signo: su cero no es una escala
  const valores = ESCALA.map((k) => CONFIG.fundador[r] * k);
  const ventana = valores.map((v) => viables(r, v));
  console.log(`\n${r}  (fundador ${CONFIG.fundador[r]})`);
  fila(["valor", ...valores.map((v) => fmt(v, v < 10 ? 2 : 0))]);
  fila(["clones", ...ventana.map((n) => `${n}/${SEMILLAS.length}`)]);
  fila(["abanico", "final", "pos", "vivas", "veredicto"]);
  for (let i = 0; i + 1 < valores.length; i++) {
    // El duelo con un extremo fuera de la ventana no se corre: su veredicto sería el de la
    // viabilidad disfrazado de selección, que es el error que esta sección existe para no cometer.
    // Pero rendirse ahí deja mudos a los genes cuya ventana entera es más estrecha que el abanico
    // —empuje y talla viven en un factor 2—, así que el abanico se encoge a ×2 antes de callarse.
    const j = i + 2 < valores.length && ventana[i + 2] >= MITAD ? i + 2 : i + 1;
    const bajo = valores[i], alto = valores[j];
    const rango = `${fmt(bajo, 1).trim()}–${fmt(alto, 1).trim()}`;
    if (ventana[i] < MITAD || ventana[j] < MITAD) {
      fila([rango, "—", "—", "—", `extremo inviable (${ventana[i]} vs ${ventana[j]})`]);
      continue;
    }
    const d = duelo(r, bajo, alto);
    const veredicto = d.vivas < 3 ? "sin datos"
      : d.pos < 0.15 ? "gana el bajo"
      : d.pos > 0.85 ? "gana el alto — sin techo"
      : "óptimo interior";
    fila([rango, fmt(d.f), fmt(d.pos), `${d.vivas}/${SEMILLAS.length}`, veredicto]);
  }
}
console.log("\nA leer: la fila `clones` es la ventana habitable del gen, y fuera de ella no hay veredicto");
console.log("que dar. Dentro, si la mediana acaba en medio hay óptimo; si se pega a un extremo en todos");
console.log("los abanicos habitables, ahí no hay trade-off que valga.");

// ── 3. ¿La escasez selecciona ojo y piernas? ─────────────────────────────────
console.log("\n## Escasez contra abundancia\n");
const pobre = correr({ comidas: 70 }), rico = correr({ comidas: 600 });
fila(["mundo", "censo", "empuje", "vision", "talla", "retorno"]);
for (const [n, r] of [["pobre", pobre], ["rico", rico]] as const) {
  fila([n, fmt(r.censo, 0), fmt(mediana(r.genes.empuje)), fmt(mediana(r.genes.vision), 1),
    fmt(mediana(r.genes.talla)), fmt(mediana(r.genes.retorno))]);
}
const dt = mediana(rico.genes.talla) / mediana(pobre.genes.talla) - 1;
console.log(`\ntalla ${(dt * 100).toFixed(0)}% más en el mundo rico.`);
console.log("A leer: lo que se mueve con la comida es la talla. Visión y empuje no salen del ruido:");
console.log("la comida se ve de cerca y el día es corto, así que ni ver lejos ni correr se pagan solos.");
