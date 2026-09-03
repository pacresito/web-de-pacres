// Test de lógica pura: `npx tsx lib/arbol/enlaces.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { aberturasDe, centroDeEnlace, ENLACES, pliegueDe } from "./enlaces";
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

// Y lo que cada enlace abre y pliega sigue siendo de quien dice
// Son ids repartidos igual que el del Centro: uno que cambiara de dueño abriría la familia
// equivocada o escondería a quien no toca, y el enlace ya está por ahí.
for (const { alias, abre = [], pliega = [] } of ENLACES) {
  for (const { union, quienes } of abre) {
    const u = g.unionPorId.get(union);
    assert.ok(u, `${alias} abre ${union}, que ya no es una unión`);
    for (const id of u.partners) {
      const nombre = comoSeLlama(g.personaPorId.get(id)!, "familiar");
      assert.ok(quienes.includes(nombre), `${alias}: ${union} ya no une a ${nombre}, sino a «${quienes}»`);
    }
  }
  for (const { id, nombre } of pliega) {
    const p = g.personaPorId.get(id);
    assert.ok(p, `${alias} pliega a ${id}, que ya no está en el árbol`);
    assert.strictEqual(comoSeLlama(p, "familiar"), nombre, `${alias} pliega a ${id}, que ya no es ${nombre}`);
  }
}

// Ningún alias repetido: el primero ganaría y el segundo no se abriría nunca.
const alias = ENLACES.map((e) => e.alias.toLowerCase());
assert.strictEqual(new Set(alias).size, alias.length, `alias repetido en ${alias}`);

// El retoque es de la persona por la que se entra, no de la URL: quien vuelve sin enlace lo
// tiene igual, y quien muda el Centro a la misma persona lo tiene también.
assert.deepStrictEqual(pliegueDe("p271"), ["p289"], "los Velasco llegan sin los Maestre");
assert.deepStrictEqual(pliegueDe("p25"), [], "quien no retoca nada no retoca nada");
assert.deepStrictEqual(pliegueDe(null), []);
assert.strictEqual(aberturasDe("p22").length, 4, "los Bordallo abren las dos casas de arriba y la suya");
assert.deepStrictEqual(aberturasDe("p84"), []);

// Resolver
assert.strictEqual(centroDeEnlace("Velasco"), "p271");
assert.strictEqual(centroDeEnlace("velasco"), "p271", "se teclean de memoria");
assert.strictEqual(centroDeEnlace(" Carmen "), "p24");
// Lo que no es alias se toma por id, que es como se reparte a quien no tiene el suyo.
assert.strictEqual(centroDeEnlace("p118"), "p118");
// Y lo que no centra en nadie no dice nada: quien lo abra arranca como si no hubiera enlace.
for (const nada of [null, undefined, "", "   "]) assert.strictEqual(centroDeEnlace(nada), null);
// Un alias que no existe llega hasta el árbol como id y muere ahí, no aquí. El inventado se
// comprueba contra la lista: cualquiera vale hasta el día que alguien lo estrena de alias.
const inventado = "Ninguna";
assert.ok(!ENLACES.some((e) => e.alias === inventado), `${inventado} ya es un alias: hace falta otro que no lo sea`);
assert.strictEqual(g.personaPorId.has(centroDeEnlace(inventado)!), false);

console.log("enlaces: ok");
