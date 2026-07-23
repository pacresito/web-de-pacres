// Test de oportunidades (F3). `npx tsx lib/fuera-de-ruta/oportunidades/oportunidades.test.ts`.
// Matriz sintética para clavar las reglas (umbral, «diferenciada», orden); smoke con datos
// reales de Navarra. GPS ficticio: solo hace falta que exista para pasar el filtro `enRuta`.
import assert from "assert";
import { oportunidades } from "./oportunidades";
import type { Destino, DatosViajes } from "../tipos";
import type { MatrizViajes } from "../geo";
import navarra from "../../../data/fuera-de-ruta/navarra.json";
import matrizNavarra from "../../../data/fuera-de-ruta/matriz-navarra.json";

const gps: [number, number] = [42, -1];
const dest = (slug: string, tipo: string): Destino => ({ slug, nombre: slug, zona: "z", tipo, queEs: "", gps });

// Matriz sintética A–F (minutos → segundos). Ruta = [A, B] (A el primero de la selección).
// Desvíos resultantes: C 0, F 2, D 8 (pero misma tipo que A), E 60 (lejos).
const min = (m: Record<string, Record<string, number>>): MatrizViajes => {
  const ids = Object.keys(m);
  return { ids, segundos: ids.map((i) => ids.map((j) => (m[i][j] ?? m[j][i] ?? 0) * 60)) };
};
const M = min({
  A: { B: 10, C: 5, D: 4, E: 30, F: 6 },
  B: { C: 5, D: 20, E: 30, F: 6 },
  C: {}, D: {}, E: {}, F: {},
});
const seleccion = [dest("A", "ruta"), dest("B", "cascada")];
const candidatas = [dest("C", "mirador"), dest("D", "ruta"), dest("E", "pueblo"), dest("F", "pueblo")];

// --- Sin selección: no hay ruta que medir → nada ---
assert.deepStrictEqual(oportunidades([], candidatas, M), [], "sin selección, sin oportunidades");

// --- Umbral, diferenciación y orden en una sola llamada ---
let o = oportunidades(seleccion, candidatas, M);
const slugs = o.map((x) => x.destino.slug);
assert.deepStrictEqual(slugs, ["C", "F"], "solo las cercanas y diferenciadas, por desvío creciente");
assert.ok(!slugs.includes("D"), "misma tipo que algo ya elegido (ruta) no es oportunidad");
assert.ok(!slugs.includes("E"), "por encima del umbral queda fuera");
assert.strictEqual(o[0].desvioMin, 0, "C se encaja sin desvío");

// --- Nunca propone algo ya seleccionado, aunque venga en las candidatas ---
o = oportunidades(seleccion, [...candidatas, dest("A", "ruta")], M);
assert.ok(!o.some((x) => x.destino.slug === "A"), "lo ya elegido nunca es oportunidad");

// --- El umbral es configurable: subirlo deja entrar a E ---
o = oportunidades(seleccion, candidatas, M, { desvioMaxMin: 60 });
assert.ok(o.some((x) => x.destino.slug === "E"), "con umbral holgado, E entra");

// --- `max` limita cuántas se muestran (no saturar el panel) ---
assert.strictEqual(oportunidades(seleccion, candidatas, M, { max: 1 }).length, 1, "max recorta");

// --- Smoke real: cluster de Elizondo; con umbral 25, infernuko (15) y elizondo (20) ---
const datos = navarra as unknown as DatosViajes;
const bySlug = (s: string) => datos.destinos.find((d) => d.slug === s)!;
const m = matrizNavarra as MatrizViajes;
const sel = ["ruta-bunkers-de-otsondo", "cascada-de-xorroxin"].map(bySlug); // ruta + cascada
const cand = ["infernuko-errota", "elizondo", "tudela"].map(bySlug);        // monumento, pueblo, pueblo (lejos)
o = oportunidades(sel, cand, m, { desvioMaxMin: 25 });
assert.deepStrictEqual(o.map((x) => x.destino.slug), ["infernuko-errota", "elizondo"], "cercanas por desvío; tudela lejos fuera");
assert.ok(o.every((x) => !["ruta", "cascada"].includes(x.destino.tipo)), "ninguna repite tipo ya elegido");
assert.deepStrictEqual(oportunidades(sel, cand, m).map((x) => x.destino.slug), ["infernuko-errota"], "umbral por defecto (15): solo infernuko");

console.log("OK oportunidades.test.ts");
