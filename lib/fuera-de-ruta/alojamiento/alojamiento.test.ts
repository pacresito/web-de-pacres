// Test de zonas de alojamiento (F4). `npx tsx lib/fuera-de-ruta/alojamiento/alojamiento.test.ts`.
// Matriz + reparto sintéticos para clavar las reglas (corte por salto, ahorro, tope,
// votación de pueblo, nunca establecimiento); smoke con datos reales de Navarra.
import assert from "assert";
import { zonasAlojamiento } from "./alojamiento";
import { resumenMiViaje, type ResumenViaje } from "../viaje/mi-viaje";
import type { Destino, DatosViajes } from "../tipos";
import type { MatrizViajes } from "../planificador/geo";
import navarra from "../../../data/fuera-de-ruta/navarra.json";
import matrizNavarra from "../../../data/fuera-de-ruta/matriz-navarra.json";

const gps: [number, number] = [42, -1];
const dest = (slug: string, pueblos?: string[]): Destino =>
  ({ slug, nombre: slug, zona: "z-" + slug, tipo: "ruta", queEs: "", gps, ...(pueblos && { pueblosAlojamiento: pueblos }) });
const hotel = (slug: string): Destino => ({ ...dest(slug), tipo: "alojamiento" });

// Reparto sintético: un ResumenViaje a mano (solo importan `numero` y `slugs`).
const dia = (numero: number, slugs: string[]) => ({ numero, slugs, min: 0, km: 0, apretado: false });
const resumen = (...dias: ReturnType<typeof dia>[]): ResumenViaje =>
  ({ dias, totalMin: 0, totalKm: 0, totalParadas: 0, desbordado: false });

// Matriz sintética simétrica (minutos → segundos).
const mat = (m: Record<string, Record<string, number>>): MatrizViajes => {
  const ids = Object.keys(m);
  return { ids, segundos: ids.map((i) => ids.map((j) => (m[i][j] ?? m[j][i] ?? 0) * 60)) };
};

// --- Salto grande entre días → dos bases; la segunda anota lo que ahorra mudarse ---
const M = mat({ P: { Q: 40 }, Q: {} });
const porSlug = new Map([dest("P", ["Norte"]), dest("Q", ["Sur"])].map((d) => [d.slug, d]));
let z = zonasAlojamiento(resumen(dia(1, ["P"]), dia(2, ["Q"])), porSlug, M);
assert.strictEqual(z.length, 2, "salto grande parte en dos bases");
assert.deepStrictEqual([z[0].pueblo, z[1].pueblo], ["Norte", "Sur"], "cada base, su pueblo");
assert.strictEqual(z[0].ahorroMin, undefined, "la primera base no ahorra nada (no hay mudanza previa)");
assert.strictEqual(z[1].ahorroMin, 40, "mudarse a la segunda ahorra el salto de coche");

// --- Salto pequeño → una sola base para ambos días ---
z = zonasAlojamiento(resumen(dia(1, ["P"]), dia(2, ["Q"])), porSlug, mat({ P: { Q: 10 }, Q: {} }));
assert.strictEqual(z.length, 1, "salto por debajo del umbral no justifica cambiar de base");
assert.deepStrictEqual(z[0].dias, [1, 2], "la base cubre los dos días");

// --- Nunca más de `max` zonas: con 4 días dispersos, corta solo en los mayores ---
const M4 = mat({ A: { B: 60 }, B: { C: 50 }, C: { D: 40 }, D: {} });
const ps4 = new Map(["A", "B", "C", "D"].map((s) => [s, dest(s, [s.toLowerCase()])]));
z = zonasAlojamiento(resumen(dia(1, ["A"]), dia(2, ["B"]), dia(3, ["C"]), dia(4, ["D"])), ps4, M4);
assert.ok(z.length <= 3, "nunca más de 3 bases");

