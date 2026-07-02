// Test del parser contra ejemplos reales de UnycopWin (inventario detallado por
// familia y variante por categoría): `npx tsx lib/farma/inventario.test.ts`. Fuera
// del build. Los .xls viven en farma/ (fuera del repo, datos privados); si no están,
// el test se salta solo.
import assert from "assert";
import { readFileSync, existsSync } from "fs";
import { parseInventario, evaluarCarga, esEspecialidad } from "./inventario";

// --- Guarda de carga (#7): veredicto por rangos. No necesita fixtures. ---
assert.strictEqual(evaluarCarga(3500, 25000), "ok", "centro del rango normal");
assert.strictEqual(evaluarCarga(2000, 15000), "ok", "límite inferior del rango normal (inclusive)");
assert.strictEqual(evaluarCarga(5000, 35000), "ok", "límite superior del rango normal (inclusive)");
assert.strictEqual(evaluarCarga(1500, 25000), "aviso", "pocos artículos pero plausible");
assert.strictEqual(evaluarCarga(3500, 12000), "aviso", "pocas unidades pero plausible");
assert.strictEqual(evaluarCarga(5500, 25000), "aviso", "demasiados artículos pero plausible");
assert.strictEqual(evaluarCarga(3500, 38000), "aviso", "demasiadas unidades pero plausible");
assert.strictEqual(evaluarCarga(900, 25000), "bloqueo", "artículos bajo el mínimo duro");
assert.strictEqual(evaluarCarga(7000, 25000), "bloqueo", "artículos sobre el máximo duro");
assert.strictEqual(evaluarCarga(3500, 9000), "bloqueo", "unidades bajo el mínimo duro");
assert.strictEqual(evaluarCarga(3500, 45000), "bloqueo", "unidades sobre el máximo duro");

const dir = "/Users/pacres/Documents/Claude/Pacres/WEB/farma/Ejemplos inventario/";

// [fichero, nº de artículos esperado (= "Nº Items" del preámbulo), fecha del informe, formato]
// El inventario detallado normal trae la agrupación fiscal (formato "familia", con
// medicamentos); solo el "por categoría" usa categorías comerciales sin medicamentos → "otro".
const casos: [string, number, string, "familia" | "otro"][] = [
  ["Inventario primera carga (2026-06-24).xls", 3664, "2026-06-24", "familia"],
  ["Inventario por Familia.xls", 3659, "2026-06-25", "familia"],
  ["Inventario por Categoría.xls", 1768, "2026-06-25", "otro"],
];

if (!existsSync(dir + casos[0][0])) {
  console.log("inventario.test.ts ⊘ (faltan los .xls de ejemplo, se salta)");
  process.exit(0);
}

for (const [fichero, nEsperado, fecha, formato] of casos) {
  const inv = parseInventario(readFileSync(dir + fichero));

  assert.strictEqual(inv.items.length, nEsperado, `${fichero}: nº de artículos`);
  assert.strictEqual(inv.fechaInforme, fecha, `${fichero}: fecha del informe`);
  assert.strictEqual(inv.formato, formato, `${fichero}: formato detectado`);

  // El formato "familia" es exactamente el que trae medicamentos (Especialidades);
  // los otros no permiten distinguir el IVA.
  assert.strictEqual(inv.items.some(esEspecialidad), formato === "familia", `${fichero}: presencia de Especialidades`);

  // Ninguna fila colada: todo artículo tiene código de 6 díg, denominación y stock/pvp numéricos.
  for (const it of inv.items) {
    assert.match(it.codigo, /^\d{6}$/, `${fichero}: código mal formado (${it.codigo})`);
    assert.ok(it.denominacion.length > 0, `${fichero}: denominación vacía`);
    assert.ok(Number.isFinite(it.stock) && Number.isFinite(it.pvp), `${fichero}: stock/pvp no numérico`);
  }

  // Sin agrupadores ni totales colados (su denominación lleva estas marcas).
  const colados = inv.items.filter((it) => /^\s*(\*\*\*|total\b|total general)/i.test(it.denominacion));
  assert.strictEqual(colados.length, 0, `${fichero}: filas no-artículo coladas`);

  // Códigos únicos (un artículo aparece una sola vez).
  assert.strictEqual(new Set(inv.items.map((it) => it.codigo)).size, inv.items.length, `${fichero}: códigos duplicados`);
}

console.log("inventario.test.ts ✓");
