// Test de lógica pura: `npx tsx lib/arbol/plural.test.ts`. Fuera del build.
import assert from "assert";
import { pluralDeNombre } from "./plural";

// Acabados en vocal, que es el caso fácil: se les pega una ese y ya.
assert.strictEqual(pluralDeNombre("Pablo"), "Pablos");
assert.strictEqual(pluralDeNombre("Ana"), "Anas");
assert.strictEqual(pluralDeNombre("Vicente"), "Vicentes");
assert.strictEqual(pluralDeNombre("José"), "Josés");
assert.strictEqual(pluralDeNombre("María"), "Marías");

// Acabados en consonante: sílaba de más, y la tilde que ya estaba escrita se queda.
assert.strictEqual(pluralDeNombre("Miguel"), "Migueles");
assert.strictEqual(pluralDeNombre("Juan"), "Juanes");
assert.strictEqual(pluralDeNombre("Pilar"), "Pilares");
assert.strictEqual(pluralDeNombre("Raúl"), "Raúles");
assert.strictEqual(pluralDeNombre("Ángel"), "Ángeles");
assert.strictEqual(pluralDeNombre("Beatriz"), "Beatrices");

// Los de la ese, que es donde se decide: solo se alarga el que carga en la última sílaba.
assert.strictEqual(pluralDeNombre("Luis"), "Luises", "monosílabo: no hay otra sílaba donde cargar");
assert.strictEqual(pluralDeNombre("Andrés"), "Andreses", "la tilde dice dónde carga");
assert.strictEqual(pluralDeNombre("Lucas"), "Lucas", "y el que no carga ahí no cambia");
assert.strictEqual(pluralDeNombre("Dolores"), "Dolores");
assert.strictEqual(pluralDeNombre("Mercedes"), "Mercedes");

// Y la excepción escrita a mano, que es por lo que existe la lista.
assert.strictEqual(pluralDeNombre("Carmen"), "Cármenes", "la tilde no estaba y aparece al alargar");

console.log("plural.test.ts OK");
