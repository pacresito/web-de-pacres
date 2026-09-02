// Las cifras que justifican las constantes del motor — `npx tsx app/apps/evolution/costes.medir.ts`.
//
// **No es un test: no falla, mide.** Fuera del build, como el resto de medidores. Cuatro
// preguntas, y ninguna es de opinión:
//
// 1. ¿La población se sostiene sin extinguirse siempre, y por debajo del techo que fija la comida?
// 2. ¿Se asienta cada gen, o hay alguno mejor cuanto más alto (la regla 1, que invalida el modelo)?
// 3. ¿Qué selecciona la escasez, y qué la abundancia?
// 4. ¿Cuánto dura un día, y cuánto hay que mirar para ver una generación?

import { CONFIG, RASGOS, correrDia, crearMundo, resumen, type Config } from "./engine";

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
// solo significan algo frente a otro, que es justo la fiereza. Aquí media población
// arranca con el gen bajo y media con el alto, en el mismo mundo, compitiendo entre sí.
console.log("\n## Ningún gen puede ser mejor cuanto más alto\n");
fila(["gen", "abajo", "arriba", "final", "veredicto"]);
for (const r of RASGOS) {
  if (r === "sociabilidad") continue;   // el único con signo: su cero no es una escala
  const bajo = CONFIG.fundador[r] * 0.5, alto = CONFIG.fundador[r] * 2;
  const fin: number[] = [];
  let vivas = 0;
  for (const s of SEMILLAS) {
    const m = crearMundo(s);
    m.bichos.forEach((b, i) => {
      b.g[r] = i % 2 ? alto : bajo;
      if (r === "talla") { b.radio = b.g.talla; b.masa = b.radio * b.radio * b.radio; }
    });
    for (let d = 0; d < DIAS && !m.extinto; d++) correrDia(m);
    if (m.extinto || m.bichos.length < 3) continue;
    vivas++;
    fin.push(resumen(m).medianas[r]);
  }
  const f = mediana(fin);
  // Dónde ha caído la mediana dentro del abanico de partida: 0 es pegada al valor bajo, 1 al
  // alto. Entre 0,2 y 0,8 hay óptimo interior; fuera, el gen tira a un extremo; y si además la
  // dispersión sigue siendo la de partida, es que no lo mira nadie.
  const pos = (f - bajo) / (alto - bajo);
  const veredicto = vivas < 3 ? "sin datos"
    : pos < 0.15 ? "gana el bajo"
    : pos > 0.85 ? "gana el alto — sin techo"
    : "óptimo interior";
  fila([r, fmt(bajo), fmt(alto), fmt(f), `${veredicto} (${pos.toFixed(2)})`]);
}
console.log("\nA leer: media población arranca abajo y media arriba. Si la mediana acaba en medio, el gen");
console.log("tiene óptimo; si se pega a un extremo, ahí no hay trade-off que valga.");

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
