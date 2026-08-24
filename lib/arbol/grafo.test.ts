// Test de lógica pura: `npx tsx lib/arbol/grafo.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo, ascendientes, consanguineos, descendientes, parejaDirecta, pasosDesde, visibles } from "./grafo";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

// --- Uniones útiles: las hojas que el extractor envolvió en una unión de una sola persona
// no lo son, y son mayoría; el resto crece con cada alta, así que aquí solo se comprueba el
// filtro, no cuántas quedan. ---
assert.ok(data.people.length > 400, "el seed no es el árbol");
for (const u of g.unionPorId.values()) {
  assert.ok(u.partners.length > 1 || u.children.length > 0, `${u.id} no debería haber pasado el filtro`);
}

// El tachón del símbolo era el divorcio, y se recuperó de los docx a mano (marcar-rupturas.py);
// las altas traen el suyo escrito.
assert.strictEqual([...g.unionPorId.values()].filter((u) => u.roto).length, 14, "14 uniones acabadas");

// Nadie es hijo de dos uniones, y todos tienen generación
assert.strictEqual(g.generacion.size, data.people.length, "todas las personas colocadas (una sola componente conexa)");
const hijosVistos = new Set<string>();
for (const u of g.unionPorId.values()) {
  for (const c of u.children) {
    assert.ok(!hijosVistos.has(c), `${c} aparece como hijo en dos uniones`);
    hijosVistos.add(c);
  }
}

// La generación es consistente: 0 conflictos, 5 niveles con este reparto
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
    [-4, 12],
    [-3, 36],
    [-2, 124],
    [-1, 181],
    [0, 113],
    // Manuela, la primera de la generación que viene detrás de la de Lucas.
    [1, 1],
  ],
  "reparto por generación relativa al más joven",
);

// Parentesco básico
const padres = [...ascendientes(g, "p25")];
assert.ok(padres.includes("p124") && padres.includes("p125"), "p25 desciende de p124 y p125");
assert.ok(descendientes(g, "p124").has("p26"), "el nieto está en la descendencia");
assert.ok(!descendientes(g, "p25").has("p25"), "uno no es descendiente de sí mismo");
assert.ok(consanguineos(g, "p25").has("p25"), "uno sí es consanguíneo de sí mismo");
assert.ok([...parejaDirecta(g, "p25")].length === 1, "p25 tiene una sola pareja");
assert.ok(!consanguineos(g, "p126").has([...parejaDirecta(g, "p25")][0]), "una cuñada no es consanguínea");

// La fórmula de "conectado": la tabla que prueba que es la de Pablo
// Conectado es "compartimos un ancestro". El hijo, con sangre de las tres ramas de los
// docx, las ve enteras; su padre y sus tíos pierden la familia de quien entró por
// matrimonio, y los abuelos, todo lo que no cuelga de ellos.
const delosDocx = data.people.filter((p) => !p.fuentes.includes("pablo"));
assert.strictEqual(
  delosDocx.filter((p) => visibles(g, "p26").has(p.id)).length,
  delosDocx.length,
  "el hijo ve los tres documentos enteros",
);
for (const pid of ["p25", "p126", "p131"]) {
  assert.strictEqual(visibles(g, pid).size, 369, `${pid} ve 369`);
}
assert.strictEqual(visibles(g, "p124").size, 188, "un abuelo ve solo lo suyo");
assert.strictEqual(visibles(g, "p125").size, 197, "…y la abuela, lo suyo");

// **Ya no hay quien vea el árbol entero.** Una familia dada de alta que solo se ata por un
// matrimonio lateral —los Sala, por el marido de una hermana— no comparte ancestro con
// nadie de los docx, así que es una isla que solo ven los suyos. Lo que se pierde desde el
// centro es eso y la rama que entró por matrimonio, nunca sangre propia.
for (const pid of ["p25", "p126"]) {
  const vistos = visibles(g, pid);
  const excluidos = data.people.filter((p) => !vistos.has(p.id));
  for (const p of excluidos) {
    const porQue = p.fuentes.includes("pablo") ? "alta" : p.fuentes.join("+");
    assert.ok(porQue === "alta" || porQue === "cardona-martin", `${p.id} no debería quedar fuera (${porQue})`);
  }
}

// Simetría: verse a uno mismo y a su pareja siempre
for (const p of data.people) {
  const v = visibles(g, p.id);
  assert.ok(v.has(p.id), `${p.id} debe verse a sí mismo`);
  for (const c of parejaDirecta(g, p.id)) assert.ok(v.has(c), `${p.id} debe ver a su pareja`);
}

// Los pasos: el árbol es una sola pieza y todos se alcanzan desde cualquiera
for (const pov of ["p25", "p1", "p289"]) {
  assert.strictEqual(pasosDesde(g, pov).size, data.people.length, `desde ${pov} no se llega a todos`);
}
const pasos = pasosDesde(g, "p25");
assert.strictEqual(pasos.get("p25"), 0);
// Un padre, un hermano y una pareja valen uno; el abuelo dos y el primo hermano tres, que
// es como los cuenta la familia al explicar de qué se conocen.
assert.deepStrictEqual(["p124", "p126", "p24", "p26"].map((id) => pasos.get(id)), [1, 1, 1, 1]);
assert.strictEqual(pasos.get("p84"), 2, "el abuelo, a dos");
assert.strictEqual(Math.max(...pasos.values()), 7, "y el más lejano de todos, a siete");

console.log("grafo.test.ts OK");
