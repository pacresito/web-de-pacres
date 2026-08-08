// Test de lógica pura: `npx tsx lib/arbol/fechas.test.ts`. Fuera del build.
import assert from "assert";
import {
  añoDe,
  conDia,
  edadDe,
  edadEntre,
  escribirCorto,
  escribirVida,
  seLeSuponeFallecido,
  type ModoFechas,
} from "./fechas";

// --- Leer y escribir ---
assert.strictEqual(añoDe("1986"), 1986);
assert.strictEqual(añoDe("1986-03-01"), 1986);
assert.ok(!conDia("1986") && conDia("1986-03-01"));
assert.strictEqual(escribirCorto("2026-03-01"), "1 mar", "la corta va sin el cero de delante");
assert.strictEqual(escribirCorto("2026-12-25"), "25 dic");
assert.strictEqual(escribirCorto("1986"), "1986");

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

// --- A quien pasaría de 100 sin constar defunción se le supone fallecido ---
assert.strictEqual(edadDe({ birth: "1917" }, HOY), null, "109 años sin defunción: no se le da edad");
assert.strictEqual(edadDe({ birth: "1926" }, HOY), null, "los 100 justos ya entran");
assert.strictEqual(edadDe({ birth: "1927" }, HOY), 99, "y los 99 siguen contando");
assert.strictEqual(edadDe({ birth: "1900", death: "1999" }, HOY), 99, "al que sí consta se le cuenta hasta su muerte");
assert.ok(!seLeSuponeFallecido({ birth: "1900", death: "1999" }, HOY), "constar muerto no es suponerlo");
assert.ok(!seLeSuponeFallecido({}, HOY), "sin nacimiento no se supone nada");

// --- Lo que se escribe de una vida, según lo que pida el interruptor ---
const escrito = (p: { birth?: string; death?: string }, modo: ModoFechas) => escribirVida(p, modo, HOY);

// Solo lo que consta, sin inventar el día ni el año que falten.
assert.strictEqual(escrito({ birth: "1986" }, "año"), "1986");
assert.strictEqual(escrito({ birth: "1945", death: "2018" }, "año"), "1945 – 2018");
assert.strictEqual(escrito({ death: "1992" }, "año"), "† 1992", "solo fallecimiento");
assert.strictEqual(escrito({}, "año"), "", "sin fechas, nada");
assert.strictEqual(escrito({ birth: "1986-03-01" }, "año"), "1986", "el modo año se queda con el año");
assert.strictEqual(escrito({ birth: "1986-03-01" }, "ocultar"), "");

// La fecha entera, en el orden en que se guarda.
assert.strictEqual(escrito({ birth: "1986-03-01" }, "completa"), "1986-03-01");
assert.strictEqual(
  escrito({ birth: "1945-05-31", death: "2018" }, "completa"),
  "1945-05-31 – 2018",
  "a nadie le consta el día de su muerte",
);

// La edad ocupa el sitio del año, y el verbo dice quién ya no está.
assert.strictEqual(escrito({ birth: "1976" }, "edad"), "50 años");
assert.strictEqual(escrito({ birth: "2025" }, "edad"), "1 año", "en singular cuando toca");
assert.strictEqual(escrito({ birth: "1945-05-31", death: "2018" }, "edad"), "vivió 73 años");
assert.strictEqual(escrito({ death: "1992" }, "edad"), "", "sin nacimiento no se inventa una edad");
assert.strictEqual(escrito({ birth: "1917" }, "edad"), "", "ni al que pasaría de 100 sin que conste su defunción");
assert.strictEqual(escrito({ birth: "1917" }, "año"), "1917", "…pero su nacimiento consta y se enseña");

console.log("fechas.test.ts OK");
