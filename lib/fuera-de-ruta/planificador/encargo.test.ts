// Test de lógica pura: `npx tsx lib/fuera-de-ruta/planificador/encargo.test.ts`. Fuera del build.
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

// Atajo: la query que produce serializar, de vuelta como la lee el planificador.
const round = (e: Encargo) => parsearEncargo(new URLSearchParams(serializarEncargo(e)));
const desde = (q: string) => parsearEncargo(new URLSearchParams(q));

// --- Round-trip exacto ---
assert.deepStrictEqual(round(encargo), encargo, "round-trip conserva el encargo");

// --- La query es plana y legible: ni JSON ni escapes ---
const query = serializarEncargo(encargo);
assert.ok(!query.includes("%"), `la query no lleva nada escapado: ${query}`);
assert.ok(query.startsWith("dias=3&fecha=2026-09-12&ritmo=relajado"), `la query es legible: ${query}`);
assert.ok(query.includes("imp=cascada-de-xorroxin&imp=cuevas-de-zugarramurdi"), "los imprescindibles repiten clave");
assert.ok(query.includes("zona=baztan-bidasoa&zona=pirineo"), "los filtros los pone url-filtros");

// --- Sin encargo entero → null: son solo filtros del explorador, no un plan ---
assert.strictEqual(desde(""), null, "query vacía → null");
assert.strictEqual(desde("zona=pirineo&tipo=cascada"), null, "solo filtros → null (no hay plan)");
assert.strictEqual(desde("dias=3"), null, "faltan campos → null");
assert.strictEqual(desde("dias=99&fecha=2026-09-12&ritmo=medio&comida=picnic"), null, "días fuera de rango → null");
assert.strictEqual(desde("dias=3&fecha=2026-09-12&ritmo=turbo&comida=picnic"), null, "ritmo inválido → null");
assert.strictEqual(desde("dias=3&fecha=12/09/2026&ritmo=medio&comida=picnic"), null, "fecha mal formada → null");

// --- Campos ausentes tolerados: imprescindibles/filtros por defecto ---
assert.deepStrictEqual(
  desde("dias=1&fecha=2026-01-01&ritmo=medio&comida=picnic"),
  { dias: 1, fecha: "2026-01-01", ritmo: "medio", comida: "picnic", imprescindibles: [], filtros: {} },
  "sin imprescindibles/filtros → vacíos");

// --- La propuesta elegida viaja, pero es opcional (un enlace sin ella cae en la primera) ---
assert.deepStrictEqual(round({ ...encargo, propuesta: "B" }), { ...encargo, propuesta: "B" }, "round-trip conserva la propuesta");
assert.strictEqual(round(encargo)!.propuesta, undefined, "sin propuesta → ausente, no null");
assert.strictEqual(
  desde("dias=1&fecha=2026-01-01&ritmo=medio&comida=picnic&propuesta=Z")!.propuesta, undefined,
  "propuesta inválida → se cae a la primera, no invalida el plan");

console.log("OK encargo.test.ts");
