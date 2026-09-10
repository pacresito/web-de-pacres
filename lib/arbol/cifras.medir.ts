// El medidor de las cifras que los comentarios del árbol citan a mano. Fuera del build, como
// los tests: `npx tsx lib/arbol/cifras.medir.ts`.
//
// Media docena de cabeceras explican una decisión con un número —«a 59 personas el documento no
// les da apellido», «son doce ramas para 501»—, y ese número es lo que sostiene el argumento: sin
// él la frase dice que hay gente sin apellido, que no es una razón para nada. Pero la familia
// crece y las cifras envejecen calladas, porque no hay test que falle cuando una miente. Esto
// las saca todas de una vez, con el sitio donde están escritas al lado.
//
// **Se corre al tocar `data/arbol.json`**, después de copiar el seed y antes de commitear.

import { readFileSync } from "fs";
import { resolve } from "path";
import { conDia, seLeSuponeFallecido } from "./fechas";
import { construirGrafo } from "./grafo";
import { homonimias, libretaDe, SIN_NOMBRE } from "./identidad";
import { losIncompletos } from "./incompletos";
import type { Apellidos } from "./personas";
import { RAMAS } from "./ramas";
import type { ArbolData } from "./tree";

const HOY = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const { linaje, homonimias: repetidos } = libretaDe(g);
const gente = [...g.personaPorId.values()];
const vivos = gente.filter((p) => !p.death && !seLeSuponeFallecido(p, HOY));

/** Los apellidos tal como los trajo el documento, sin deducir ninguno subiendo por el árbol. */
const crudo = new Map<string, Apellidos>(
  gente.map((p) => [p.id, { todos: p.apellidos ?? [], escritos: (p.apellidos ?? []).length, nuevos: [] }]),
);

const cifras: [number, string][] = [
  [gente.length, "personas — auth.ts «son N personas a la vista», identidad.ts «N ramas para N»"],
  [linajesVacios(), "sin ningún apellido — identidad.ts, cabecera"],
  [gente.filter((p) => !p.birth && !p.death).length, "sin ninguna fecha — identidad.ts, cabecera"],
  [gente.filter((p) => p.birth).length, "con año — identidad.ts, `tituloDe`"],
  [RAMAS.length, "ramas — identidad.ts, `PELDAÑOS`"],
  [repetidos.size, "comparten nombre completo y año — identidad.ts, `homonimias`"],
  [homonimias(g, crudo).size, "…y serían tantos sin reconstruir los apellidos — el mismo sitio"],
  [gente.filter((p) => p.nombre === SIN_NOMBRE).length, "sin nombre — Arbol.tsx y busqueda.ts, «las trece»"],
  [losIncompletos(g, linaje, HOY).size, "con algo que preguntar — Arbol.tsx, la nota de «Qué se ve»"],
  [vivos.filter((p) => !p.birth || !conDia(p.birth)).length, "vivos sin día de nacimiento — stats.ts, `proximosCumples`"],
];

function linajesVacios(): number {
  return gente.filter((p) => linaje.get(p.id)!.todos.length === 0).length;
}

console.log(`Las cifras del árbol el ${HOY}, desde seed/arbol.json:\n`);
for (const [n, donde] of cifras) console.log(`${String(n).padStart(4)}  ${donde}`);
console.log("\nLa que no cuadre con lo que dice su comentario, se corrige en el comentario.");
