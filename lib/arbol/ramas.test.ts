// Test de lógica pura: `npx tsx lib/arbol/ramas.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { calcularRamas, RAMAS, type Rama } from "./ramas";
import type { ArbolData, Persona, Union } from "./tree";

const persona = (id: string): Persona => ({ id, nombre: id, apellidos: [], fuentes: [] });
const union = (id: string, partners: string[], children: string[]): Union => ({
  id,
  partners,
  children,
  tipo: "matrimonio",
  fuentes: [],
});

// Dos troncos que se cruzan: p3 desciende de los dos, p5 no desciende de ninguno y entra
// casándose con p3, y p6 desciende de p2 pero por la línea que p1 se desgaja.
const juguete: ArbolData = {
  people: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"].map(persona),
  unions: [
    union("u1", ["p1", "p2"], ["p3", "p4"]),
    union("u2", ["p3", "p5"], []),
    union("u3", ["p4"], ["p6"]),
    union("u4", ["p6"], ["p7"]),
  ],
  roots: {},
};
const RAMAS_JUGUETE: Rama[] = [
  { nombre: "Uno", ancestro: "p1", excluye: "p4" },
  { nombre: "Dos", ancestro: "p2" },
  { nombre: "Cuatro", ancestro: "p4" },
];
const chicas = calcularRamas(construirGrafo(juguete), RAMAS_JUGUETE);

assert.deepStrictEqual(chicas.get("p3"), { ramas: ["Uno", "Dos"], porMatrimonio: false }, "quien está en varias sale en todas");
assert.deepStrictEqual(chicas.get("p5"), { ramas: ["Uno", "Dos"], porMatrimonio: true }, "y quien entra casándose hereda las suyas");
assert.deepStrictEqual(chicas.get("p6"), { ramas: ["Dos", "Cuatro"], porMatrimonio: false }, "la exclusión desgaja la línea entera");
assert.deepStrictEqual(chicas.get("p7")?.ramas, ["Dos", "Cuatro"], "y baja con ella hasta abajo");
assert.deepStrictEqual(chicas.get("p1")?.ramas, ["Uno"], "el antepasado cuenta en la suya");
assert.strictEqual(
  calcularRamas(construirGrafo(juguete), [{ nombre: "Sola", ancestro: "p3" }]).get("p5")?.porMatrimonio,
  true,
  "el cónyuge de quien no tiene descendencia también hereda",
);
assert.throws(
  () => calcularRamas(construirGrafo(juguete), [{ nombre: "Fantasma", ancestro: "p99" }]),
  /Fantasma/,
  "una rama sin antepasado en los datos falla a la cara, no en silencio",
);

// --- Sobre los datos de verdad: los números con los que se decidió el reparto ---
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const pertenencias = calcularRamas(g);

assert.strictEqual(pertenencias.size, data.people.length, "nadie se queda sin rama");
assert.strictEqual([...pertenencias.values()].filter((p) => p.porMatrimonio).length, 126, "las que entraron casándose");

const cuantos = (nombre: string) => [...pertenencias.values()].filter((p) => p.ramas.includes(nombre)).length;
assert.deepStrictEqual(
  RAMAS.map((r) => [r.nombre, cuantos(r.nombre)]),
  [
    ["Castrillo", 68],
    ["Crespo", 59],
    ["Crespo-León", 58],
    ["Velasco", 77],
    ["Maestre", 90],
    ["Cardona", 60],
    ["Martín", 18],
    ["Sala", 15],
  ],
  "el reparto por rama; Santi deja Crespo y Velasco al estrenar la suya",
);
const total = [...pertenencias.values()].reduce((n, p) => n + p.ramas.length, 0);
assert.strictEqual(total, 445, "445 pertenencias para 428 personas: el mapa de áreas suma un 4 % de más");
assert.strictEqual([...pertenencias.values()].filter((p) => p.ramas.length > 1).length, 12, "los que están en más de una");

console.log(`ramas.test.ts OK (${RAMAS.length} ramas, ${total} pertenencias para ${pertenencias.size} personas)`);
