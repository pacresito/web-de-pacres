// Test de lógica pura: `npx tsx lib/arbol/trazos.test.ts`. Fuera del build.
// No lee datos: la geometría de un trazo no depende de quién sea la familia.
import assert from "assert";
import { ALTO_NODO, RADIO_SALTO, type Vinculo } from "./layout";
import { bajada, entreBordes, ESCOTE, hastaElAncla, horizontal, PICO, tramosDePareja } from "./trazos";

const union = (extra: Partial<Vinculo> = {}): Vinculo => ({
  unionId: "u1",
  tipo: "matrimonio",
  roto: false,
  directo: false,
  x: 0,
  y: 100,
  salida: 0,
  canal: 60,
  saltos: [],
  hijos: [],
  colapsable: false,
  ...extra,
});

const hijo = (extra: Partial<Vinculo["hijos"][number]> = {}) => ({
  x: 300,
  y: 100,
  ancho: 200,
  saltos: [],
  recto: true,
  ...extra,
});

// El tramo horizontal

assert.strictEqual(horizontal(50, 10, []), "H 50", "sin nada que cruzar es una recta");
assert.strictEqual(
  horizontal(50, 10, [30]),
  `H ${30 - RADIO_SALTO} A ${RADIO_SALTO} ${RADIO_SALTO} 0 0 1 ${30 + RADIO_SALTO} 10 H 50`,
  "el saltito rodea la vertical que cruza y vuelve a su altura",
);

// La bajada de una unión a un hijo

assert.strictEqual(bajada(union(), hijo()), "M 0 100 H 200", "el hijo recto va del ancla a su borde de un tirón");
assert.strictEqual(
  bajada(union(), hijo({ y: 400, recto: false })),
  "M 0 100 H 60 V 400 H 200",
  "y el que no, por el canal: ancla, canal, altura del hijo y borde",
);

// Quien tuvo hijos sin pareja ancla dentro de su propio recuadro, así que el reparto sale
// por el borde: el nodo es traslúcido y el tramo se leía cruzándole la caja de lado a lado.
assert.strictEqual(
  bajada(union({ salida: 114, canal: 144 }), hijo({ y: 400, recto: false })),
  "M 114 100 H 144 V 400 H 200",
  "sin hueco entre dos donde arrancar, se arranca en el borde de quien ancla",
);

/**
 * **El caso que se escapó dos veces.** De hermano a hermano se pasa por el canal, no por los
 * padres, así que el trazo arranca a la altura del otro hermano: ni sale del ancla ni pasa de
 * largo por el canal hasta ella. En el hijo recto el tramo del ancla no va aparte —lo lleva
 * dentro de su horizontal—, y no cortarlo pintaba el camino saliendo de unos padres por los
 * que no pasa; y arrancarlo en el ancla en vez de en el hermano dejaba la raya asomando por
 * encima de los dos cuando los dos caían del mismo lado de sus padres.
 */
assert.strictEqual(bajada(union(), hijo(), 100), "M 60 100 H 200", "dos hermanos rectos comparten altura y no hay canal que subir");
assert.strictEqual(
  bajada(union(), hijo({ y: 400, recto: false }), 250),
  "M 60 250 V 400 H 200",
  "el canal va del hermano a él, y no del ancla",
);
assert.strictEqual(
  bajada(union(), hijo(), 250),
  "M 60 250 V 100 H 200",
  "también al recto, que sin esto arrancaba en el ancla y se comía el trozo de canal de en medio",
);
assert.strictEqual(
  bajada(union(), hijo({ saltos: [30, 120] }), 100),
  `M 60 100 ${horizontal(200, 100, [120])}`,
  "los saltos de antes del canal se van con el tramo que los traía —el trazo retrocedería a buscarlos— y los de después se quedan",
);

// El trazo de la pareja

assert.deepStrictEqual(entreBordes([0, 300]), [ALTO_NODO / 2, 300 - ALTO_NODO / 2], "el trazo muere en los bordes, no en los centros");
assert.deepStrictEqual(entreBordes([300, 0]), [300 - ALTO_NODO / 2, ALTO_NODO / 2], "y da igual quién de los dos vaya arriba");

assert.deepStrictEqual(tramosDePareja([0, 100], false), { tramos: [[0, 100]], centro: 50 }, "el matrimonio va de una pieza");
assert.deepStrictEqual(
  tramosDePareja([100, 0], true),
  { tramos: [[0, 50 - ESCOTE], [50 + PICO, 100]], centro: 50 },
  "los novios le dejan su hueco al corazón, y el orden de los extremos no manda",
);

assert.strictEqual(hastaElAncla(0, 100, false), 100, "sin corazón, la mitad del trazo muere en el ancla");
assert.strictEqual(hastaElAncla(0, 100, true), 100 - ESCOTE, "el que baja muere en el escote");
assert.strictEqual(hastaElAncla(200, 100, true), 100 + PICO, "y el que sube, en el pico");

console.log("trazos.test.ts OK");
