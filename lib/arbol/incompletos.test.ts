// Test de lógica pura: `npx tsx lib/arbol/incompletos.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { huecosDe, losIncompletos } from "./incompletos";
import { apellidosDe } from "./personas";
import type { Apellidos } from "./personas";
import type { ArbolData, Persona } from "./tree";

const apellidos = (todos: string[]): Apellidos => ({ todos, escritos: todos.length, nuevos: [] });
const quien = (extra: Partial<Persona>): Persona => ({ id: "x", nombre: "X", apellidos: [], fuentes: [], ...extra });
const linea = (p: Persona, a: Apellidos) => huecosDe(p, a)?.vida.map((t) => (t.falta ? `[${t.texto}]` : t.texto)).join("");

// Nada que preguntar: la fecha entera y algún apellido. El segundo no cuenta.
assert.strictEqual(huecosDe(quien({ birth: "1986-03-01" }), apellidos(["Crespo", "Velasco"])), null);
assert.strictEqual(huecosDe(quien({ birth: "1986-03-01" }), apellidos(["Crespo"])), null, "el 2.º apellido no es un hueco");

// El hueco se escribe donde iría, y solo él se resalta: se pide un día, no un año.
assert.strictEqual(linea(quien({ birth: "1937" }), apellidos(["A"])), "1937-[MM-DD]");
assert.strictEqual(linea(quien({}), apellidos(["A"])), "[AAAA-MM-DD]");
assert.strictEqual(linea(quien({ birth: "1937", death: "2014" }), apellidos(["A"])), "1937-[MM-DD] – 2014-[MM-DD]");
assert.strictEqual(
  linea(quien({ birth: "1921-10-01", death: "1990" }), apellidos(["A"])),
  "1921-10-01 – 1990-[MM-DD]",
  "la fecha que sí consta se lee entera y no se resalta",
);
assert.strictEqual(linea(quien({ birth: "1975-05-18", incierto: "fechas" }), apellidos(["A"])), "1975-05-18[ · fechas dudosas]");

// El apellido no va en esta línea: lo dice la del nombre, que es donde iría.
assert.strictEqual(huecosDe(quien({ birth: "1986-03-01" }), apellidos([]))?.apellido, true);
assert.strictEqual(linea(quien({ birth: "1986-03-01" }), apellidos([])), "1986-03-01");

// La onomástica no cuenta: no es un hueco del documento, y no se le pregunta a nadie.
assert.strictEqual(huecosDe(quien({ nombre: "Jara", birth: "2012-07-15" }), apellidos(["A", "B"])), null);

// Sobre el árbol de verdad: falta algo de la mayoría, y por eso el repaso apaga a los demás
// en vez de encender a estos. La cifra es la que pinta el interruptor de «Qué se ve».
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const conHuecos = losIncompletos(g, apellidosDe(g));
assert.ok(conHuecos.size > data.people.length / 2, `solo ${conHuecos.size} de ${data.people.length} tienen algo que preguntar`);
assert.ok(conHuecos.size < data.people.length, "y alguien está completo, o el repaso no distingue nada");
assert.strictEqual(conHuecos.has("p25"), false, "Pablo se sabe entero");
assert.strictEqual(conHuecos.has("p396"), false, "y Catalina, desde que se le sabe el día");

console.log(`incompletos.test.ts OK (${conHuecos.size} de ${data.people.length} con algo que preguntar)`);
