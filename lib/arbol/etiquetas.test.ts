// Test de lógica pura: `npx tsx lib/arbol/etiquetas.test.ts`. Fuera del build.
import assert from "assert";
import { CAMPOS_COMPLETOS, detalleDe, fechasDe, nombreIncierto, partirNombre } from "./etiquetas";
import type { Persona } from "./tree";

const persona = (p: Partial<Persona>): Persona => ({ id: "x", nombre: "X", apellidos: [], fuentes: [], ...p });
const APAGADOS = { fechas: false, dudoso: false, notas: false };

// --- Partir el nombre ---
const entero = (nombre: string, ancho: number, lineas: number) =>
  partirNombre(nombre, nombre.length, ancho, lineas).map((r) => r.escrito);

assert.deepStrictEqual(entero("Lucas", 26, 1), ["Lucas"], "un nombre corto no se parte");
assert.deepStrictEqual(
  entero("Federico Maestre de San Juan", 26, 2),
  ["Federico Maestre de San", "Juan"],
  "el más largo del árbol cabe en dos líneas",
);
assert.deepStrictEqual(entero("Federico Maestre de San Juan", 26, 1), ["Federico Maestre de San J…"], "en una, se recorta");
assert.deepStrictEqual(entero("A".repeat(30), 26, 1), ["A".repeat(25) + "…"], "una palabra sin espacios se corta");
assert.ok(entero("Uno dos tres cuatro cinco seis siete ocho nueve", 21, 2).length === 2, "nunca más líneas de las pedidas");

// El apellido heredado se separa en cada renglón, esté donde esté el corte de línea.
assert.deepStrictEqual(
  partirNombre("Chiara Teresa Torres Cardona", "Chiara Teresa".length, 40, 1),
  [{ escrito: "Chiara Teresa", heredado: " Torres Cardona" }],
  "lo deducido va aparte",
);
assert.deepStrictEqual(
  partirNombre("Chiara Teresa Torres Cardona", "Chiara Teresa Torres".length, 21, 2),
  [
    { escrito: "Chiara Teresa Torres", heredado: "" },
    { escrito: "", heredado: "Cardona" },
  ],
  "el renglón que solo trae heredado no lleva nada escrito",
);

// --- Fechas: solo lo que consta, sin inventar el año que falta ---
assert.strictEqual(fechasDe(persona({ birth: 1986 })), "1986");
assert.strictEqual(fechasDe(persona({ birth: 1945, death: 2018 })), "1945–2018");
assert.strictEqual(fechasDe(persona({ death: 1992 })), "†1992", "solo fallecimiento");
assert.strictEqual(fechasDe(persona({})), "", "sin fechas, nada");

// --- Detalle: cada campo se enciende por separado, para todos a la vez ---
const p = persona({ birth: 1976, nota: "de Japón", apodo: "Chon" });
assert.deepStrictEqual(detalleDe(p, APAGADOS), [], "todo apagado deja solo el nombre");
assert.deepStrictEqual(detalleDe(p, { ...APAGADOS, fechas: true }), [{ texto: "1976", incierto: false }]);
assert.deepStrictEqual(
  detalleDe(p, { ...APAGADOS, notas: true }),
  [
    { texto: "«Chon»", incierto: false },
    { texto: "de Japón", incierto: false },
  ],
  "el apodo va con las notas, entrecomillado",
);
assert.deepStrictEqual(detalleDe(persona({}), CAMPOS_COMPLETOS), [], "sin datos no hay línea");

// --- Una nota larga se recorta antes de desbordar el nodo ---
const charlatan = persona({ birth: 2004, nota: "(mamá MªLuisa Pérez-Cuadrado de la Torre)" });
const detalle = detalleDe(charlatan, CAMPOS_COMPLETOS);
assert.strictEqual(detalle[0].texto, "2004", "las fechas nunca se recortan");
assert.ok(detalle[1].texto.endsWith("…"), "la nota avisa de lo que no cabe");
assert.ok(detalle.reduce((n, s) => n + s.texto.length + 3, -3) <= 36, "la línea entera cabe");

// --- La duda señala el dato concreto, no la persona entera ---
const fechaDudosa = persona({ birth: 1992, incierto: "fechas" });
const nombreDudoso = persona({ nombre: "Rafa", apellidos: ["Orte"], death: 2016, incierto: "nombre" });
assert.deepStrictEqual(detalleDe(fechaDudosa, CAMPOS_COMPLETOS), [{ texto: "1992", incierto: true }], "la fecha, marcada");
assert.ok(!nombreIncierto(fechaDudosa, CAMPOS_COMPLETOS), "…y el nombre no");
assert.ok(nombreIncierto(nombreDudoso, CAMPOS_COMPLETOS), "el nombre dudoso, marcado");
assert.deepStrictEqual(detalleDe(nombreDudoso, CAMPOS_COMPLETOS), [{ texto: "†2016", incierto: false }], "…y su fecha no");
assert.ok(!nombreIncierto(nombreDudoso, { ...CAMPOS_COMPLETOS, dudoso: false }), "con el interruptor apagado, nada se marca");
assert.deepStrictEqual(detalleDe(fechaDudosa, { ...CAMPOS_COMPLETOS, dudoso: false }), [{ texto: "1992", incierto: false }]);

console.log("etiquetas.test.ts OK");
