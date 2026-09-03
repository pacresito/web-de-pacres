// Las cifras que fijan la escala del reparto — `npx tsx app/apps/evolution/reparto.medir.ts`.
//
// **No es un test: no falla, mide.** Fuera del build, como el resto de medidores. Tarda unos
// minutos: la pregunta de la ventana solo se contesta con partidas largas, porque lo que decide
// cuánta hace falta es hasta dónde llega un gen en mil días y no dónde está al centenar.
//
// Cuatro preguntas, y las cuatro son del instrumento y no del mundo:
//
// 1. ¿Se ven las seis bandas distintas entre sí? Es lo que decide si el panel cuenta seis cosas o
//    una repetida seis veces, y es lo único que no se puede saber sin mirarlas.
// 2. ¿Cuánta ventana pide cada gen? Fija `OCTAVAS` y `SOC`. Hay que caber dos cosas que tiran en
//    sentidos opuestos: **lejos**, hasta dónde se va la población del fundador —si no cabe, la
//    banda se apelmaza contra la pared y deja de decir dónde está—, y **grosor**, lo ancha que es
//    en un día — si sobra ventana, el cuerpo de la población es una rendija.
// 3. ¿Cuántas franjas hacen falta para ese grosor? Fija `BINS`.
// 4. ¿Qué se ve en los primeros días? Es lo primero que mira quien abre la página, y el panel
//    tiene que aguantarlo: la población se desploma antes de recuperarse.

import { RASGOS, banda, correrDia, crearMundo, signado } from "./engine";
import { BINS, OCTAVAS, SOC, columnas, crearHistoria, registrar, type Historia } from "./reparto";

const SEMILLAS = ["hola", "pablo", "mar", "brizna", "duna"];
const DIAS = 1000;
const ANCHO = 92;                 // columnas de la banda en ASCII, que es lo que cabe en una terminal
const ALTO = 16;                  // franjas que se pintan: las de `BINS`, agrupadas
const RAMPA = " ·:-=+*#%@";

/** Positivos: octavas desde el fundador. El que lleva signo: unidades desde el cero, que es su ancla. */
const esc = (r: (typeof RASGOS)[number], x: number, eva: number) =>
  signado(r) ? x : Math.log2(x / eva);

const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
const col = (x: string | number, n = 9) => String(x).padStart(n);

// ── Una pasada por semilla, que es lo caro ───────────────────────────────────
// La historia y las distancias salen del mismo mundo: correrlo dos veces sería el doble de
// minutos para las mismas cifras.
type Medida = { grosor: number; lejos: number };
const historias: Historia[] = [];
const medidas: Record<string, Medida[]> = {};
for (const r of RASGOS) medidas[r] = [];

for (const s of SEMILLAS) {
  const m = crearMundo(s);
  const h = crearHistoria(m.eva);
  const eva = { ...m.eva };
  const lejos: Record<string, number> = {}, grosores: Record<string, number[]> = {};
  for (const r of RASGOS) { lejos[r] = 0; grosores[r] = []; }
  let vivos = 0;
  for (let d = 0; d < DIAS && !m.extinto; d++) {
    correrDia(m);
    registrar(h, m);
    if (m.bichos.length < 4) continue;      // con tres bichos los deciles no son deciles
    vivos++;
    for (const r of RASGOS) {
      const b = banda(m.bichos.map((x) => x.g[r]))!;
      const lo = esc(r, b.lo, eva[r]), hi = esc(r, b.hi, eva[r]);
      lejos[r] = Math.max(lejos[r], Math.abs(lo), Math.abs(hi));
      grosores[r].push(hi - lo);
    }
  }
  historias.push(h);
  console.log(`${s.padEnd(9)} ${col(vivos, 5)} días con población, censo final ${m.bichos.length}`);
  for (const r of RASGOS) if (grosores[r].length) medidas[r].push({ grosor: med(grosores[r]), lejos: lejos[r] });
}

// ── 1. Las seis bandas de una partida ────────────────────────────────────────
/** La banda de un gen en caracteres: el tiempo a lo ancho, la escala del gen a lo alto. */
function pintarBanda(h: Historia, gen: number): string[] {
  const cs = columnas(h, ANCHO);
  const grupo = BINS / ALTO;
  const celda = (c: (typeof cs)[number], f: number) => {
    let s = 0;
    for (let j = 0; j < grupo; j++) s += c.densidad[gen * BINS + f * grupo + j];
    return s;
  };
  // Una rampa por gen y no una común: lo que se compara dentro de una banda es su propia forma, y
  // con una escala compartida la del gen más apretado se comería a las otras cinco.
  let pico = 0;
  for (const c of cs) for (let f = 0; f < ALTO; f++) pico = Math.max(pico, celda(c, f));
  const filas: string[] = [];
  for (let f = ALTO - 1; f >= 0; f--) {                 // de arriba abajo: el gen alto, arriba
    let s = "";
    for (const c of cs) s += RAMPA[Math.min(RAMPA.length - 1, Math.round((celda(c, f) / (pico || 1)) * (RAMPA.length - 1)))];
    filas.push(s);
  }
  return filas;
}

