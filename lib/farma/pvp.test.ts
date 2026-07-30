// Test del diff de PVP: `npx tsx lib/farma/pvp.test.ts`. Fuera del build.
// Clave de negocio: los medicamentos (Especialidades, 4%) nunca se marcan `pending`
// —solo el 21%/10% aparece en la pantalla PVP para reetiquetar—, y un pendiente
// antiguo de un medicamento se limpia al reprocesarse.
import assert from "assert";
import { diffPvp, fraseHoja, resumenEtiquetas, sanearBorrador, type BorradorEtiquetas, type LineaPvp, type RegistroPvp } from "./pvp";
import { POR_HOJA } from "./etiquetas";

const F = "2026-07-02";
const base = (p: Partial<RegistroPvp> = {}): RegistroPvp => ({
  denominacion: "X", oldPrice: 10, newPrice: 10, firstSeen: "2026-06-01", lastSeen: "2026-06-01", pending: false, ...p,
});

// Primera vez: línea base, sin cambio, nunca pendiente (sea medicamento o no).
assert.strictEqual(diffPvp("X", 10, F, null, true).pending, false, "primera vez no es pendiente");
assert.strictEqual(diffPvp("X", 10, F, null, false).pending, false, "primera vez (medicamento) no es pendiente");

// Cambio de precio en un NO-medicamento (marcar=true) → pendiente, con oldPrice correcto.
const r1 = diffPvp("X", 12, F, base({ newPrice: 10 }), true);
assert.strictEqual(r1.pending, true, "no-medicamento que cambia de precio → pendiente");
assert.strictEqual(r1.oldPrice, 10, "el precio anterior pasa a oldPrice");
assert.strictEqual(r1.newPrice, 12, "el precio nuevo");

// Cambio de precio en un MEDICAMENTO (marcar=false) → NUNCA pendiente.
assert.strictEqual(diffPvp("X", 12, F, base({ newPrice: 10 }), false).pending, false, "medicamento que cambia de precio no se marca");

// Mismo precio: refresca lastSeen; un pendiente vivo de no-medicamento se conserva…
const r2 = diffPvp("X", 10, F, base({ newPrice: 10, pending: true }), true);
assert.strictEqual(r2.pending, true, "no-medicamento pendiente se mantiene pendiente");
assert.strictEqual(r2.lastSeen, F, "se refresca lastSeen");

// …pero el mismo caso en un medicamento LIMPIA el pendiente antiguo.
assert.strictEqual(diffPvp("X", 10, F, base({ newPrice: 10, pending: true }), false).pending, false, "medicamento limpia pendiente antiguo");

// sanearBorrador: conserva lo válido y descarta lo que ensuciaría el render.
const limpio = sanearBorrador({
  tamanos: { "123": "M", "456": "gigante", "789": 1 }, // solo "M" es válido
  cantidades: { a: 3, b: 0, c: 2.5, d: "x" }, // solo enteros ≥ 1
  extras: [
    { id: "extra-1", tipo: "promo", denominacion: "3x2", precio: null },
    { id: "extra-2", tipo: "raro", denominacion: "x", precio: null }, // tipo inválido
    { tipo: "precio", denominacion: "x", precio: 5 }, // sin id
  ],
});
assert.deepStrictEqual(limpio.tamanos, { "123": "M" }, "solo tamaños válidos");
assert.deepStrictEqual(limpio.cantidades, { a: 3 }, "solo cantidades enteras ≥ 1");
assert.strictEqual(limpio.extras.length, 1, "solo la fila extra bien formada");
assert.deepStrictEqual(sanearBorrador(null), { tamanos: {}, cantidades: {}, extras: [] }, "no-objeto → borrador vacío");
assert.deepStrictEqual(sanearBorrador({ extras: "nope" }).extras, [], "extras no-array → []");

// resumenEtiquetas: personalizadas = líneas manuales; unidades = copias imprimibles.
{
  const pendiente = (codigo: string): LineaPvp => ({
    codigo, denominacion: "X", oldPrice: 1, newPrice: 2, firstSeen: F, lastSeen: F, pending: true,
  });
  const borrador: BorradorEtiquetas = {
    tamanos: { "000001": "L" }, // el resto, S por defecto
    cantidades: { "000001": 2, "extra-1": 3 },
    extras: [
      { id: "extra-1", tipo: "promo", denominacion: "3x2", precio: null },
      { id: "extra-2", tipo: "precio", denominacion: "", precio: null }, // sin precio: no imprime
    ],
  };
  const r = resumenEtiquetas([pendiente("000001"), pendiente("000002")], borrador);
  assert.strictEqual(r.personalizadas, 2, "las dos líneas manuales cuentan, se impriman o no");
  assert.strictEqual(r.unidades, 6, "2 grandes + 1 (por defecto) + 3 copias de la promo");
  assert.ok(Math.abs(r.hojas - (2 / POR_HOJA.L + 4 / POR_HOJA.S)) < 1e-9, "la hoja se estima por tamaño");
  assert.strictEqual(resumenEtiquetas([], { tamanos: {}, cantidades: {}, extras: [] }).unidades, 0, "sin nada, nada que imprimir");
}

// fraseHoja: porcentaje hasta llenar la primera hoja; luego, hojas enteras.
assert.strictEqual(fraseHoja(0.452), "llevas el 45% de una hoja");
assert.strictEqual(fraseHoja(1), "¡ya llenas una hoja entera!");
assert.strictEqual(fraseHoja(1.8), "¡ya llenas una hoja entera!");
assert.strictEqual(fraseHoja(2.1), "¡ya llenas 2 hojas enteras!");

console.log("pvp.test.ts ✓");
