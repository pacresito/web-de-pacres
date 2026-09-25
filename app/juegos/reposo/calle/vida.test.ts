// npx tsx app/juegos/reposo/calle/vida.test.ts
import { CALMA, SUCESOS, TRAMO, agenda, familiaDe, farolaLuz, sucesoDelTramo, viento, type Suceso } from "./vida";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

const horaEn = (t: number) => ((t / 3600) % 24 + 24) % 24;
const T0 = Date.UTC(2026, 8, 24) / 1000;
const SEMANA = 7 * 86400;

// Una semana, cada 5 segundos.
let aLaVez = 0, gatoDoble = 0, tiempoConAlgo = 0;
const vistos = new Map<string, number>();
for (let t = T0; t < T0 + SEMANA; t += 5) {
  const hay = agenda(t, horaEn);
  const otros = hay.filter((s) => s.id !== "siesta");
  if (otros.length > 1) aLaVez++;
  if (hay.filter((s) => familiaDe(s.id) === "gato").length > 1) gatoDoble++;
  if (otros.length) tiempoConAlgo += 5;
  for (const s of hay) vistos.set(`${s.id}@${s.inicio}`, 1);
}
test("nunca pasan dos sucesos a la vez", aLaVez === 0, `${aLaVez} instantes`);
test("el gato no se asoma mientras duerme la siesta", gatoDoble === 0, `${gatoDoble} instantes`);

const porTipo = new Map<string, number>();
for (const k of vistos.keys()) porTipo.set(k.split("@")[0], (porTipo.get(k.split("@")[0]) ?? 0) + 1);
const faltan = [...Object.keys(SUCESOS), "siesta"].filter((id) => !porTipo.get(id));
test("en una semana sale todo", faltan.length === 0, faltan.join(", "));
const sucesos = [...porTipo.entries()].filter(([id]) => id !== "siesta").reduce((a, [, n]) => a + n, 0);
const cada = SEMANA / sucesos / 60;
test("un suceso cada tres minutos, más o menos", cada > 2.5 && cada < 4, `${cada.toFixed(1)} min`);
const ocupado = tiempoConAlgo / SEMANA;
test("la mayor parte del tiempo no pasa nada", ocupado < 0.4, `${Math.round(ocupado * 100)} % con algo`);
// Calma entre sucesos, más aún en la misma familia; la siesta cuenta como gato.
const lista: Suceso[] = [...vistos.keys()].map((k) => {
  const [id, inicio] = k.split("@");
  const dur = id === "siesta" ? 600 : SUCESOS[id as keyof typeof SUCESOS].dur;
  return { id: id as Suceso["id"], inicio: +inicio, dur, variante: 0 };
}).sort((a, b) => a.inicio - b.inicio);
let sinAire = 0, familiaSeguida = 0;
const ultimoDe = new Map<string, Suceso>();
let anterior: Suceso | null = null;
for (const s of lista) {
  if (s.id !== "siesta") {
    if (anterior && s.inicio - (anterior.inicio + anterior.dur) < 2 * CALMA) sinAire++;
    anterior = s;
  }
  const previo = ultimoDe.get(familiaDe(s.id));
  if (previo && s.inicio - (previo.inicio + previo.dur) < TRAMO) familiaSeguida++;
  ultimoDe.set(familiaDe(s.id), s);
}
test("entre dos sucesos hay calma", sinAire === 0, `${sinAire} pegados`);
test("la misma familia no repite seguida", familiaSeguida === 0, `${familiaSeguida} seguidos`);

const siestas = porTipo.get("siesta") ?? 0;
test("unas pocas siestas al día", siestas / 7 > 3 && siestas / 7 < 40, `${(siestas / 7).toFixed(1)} al día`);

// Cada suceso cabe en su tramo y sale a su hora.
let fuera = 0;
const aDeshora: string[] = [];
for (let k = Math.floor(T0 / TRAMO); k < (T0 + SEMANA) / TRAMO; k++) {
  const s = sucesoDelTramo(k, horaEn);
  if (!s) continue;
  if (s.inicio < k * TRAMO || s.inicio + s.dur > (k + 1) * TRAMO) fuera++;
  const tipo: { cuando: (h: number) => boolean } = SUCESOS[s.id as keyof typeof SUCESOS];
  if (!tipo.cuando(horaEn(k * TRAMO))) aDeshora.push(`${s.id} a las ${horaEn(k * TRAMO).toFixed(1)}`);
}
test("cada suceso cabe en su tramo", fuera === 0, `${fuera} se salen`);
test("cada suceso sale solo a su hora", aDeshora.length === 0, aDeshora.slice(0, 3).join(", "));

// El reloj decide.
const t = T0 + 12345.6;
test("la misma hora da la misma escena", JSON.stringify(agenda(t, horaEn)) === JSON.stringify(agenda(t, horaEn)));

// Viento y farola.
let vMin = 1, vMax = 0, apagada = 0, n = 0;
for (let s = T0; s < T0 + 86400; s += 0.5) {
  const v = viento(s);
  vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  if (farolaLuz(s) < 1) apagada++;
  n++;
}
test("el viento va de calma a ráfaga sin salirse", vMin >= 0 && vMax <= 1 && vMax - vMin > 0.5, `${vMin.toFixed(2)}–${vMax.toFixed(2)}`);
test("la farola falla poco", apagada / n > 0.001 && apagada / n < 0.02, `${((apagada / n) * 100).toFixed(2)} % del tiempo`);

console.log(fails ? `\n${fails} fallos` : "\ntodo bien");
process.exit(fails ? 1 : 0);
