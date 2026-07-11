// Test de lógica pura: `npx tsx lib/viajes/planificador/planificar.test.ts`. Fuera del build.
import assert from "assert";
import { planificar } from "./planificar";
import { filtrarDestinos } from "../filtrar";
import type { MatrizViajes } from "./geo";
import type { PlanInput } from "./tipos";
import type { DatosViajes } from "../tipos";
import navarra from "../../../data/viajes/navarra.json";
import matriz from "../../../data/viajes/matriz-navarra.json";

const datos = navarra as unknown as DatosViajes;
const base: Omit<PlanInput, "dias"> = {
  datos, matriz: matriz as MatrizViajes, filtros: {},
  ritmo: "activo", comida: "picnic", fecha: new Date(Date.UTC(2026, 6, 15, 12)),
};

// Candidatos esperados: destinos filtrados, con GPS en la matriz y no alojamientos.
const candidatos = filtrarDestinos(datos.destinos, {})
  .filter((d) => d.gps && (matriz as MatrizViajes).ids.includes(d.slug) && d.tipo !== "alojamiento");
const setCand = new Set(candidatos.map((d) => d.slug));

const props = planificar({ ...base, dias: 4 });

// --- Forma: 3 propuestas A/B/C ---
assert.deepStrictEqual(props.map((p) => p.id), ["A", "B", "C"], "3 propuestas en orden A,B,C");
assert.deepStrictEqual(props.map((p) => p.nombre), ["Equilibrada", "Mínimo coche", "Imprescindibles"], "nombres");

for (const p of props) {
  assert.ok(p.dias.length <= 4, `${p.id}: no más días de los pedidos`);
  // Conservación: cada candidato aparece exactamente una vez (en un día o sin encajar).
  const colocados = p.dias.flatMap((d) => d.paradas.map((x) => x.slug));
  const todos = [...colocados, ...p.sinEncajar.map((s) => s.slug)];
  assert.strictEqual(todos.length, new Set(todos).size, `${p.id}: sin duplicados`);
  assert.deepStrictEqual(new Set(todos), setCand, `${p.id}: no se pierde ni inventa ningún candidato`);
  for (const d of p.dias) {
    assert.ok(d.paradas.length >= 1 && d.paradas.length <= 8, `${p.id} día ${d.numero}: 1–8 paradas`);
    assert.strictEqual(d.paradas[0].cocheDesdeAnterior, 0, `${p.id} día ${d.numero}: la 1ª parada no lleva coche previo`);
    assert.ok(d.minutosActivos > 0 && d.minutosLuz > 0, `${p.id} día ${d.numero}: minutos coherentes`);
  }
  assert.ok(p.cocheTotalMin >= 0, `${p.id}: coche total no negativo`);
}

// --- "Mínimo coche" (B): compacta PERO llena ---
// Con ritmo medio y comida en restaurante la penalización de zona se nota: B conduce
// menos que A sin dejar más destinos fuera (no degrada a días de una sola parada).
const [A, B, C] = props;
const medio = planificar({ ...base, dias: 5, ritmo: "medio", comida: "restaurante" });
const [Am, Bm] = medio;
assert.ok(Bm.cocheTotalMin < Am.cocheTotalMin, `B compacta: ${Bm.cocheTotalMin} < ${Am.cocheTotalMin} (A) min de coche`);
assert.ok(Bm.sinEncajar.length <= Am.sinEncajar.length, `B llena: no deja más fuera que A (${Bm.sinEncajar.length} ≤ ${Am.sinEncajar.length})`);
const diasConParadas = Bm.dias.filter((d) => d.paradas.length >= 1).length;
assert.strictEqual(Bm.dias.length, diasConParadas, "B: ningún día vacío");
assert.ok(B.cocheTotalMin <= A.cocheTotalMin, `B nunca conduce más que A (${B.cocheTotalMin} ≤ ${A.cocheTotalMin})`);

// --- "Imprescindibles" (C) coloca lo marcado el primer día ---
const imp = "tudela"; // en la Ribera, lejos del resto: sin priorizar quedaría para el final
const conImp = planificar({ ...base, dias: 4, imprescindibles: [imp] });
const cImp = conImp.find((p) => p.id === "C")!;
assert.ok(cImp.dias[0].paradas.some((x) => x.slug === imp), "C arranca el día 1 por el imprescindible");

// --- Un solo día: el resto queda sin encajar ---
const und = planificar({ ...base, dias: 1 }).find((p) => p.id === "A")!;
assert.strictEqual(und.dias.length, 1, "dias=1 → un solo día");
assert.ok(und.sinEncajar.length > 0, "con 1 día no caben los 19 candidatos");

// --- Determinista: mismos inputs, misma salida ---
assert.deepStrictEqual(planificar({ ...base, dias: 4 }), props, "salida determinista");

// --- Con comida=restaurante, un día en zona sin restaurante avisa del picnic ---
const conResto = planificar({ ...base, dias: 8, comida: "restaurante" });
const avisosPicnic = conResto.flatMap((p) => p.dias).flatMap((d) => d.avisos).filter((a) => a.includes("picnic"));
assert.ok(avisosPicnic.length > 0, "Urbasa/Tierra Estella no tienen restaurante → aviso de picnic");

console.log(`OK planificar.test.ts | A: ${A.dias.length}d/${A.cocheTotalMin}min coche · B: ${B.dias.length}d/${B.cocheTotalMin}min · C: ${C.dias.length}d/${C.cocheTotalMin}min`);
