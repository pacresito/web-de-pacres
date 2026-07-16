// Test de la Fase 1 (eliminación). `npx tsx lib/fuera-de-ruta/motor/eliminar.test.ts`.
// Fuera del build. Vigila la regla de oro: solo elimina incompatibilidad EXPLÍCITA.
import assert from "assert";
import { eliminar } from "./eliminar";
import type { Perfil } from "./tipos";
import type { Destino, DatosViajes } from "../tipos";
import navarra from "../../../data/fuera-de-ruta/navarra.json";

const mk = (over: Partial<Destino>): Destino => ({
  slug: "x", nombre: "X", zona: "z1", tipo: "ruta", queEs: "", imagen: "", ...over,
});
const slugs = (ds: Destino[]) => ds.map((d) => d.slug).sort();

// --- Perfil vacío: no elimina a nadie ---
const tres = [mk({ slug: "a" }), mk({ slug: "b" }), mk({ slug: "c" })];
let r = eliminar(tres, {});
assert.deepStrictEqual(slugs(r.candidatas), ["a", "b", "c"], "perfil vacío no elimina");
assert.strictEqual(r.eliminadas.length, 0, "perfil vacío: sin eliminadas");

// --- "Ausente = no consta", no "no": el dato que falta NUNCA se elimina ---
const carritos = [
  mk({ slug: "apta", carrito: true }),
  mk({ slug: "noApta", carrito: false }),
  mk({ slug: "sinDato" }),  // carrito ausente
];
r = eliminar(carritos, { carritoImprescindible: true });
assert.deepStrictEqual(slugs(r.candidatas), ["apta", "sinDato"], "carrito: solo elimina el explícito false; el ausente pasa");
assert.deepStrictEqual(r.eliminadas.map((e) => e.destino.slug), ["noApta"], "carrito: eliminado el false");

// --- Perro: mismo criterio (solo false explícito) ---
const perros = [mk({ slug: "si", perros: true }), mk({ slug: "no", perros: false }), mk({ slug: "nd" })];
r = eliminar(perros, { conPerro: true });
assert.deepStrictEqual(slugs(r.candidatas), ["nd", "si"], "perro: ausente pasa, solo elimina el false");

// --- Zona: fuera de las elegidas se elimina ---
const zonas = [mk({ slug: "z1a", zona: "z1" }), mk({ slug: "z2a", zona: "z2" })];
r = eliminar(zonas, { zonas: ["z1"] });
assert.deepStrictEqual(slugs(r.candidatas), ["z1a"], "zona: solo la elegida");

// --- Edad mínima: elimina si supera la edad del menor; empate no elimina ---
const edades = [mk({ slug: "e10", edadMinima: 10 }), mk({ slug: "libre" })];
assert.deepStrictEqual(slugs(eliminar(edades, { edadMinNino: 8 }).candidatas), ["libre"], "menor 8 < edadMínima 10: fuera");
assert.deepStrictEqual(slugs(eliminar(edades, { edadMinNino: 10 }).candidatas), ["e10", "libre"], "menor 10 = edadMínima 10: pasa");

// --- Acceso: elimina los peores que el máximo aceptado; ausente pasa ---
const accesos = [
  mk({ slug: "asf", accesoCarretera: "asfalto" }),
  mk({ slug: "buena", accesoCarretera: "pista buena" }),
  mk({ slug: "pista", accesoCarretera: "pista" }),
  mk({ slug: "nd" }),
];
assert.deepStrictEqual(slugs(eliminar(accesos, { accesoMax: "asfalto" }).candidatas), ["asf", "nd"], "solo asfalto: pistas fuera, ausente pasa");
assert.deepStrictEqual(slugs(eliminar(accesos, { accesoMax: "pista buena" }).candidatas), ["asf", "buena", "nd"], "hasta pista buena: pista fuera");
assert.deepStrictEqual(slugs(eliminar(accesos, { accesoMax: "pista" }).candidatas), ["asf", "buena", "nd", "pista"], "hasta pista: no elimina ninguno");

// --- Regla de oro: NINGUNA preferencia de puntuación elimina ---
const soloPreferencias: Perfil = {
  paisajes: ["bosque", "cascada"], experiencias: ["senderismo"], tipos: ["cascada"],
  dificultades: ["fácil"], epoca: ["verano"], quiereBano: true, imprescindibles: ["a"],
};
r = eliminar(tres, soloPreferencias);
assert.strictEqual(r.eliminadas.length, 0, "regla de oro: las preferencias no eliminan");
assert.strictEqual(r.candidatas.length, 3, "regla de oro: el conjunto se mantiene entero");

// --- Datos reales de Navarra ---
const todos = (navarra as unknown as DatosViajes).destinos;
assert.strictEqual(eliminar(todos, {}).candidatas.length, 20, "sin perfil: los 20");
assert.strictEqual(eliminar(todos, { carritoImprescindible: true }).eliminadas.length, 12, "12 no aptos para carrito (los 5 ausentes pasan)");
assert.deepStrictEqual(eliminar(todos, { conVertigo: true }).eliminadas.map((e) => e.destino.slug), ["mirador-de-lazkua"], "vértigo: solo Lazkua");
assert.strictEqual(eliminar(todos, { edadMinNino: 8 }).eliminadas.length, 3, "menor de 8: fuera los 3 de edad mínima 10");
assert.strictEqual(eliminar(todos, { accesoMax: "asfalto" }).eliminadas.length, 2, "solo asfalto: fuera Arpea y Peña Izaga (pista)");
assert.strictEqual(eliminar(todos, { conPerro: true }).eliminadas.length, 0, "ninguno marca perros=false: no elimina");

console.log("OK eliminar.test.ts");
