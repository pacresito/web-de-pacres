// Test de lógica pura: `npx tsx lib/arbol/bloques.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ALTO_BLOQUE, calcularBloques } from "./bloques";
import { construirGrafo, pasosDesde } from "./grafo";
import { ANCHO_COLUMNA, calcularLayout } from "./layout";
import type { ArbolData, Persona, Union } from "./tree";

const persona = (id: string, sexo?: Persona["sexo"]): Persona => ({ id, nombre: id, apellidos: [], fuentes: [], sexo });
const union = (id: string, partners: string[], children: string[]): Union => ({
  id,
  partners,
  children,
  tipo: "matrimonio",
  fuentes: [],
});

// Dos hermanos (p3, p4) con sus padres; p5 entra casándose con p3 y p6 es hijo de los dos.
const juguete: ArbolData = {
  people: [persona("p1", "h"), persona("p2", "m"), persona("p3"), persona("p4"), persona("p5"), persona("p6")],
  unions: [union("u1", ["p1", "p2"], ["p3", "p4"]), union("u2", ["p3", "p5"], ["p6"])],
  roots: {},
};
const chico = calcularBloques(construirGrafo(juguete), { puntoDeVista: "p3", ocultarNoConectados: false });
const suyo = chico.bloques.find((b) => b.id === "u1")!;

assert.deepStrictEqual(suyo.hermanos, ["p3", "p4"], "los hijos de una unión son un bloque");
assert.deepStrictEqual(suyo.parejas, ["p5"], "y quien se casa con uno de ellos entra en el suyo");
assert.strictEqual(suyo.titulo, "de p1 y p2", "el bloque se nombra por sus dos progenitores");
assert.ok(suyo.esDelPuntoDeVista, "el bloque del punto de vista se señala");
assert.strictEqual(suyo.nivel, 0, "y ancla la columna 0");
assert.strictEqual(suyo.x, 0);
assert.strictEqual(chico.bloques.find((b) => b.id === "solo:p1")!.x, -ANCHO_COLUMNA, "los padres, a la izquierda");
assert.strictEqual(chico.bloques.find((b) => b.id === "u2")!.x, ANCHO_COLUMNA, "los hijos, a la derecha");
assert.ok(
  chico.bloques.every((b) => b.lineaDirecta),
  "en un árbol de una sola línea, todos los bloques son directos",
);

// La familia de verdad
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const { bloques, limites } = calcularBloques(g, { puntoDeVista: "p25", ocultarNoConectados: false });

const repartidos = bloques.flatMap((b) => [...b.hermanos, ...b.parejas]);
assert.strictEqual(repartidos.length, g.personaPorId.size, "no se pierde ni se duplica a nadie");
assert.strictEqual(new Set(repartidos).size, repartidos.length, "nadie está en dos bloques");
assert.ok(bloques.length < g.personaPorId.size / 3, `el reparto compacta de verdad, fueron ${bloques.length} bloques`);
assert.strictEqual(bloques.filter((b) => b.esDelPuntoDeVista).length, 1, "un solo bloque lleva el punto de vista");

// Nadie fuera de la columna de su generación, y nadie encima de otro dentro de ella.
const porColumna = new Map<number, number[]>();
for (const b of bloques) {
  assert.strictEqual(b.x, -b.nivel * ANCHO_COLUMNA || 0, `${b.id} con x fuera de su columna`);
  for (const p of [...b.hermanos, ...b.parejas]) {
    const esperado = g.generacion.get("p25")! - g.generacion.get(p)!;
    assert.strictEqual(b.nivel, esperado, `${p} está en un bloque de otra generación`);
  }
  porColumna.set(b.x, [...(porColumna.get(b.x) ?? []), b.y]);
}
for (const [x, ys] of porColumna) {
  ys.sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) {
    assert.ok(ys[i] - ys[i - 1] >= ALTO_BLOQUE, `dos bloques se solapan en la columna ${x}`);
  }
}

// Arriba lo tuyo: dentro de cada columna, ningún bloque queda por encima de otro que te
// quede más cerca. Y el tuyo abre la suya, que es la primera fila que se lee al alejarse.
{
  const pasos = pasosDesde(g, "p25");
  const cerca = (b: (typeof bloques)[number]) =>
    Math.min(...[...b.hermanos, ...b.parejas].map((p) => pasos.get(p) ?? Infinity));
  for (const [x, ys] of porColumna) {
    const columna = bloques.filter((b) => b.x === x).sort((a, b) => a.y - b.y);
    for (let i = 1; i < columna.length; i++) {
      assert.ok(cerca(columna[i - 1]) <= cerca(columna[i]), `en la columna ${x} lo lejano queda por encima de lo cercano`);
    }
    assert.strictEqual(columna.length, ys.length);
  }
  const tuyo = bloques.find((b) => b.esDelPuntoDeVista)!;
  assert.strictEqual(tuyo.y, Math.min(...bloques.filter((b) => b.x === tuyo.x).map((b) => b.y)), "el tuyo no abre tu columna");
}

// El mapa es mucho más corto que el árbol de personas desplegado del todo: no es un detalle
// de estilo, es la razón de existir de esta escala.
const alto = limites.maxY - limites.minY;
const desplegado = calcularLayout(g, {
  puntoDeVista: "p25",
  expandidas: new Set(g.unionPorId.keys()),
  parejas: new Set(),
  plegados: new Set(),
  ocultarNoConectados: false,
});
const altoPersonas = desplegado.limites.maxY - desplegado.limites.minY;
assert.ok(alto * 3 < altoPersonas, `el mapa mide ${alto.toFixed(0)} px y el árbol ${altoPersonas.toFixed(0)}`);

// Con el filtro de consanguinidad puesto sale menos gente, y ni un bloque vacío.
const filtrados = calcularBloques(g, { puntoDeVista: "p25", ocultarNoConectados: true });
assert.ok(filtrados.bloques.length <= bloques.length, "el filtro no puede añadir bloques");
assert.ok(
  filtrados.bloques.every((b) => b.hermanos.length + b.parejas.length > 0),
  "ningún bloque se queda vacío",
);

console.log(`bloques ok · ${bloques.length} bloques para ${g.personaPorId.size} personas · ${alto.toFixed(0)} px de alto`);
