// Test de lógica pura: `npx tsx lib/arbol/etiquetas.test.ts`. Fuera del build.
import assert from "assert";
import { fechasDe, type ModoFechas } from "./etiquetas";
import type { Persona } from "./tree";

const persona = (p: Partial<Persona>): Persona => ({ id: "x", nombre: "X", apellidos: [], fuentes: [], ...p });
const HOY = "2026-08-08";
const escrito = (p: Partial<Persona>, modo: ModoFechas) => fechasDe(persona(p), modo, HOY);

// --- Solo lo que consta, sin inventar el día ni el año que falten ---
assert.strictEqual(escrito({ birth: "1986" }, "año"), "1986");
assert.strictEqual(escrito({ birth: "1945", death: "2018" }, "año"), "1945 – 2018");
assert.strictEqual(escrito({ death: "1992" }, "año"), "† 1992", "solo fallecimiento");
assert.strictEqual(escrito({}, "año"), "", "sin fechas, nada");
assert.strictEqual(escrito({ birth: "1986-03-01" }, "año"), "1986", "el modo año se queda con el año");
assert.strictEqual(escrito({ birth: "1986-03-01" }, "ocultar"), "");

// --- La fecha entera, en el orden en que se guarda ---
assert.strictEqual(escrito({ birth: "1986-03-01" }, "completa"), "1986-03-01");
assert.strictEqual(
  escrito({ birth: "1945-05-31", death: "2018" }, "completa"),
  "1945-05-31 – 2018",
  "a nadie le consta el día de su muerte",
);

// --- La edad ocupa el sitio del año, y el verbo dice quién ya no está ---
assert.strictEqual(escrito({ birth: "1976" }, "edad"), "50 años");
assert.strictEqual(escrito({ birth: "2025" }, "edad"), "1 año", "en singular cuando toca");
assert.strictEqual(escrito({ birth: "1945-05-31", death: "2018" }, "edad"), "vivió 73 años");
assert.strictEqual(escrito({ death: "1992" }, "edad"), "", "sin nacimiento no se inventa una edad");
assert.strictEqual(escrito({ birth: "1917" }, "edad"), "", "ni al que pasaría de 100 sin que conste su defunción");
assert.strictEqual(escrito({ birth: "1917" }, "año"), "1917", "…pero su nacimiento consta y se enseña");

console.log("etiquetas.test.ts OK");
