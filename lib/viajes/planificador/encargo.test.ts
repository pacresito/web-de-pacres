// Test de lógica pura: `npx tsx lib/viajes/planificador/encargo.test.ts`. Fuera del build.
import assert from "assert";
import { serializarEncargo, parsearEncargo, type Encargo } from "./encargo";

const encargo: Encargo = {
  dias: 3,
  fecha: "2026-09-12",
  ritmo: "relajado",
  comida: "restaurante",
  imprescindibles: ["cascada-de-xorroxin", "cuevas-de-zugarramurdi"],
  filtros: { zona: ["baztan-bidasoa", "pirineo"], tipo: ["cascada"], ninos: true },
};

// --- Round-trip exacto ---
assert.deepStrictEqual(parsearEncargo(serializarEncargo(encargo)), encargo, "round-trip conserva el encargo");

// --- Entradas inválidas → null (no revienta, no estado a medias) ---
assert.strictEqual(parsearEncargo(null), null, "null → null");
assert.strictEqual(parsearEncargo("no-json"), null, "basura → null");
assert.strictEqual(parsearEncargo(encodeURIComponent(JSON.stringify({ dias: 3 }))), null, "faltan campos → null");
assert.strictEqual(
  parsearEncargo(encodeURIComponent(JSON.stringify({ ...encargo, dias: 99 }))), null, "días fuera de rango → null");
assert.strictEqual(
  parsearEncargo(encodeURIComponent(JSON.stringify({ ...encargo, ritmo: "turbo" }))), null, "ritmo inválido → null");
assert.strictEqual(
  parsearEncargo(encodeURIComponent(JSON.stringify({ ...encargo, fecha: "12/09/2026" }))), null, "fecha mal formada → null");

// --- Campos ausentes tolerados: imprescindibles/filtros por defecto ---
const minimo = parsearEncargo(encodeURIComponent(JSON.stringify({
  dias: 1, fecha: "2026-01-01", ritmo: "medio", comida: "picnic",
})));
assert.deepStrictEqual(minimo, { dias: 1, fecha: "2026-01-01", ritmo: "medio", comida: "picnic", imprescindibles: [], filtros: {} }, "sin imprescindibles/filtros → vacíos");

console.log("OK encargo.test.ts");
