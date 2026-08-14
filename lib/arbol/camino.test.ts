// Test de lógica pura: `npx tsx lib/arbol/camino.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { caminoEntre, trazosDelCamino } from "./camino";
import { construirGrafo, pasosDesde } from "./grafo";
import { relacionesDesde } from "./parentesco";
import type { ArbolData, Persona, Union } from "./tree";

const persona = (id: string, nombre: string, sexo?: Persona["sexo"]): Persona => ({ id, nombre, apellidos: [], sexo, fuentes: [] });
const union = (id: string, partners: string[], children: string[], tipo: Union["tipo"] = "matrimonio"): Union => ({
  id,
  partners,
  children,
  tipo,
  fuentes: [],
});

// Tres generaciones por la línea de la madre, más un hermano y un novio: los cuatro
// eslabones en un solo árbol de juguete.
const juguete: ArbolData = {
  people: [
    persona("abuelo", "Tomás", "h"),
    persona("abuela", "Antonia", "m"),
    persona("madre", "Carmen", "m"),
    persona("padre", "Miguel", "h"),
    persona("yo", "Pablo", "h"),
    persona("hermana", "Lucía", "m"),
    persona("novia", "Rosa", "m"),
  ],
  unions: [
    union("u1", ["abuelo", "abuela"], ["madre"]),
    union("u2", ["padre", "madre"], ["yo", "hermana"]),
    union("u3", ["yo", "novia"], [], "pareja"),
  ],
  roots: {},
};
const g = construirGrafo(juguete);

const arriba = caminoEntre(g, "yo", "abuela");
assert.deepStrictEqual(
  arriba.eslabones.map((e) => [e.id, e.frase]),
  [
    ["yo", undefined],
    ["madre", "hijo de"],
    ["abuela", "hija de"],
  ],
  "cada eslabón dice qué es el anterior de él, y se declina por quien lo mira desde atrás",
);
assert.strictEqual(arriba.pasos, 2);
assert.strictEqual(arriba.porParte, "de madre", "el primer paso dice de qué lado de la familia va el camino");

assert.strictEqual(caminoEntre(g, "yo", "madre").porParte, undefined, "«tu madre por parte de madre» no dice nada");
assert.strictEqual(caminoEntre(g, "yo", "hermana").eslabones[1]?.frase, "hermano de");
assert.strictEqual(caminoEntre(g, "yo", "novia").eslabones[1]?.frase, "pareja de", "el noviazgo no se casa");
assert.strictEqual(caminoEntre(g, "yo", "padre").eslabones[1]?.frase, "hijo de");
assert.strictEqual(caminoEntre(g, "madre", "yo").eslabones[1]?.frase, "madre de", "bajando se declina al revés");
assert.strictEqual(caminoEntre(g, "hermana", "novia").pasos, 2, "por el hermano y su pareja");

// Qué del dibujo se queda delante: solo lo que une un eslabón con el siguiente
const trazos = (desde: string, hasta: string) => {
  const t = trazosDelCamino(caminoEntre(g, desde, hasta));
  return [[...t.bajadas], [...t.uniones].map(([u, quienes]) => [u, [...quienes]])];
};

assert.deepStrictEqual(
  trazos("yo", "abuela"),
  [
    [
      ["u2:yo", "entera"],
      ["u1:madre", "entera"],
    ],
    [
      ["u2", ["madre"]],
      ["u1", ["abuela"]],
    ],
  ],
  "subir toca la bajada del hijo y solo la mitad del trazo que va al progenitor, no la de su pareja",
);
assert.deepStrictEqual(
  trazos("yo", "hermana"),
  [
    [
      ["u2:yo", { desdeElHermano: "hermana" }],
      ["u2:hermana", { desdeElHermano: "yo" }],
    ],
    [],
  ],
  "entre hermanos el paso va por el canal y de uno a otro: ni el trazo de los padres ni el ramal que sale de él son camino",
);
assert.deepStrictEqual(trazos("yo", "novia"), [[], [["u3", ["yo", "novia"]]]], "la pareja es su trazo entero");
assert.deepStrictEqual(
  trazos("madre", "yo"),
  [[["u2:yo", "entera"]], [["u2", ["madre"]]]],
  "y bajando se toca la misma mitad",
);

const quieto = caminoEntre(g, "yo", "yo");
assert.deepStrictEqual([quieto.pasos, quieto.eslabones.length], [0, 1], "de uno a sí mismo, un solo eslabón y ningún paso");
assert.throws(() => caminoEntre(g, "yo", "fantasma"), /fantasma/, "una persona que no está falla a la cara");

// Sobre los datos de verdad: el camino y la distancia no pueden discrepar
const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const real = construirGrafo(data);
const POV = "p25";
const pasos = pasosDesde(real, POV);
const relaciones = relacionesDesde(real, POV);

let largo = 0;
for (const p of data.people) {
  const camino = caminoEntre(real, POV, p.id);
  assert.strictEqual(camino.pasos, pasos.get(p.id), `los pasos del camino hasta ${p.id} son los de la distancia`);
  assert.strictEqual(camino.pasos, relaciones.get(p.id)!.pasos, `y los que dice la ficha de ${p.id}`);
  assert.strictEqual(camino.eslabones[0]!.id, POV, "el camino arranca siempre en el punto de vista");
  assert.strictEqual(camino.eslabones.at(-1)!.id, p.id, "y muere en quien se buscaba");
  assert.ok(camino.eslabones.slice(1).every((e) => e.frase), "ningún eslabón se queda sin decir cómo se llega");
  largo = Math.max(largo, camino.pasos);
}

console.log(`camino.test.ts OK (${data.people.length} caminos desde ${POV}, el más largo de ${largo} pasos)`);
