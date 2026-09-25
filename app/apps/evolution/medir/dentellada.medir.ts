// Qué le hace al mundo que comer tarde — `npx tsx app/apps/evolution/medir/dentellada.medir.ts`.
// No es un test: mide. Fuera del build.
//
// 1. ¿Cambian censo, depredación y genes, sobre todo en el clima donde más se caza?
// 2. Emparejando por semilla, ¿hacia dónde se mueve cada mundo, o se reparten como el azar?
// 3. ¿Cuánta jornada se va de verdad en morder?
import { CONFIG, correrDia, REFERENCIA, crearMundo, mediana, resumen, tick, anochecer, amanecer } from "../engine";

const SEMILLAS = ("hola pablo claudio mar brizna raiz sal duna ocho nueve diez once sur norte cal arena hoja rama polvo cima " +
  "vado junco era brea luna sol pino roble olmo haya sauce cedro").split(" ");
const DIAS = 200;
/** Los que se comparan. 60 es un segundo a ×1; 120, dos. */
const TICKS = [0, 60, 120, 240];
/** Pobre, el de la urna, y rico — que es donde la depredación pesa el triple. */
const CLIMAS = [25, 40, 55];

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—").padStart(9);
const fila = (xs: (string | number)[]) => console.log(xs.map((x) => String(x).padStart(9)).join(" "));

type Fin = { censo: number; comidos: number; presa: number; talla: number; fiereza: number } | null;

function correr(sem: string, comidas: number, ticksPresa: number): Fin {
  const m = crearMundo(sem, { ...REFERENCIA, comidas, ticksPresa });
  for (let d = 0; d < DIAS && !m.extinto; d++) correrDia(m);
  if (m.extinto || m.bichos.length < 3) return null;
  const r = resumen(m);
  const muertes = m.cuenta.hambre + m.cuenta.comidos + m.cuenta.vejez;
  return {
    censo: r.censo, comidos: m.cuenta.comidos / m.dia,
    presa: muertes ? (100 * m.cuenta.comidos) / muertes : 0,
    talla: r.medianas.talla, fiereza: r.medianas.fiereza,
  };
}

// ── 1. El mundo al final, clima por clima ────────────────────────────────────
console.log(`\n## La dentellada: ${SEMILLAS.length} semillas, ${DIAS} días\n`);
const todo = new Map<string, Fin[]>();
for (const comidas of CLIMAS) {
  console.log(`\nclima ${comidas} bocados/día`);
  fila(["ticks", "vivas", "censo", "presas/d", "%presa", "talla", "fiereza"]);
  for (const ticksPresa of TICKS) {
    const fines = SEMILLAS.map((s) => correr(s, comidas, ticksPresa));
    todo.set(`${comidas}·${ticksPresa}`, fines);
    const v = fines.filter((f): f is NonNullable<Fin> => f !== null);
    fila([ticksPresa, `${v.length}/${SEMILLAS.length}`, fmt(mediana(v.map((f) => f.censo)), 0),
      fmt(mediana(v.map((f) => f.comidos))), fmt(mediana(v.map((f) => f.presa)), 1),
      fmt(mediana(v.map((f) => f.talla))), fmt(mediana(v.map((f) => f.fiereza)))]);
  }
}

// ── 2. Semilla contra semilla ────────────────────────────────────────────────
// La misma semilla comparte clima y fundador; el reparto de signos dice si hay efecto o caos.
console.log("\n\n## Semilla contra semilla, contra el mundo de 60 ticks\n");
fila(["clima", "ticks", "pares", "Δcenso", "suben", "Δpresas/d", "suben", "Δtalla", "suben"]);
for (const comidas of CLIMAS) {
  const base = todo.get(`${comidas}·60`)!;
  for (const ticksPresa of TICKS) {
    if (ticksPresa === 60) continue;
    const otro = todo.get(`${comidas}·${ticksPresa}`)!;
    const dc: number[] = [], dp: number[] = [], dt: number[] = [];
    for (let i = 0; i < SEMILLAS.length; i++) {
      const a = base[i], b = otro[i];
      if (!a || !b) continue;
      dc.push(b.censo - a.censo); dp.push(b.comidos - a.comidos); dt.push(b.talla - a.talla);
    }
    const suben = (xs: number[]) => `${xs.filter((x) => x > 0).length}/${xs.length}`;
    fila([comidas, ticksPresa, dc.length, fmt(mediana(dc), 1), suben(dc),
      fmt(mediana(dp)), suben(dp), fmt(mediana(dt)), suben(dt)]);
  }
}

// ── 3. Cuánta jornada se va en morder: fracción de vida anclada, los dos cuentan ─
console.log("\n\n## Jornada anclada (clima 55, el que más caza)\n");
fila(["ticks", "anclado%", "presas/d", "censo"]);
for (const ticksPresa of TICKS) {
  if (ticksPresa === 0) continue;
  let anclados = 0, vividos = 0, presas = 0, dias = 0, censo = 0;
  for (const sem of SEMILLAS.slice(0, 10)) {
    const m = crearMundo(sem, { ...REFERENCIA, comidas: 55, ticksPresa });
    for (let d = 0; d < 60 && !m.extinto; d++) {
      while (!tick(m)) for (const b of m.bichos) { vividos++; if (b.muerde || b.preso) anclados++; }
      anchoDia(m);
    }
    if (m.extinto) continue;
    presas += m.cuenta.comidos; dias += m.dia; censo += m.bichos.length;
  }
  fila([ticksPresa, fmt((100 * anclados) / vividos), fmt(presas / dias), fmt(censo / 10, 0)]);
}
function anchoDia(m: ReturnType<typeof crearMundo>) { anochecer(m); if (!m.extinto) amanecer(m); }

console.log(`\nEl mundo por defecto está en ticksPresa ${CONFIG.ticksPresa}.`);
console.log("A leer: `%presa` es la parte de las muertes que causa otro bicho, y `anclado%` la de la vida");
console.log("de la población que se pasa en una boca. Si la segunda es de décimas, la primera no puede");
console.log("moverse por la dentellada — y lo que se vea en las medianas es el caos de cada partida.");
