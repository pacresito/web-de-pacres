// Test de lógica pura: `npx tsx lib/fuera-de-ruta/resumen.test.ts`. Fuera del build.
import assert from "assert";
import { filtrosActivos, resumenFiltros } from "./resumen";
import type { Filtros } from "./filtrar";

const zonas: Record<string, string> = { ribera: "Ribera de Navarra", "baztan-otsondo": "Baztán y Otsondo" };
const nombre = (id: string) => zonas[id] ?? id;

// --- resumenFiltros: frase legible desde los filtros ---
assert.strictEqual(resumenFiltros({}, nombre), "", "sin filtros no hay resumen");
assert.strictEqual(resumenFiltros({ tipo: ["cascada"], zona: ["ribera"] }, nombre), "cascadas en Ribera de Navarra", "tipo pluralizado + zona sin coma");
assert.strictEqual(
  resumenFiltros({ tipo: ["cascada", "mirador"], ninos: true, perros: true }, nombre),
  "cascadas y miradores, para niños y perros",
  "plural en -es y booleanos combinados",
);
assert.strictEqual(
  resumenFiltros({ zona: ["ribera"], bano: true, distanciaMax: 2 }, nombre),
  "en Ribera de Navarra, con baño, a menos de 2 km a pie",
  "sin tipo, la zona encabeza",
);
assert.strictEqual(resumenFiltros({ desnivel: "+500", epoca: ["otono"] }, nombre), "con más de 500 m de desnivel, en otoño", "desnivel +500 y época con acento");
assert.strictEqual(resumenFiltros({ agua: ["rio", "poza"] }, nombre), "con río o poza", "agua con texto visible y nexo o");

// --- filtrosActivos: una unidad por filtro, con su etiqueta ---
const f: Filtros = { zona: ["ribera"], tipo: ["cascada"], bano: true, distanciaMax: 2 };
const activos = filtrosActivos(f, nombre);
assert.deepStrictEqual(
  activos.map((a) => a.etiqueta),
  ["solo Ribera de Navarra", "cascada", "‹ 2 km a pie", "baño sí"],
  "etiquetas en orden estable",
);
assert.strictEqual(filtrosActivos({ zona: ["ribera", "baztan-otsondo"] }, nombre)[0].etiqueta, "2 zonas", "multi-selección cuenta, no lista");
assert.strictEqual(filtrosActivos({}, nombre).length, 0, "sin filtros no hay unidades");

// --- filtrosActivos: `sin` quita solo esa unidad ---
const sinBano = activos.find((a) => a.etiqueta === "baño sí")!.sin;
assert.deepStrictEqual(sinBano, { zona: ["ribera"], tipo: ["cascada"], bano: undefined, distanciaMax: 2 }, "quitar baño conserva el resto");

console.log("OK resumen.test.ts");
