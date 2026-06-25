// Test de lógica pura: `npx tsx lib/farma/prioridades.test.ts`. Fuera del build.
import assert from "assert";
import { rankear } from "./prioridades";

// Orden por descuento desc, denominación = principio + lab.
const r = rankear("AMLODIPINO", [
  { lab: "CINFA", descuento: 10, inferido: false },
  { lab: "NORMON", descuento: 50, inferido: false },
  { lab: "TECNIGEN", descuento: 60, inferido: false },
]);
assert.deepStrictEqual(
  r.map((f) => [f.lab, f.prioridad]),
  [["TECNIGEN", 1], ["NORMON", 2], ["CINFA", 3]],
);
assert.strictEqual(r[0].denominacion, "AMLODIPINO TECNIGEN");

// Empates comparten prioridad (dense rank: 30,30,10 → 1,1,2).
const e = rankear("X", [
  { lab: "A", descuento: 30, inferido: false },
  { lab: "B", descuento: 30, inferido: false },
  { lab: "C", descuento: 10, inferido: false },
]);
assert.deepStrictEqual(e.map((f) => f.prioridad), [1, 1, 2]);

// Labs sin descuento: prioridad null, al final.
const n = rankear("Y", [
  { lab: "SIN", descuento: null, inferido: true },
  { lab: "CON", descuento: 40, inferido: false },
]);
assert.deepStrictEqual(n.map((f) => [f.lab, f.prioridad]), [["CON", 1], ["SIN", null]]);

console.log("prioridades.test.ts ✓");
