// Test de lógica pura: `npx tsx lib/viajes/filtrar.test.ts`. Fuera del build.
import assert from "assert";
import { filtrarDestinos } from "./filtrar";
import type { Destino, DatosViajes } from "./tipos";
import navarra from "../../data/viajes/navarra.json";

const mk = (over: Partial<Destino>): Destino => ({
  slug: "x", nombre: "X", zona: "z1", tipo: "ruta", queEs: "", imagen: "", ...over,
});
const slugs = (ds: Destino[]) => ds.map((d) => d.slug).sort();

// --- Sin filtros: pasan todos ---
const tres = [mk({ slug: "a" }), mk({ slug: "b" }), mk({ slug: "c" })];
assert.deepStrictEqual(slugs(filtrarDestinos(tres, {})), ["a", "b", "c"], "sin filtros no descarta nada");

// --- Zona y tipo: igualdad exacta ---
const mix = [mk({ slug: "r1", zona: "z1", tipo: "ruta" }), mk({ slug: "c1", zona: "z2", tipo: "cascada" })];
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { zona: "z1" })), ["r1"], "filtra por zona");
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { tipo: "cascada" })), ["c1"], "filtra por tipo");
assert.deepStrictEqual(slugs(filtrarDestinos(mix, { zona: "z1", tipo: "cascada" })), [], "zona+tipo se acumulan (AND)");

// --- Distancia: regla del mínimo del rango; el tope es inclusivo ---
const dist = [
  mk({ slug: "d56", distanciaKm: [5, 6] }),
  mk({ slug: "d1015", distanciaKm: [10, 15] }),
  mk({ slug: "sinDist" }), // sin distanciaKm
];
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 5 })), ["d56"], "min 5 pasa el tope 5 (inclusivo)");
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 4 })), [], "min 5 no pasa el tope 4");
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 12 })), ["d1015", "d56"], "10-15 entra por su mínimo 10");
assert.deepStrictEqual(slugs(filtrarDestinos(dist, { distanciaMax: 25 })), ["d1015", "d56"], "sin distancia queda fuera si hay filtro de distancia");

// --- Desnivel: tramos, contra el mínimo ---
const desn = [
  mk({ slug: "d110", desnivelM: [110, 110] }),
  mk({ slug: "d385", desnivelM: [385, 385] }),
  mk({ slug: "d200_300", desnivelM: [200, 300] }),
  mk({ slug: "d700", desnivelM: [700, 700] }),
  mk({ slug: "sinDesn" }),
];
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "<150" })), ["d110"], "<150 solo el suave");
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "<300" })), ["d110", "d200_300"], "<300 incluye min 200");
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "<500" })), ["d110", "d200_300", "d385"], "<500 hasta 385");
assert.deepStrictEqual(slugs(filtrarDestinos(desn, { desnivel: "+500" })), ["d700"], "+500 solo el duro (>500)");

// --- Toggles booleanos: exigen true; null/ausente no cuela ---
const apto = [
  mk({ slug: "siNinos", ninos: true, perros: true, bano: true }),
  mk({ slug: "noNinos", ninos: false }),
  mk({ slug: "nulos" }), // sin ninos/perros/bano
];
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { ninos: true })), ["siNinos"], "apto niños: solo true");
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { perros: true })), ["siNinos"], "apto perros: solo true");
assert.deepStrictEqual(slugs(filtrarDestinos(apto, { bano: true })), ["siNinos"], "baño: solo true");

// --- Datos reales de Navarra: sanity checks ---
const datos = navarra as unknown as DatosViajes;
const todos = datos.destinos;
assert.strictEqual(todos.length, 20, "20 destinos en el JSON");
assert.deepStrictEqual(slugs(filtrarDestinos(todos, { bano: true })), ["cascada-de-xorroxin", "ubagua"], "solo Xorroxin y Ubagua tienen baño");
assert.strictEqual(filtrarDestinos(todos, { tipo: "pueblo" }).length, 3, "3 pueblos");
assert.strictEqual(filtrarDestinos(todos, { zona: "ribera" }).length, 3, "3 destinos en la Ribera");
assert.strictEqual(filtrarDestinos(todos, { desnivel: "+500" }).length, 1, "solo Peña Izaga supera 500 m");

console.log("OK filtrar.test.ts");