const h0 = historias[0];
console.log(`\n## Las seis bandas — semilla "${SEMILLAS[0]}", ${h0.dias.length * h0.paso} días\n`);
console.log(`Arriba ×${2 ** OCTAVAS} del fundador, en medio el fundador, abajo ÷${2 ** OCTAVAS}`);
console.log(`(y en la sociabilidad, de +${SOC} a −${SOC}). A lo ancho, la partida entera.\n`);
for (let i = 0; i < RASGOS.length; i++) {
  const r = RASGOS[i], fin = h0.dias[h0.dias.length - 1].med[i];
  console.log(`${r}  ${h0.eva[r].toFixed(2)} → ${fin.toFixed(2)}`);
  const marca = (k: number) => k === 0 ? `×${2 ** OCTAVAS}` : k === (ALTO >> 1) ? "ev" : k === ALTO - 1 ? `÷${2 ** OCTAVAS}` : "  ";
  pintarBanda(h0, i).forEach((f, k) => console.log(`  ${marca(k).padStart(2)} │${f}│`));
  console.log("");
}
console.log("A leer: seis formas distintas o el panel cuenta una cosa seis veces. Una banda que se apoya");
console.log("en el borde de arriba o de abajo pide más ventana; una que es una raya, menos.\n");

// ── 2. Cuánta ventana pide cada gen ──────────────────────────────────────────
console.log(`## La ventana: hasta dónde se va la población y cuánto mide (octavas; la sociabilidad, unidades)\n`);
console.log([col("gen", 13), col("grosor"), col("lejos"), col("peor"), col("% escala")].join(" "));
for (const r of RASGOS) {
  const ms = medidas[r];
  if (!ms.length) continue;
  const ventana = signado(r) ? 2 * SOC : 2 * OCTAVAS;
  console.log([r.padEnd(13), col(med(ms.map((x) => x.grosor)).toFixed(2)),
    col(med(ms.map((x) => x.lejos)).toFixed(2)), col(Math.max(...ms.map((x) => x.lejos)).toFixed(2)),
    col(((100 * med(ms.map((x) => x.grosor))) / ventana).toFixed(0))].join(" "));
}
console.log(`\nA leer: la ventana es de ±${OCTAVAS} octavas (±${SOC} en la sociabilidad), así que **peor** tiene que caber`);
console.log(`con margen —lo que la pase se apelmaza contra la pared— y **% escala** dice qué parte de la banda`);
console.log("ocupa el cuerpo de la población. Por debajo del 5% es una rendija; por encima del 30%, no queda");
console.log("sitio para que el gen se mueva.\n");

// ── 3. Cuántas franjas ──────────────────────────────────────────────────────
console.log("## Franjas que ocupa el cuerpo de la población, a cada resolución\n");
console.log([col("gen", 13), ...[BINS / 4, BINS / 2, BINS, BINS * 2].map((b) => col(b))].join(" "));
for (const r of RASGOS) {
  const ms = medidas[r];
  if (!ms.length) continue;
  const parte = med(ms.map((x) => x.grosor)) / (signado(r) ? 2 * SOC : 2 * OCTAVAS);
  console.log([r.padEnd(13), ...[BINS / 4, BINS / 2, BINS, BINS * 2].map((b) => col((parte * b).toFixed(1)))].join(" "));
}
console.log(`\nA leer: por debajo de tres franjas no hay forma que enseñar —una población partida en dos se ve`);
console.log("igual que una ancha, que es justo lo que el panel está para distinguir— y por encima de doce cada");
console.log("franja cuenta un bicho o ninguno, y lo que se dibuja es el ruido del censo.\n");

// ── 4. El primer valle ───────────────────────────────────────────────────────
console.log("## Censo de los primeros días, y cuándo se recupera\n");
const DIAS_MIRA = [1, 2, 3, 5, 10, 20, 40, 60, 100, 300];
console.log([col("semilla", 9), ...DIAS_MIRA.map((d) => col(`d${d}`, 6))].join(" "));
SEMILLAS.forEach((s, k) => {
  const hh = historias[k];
  const en = (d: number) => col(hh.dias[Math.floor(d / hh.paso) - 1]?.censo ?? "—", 6);
  console.log([s.padEnd(9), ...DIAS_MIRA.map(en)].join(" "));
});
console.log("\nA leer: lo primero que ve quien abre la página es un mundo que se desploma a un tercio en tres");
console.log("días y tarda decenas en recuperarse. El panel arranca ahí, y su escala vertical no puede quedar");
console.log("fijada por lo que pase en esa caída.");
