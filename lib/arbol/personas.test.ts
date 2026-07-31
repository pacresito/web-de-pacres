// Test de lógica pura: `npx tsx lib/arbol/personas.test.ts`. Fuera del build.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { apellidosNuevos, esHombre, esMujer, etiquetaDe, ordenarPareja } from "./personas";
import type { ArbolData, Persona } from "./tree";

const persona = (nombre: string, apellidos: string[] = []): Persona => ({ id: nombre, nombre, apellidos, fuentes: [] });

// --- Quién es hombre: por el nombre de pila, y sin regla de terminación ---
assert.ok(esHombre(persona("Pablo")), "Pablo");
assert.ok(esHombre(persona("José Manuel")), "el compuesto se mira por el primero");
assert.ok(esHombre(persona("Su marido")), "el marcador es explícito");
assert.ok(!esHombre(persona("Su mujer")), "y el otro también");
assert.ok(!esHombre(persona("Carmen")), "Carmen");
for (const trampa of ["Rocío", "Amparo", "Socorro", "Consuelo"]) {
  assert.ok(!esHombre(persona(trampa)), `${trampa} acaba en o y es de mujer`);
}

// --- La pareja: el hombre arriba, y si hay duda manda el documento ---
const gente = new Map([
  ["h", persona("Ricardo")],
  ["m", persona("Lola")],
  ["mujer", persona("Ruth")],
  ["nadie", persona("Sin nombre")],
  ["x", persona("Yodelina")],
  ["z", persona("Binta")],
]);
const buscar = (id: string) => gente.get(id);
assert.deepStrictEqual(ordenarPareja(["m", "h"], buscar), ["h", "m"], "el hombre sube");
assert.deepStrictEqual(ordenarPareja(["h", "m"], buscar), ["h", "m"], "y si ya estaba arriba, se queda");
assert.deepStrictEqual(ordenarPareja(["mujer", "nadie"], buscar), ["nadie", "mujer"], "si solo se reconoce a la mujer, sube el otro");
assert.deepStrictEqual(ordenarPareja(["x", "z"], buscar), ["x", "z"], "dos mujeres: manda el documento");
assert.deepStrictEqual(ordenarPareja(["m"], buscar), ["m"], "una sola persona no es pareja");

// --- La etiqueta ---
const conApellidos = persona("José", ["Cardona", "Torres"]);
assert.strictEqual(etiquetaDe(conApellidos, 2, []), "José Cardona Torres");
assert.strictEqual(etiquetaDe(conApellidos, 1, []), "José Cardona");
assert.strictEqual(etiquetaDe(conApellidos, 0, []), "José");
assert.strictEqual(etiquetaDe(conApellidos, "nuevos", ["Torres"]), "José Torres", "en «nuevos» solo el que estrena");
assert.strictEqual(etiquetaDe(persona("Lucas"), 2, []), "Lucas", "sin apellidos documentados, el nombre");

// --- Sobre los datos de verdad ---
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const porId = new Map(data.people.map((p) => [p.id, p]));
const parejas = data.unions.filter((u) => u.partners.length === 2);
const sinResolver = parejas.filter((u) => {
  const [a, b] = u.partners.map((id) => porId.get(id)!);
  return esHombre(a) === esHombre(b) && !esMujer(a) && !esMujer(b);
});
assert.strictEqual(
  sinResolver.length,
  0,
  `parejas sin colocar: ${sinResolver.map((u) => u.partners.map((p) => porId.get(p)!.nombre).join(" + ")).join(", ")}`,
);

// El apellido lo estrena quien lo trae, y sus descendientes ya no lo repiten.
const nuevos = apellidosNuevos(construirGrafo(data));
assert.deepStrictEqual(nuevos.get("p25"), [], "Pablo no estrena «Crespo»: ya lo lleva su padre");
assert.deepStrictEqual(nuevos.get("p63"), ["Forasté", "Puget"], "quien corona una línea los enseña los dos");
for (const p of data.people) {
  const propios = nuevos.get(p.id)!;
  assert.ok(propios.every((a) => p.apellidos.includes(a)), `${p.id} estrena un apellido que no es suyo`);
}

console.log(`personas.test.ts OK (${parejas.length} parejas colocadas)`);
