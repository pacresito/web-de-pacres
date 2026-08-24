// Test de lógica pura: `npx tsx lib/arbol/ramas.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo, visibles } from "./grafo";
import { calcularRamas, ramaVisible, RAMAS, repartoDeRamas, type Rama } from "./ramas";
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

// Aina es la única sin rama, y no hay ninguna que darle: su padre no está en el árbol y su
// madre entró casándose, así que no desciende de nadie ni la hereda de segunda mano.
assert.deepStrictEqual(
  data.people.filter((p) => !pertenencias.has(p.id)).map((p) => p.id),
  ["p425"],
  "sin rama solo se queda quien no es de ninguna familia",
);
assert.strictEqual([...pertenencias.values()].filter((p) => p.porMatrimonio).length, 138, "las que entraron por su pareja");

const cuantos = (nombre: string) => [...pertenencias.values()].filter((p) => p.ramas.includes(nombre)).length;
assert.deepStrictEqual(
  RAMAS.map((r) => [r.nombre, cuantos(r.nombre)]),
  [
    ["Castrillo", 68],
    ["Crespo", 58],
    ["Crespo-León", 58],
    ["Velasco", 74],
    ["Maestre", 95],
    ["Pérez", 23],
    ["Cardona", 62],
    ["Martín", 18],
    ["Sala", 22],
    ["Baños", 7],
  ],
  "el reparto por rama; Santi y Mar dejan Crespo y Velasco al estrenar la suya",
);
const total = [...pertenencias.values()].reduce((n, p) => n + p.ramas.length, 0);
assert.strictEqual(total, 485, "485 pertenencias para 467 personas: el mapa de áreas suma un 4 % de más");
assert.strictEqual([...pertenencias.values()].filter((p) => p.ramas.length > 1).length, 11, "los que están en más de una");

// El mapa de la escala más lejana: un rectángulo por rama, con lo que cada uno confiesa.
const reparto = repartoDeRamas(pertenencias, "p25");
assert.deepStrictEqual(
  reparto.map((r) => r.nombre),
  RAMAS.map((r) => r.nombre),
  "el mapa respeta el orden de la familia, no el de los datos",
);
assert.strictEqual(
  reparto.reduce((n, r) => n + r.gente.length, 0),
  total,
  "el mapa reparte exactamente las pertenencias, con sus repeticiones",
);
assert.ok(
  reparto.some((r) => r.tuya),
  "el punto de vista tiene su rama señalada",
);
for (const r of reparto) {
  assert.ok(r.compartidos <= r.gente.length, `${r.nombre} no puede compartir más gente de la que tiene`);
}

// El filtro de consanguinidad decide qué ramas se pintan, y no por cuánta gente le quede a
// cada una: los Cardona, los Sala y los Baños de Pablo son familia política y asoman con
// dos o tres cónyuges, que bastaban para levantar rectángulo.
const dentro = visibles(g, "p25");
assert.deepStrictEqual(
  repartoDeRamas(
    new Map([...pertenencias].filter(([id]) => dentro.has(id))),
    "p25",
  )
    .filter((r) => ramaVisible(r, dentro))
    .map((r) => r.nombre),
  ["Castrillo", "Crespo", "Crespo-León", "Velasco", "Maestre", "Pérez"],
  "sin el que estrena el apellido a la vista, la rama no se pinta",
);
assert.strictEqual(
  repartoDeRamas(pertenencias, "p25").filter((r) => ramaVisible(r, null)).length,
  RAMAS.length,
  "sin filtro están todas: no hay nada que decidir",
);

console.log(`ramas.test.ts OK (${RAMAS.length} ramas, ${total} pertenencias para ${pertenencias.size} personas)`);
