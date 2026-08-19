// Test de lógica pura: `npx tsx lib/farma/resumen.test.ts`. Fuera del build.
import assert from "assert";
import { filasPorHoja, type DatosLinea } from "./resumen";
import type { Colocada } from "./etiquetas";

const datos: Record<string, DatosLinea> = {
  a: { producto: "CREMA", tamano: "S", precio: 12.95, antes: 11.5 },
  b: { producto: "GEL", tamano: "M", precio: 8.5, antes: 8.5 },
  c: { producto: "ACEITE", tamano: "S", precio: 12.95, antes: 13 },
  promo: { producto: "Promoción", tamano: "L", precio: null, texto: "3x2", antes: null },
};
const et = (ref: string): Colocada => ({ diametro: 30, x: 0, y: 0, ref });

const [hoja1, hoja2] = filasPorHoja([[et("a"), et("promo"), et("b"), et("a"), et("c")], [et("a")]], datos);

// Copias de la misma línea en una hoja → una fila con su ×N.
assert.strictEqual(hoja1.length, 4, "cuatro líneas distintas en la hoja");
assert.strictEqual(hoja1.find((f) => f.producto === "CREMA")!.copias, 2, "las dos copias se agrupan");

// De menor a mayor precio; a igual precio, por nombre. Las promos, al final.
assert.deepStrictEqual(hoja1.map((f) => f.producto), ["GEL", "ACEITE", "CREMA", "Promoción"]);

// Las copias se cuentan por hoja: la tercera cayó en la segunda y allí es ×1.
assert.strictEqual(hoja2[0].copias, 1, "cada hoja cuenta las suyas");

// Una etiqueta sin datos no se puede describir y no inventa fila.
assert.deepStrictEqual(filasPorHoja([[et("fantasma")]], datos), [[]]);

console.log("✓ resumen");
