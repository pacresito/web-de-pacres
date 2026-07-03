// Test de lógica pura: `npx tsx lib/farma/etiquetas.test.ts`. Fuera del build.
import assert from "assert";
import { formatoPrecio, expandir, empaquetar, A4, DIAMETROS, type Etiqueta } from "./etiquetas";

// --- formatoPrecio: entero grande + decimales pegados con € ---
assert.deepStrictEqual(formatoPrecio(21.95), { entero: "21", decimales: ",95€" });
assert.deepStrictEqual(formatoPrecio(7), { entero: "7", decimales: ",00€" });
assert.deepStrictEqual(formatoPrecio(16.5), { entero: "16", decimales: ",50€" });
assert.deepStrictEqual(formatoPrecio(120.05), { entero: "120", decimales: ",05€" });

// --- expandir: una etiqueta por copia; precio, promo, título ---
const exp = expandir([
  { diametro: DIAMETROS.S, cantidad: 3, precio: 21.95 },
  { diametro: DIAMETROS.L, cantidad: 1, texto: "3x2" },
  { diametro: DIAMETROS.L, cantidad: 1, titulo: "2ª unidad", texto: "-50%" },
  { diametro: DIAMETROS.M, cantidad: 1, titulo: "Sacaleches eléctrico", precio: 99.95 },
]);
assert.strictEqual(exp.length, 6, "3 copias + 3 sueltas");
assert.strictEqual(exp.filter((e) => e.entero === "21").length, 3, "3 copias del precio");
const promo = exp.find((e) => e.texto === "3x2")!;
assert.strictEqual(promo.entero, undefined, "la promo no lleva precio");
assert.strictEqual(promo.titulo, undefined, "3x2 no lleva título");
const promo2 = exp.find((e) => e.texto === "-50%")!;
assert.strictEqual(promo2.titulo, "2ª unidad", "la promo de dos pisos lleva título");
const tp = exp.find((e) => e.titulo === "Sacaleches eléctrico")!;
assert.strictEqual(tp.entero, "99", "texto + precio conserva el precio");
assert.strictEqual(tp.decimales, ",95€", "texto + precio conserva los decimales");

// --- empaquetar: nada se solapa y todo cae dentro de los márgenes ---
const muchas: Etiqueta[] = [
  ...Array(4).fill({ diametro: DIAMETROS.L, entero: "62", decimales: ",95€" }),
  ...Array(12).fill({ diametro: DIAMETROS.M, entero: "21", decimales: ",95€" }),
  ...Array(16).fill({ diametro: DIAMETROS.S, entero: "7", decimales: ",45€" }),
];
const hojas = empaquetar(muchas, A4);
const colocadas = hojas.flat();
assert.strictEqual(colocadas.length, muchas.length, "todas las etiquetas se colocan");

for (const c of colocadas) {
  const r = c.diametro / 2;
  assert.ok(c.x - r >= A4.margen - 1e-6 && c.x + r <= A4.ancho - A4.margen + 1e-6, "dentro en X");
  assert.ok(c.y - r >= A4.margen - 1e-6 && c.y + r <= A4.alto - A4.margen + 1e-6, "dentro en Y");
}
for (const hoja of hojas) {
  for (let i = 0; i < hoja.length; i++) {
    for (let j = i + 1; j < hoja.length; j++) {
      const a = hoja[i], b = hoja[j];
      const min = (a.diametro + b.diametro) / 2;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= min - 1e-6, "sin solapamiento");
    }
  }
}

// --- paginación: si no caben en una hoja, se abre otra ---
const desborde = empaquetar(Array(60).fill({ diametro: DIAMETROS.L, entero: "9", decimales: ",95€" }), A4);
assert.ok(desborde.length > 1, "60 grandes no caben en una sola hoja");

console.log("etiquetas.test.ts OK");