// --- Pueblo por votación con peso por posición (el primero de la lista pesa más) ---
const dv = new Map([dest("dA", ["X", "Y"]), dest("dB", ["Y", "Z"])].map((d) => [d.slug, d]));
z = zonasAlojamiento(resumen(dia(1, ["dA", "dB"])), dv, mat({ dA: { dB: 5 }, dB: {} }));
assert.strictEqual(z[0].pueblo, "Y", "Y (1º en dB + 2º en dA) gana a X y Z");

// --- Sin pueblosAlojamiento en los datos → cae a la zona, nunca queda sin nombre ---
z = zonasAlojamiento(resumen(dia(1, ["solo"])), new Map([["solo", dest("solo")]]), mat({ solo: {} }));
assert.strictEqual(z[0].pueblo, "z-solo", "fallback a la zona de la provincia");

// --- Ancla rutable: el alojamiento más cerca de las paradas del tramo, no del pueblo ---
const Ma = mat({ P: { Q: 40, hN: 10, hS: 90 }, Q: { hN: 90, hS: 10 }, hN: { hS: 100 }, hS: {} });
const psA = new Map([dest("P", ["Norte"]), dest("Q", ["Sur"]), hotel("hN"), hotel("hS")].map((d) => [d.slug, d]));
z = zonasAlojamiento(resumen(dia(1, ["P"]), dia(2, ["Q"])), psA, Ma);
assert.deepStrictEqual(z.map((x) => x.ancla?.slug), ["hN", "hS"], "cada base ancla en el alojamiento que menos coche suma");
assert.deepStrictEqual([z[0].pueblo, z[1].pueblo], ["Norte", "Sur"], "el ancla no pisa el pueblo que se enseña");

// --- Base sin ningún alojamiento rutable → sin ancla, pero con pueblo (no se rompe) ---
z = zonasAlojamiento(resumen(dia(1, ["P"])), porSlug, M);
assert.strictEqual(z[0].ancla, undefined, "sin alojamientos en los datos, la base se queda sin ancla");
assert.strictEqual(z[0].pueblo, "Norte", "y aun así propone dónde dormir");

// --- Sin paradas rutables → nada que proponer ---
assert.deepStrictEqual(zonasAlojamiento(resumen(dia(1, ["fuera-de-matriz"])), porSlug, M), [], "sin rutables, sin zonas");

// --- Smoke real: viaje norte+sur en 2 días → 2 bases, la 2ª con ahorro; pueblo real ---
const datos = navarra as unknown as DatosViajes;
const bySlug = (s: string) => datos.destinos.find((d) => d.slug === s)!;
const m = matrizNavarra as MatrizViajes;
const real = new Map(datos.destinos.map((d) => [d.slug, d]));
const sel = ["ruta-bunkers-de-otsondo", "cascada-de-xorroxin", "nacedero-del-urederra", "ojo-de-iturmendi"].map(bySlug);
const opts = { dias: 2, ritmo: "medio" as const, comida: "picnic" as const, fecha: new Date("2026-07-18") };
z = zonasAlojamiento(resumenMiViaje(sel, m, opts), real, m);
assert.strictEqual(z.length, 2, "norte y sur son dos bases");
assert.ok(z[1].ahorroMin && z[1].ahorroMin > 0, "la mudanza al sur ahorra coche real");
const pueblosReales = new Set(datos.destinos.flatMap((d) => d.pueblosAlojamiento ?? []));
assert.ok(z.every((x) => pueblosReales.has(x.pueblo)), "toda base es una localidad de pueblosAlojamiento, nunca un hotel");
assert.ok(z.every((x) => x.ancla && bySlug(x.ancla.slug).tipo === "alojamiento"), "toda base real ancla en un alojamiento de los datos");
assert.notStrictEqual(z[0].ancla!.slug, z[1].ancla!.slug, "norte y sur no anclan en el mismo hotel");
assert.strictEqual(zonasAlojamiento(resumenMiViaje(sel, m, opts), real, m, { max: 1 }).length, 1, "max recorta a una base");

console.log("OK alojamiento.test.ts");
