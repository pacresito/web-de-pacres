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

assert.deepStrictEqual(chicas.get("p3"), { ramas: ["Uno", "Dos"], porMatrimonio: null }, "quien está en varias sale en todas");
assert.deepStrictEqual(chicas.get("p5"), { ramas: ["Uno", "Dos"], porMatrimonio: "p3" }, "y quien entra casándose hereda las suyas, y con su nombre");
assert.deepStrictEqual(chicas.get("p6"), { ramas: ["Dos", "Cuatro"], porMatrimonio: null }, "la exclusión desgaja la línea entera");
assert.deepStrictEqual(chicas.get("p7")?.ramas, ["Dos", "Cuatro"], "y baja con ella hasta abajo");
assert.deepStrictEqual(chicas.get("p1")?.ramas, ["Uno"], "el antepasado cuenta en la suya");
assert.strictEqual(
  calcularRamas(construirGrafo(juguete), [{ nombre: "Sola", ancestro: "p3" }]).get("p5")?.porMatrimonio,
  "p3",
  "el cónyuge de quien no tiene descendencia también hereda",
);
assert.throws(
  () => calcularRamas(construirGrafo(juguete), [{ nombre: "Fantasma", ancestro: "p99" }]),
  /Fantasma/,
  "una rama sin antepasado en los datos falla a la cara, no en silencio",
);

// Sobre los datos de verdad: los números con los que se decidió el reparto
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const pertenencias = calcularRamas(g);

// Los tres sin rama son los tres hijos de un padre que no está en el árbol y de una madre que
// entró casándose: no descienden de nadie y la de ella es prestada, así que no hay ninguna que
// darles. Aina (p425), y los dos de Montserrat (p531, p532).
assert.deepStrictEqual(
  data.people.filter((p) => !pertenencias.has(p.id)).map((p) => p.id),
  ["p425", "p531", "p532"],
  "sin rama solo se queda quien no es de ninguna familia",
);
assert.strictEqual([...pertenencias.values()].filter((p) => p.porMatrimonio).length, 148, "las que entraron por su pareja");

const cuantos = (nombre: string) => [...pertenencias.values()].filter((p) => p.ramas.includes(nombre)).length;
assert.deepStrictEqual(
  RAMAS.map((r) => [r.nombre, cuantos(r.nombre)]),
  [
    ["Crespo", 58],
    ["Crespo-León", 58],
    ["Castrillo", 68],
    ["Velasco", 75],
    ["Maestre", 97],
    ["Pérez", 27],
    ["Bordallo", 28],
    ["Oreja", 9],
    ["Cardona", 61],
    ["Martín", 18],
    ["Sala", 28],
    ["Baños", 7],
  ],
  "el reparto por rama; Santi y Mar dejan Crespo y Velasco al estrenar la suya",
);
const total = [...pertenencias.values()].reduce((n, p) => n + p.ramas.length, 0);
assert.strictEqual(total, 534, "534 pertenencias para 509 personas: estar en dos ramas suma de más");
assert.strictEqual([...pertenencias.values()].filter((p) => p.ramas.length > 1).length, 14, "los que están en más de una");

console.log(`ramas.test.ts OK (${RAMAS.length} ramas, ${total} pertenencias para ${pertenencias.size} personas)`);
