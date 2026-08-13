// Test de lógica pura: `npx tsx lib/arbol/cinta.test.ts`. Fuera del build.
// No lee datos: la cinta solo sabe de una columna de bloques y de dónde mira la cámara.
import assert from "assert";
import { cintaDe } from "./cinta";
import { ANCHO_COLUMNA } from "./layout";

/** Tres bloques en la columna del punto de vista y dos en la de sus padres. */
const bloques = [
  { id: "a", nivel: 0, esDelPuntoDeVista: false },
  { id: "b", nivel: 0, esDelPuntoDeVista: true },
  { id: "c", nivel: 0, esDelPuntoDeVista: false },
  { id: "p1", nivel: 1, esDelPuntoDeVista: false },
  { id: "p2", nivel: 1, esDelPuntoDeVista: false },
];
const dibujados = [
  { bloque: "a", y: 0 },
  { bloque: "b", y: 500 },
  { bloque: "c", y: 1000 },
  { bloque: "p1", y: 0 },
  { bloque: "p2", y: 1000 },
];

// Mirando al medio de la columna propia, con un hueco que solo alcanza al bloque de en medio.
{
  assert.deepStrictEqual(cintaDe(bloques, dibujados, { x: 0, y: 500, alto: 400 }), [
    { id: "a", aqui: false, tuyo: false },
    { id: "b", aqui: true, tuyo: true },
    { id: "c", aqui: false, tuyo: false },
  ]);
}

// Un hueco que los abarca a los tres no saca cinta: no hay ningún punto donde estar.
{
  assert.deepStrictEqual(cintaDe(bloques, dibujados, { x: 0, y: 500, alto: 4000 }), []);
}

// Arrastrar a otra columna cambia la cinta entera: la generación que se mira es la que se
// mide, y en ella no hay ningún bloque tuyo.
{
  assert.deepStrictEqual(cintaDe(bloques, dibujados, { x: -ANCHO_COLUMNA, y: 0, alto: 400 }), [
    { id: "p1", aqui: true, tuyo: false },
    { id: "p2", aqui: false, tuyo: false },
  ]);
  // Y a media columna se sigue midiendo la más cercana, no dos a medias.
  assert.deepStrictEqual(
    cintaDe(bloques, dibujados, { x: -ANCHO_COLUMNA * 0.6, y: 0, alto: 400 }).map((s) => s.id),
    ["p1", "p2"],
  );
}

// El orden es el del lienzo, no el del reparto: en la escala de personas el layout coloca a
// cada familia donde le toca por su ascendencia, y la cinta tiene que seguirle.
{
  const alReves = [
    { bloque: "c", y: 0 },
    { bloque: "b", y: 500 },
    { bloque: "a", y: 1000 },
  ];
  assert.deepStrictEqual(
    cintaDe(bloques, alReves, { x: 0, y: 0, alto: 400 }).map((s) => [s.id, s.aqui]),
    [
      ["c", true],
      ["b", false],
      ["a", false],
    ],
  );
}

// El bloque que no se dibuja no tiene segmento: la cinta mide lo que hay en el lienzo, no
// lo que habría desplegándolo todo.
{
  const soloDos = dibujados.filter((d) => d.bloque !== "b");
  assert.deepStrictEqual(
    cintaDe(bloques, soloDos, { x: 0, y: 0, alto: 400 }).map((s) => [s.id, s.aqui]),
    [
      ["a", true],
      ["c", false],
    ],
  );
}

// Y con menos de dos no hay en qué punto estar: ni una columna de un bloque ni una vacía.
{
  assert.deepStrictEqual(
    cintaDe([{ id: "solo", nivel: 0, esDelPuntoDeVista: true }], [{ bloque: "solo", y: 0 }], { x: 0, y: 0, alto: 400 }),
    [],
  );
  assert.deepStrictEqual(cintaDe(bloques, dibujados, { x: -ANCHO_COLUMNA * 5, y: 0, alto: 400 }), []);
}

console.log("cinta: ok");
