// Test de lógica pura: `npx tsx lib/arbol/enlaces.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { centroDeEnlace, ENLACES } from "./enlaces";
import { construirGrafo } from "./grafo";
import { comoSeLlama } from "./personas";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

// Cada enlace sigue centrando en quien decía
// Es lo único que lo protege: los enlaces se reparten y no se vuelven a mirar, así que un id que
// cambiara de dueño abriría el árbol de otra familia sin que fallara nada.
for (const { alias, id, nombre, nace } of ENLACES) {
  const p = g.personaPorId.get(id);
  assert.ok(p, `el enlace ${alias} apunta a ${id}, que ya no está en el árbol`);
  assert.strictEqual(comoSeLlama(p, "familiar"), nombre, `${alias} (${id}) ya no es ${nombre}`);
  assert.strictEqual(p.birth?.slice(0, 4) ?? "", nace, `${alias} (${id}) ya no nace en ${nace}`);
}

// Ningún alias repetido: el primero ganaría y el segundo no se abriría nunca.
const alias = ENLACES.map((e) => e.alias.toLowerCase());
assert.strictEqual(new Set(alias).size, alias.length, `alias repetido en ${alias}`);

// Resolver
assert.strictEqual(centroDeEnlace("Velasco"), "p395");
assert.strictEqual(centroDeEnlace("velasco"), "p395", "se teclean de memoria");
assert.strictEqual(centroDeEnlace(" Carmen "), "p24");
// Lo que no es alias se toma por id, que es como se reparte a quien no tiene el suyo.
assert.strictEqual(centroDeEnlace("p118"), "p118");
// Y lo que no centra en nadie no dice nada: quien lo abra arranca como si no hubiera enlace.
for (const nada of [null, undefined, "", "   "]) assert.strictEqual(centroDeEnlace(nada), null);
// Un alias que no existe llega hasta el árbol como id y muere ahí, no aquí.
assert.strictEqual(g.personaPorId.has(centroDeEnlace("Bordallo")!), false);

console.log("enlaces: ok");
