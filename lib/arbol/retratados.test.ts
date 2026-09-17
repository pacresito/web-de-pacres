// Test de lógica pura: `npx tsx lib/arbol/retratados.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { libretaDe } from "./identidad";
import { retratadosEn } from "./retratados";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const o = { nombre: "familiar" as const, linaje: libretaDe(g).linaje };

const enLaVenta = retratadosEn(g, "la-venta-de-la-paloma-1962", o);

// Los nueve, y **en el orden en que se les ve**, no en el que están escritos: de arriba abajo.
assert.strictEqual(enLaVenta.length, 9);
assert.deepStrictEqual(
  enLaVenta.slice(0, 2).map((r) => r.nombre),
  ["Lola Velasco Pérez", "Flora Velasco Pérez"],
  "la fila de atrás primero, y de izquierda a derecha",
);
assert.strictEqual(enLaVenta.at(-1)!.nombre, "Juan José Martínez Velasco", "el último, el de abajo del todo");

// La edad se cuenta contra el año de la foto, que es lo que la sitúa en una vida.
assert.strictEqual(enLaVenta.find((r) => r.id === "p125")!.edad, "16 años");
assert.strictEqual(enLaVenta.find((r) => r.id === "p271")!.edad, "75 años");

// Una foto que no existe no rompe nada: no hay a quien rotular y ya está.
assert.deepStrictEqual(retratadosEn(g, "no-existe-1900", o), []);
// Y la de uno solo no rotula a nadie, tenga recuadro o no: abierta se ve entera, y el único
// que sale es de quien es la ficha desde la que se ha abierto.
assert.deepStrictEqual(retratadosEn(g, "p25-2012", o), []);
assert.deepStrictEqual(retratadosEn(g, "p125-2026", o), [], "aunque lleve recuadro");

console.log("retratados.test.ts ✓");
