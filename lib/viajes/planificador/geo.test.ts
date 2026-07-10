// Test de lógica pura: `npx tsx lib/viajes/planificador/geo.test.ts`. Fuera del build.
import assert from "assert";
import { tiempoCoche, ordenarDia, type MatrizViajes } from "./geo";
import matrizNavarra from "../../../data/viajes/matriz-navarra.json";

// Matriz sintética: 4 puntos en línea (a-b-c-d), tiempo = distancia entre índices.
// Simétrica; el orden óptimo desde cada extremo es recorrer la línea sin saltos.
const linea: MatrizViajes = {
  ids: ["a", "b", "c", "d"],
  segundos: [
    [0, 1, 2, 3],
    [1, 0, 1, 2],
    [2, 1, 0, 1],
    [3, 2, 1, 0],
  ],
};

// --- Lookup ---
assert.strictEqual(tiempoCoche(linea, "a", "d"), 3, "lookup a→d");
assert.strictEqual(tiempoCoche(linea, "c", "a"), 2, "lookup c→a");
assert.strictEqual(tiempoCoche(linea, "b", "b"), 0, "diagonal = 0");
assert.throws(() => tiempoCoche(linea, "a", "z"), /fuera de la matriz/, "slug inexistente lanza");

// --- Casos triviales ---
assert.deepStrictEqual(ordenarDia(linea, []), { orden: [], segundos: 0 }, "sin paradas");
assert.deepStrictEqual(ordenarDia(linea, ["c"]), { orden: ["c"], segundos: 0 }, "una parada, sin coche");

// --- TSP abierto sin inicio: recorrer la línea cuesta 3 (1+1+1), no saltar ---
const sinInicio = ordenarDia(linea, ["a", "c", "b", "d"]);
assert.strictEqual(sinInicio.segundos, 3, "óptimo recorre la línea (coste 3)");
assert.ok(
  JSON.stringify(sinInicio.orden) === JSON.stringify(["a", "b", "c", "d"]) ||
  JSON.stringify(sinInicio.orden) === JSON.stringify(["d", "c", "b", "a"]),
  `orden óptimo es la línea en algún sentido, fue ${sinInicio.orden}`,
);

// --- Con inicio en un extremo: el orden se fija (a→b→c→d), coste 3 ---
const desdeA = ordenarDia(linea, ["b", "d", "c"], "a");
assert.deepStrictEqual(desdeA.orden, ["b", "c", "d"], "desde 'a' visita en orden creciente");
assert.strictEqual(desdeA.segundos, 3, "a→b→c→d cuesta 1+1+1");

// --- Con inicio en el centro: conviene arrancar por el lado más cercano ---
const desdeB = ordenarDia(linea, ["a", "d"], "b");
assert.strictEqual(desdeB.segundos, tiempoCoche(linea, "b", "a") + tiempoCoche(linea, "a", "d"), "b→a→d es lo barato");
assert.deepStrictEqual(desdeB.orden, ["a", "d"], "primero 'a' (a 1) y luego 'd'");

// --- Tope de paradas ---
assert.throws(() => ordenarDia(linea, ["a", "b", "c", "d", "a", "b", "c", "d", "a"]), /≤8 paradas/, "más de 8 lanza");

// --- Matriz real de Navarra: forma y coherencia ---
const real = matrizNavarra as MatrizViajes;
assert.strictEqual(real.ids.length, 20, "20 destinos en la matriz");
assert.strictEqual(real.segundos.length, 20, "20 filas");
assert.ok(real.segundos.every((f) => f.length === 20), "matriz cuadrada 20×20");
assert.ok(real.ids.every((_, i) => real.segundos[i][i] === 0), "diagonal a 0");
// Dos destinos del Baztán colindantes están a pocos minutos en coche.
assert.ok(tiempoCoche(real, "ruta-bunkers-de-otsondo", "cascada-de-xorroxin") < 10 * 60, "Otsondo↔Xorroxin < 10 min");

console.log("OK geo.test.ts");
