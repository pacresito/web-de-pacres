// Test de lógica pura: `npx tsx lib/arbol/busqueda.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { acortar, buscar, losSinNombre, type Resultado } from "./busqueda";
import { construirGrafo, pasosDesde } from "./grafo";
import { contextoEntero, libretaDe, SIN_NOMBRE } from "./identidad";
import type { ArbolData, Persona, Union } from "./tree";

const persona = (id: string, nombre: string, sexo?: Persona["sexo"], apellidos: string[] = []): Persona => ({
  id,
  nombre,
  apellidos,
  sexo,
  fuentes: [],
});
const union = (id: string, partners: string[], children: string[]): Union => ({
  id,
  partners,
  children,
  tipo: "matrimonio",
  fuentes: [],
});

// Un abuelo con apellido, un hijo que lo hereda sin que conste, una nieta que se llama casi
// como el abuelo y una cuarta sin nombre, que solo existe por su pareja.
const juguete: ArbolData = {
  people: [
    persona("abuelo", "Ramón", "h", ["Muñoz"]),
    persona("padre", "Tomás", "h"),
    persona("nieta", "Ramona", "m"),
    persona("nadie", SIN_NOMBRE),
  ],
  unions: [union("u1", ["abuelo"], ["padre"]), union("u2", ["padre", "nadie"], ["nieta"])],
  roots: {},
};
const g = construirGrafo(juguete);
const o = { linaje: libretaDe(g).linaje, pasos: pasosDesde(g, "nieta") };
const ids = (consulta: string) => buscar(g, consulta, o).map((r) => r.id);
const vias = (consulta: string) => buscar(g, consulta, o).map((r): [string, Resultado["via"]] => [r.id, r.via]);

assert.deepStrictEqual(
  vias("Ramón"),
  [
    ["nieta", "nombre"],
    ["abuelo", "nombre"],
    ["padre", "familia"],
  ],
  "«Ramón» empieza «Ramona» y el padre es hijo de él: primero quien se llama así, y dentro, quien está más cerca",
);
assert.deepStrictEqual(ids("ramon"), ["nieta", "abuelo", "padre"], "sin tildes se busca lo mismo");
assert.deepStrictEqual(ids("amon"), [], "y solo por el principio de la palabra: no se busca por el medio");
assert.deepStrictEqual(ids("muñoz"), ["nieta", "padre", "abuelo"], "el apellido deducido del árbol se busca como el escrito");
assert.deepStrictEqual(ids("ramon muñoz"), ["nieta", "abuelo"], "las dos palabras tienen que casar");
assert.deepStrictEqual(
  vias("tomas"),
  [
    ["padre", "nombre"],
    ["nieta", "familia"],
    ["nadie", "familia"],
    ["abuelo", "familia"],
  ],
  "quien se llama así va antes que su hija, su mujer y su padre, que son quienes lo nombran",
);
assert.deepStrictEqual(ids("hija de Tomás"), ["nieta"], "la relación se busca tal como se lee en la segunda línea");
assert.deepStrictEqual(ids(""), [], "sin consulta no hay resultados: el vacío es el índice, no la lista entera");

assert.deepStrictEqual(ids("Sin nombre"), [], "a quien no tiene nombre no se llega tecleando el que no tiene");
assert.deepStrictEqual(
  losSinNombre(g, o).map((r) => [r.id, r.via]),
  [["nadie", "sin nombre"]],
  "y por eso tiene su propia salida",
);
assert.ok(contextoEntero(g, "nadie") !== "", "a la que solo se la identifica por su gente");

assert.strictEqual(acortar(g, "Ramón Genoveva", o), "Ramón", "de la consulta que no encuentra nada, la palabra que sí");
assert.strictEqual(acortar(g, "Genoveva", o), null, "con una sola palabra no hay nada que quitar");

// Sobre los datos de verdad
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const real = construirGrafo(data);
const POV = "p25";
const suyo = { linaje: libretaDe(real).linaje, pasos: pasosDesde(real, POV) };

const pablos = buscar(real, "Pablo", suyo);
assert.strictEqual(pablos[0]!.id, POV, "el Centro es el más cercano a sí mismo y encabeza su propio nombre");
assert.strictEqual(pablos.filter((r) => r.via === "nombre").length, 14, "once Pablo y tres que lo llevan de segundo");
const cerca = pablos.filter((r) => r.via === "nombre").map((r) => suyo.pasos.get(r.id)!);
assert.deepStrictEqual(cerca, [...cerca].sort((a, b) => a - b), "ordenados por cercanía a ti, que es el único criterio que siempre existe");

// Los tres Pablo de 1989: el nombre y el año no los distinguen, y la lista no los pinta con
// nada más que su segunda línea. Si dos coincidieran, en la búsqueda serían el mismo.
const mismos = data.people.filter((p) => p.nombre === "Pablo" && p.birth?.startsWith("1989")).map((p) => p.id);
assert.strictEqual(mismos.length, 3);
assert.strictEqual(new Set(mismos.map((id) => contextoEntero(real, id))).size, 3, "a los tres Pablo (1989) los separa de quién son");

const sinNombre = losSinNombre(real, suyo);
assert.strictEqual(
  sinNombre.length,
  data.people.filter((p) => p.nombre === "Sin nombre").length,
  "su lista los recoge a todos: es la única forma de llegar a ellos",
);
assert.ok(
  sinNombre.every((r) => contextoEntero(real, r.id) !== ""),
  "y ninguna sale como un nombre suelto: todas tienen de quién ser",
);
assert.strictEqual(buscar(real, "Genoveva", suyo).length, 0, "nadie se llama así");

console.log(
  `busqueda.test.ts OK (${pablos.length} Pablo, ${buscar(real, "María", suyo).length} María, ${sinNombre.length} sin nombre)`,
);
