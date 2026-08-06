// Test de lógica pura: `npx tsx lib/arbol/fechas.test.ts`. Fuera del build.
import assert from "assert";
import { añoDe, conDia, edadDe, edadEntre, escribir } from "./fechas";

// --- Leer y escribir ---
assert.strictEqual(añoDe("1986"), 1986);
assert.strictEqual(añoDe("1986-03-01"), 1986);
assert.ok(!conDia("1986") && conDia("1986-03-01"));
assert.strictEqual(escribir("1986-03-01"), "01/03/1986");
assert.strictEqual(escribir("1986"), "1986", "sin día no hay nada que formatear");

// --- Años naturales cuando a alguna fecha le falta el día ---
assert.strictEqual(edadEntre("1945", "2018"), 73);
assert.strictEqual(edadEntre("1945-05-31", "2018"), 73, "el año natural manda aunque una sí tenga día");
assert.strictEqual(edadEntre("1926", "1926"), 0);

// --- Exacta cuando las dos lo tienen ---
assert.strictEqual(edadEntre("1986-03-01", "2026-08-06"), 40, "cumplido");
assert.strictEqual(edadEntre("1986-08-28", "2026-08-06"), 39, "aún no");
assert.strictEqual(edadEntre("1986-08-06", "2026-08-06"), 40, "el día del cumpleaños ya cuenta");

// --- La edad de una persona ---
const HOY = "2026-08-06";
assert.strictEqual(edadDe({ birth: "1946-08-16" }, HOY), 79, "vivo: hasta hoy");
assert.strictEqual(edadDe({ birth: "1945-05-31", death: "2018" }, HOY), 73, "fallecido: hasta su muerte");
assert.strictEqual(edadDe({ death: "1992" }, HOY), null, "sin nacimiento no hay edad que dar");
assert.strictEqual(edadDe({}, HOY), null);

console.log("fechas.test.ts OK");
