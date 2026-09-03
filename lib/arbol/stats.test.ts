// Test de lógica pura: `npx tsx lib/arbol/stats.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { calcularStats } from "./stats";
import { ENLACES } from "./enlaces";
import { construirGrafo, visibles } from "./grafo";
import { RAMAS } from "./ramas";
import type { ArbolData } from "./tree";

const HOY = "2026-09-03";
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const c = calcularStats(g, HOY);

// Lo que se cuenta es el árbol entero, no una vista suya
assert.strictEqual(c.personas, data.people.length, "las personas son todas las del dato");
assert.strictEqual(c.generaciones.reduce((n, x) => n + x.cuantos, 0), c.personas, "todos caen en alguna generación");
assert.deepStrictEqual(c.generaciones.map((x) => x.numero), [1, 2, 3, 4, 5, 6], "numeradas desde la más antigua, sin huecos");
assert.ok(c.generaciones[0].cuantos < c.generaciones[2].cuantos, "el árbol se ensancha hacia abajo");

// Un centro por enlace, y lo que promete es lo que el lienzo pinta
assert.strictEqual(c.centros.length, ENLACES.length, "una fila por enlace repartido");
for (const centro of c.centros) {
  const { nombre, nace } = ENLACES.find((e) => e.alias === centro.alias)!;
  // Nombre, apellido y año: en una tabla no hay árbol del que subir el apellido.
  assert.ok(centro.quien.startsWith(nombre), `${centro.alias}: ${centro.quien}`);
  assert.ok(nace === "" || centro.quien.endsWith(`(${nace})`), `${centro.alias} sale sin su año: ${centro.quien}`);
  assert.strictEqual(centro.alcanzables, visibles(g, centro.id).size, `${centro.alias}: los alcanzables son los suyos`);
  assert.ok(centro.desplegados > 0 && centro.desplegados <= centro.alcanzables, `${centro.alias}: se despliega parte de lo suyo`);
}

// Una rama por rama, y el reparto suma más que el árbol porque hay quien está en dos
assert.deepStrictEqual(c.ramas.map((r) => r.nombre), RAMAS.map((r) => r.nombre), "el orden es el de la familia");
const repartidos = c.ramas.reduce((n, r) => n + r.gente, 0);
assert.ok(repartidos - (c.personas - c.sinRama) >= c.enVarias, "cada uno de los de varias ramas suma al menos una vez de más");
assert.ok(c.enVarias > 0 && c.enVarias < c.personas, "descender de dos antepasados le pasa a algunos, no a todos");
assert.ok(c.ramas.reduce((n, r) => n + r.compartidos, 0) >= c.enVarias, "y a cada rama le consta el suyo");
for (const r of c.ramas) assert.ok(r.huecos <= r.gente, `${r.nombre}: no puede faltarle algo a más gente de la que tiene`);

// Lo que falta es un subconjunto del árbol, y lo de cada rama no lo contradice
assert.ok(c.falta.conAlgo < c.personas, "no le falta algo a todo el mundo");
assert.ok(c.falta.sinNombre <= c.falta.conAlgo, "quien no tiene nombre tiene algo que preguntar");
assert.ok(c.falta.sinNingunaFecha <= c.falta.conAlgo, "y quien no trae ninguna fecha, también");

// Las listas de repetidos vienen ordenadas y sin cola de unos
for (const lista of [c.nombres, c.apellidos]) {
  assert.ok(lista.length > 0, "alguna hay");
  for (let i = 1; i < lista.length; i++) {
    assert.ok(lista[i - 1].cuantos >= lista[i].cuantos, `${lista[i].texto} se cuela por delante`);
  }
  assert.ok(lista[lista.length - 1].cuantos > 1, "una lista de «más repetidos» no acaba en los que salen una vez");
}

// Los extremos: uno por récord, ninguno vacío y ninguno repetido
assert.strictEqual(c.extremos.length, 7, "los siete récords tienen a alguien que los tenga");
for (const e of c.extremos) {
  assert.ok(e.que !== "" && e.quien !== "", `el extremo «${e.que}» no dice nada`);
  assert.ok(!/undefined|NaN/.test(e.quien), `el extremo «${e.que}» sale a medio escribir: ${e.quien}`);
}
assert.strictEqual(new Set(c.extremos.map((e) => e.que)).size, c.extremos.length, "cada récord se cuenta una vez");
// El único que tienen varios a la vez dice cuáles, y son tantos como promete el rótulo.
const cumples = c.extremos.find((e) => e.que.includes("cumpleaños"))!;
assert.ok(cumples.detalle, "el día con más cumpleaños dice de quiénes son");
assert.strictEqual(`${cumples.detalle!.length} personas`, cumples.quien.split(": ")[1], "y son los que cuenta");
// Con apellido y año: en «Los extremos» no hay columna que diga de qué familia se habla.
for (const quien of cumples.detalle!) assert.match(quien, /^\S.* \S+ \(\d{4}\)$/, `«${quien}» sale sin apellido o sin año`);
assert.ok(c.vivos > 0 && c.vivos < c.personas, "ni todos ni ninguno");

console.log(
  `stats.test.ts OK (${c.personas} personas, ${c.uniones} uniones, ${c.centros.length} centros, ${c.ramas.length} ramas)`,
);
