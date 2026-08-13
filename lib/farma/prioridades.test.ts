// Test de lógica pura: `npx tsx lib/farma/prioridades.test.ts`. Fuera del build.
import assert from "assert";
import { abreviar, mismaEntrada, rankear, sinGenerica } from "./prioridades";

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

// La hidroclorotiazida se abrevia en combo y no cuando va sola.
assert.strictEqual(abreviar("HIDROCLOROTIAZIDA"), "HIDROCLOROTIAZIDA");
assert.strictEqual(abreviar("LOSARTAN/HIDROCLOROTIAZIDA"), "LOSARTAN/HCTZ");
assert.strictEqual(abreviar("AMLODIPINO/OLMESARTAN/HIDROCLOROTIAZIDA"), "AMLODIPINO/OLMESARTAN/HCTZ");
assert.strictEqual(
  rankear("LOSARTAN/HIDROCLOROTIAZIDA", [{ lab: "CINFA", descuento: 50, inferido: false }])[0].denominacion,
  "LOSARTAN/HCTZ CINFA",
);

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

// Dosis: entra en la denominación (delante del lab), rankea en la misma lista que las
// genéricas y luego se coloca bajo la de su lab, saltándose el orden de prioridad.
const d = rankear("LORAZEPAM", [
  { lab: "KERN", descuento: 40, inferido: false },
  { lab: "NORMON", descuento: 30, inferido: false },
  { lab: "NORMON", descuento: 25, inferido: false, dosis: "0,5 MG" },
]);
assert.deepStrictEqual(
  d.map((f) => [f.denominacion, f.prioridad]),
  [
    ["LORAZEPAM KERN", 1],
    ["LORAZEPAM NORMON", 2],
    ["LORAZEPAM 0,5 MG NORMON", 3],
  ],
);
assert.strictEqual(d[2].dosis, "0,5 MG");

// Varias dosis del mismo lab: van juntas bajo su genérica, por descuento desc, aunque
// eso rompa el orden de la columna Prioridad. La dosis de un lab sin genérica (MABO)
// se queda en su puesto rankeado.
const g = rankear("IBUPROFENO", [
  { lab: "NORMON", descuento: 50, inferido: false },
  { lab: "CINFA", descuento: 30, inferido: false },
  { lab: "NORMON", descuento: 25, inferido: false, dosis: "600X40" },
  { lab: "KERN", descuento: 20, inferido: false },
  { lab: "MABO", descuento: 15, inferido: false, dosis: "SOBRES" },
  { lab: "KERN", descuento: 10, inferido: false, dosis: "600X20" },
  { lab: "NORMON", descuento: null, inferido: false, dosis: "SUSP" },
]);
assert.deepStrictEqual(
  g.map((f) => [f.denominacion, f.prioridad]),
  [
    ["IBUPROFENO NORMON", 1],
    ["IBUPROFENO 600X40 NORMON", 3],
    ["IBUPROFENO SUSP NORMON", null],
    ["IBUPROFENO CINFA", 2],
    ["IBUPROFENO KERN", 4],
    ["IBUPROFENO 600X20 KERN", 6],
    ["IBUPROFENO SOBRES MABO", 5],
  ],
);

// Identidad de una entrada: lab + dosis. La genérica no es la de una dosis, ni al revés.
const generica = { lab: "NORMON", descuento: 30, inferido: false };
const media = { lab: "NORMON", descuento: 25, inferido: false, dosis: "0,5 MG" };
assert.ok(mismaEntrada(generica, "NORMON"));
assert.ok(!mismaEntrada(generica, "NORMON", "0,5 MG"));
assert.ok(mismaEntrada(media, "NORMON", "0,5 MG"));
assert.ok(!mismaEntrada(media, "NORMON"));
assert.ok(!mismaEntrada(media, "KERN", "0,5 MG"));

// Un lab solo con dosis no tiene tarifa general; el que tiene genérica sí, aunque además
// excepcione alguna dosis. Un lab que no está en el principio tampoco tiene tarifa.
const conYSin = [
  { lab: "NORMON", descuento: 30, inferido: false, dosis: "COMP" },
  { lab: "NORMON", descuento: 70, inferido: false, dosis: "CAPS" },
  { lab: "KERN", descuento: 65, inferido: false },
  { lab: "KERN", descuento: 10, inferido: false, dosis: "600X20" },
];
assert.ok(sinGenerica(conYSin, "NORMON"));
assert.ok(!sinGenerica(conYSin, "KERN"));
assert.ok(sinGenerica(conYSin, "CINFA"));

console.log("prioridades.test.ts ✓");
