// Qué le hace al mundo que comerse a otro tarde — `npx tsx app/apps/evolution/dentellada.medir.ts`.
//
// **No es un test: no falla, mide.** La cifra de `ticksPresa` la elige el ojo, así que lo que no
// puede quedar sin medir es lo otro: mordiendo no se decide ni se anda, ni el que muerde ni el
// mordido, y eso es jornada que se pierde. En 0 se come en el tick del contacto, que es como
// estuvo el mundo hasta que la depredación se pudo mirar.
//
// Tres preguntas, y ninguna es «¿sale otra partida?» — eso ya se sabe: el mundo es determinista y
// cambiar cualquier cosa lo bifurca desde el primer mordisco. Lo que se pregunta es si la ecología
// se mueve.
//
// 1. ¿Cambian el censo, la depredación y los genes, y cambian **en el clima donde más se caza**?
// 2. Emparejando por semilla —el clima y la Eva son la mayor fuente de ruido—, ¿hacia dónde se
//    mueve cada mundo, o se reparten a un lado y a otro como el azar?
// 3. ¿Cuánta jornada se va de verdad en morder? Es la magnitud de la que cuelgan las otras dos.
import { CONFIG, correrDia, crearMundo, mediana, resumen, tick, anochecer, amanecer } from "./engine";

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
  const m = crearMundo(sem, { comidas, ticksPresa });
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
// **Emparejar es lo que le da sensibilidad a esto.** Entre semillas, el censo va de doce a treinta
// y una mediana de treinta y dos mundos distintos tapa cualquier efecto pequeño; la misma semilla
// con dos reglas comparte clima y fundador, así que lo que queda es lo que hace la regla — más el
// caos, que es lo que se lee en el reparto de signos: si sube en la mitad y baja en la otra, no hay
// efecto que contar por mucho que la mediana se mueva.
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

// ── 3. Cuánta jornada se va en morder ────────────────────────────────────────
// Tick a tick y contando cuerpos: la fracción de la vida de la población que se pasa anclada, con
// el que muerde y el mordido contando los dos. Es la magnitud que explica por qué lo de arriba
// sale como sale.
console.log("\n\n## Jornada anclada (clima 55, el que más caza)\n");
fila(["ticks", "anclado%", "presas/d", "censo"]);
for (const ticksPresa of TICKS) {
  if (ticksPresa === 0) continue;
  let anclados = 0, vividos = 0, presas = 0, dias = 0, censo = 0;
  for (const sem of SEMILLAS.slice(0, 10)) {
    const m = crearMundo(sem, { comidas: 55, ticksPresa });
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
