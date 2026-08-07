// Test de lógica pura: `npx tsx lib/arbol/etiquetas.test.ts`. Fuera del build.
import assert from "assert";
import { CAMPOS_POR_DEFECTO, type Campos, detalleDe, fechasDe, nombreIncierto, partirNombre } from "./etiquetas";
import type { Persona } from "./tree";

const persona = (p: Partial<Persona>): Persona => ({ id: "x", nombre: "X", apellidos: [], fuentes: [], ...p });
const APAGADOS: Campos = { fechas: "ocultar", edad: false, dudoso: false, notas: false };
const CON_FECHAS: Campos = { ...CAMPOS_POR_DEFECTO, fechas: "año" };
const HOY = "2026-08-06";
const detalleCon = (p: Persona, campos: Campos) => detalleDe(p, campos, HOY);

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

// --- Fechas: solo lo que consta, sin inventar el día ni el año que falten ---
assert.strictEqual(fechasDe(persona({ birth: "1986" }), "año"), "1986");
assert.strictEqual(fechasDe(persona({ birth: "1945", death: "2018" }), "año"), "1945–2018");
assert.strictEqual(fechasDe(persona({ death: "1992" }), "año"), "†1992", "solo fallecimiento");
assert.strictEqual(fechasDe(persona({}), "año"), "", "sin fechas, nada");
assert.strictEqual(fechasDe(persona({ birth: "1986-03-01" }), "año"), "1986", "el modo año se queda con el año");
assert.strictEqual(fechasDe(persona({ birth: "1986-03-01" }), "completa"), "01/03/1986");
assert.strictEqual(fechasDe(persona({ birth: "1945-05-31", death: "2018" }), "completa"), "31/05/1945–2018", "a nadie le consta el día de su muerte");
assert.strictEqual(fechasDe(persona({ birth: "1986-03-01" }), "ocultar"), "");

// --- Detalle: cada campo se enciende por separado, para todos a la vez ---
const p = persona({ birth: "1976", nota: "Chon · de Japón" });
assert.deepStrictEqual(detalleCon(p, APAGADOS), [], "todo apagado deja solo el nombre");
assert.deepStrictEqual(detalleCon(p, { ...APAGADOS, fechas: "año" }), [{ texto: "1976", incierto: false }]);
assert.deepStrictEqual(
  detalleCon(p, { ...APAGADOS, notas: true }),
  [{ texto: "Chon · de Japón", incierto: false, nota: true }],
  "la nota se marca como tal para pintarla en cursiva",
);
assert.deepStrictEqual(detalleCon(persona({}), CAMPOS_POR_DEFECTO), [], "sin datos no hay línea");
assert.deepStrictEqual(detalleCon(p, CAMPOS_POR_DEFECTO)[0], { texto: "50 años", incierto: false }, "de entrada, la edad sin fecha");

// --- Un fallecido lo dice su edad, que de entrada es lo único que se ve de él ---
assert.deepStrictEqual(
  detalleCon(persona({ birth: "1945-05-31", death: "2018" }), CAMPOS_POR_DEFECTO),
  [{ texto: "vivió 73 años", incierto: false }],
  "el verbo dice lo que la fecha oculta ya no dice",
);
assert.strictEqual(detalleCon(persona({ birth: "1976" }), CAMPOS_POR_DEFECTO)[0].texto, "50 años", "y el vivo no lo lleva");

// --- La edad va aparte de las fechas: se puede ver sin ellas ---
assert.deepStrictEqual(detalleCon(p, { ...APAGADOS, edad: true }), [{ texto: "50 años", incierto: false }]);
assert.deepStrictEqual(
  detalleCon(persona({ birth: "2025" }), { ...APAGADOS, edad: true }),
  [{ texto: "1 año", incierto: false }],
  "en singular cuando toca",
);
assert.deepStrictEqual(
  detalleCon(persona({ death: "1992" }), { ...APAGADOS, edad: true }),
  [],
  "sin nacimiento no se inventa una edad",
);
assert.deepStrictEqual(
  detalleCon(persona({ birth: "1917" }), { ...APAGADOS, edad: true }),
  [],
  "ni al que pasaría de 100 sin que conste su defunción",
);
assert.deepStrictEqual(
  detalleCon(persona({ birth: "1917" }), { ...APAGADOS, fechas: "año" }),
  [{ texto: "1917", incierto: false }],
  "…pero su nacimiento consta y se enseña",
);

// --- Una nota larga se recorta antes de desbordar el nodo ---
const charlatan = persona({ birth: "2004", nota: "(mamá MªLuisa Pérez-Cuadrado de la Torre)" });
const detalle = detalleCon(charlatan, CON_FECHAS);
assert.strictEqual(detalle[0].texto, "2004", "las fechas nunca se recortan");
assert.strictEqual(detalle[1].texto, "22 años", "la edad tampoco");
assert.ok(detalle[2].texto.endsWith("…"), "la nota avisa de lo que no cabe");
assert.ok(detalle.reduce((n, s) => n + s.texto.length + 3, -3) <= 36, "la línea entera cabe");

// --- La duda señala el dato concreto, no la persona entera ---
const fechaDudosa = persona({ birth: "1992", incierto: "fechas" });
const nombreDudoso = persona({ nombre: "Rafa", apellidos: ["Orte"], death: "2016", incierto: "nombre" });
assert.deepStrictEqual(
  detalleCon(fechaDudosa, CON_FECHAS),
  [
    { texto: "1992", incierto: true },
    { texto: "34 años", incierto: true },
  ],
  "la fecha y la edad que sale de ella, marcadas",
);
assert.ok(!nombreIncierto(fechaDudosa, CAMPOS_POR_DEFECTO), "…y el nombre no");
assert.ok(nombreIncierto(nombreDudoso, CAMPOS_POR_DEFECTO), "el nombre dudoso, marcado");
assert.deepStrictEqual(detalleCon(nombreDudoso, CON_FECHAS), [{ texto: "†2016", incierto: false }], "…y su fecha no");
assert.ok(!nombreIncierto(nombreDudoso, { ...CAMPOS_POR_DEFECTO, dudoso: false }), "con el interruptor apagado, nada se marca");
assert.deepStrictEqual(detalleCon(fechaDudosa, { ...CON_FECHAS, dudoso: false })[0], { texto: "1992", incierto: false });

console.log("etiquetas.test.ts OK");
