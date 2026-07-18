// Test del comparador. `npx tsx lib/fuera-de-ruta/comparador/comparador.test.ts`.
// Sintético para clavar las reglas; smoke con datos reales de Navarra.
import assert from "assert";
import { comparar } from "./comparador";
import type { Destino, DatosViajes } from "../tipos";
import navarra from "../../../data/fuera-de-ruta/navarra.json";

const base = (over: Partial<Destino>): Destino => ({ slug: "x", nombre: "X", zona: "z", tipo: "ruta", queEs: "", ...over });
const A = base({ nombre: "Ruta A", duracionHoras: [1, 2], dificultad: "fácil", bano: true, ninos: true });
const B = base({ nombre: "Ruta B", duracionHoras: [4, 6], dificultad: "difícil", bano: false, ninos: false });

// --- Menos de 2: nada que comparar ---
let c = comparar([A]);
assert.deepStrictEqual([c.filas, c.frases], [[], []], "con un solo destino no hay comparativa");

// --- Filas: solo campos que alguien tiene; las vacías no se pintan ---
c = comparar([A, B]);
const etiquetas = c.filas.map((f) => f.etiqueta);
assert.ok(etiquetas.includes("Duración") && etiquetas.includes("Dificultad"), "pinta los campos con dato");
assert.ok(!etiquetas.includes("Distancia"), "campo que nadie tiene (distancia) no se pinta");
assert.ok(c.filas.every((f) => f.valores.length === 2), "una columna por destino");
assert.ok(c.filas.every((f) => f.valores.some((v) => v !== null)), "ninguna fila totalmente vacía");

// --- Frases: SIEMPRE condicionales («Si …»), nunca superioridad absoluta ---
assert.ok(c.frases.length > 0, "hay frases con datos que difieren");
assert.ok(c.frases.every((f) => f.startsWith("Si ")), "toda frase es condicional por construcción");
assert.ok(!c.frases.some((f) => /es mejor|la mejor|mejor opción|peor/i.test(f)), "nunca decreta un ganador");

// --- Numéricas: extremos nombrados en ambas direcciones ---
assert.ok(c.frases.some((f) => f.includes("más corto") && f.includes("Ruta A")), "la más corta apunta a A");
assert.ok(c.frases.some((f) => f.includes("caminar más") && f.includes("Ruta B")), "la más larga apunta a B");
assert.ok(c.frases.some((f) => f.includes("más sencillo") && f.includes("Ruta A")), "la más fácil apunta a A");

// --- Booleanas: discriminan solo con un sí y un NO explícito ---
assert.ok(c.frases.some((f) => f.includes("bañarte") && f.includes("Ruta A")), "baño sí/no apunta al que permite");
// "No consta" (undefined) no cuenta: no se inventa una diferencia.
const D = base({ nombre: "Ruta D", duracionHoras: [1, 2], ninos: undefined, bano: undefined });
assert.ok(!comparar([A, D]).frases.some((f) => /niños|bañarte/.test(f)), "campo ausente en un lado no genera frase");

// --- Smoke con datos reales: estructura coherente, frases condicionales ---
const datos = navarra as unknown as DatosViajes;
const bySlug = (s: string) => datos.destinos.find((d) => d.slug === s)!;
const reales = ["nacedero-del-urederra", "ubagua"].map(bySlug);
c = comparar(reales);
assert.strictEqual(c.nombres.length, 2, "dos nombres");
assert.ok(c.filas.length > 0, "hay campos comparables en datos reales");
assert.ok(c.frases.every((f) => f.startsWith("Si ")), "frases reales también condicionales");

console.log("OK comparador.test.ts");
