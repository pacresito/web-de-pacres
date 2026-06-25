// Test de ida y vuelta: `npx tsx lib/farma/xls.test.ts`. Fuera del build.
import assert from "assert";
import * as XLSX from "xlsx";
import { generarBolsa } from "./xls";

const buf = generarBolsa([
  { codigo: "664014", denominacion: "FENTANILO AUROVITAS 25 MCG 5 PARCHES EFG", cantidad: 5 },
  { codigo: "001021", denominacion: "INTERAPOTHEK PAÑUELOS BOLSILLO 6 UI", cantidad: 0 },
]);

const wb = XLSX.read(buf, { type: "buffer" });
assert.deepStrictEqual(wb.SheetNames, ["UnycopWin"], "hoja UnycopWin");

const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets["UnycopWin"], { header: 1, raw: true });
assert.deepStrictEqual(rows[0], ["Código", "Denominación", "Cantidad"], "cabecera");
assert.deepStrictEqual(rows[1], ["664014", "FENTANILO AUROVITAS 25 MCG 5 PARCHES EFG", "5"]);
// Código con cero a la izquierda se conserva (string, no número) y cantidad 0 va como "0".
assert.deepStrictEqual(rows[2], ["001021", "INTERAPOTHEK PAÑUELOS BOLSILLO 6 UI", "0"], "cero a la izquierda + cantidad 0");

console.log("xls.test.ts ✓");
