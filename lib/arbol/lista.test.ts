// Test de lógica pura: `npx tsx lib/arbol/lista.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { CITADOS, laLista, PAREJA, YO } from "./lista";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const persona = (id: string) => g.personaPorId.get(id)!;

// --- Los ids de la lista siguen siendo de quien dicen ---
// Es lo único que la protege: el JSON se regenera, y un id que cambiara de dueño en silencio
// pondría a felicitar a un desconocido sin que fallara nada.
for (const { id, nombre } of CITADOS) {
  assert.ok(g.personaPorId.has(id), `${nombre} (${id}) ya no está en el árbol`);
  assert.strictEqual(persona(id).nombre, nombre, `${id} ya no es ${nombre}`);
}

const lista = laLista(g);
const comoLoLlamo = (id: string) => lista.get(id);

// --- Quién entra ---
assert.ok(lista.has(YO.id), "el primero de la lista soy yo: mi cumpleaños también se avisa");
assert.strictEqual(comoLoLlamo(YO.id), null, "y a mí no me llamo de ninguna manera");
assert.strictEqual(comoLoLlamo("p125"), "madre");
assert.strictEqual(comoLoLlamo("p24"), "tu pareja");
assert.strictEqual(comoLoLlamo("p26"), "hijo");

// Los de Carmen entran por ella y se nombran desde ella, hasta el hijo de sus primos.
assert.strictEqual(comoLoLlamo("p21"), "madre de Carmen");
assert.strictEqual(comoLoLlamo("p29"), "hermano de Carmen");
assert.strictEqual(comoLoLlamo("p13"), "sobrina segunda de Carmen");
// Y su familia política con ellos, nombrada por aquel con quien está: Eva no me es nada ni le
// es sangre a Carmen, pero está con su primo.
assert.strictEqual(comoLoLlamo("p8"), "pareja de Mariano");
// Lo que no arrastra la pareja son los suyos: Mar entra por estar con mi hermano, y sus
// padres se quedan fuera. La política de la política no la felicita nadie.
assert.strictEqual(comoLoLlamo("p127"), "pareja de Ricardo");
for (const id of ["p461", "p462"]) assert.strictEqual(lista.has(id), false, `${persona(id).nombre} es de la familia de Mar, no de la mía`);

// La rama entera de los abuelos maternos, sin tope de grado: por parentesco, una sobrina
// segunda no entraría —no está entre los términos de la lista—, y por rama sí.
assert.strictEqual(comoLoLlamo("p416"), "sobrina segunda", "Elena, la hija de Marta");
assert.strictEqual(comoLoLlamo("p425"), "sobrina segunda", "Aina");
// Y solo las de esa rama: las dos que hay son las dos que descienden de José y Catalina.
const sobrinasSegundas = [...lista].filter(([, como]) => como === "sobrina segunda" || como === "sobrino segundo");
assert.strictEqual(sobrinasSegundas.length, 2, `sobrinos segundos míos en la lista: ${sobrinasSegundas.map(([id]) => persona(id).nombre)}`);

// --- Quién no ---
// Los primos segundos de la rama de arriba, que no descienden de mis abuelos: p331 es hija de
// Magda, que viene de mi bisabuelo.
assert.strictEqual(lista.has("p331"), false);
// Y quien no me es nada ni le es nada a Carmen ni está con nadie de la lista.
assert.strictEqual(lista.has("p444"), false);

// Nadie se queda sin nombre salvo yo: una línea que solo dijera «Elena» no vale de nada
// cuando hay cuatro en el árbol.
for (const [id, como] of lista) {
  assert.ok(como !== null || id === YO.id, `${persona(id).nombre} (${id}) entra sin decir quién es`);
}

// Y nadie sale por partida doble ni se cuela un id que no exista.
for (const id of lista.keys()) assert.ok(g.personaPorId.has(id), `${id} no está en el árbol`);
assert.ok(lista.size > 60 && lista.size < 120, `la lista se ha ido de tamaño: ${lista.size}`);
assert.ok(lista.has(PAREJA.id));

console.log("lista: ok");
