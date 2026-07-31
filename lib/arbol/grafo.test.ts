// Test de lógica pura: `npx tsx lib/arbol/grafo.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo, ascendientes, consanguineos, descendientes, parejaDirecta, visibles } from "./grafo";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

// --- Uniones útiles: de las 298 del JSON, 167 son hojas envueltas por el extractor ---
assert.strictEqual(data.people.length, 415, "415 personas");
assert.strictEqual(g.unionPorId.size, 131, "131 uniones reales tras filtrar las de 1 partner y 0 hijos");
for (const u of g.unionPorId.values()) {
  assert.ok(u.partners.length > 1 || u.children.length > 0, `${u.id} no debería haber pasado el filtro`);
}

// --- Nadie es hijo de dos uniones, y todos tienen generación ---
assert.strictEqual(g.generacion.size, 415, "todas las personas colocadas (una sola componente conexa)");
const hijosVistos = new Set<string>();
for (const u of g.unionPorId.values()) {
  for (const c of u.children) {
    assert.ok(!hijosVistos.has(c), `${c} aparece como hijo en dos uniones`);
    hijosVistos.add(c);
  }
}

// --- La generación es consistente: 0 conflictos, 5 niveles con este reparto ---
// (construirGrafo lanza si hay conflicto; llegar aquí ya lo prueba)
const ancla = g.generacion.get("p26")!; // el más joven de la línea directa
const porNivel = new Map<number, number>();
for (const gen of g.generacion.values()) {
  const n = gen - ancla;
  porNivel.set(n, (porNivel.get(n) ?? 0) + 1);
}
assert.deepStrictEqual(
  [...porNivel.entries()].sort((a, b) => a[0] - b[0]),
  [
    [-4, 10],
    [-3, 34],
    [-2, 112],
    [-1, 162],
    [0, 97],
  ],
  "reparto por generación relativa al más joven",
);

// --- Parentesco básico ---
const padres = [...ascendientes(g, "p25")];
assert.ok(padres.includes("p124") && padres.includes("p125"), "p25 desciende de p124 y p125");
assert.ok(descendientes(g, "p124").has("p26"), "el nieto está en la descendencia");
assert.ok(!descendientes(g, "p25").has("p25"), "uno no es descendiente de sí mismo");
assert.ok(consanguineos(g, "p25").has("p25"), "uno sí es consanguíneo de sí mismo");
assert.ok([...parejaDirecta(g, "p25")].length === 1, "p25 tiene una sola pareja");
assert.ok(!consanguineos(g, "p126").has([...parejaDirecta(g, "p25")][0]), "una cuñada no es consanguínea");

// --- La fórmula de "conectado": la tabla que prueba que es la de Pablo ---
// Desde el punto de vista por defecto y desde su hijo se ve el árbol entero; desde un
// hermano o desde los padres desaparece la ascendencia de quien entró por matrimonio.
for (const pid of ["p25", "p26"]) {
  assert.strictEqual(visibles(g, pid).size, 415, `${pid} ve el árbol entero`);
}
for (const pid of ["p126", "p131", "p124", "p125"]) {
  assert.strictEqual(visibles(g, pid).size, 342, `${pid} ve 342`);
}

// Y los 73 que se pierden son exactamente la rama que entró por ese matrimonio.
const vistos = visibles(g, "p126");
const excluidos = data.people.filter((p) => !vistos.has(p.id));
assert.strictEqual(excluidos.length, 73, "73 excluidos");
for (const p of excluidos) {
  assert.deepStrictEqual(p.fuentes, ["cardona-martin"], `${p.id} no debería quedar fuera`);
}

// --- Simetría: verse a uno mismo y a su pareja siempre ---
for (const p of data.people) {
  const v = visibles(g, p.id);
  assert.ok(v.has(p.id), `${p.id} debe verse a sí mismo`);
  for (const c of parejaDirecta(g, p.id)) assert.ok(v.has(c), `${p.id} debe ver a su pareja`);
}

console.log("grafo.test.ts OK");
