// Test de lógica pura: `npx tsx lib/fuera-de-ruta/url-filtros.test.ts`. Fuera del build.
import assert from "assert";
import { filtrosAQuery, queryAFiltros } from "./url-filtros";
import type { Filtros } from "./filtrar";

const ida = (f: Filtros) => queryAFiltros(new URLSearchParams(filtrosAQuery(f)));

// --- Round-trip: lo que sale del explorador vuelve igual ---
const completo: Filtros = {
  zona: ["baztan-otsondo", "ribera"],
  tipo: ["cascada"],
  dificultad: ["fácil", "media"],
  epoca: ["verano"],
  agua: ["poza"],
  distanciaMax: 10,
  duracionMax: 3,
  desnivel: "<300",
  ninos: true,
  perros: true,
  bano: true,
  parkingGratuito: true,
  sinReserva: true,
};
assert.deepStrictEqual(ida(completo), completo, "round-trip conserva todos los filtros");

// --- Sin filtros = query vacía (URL limpia, no "?") ---
assert.strictEqual(filtrosAQuery({}), "", "sin filtros → query vacía");
assert.deepStrictEqual(queryAFiltros(new URLSearchParams("")), {}, "query vacía → sin filtros");

// --- Solo se escribe lo que filtra: un booleano en false no ensucia la URL ---
assert.strictEqual(filtrosAQuery({ ninos: false, bano: true }), "bano=1", "booleano false no se escribe");
assert.strictEqual(filtrosAQuery({ zona: [] }), "", "dimensión vacía no se escribe");

// --- Multi-selección: repite clave, conserva el orden ---
assert.strictEqual(filtrosAQuery({ tipo: ["cascada", "ibon"] }), "tipo=cascada&tipo=ibon", "multi repite clave");

// --- Parseo defensivo: el valor raro se cae, el resto de filtros sigue en pie ---
assert.deepStrictEqual(
  queryAFiltros(new URLSearchParams("desnivel=everest&tipo=cascada")),
  { tipo: ["cascada"] },
  "desnivel inválido se ignora sin tumbar el resto");
assert.deepStrictEqual(
  queryAFiltros(new URLSearchParams("distanciaMax=abc&duracionMax=-3&bano=1")),
  { bano: true },
  "umbrales no numéricos o negativos se ignoran");
assert.deepStrictEqual(
  queryAFiltros(new URLSearchParams("ninos=true")), {}, "booleano solo se activa con 1");

console.log("OK url-filtros.test.ts");
