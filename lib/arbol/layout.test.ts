// Test de lógica pura: `npx tsx lib/arbol/layout.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo, parejaDirecta, visibles } from "./grafo";
import { ALTO_CONTADOR, ALTO_NODO, ANCHO_COLUMNA, calcularLayout, type Layout } from "./layout";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const TODAS = new Set(g.unionPorId.keys());
const layout = (pov: string, expandidas = new Set<string>(), ocultar = false) =>
  calcularLayout(g, { puntoDeVista: pov, expandidas, ocultarNoConectados: ocultar });

/** Nadie repetido, nadie fuera de la columna de su generación, nadie encima de otro. */
function revisar(l: Layout, pov: string, etiqueta: string): void {
  const vistos = new Set<string>();
  for (const n of l.nodos) {
    assert.ok(!vistos.has(n.id), `${etiqueta}: ${n.id} aparece dos veces`);
    vistos.add(n.id);
    const esperado = g.generacion.get(pov)! - g.generacion.get(n.id)!;
    assert.strictEqual(n.nivel, esperado, `${etiqueta}: ${n.id} en la columna equivocada`);
    assert.strictEqual(n.x, -n.nivel * ANCHO_COLUMNA || 0, `${etiqueta}: ${n.id} con x fuera de su columna`);
  }

  const porColumna = new Map<number, { y: number; alto: number; id: string }[]>();
  for (const n of l.nodos) porColumna.set(n.x, [...(porColumna.get(n.x) ?? []), { y: n.y, alto: ALTO_NODO, id: n.id }]);
  for (const c of l.contadores) {
    porColumna.set(c.x, [...(porColumna.get(c.x) ?? []), { y: c.y, alto: ALTO_CONTADOR, id: `${c.sentido}:${c.unionId}` }]);
  }
  for (const columna of porColumna.values()) {
    columna.sort((a, b) => a.y - b.y);
    for (let i = 1; i < columna.length; i++) {
      const hueco = columna[i].y - columna[i - 1].y - (columna[i].alto + columna[i - 1].alto) / 2;
      assert.ok(hueco >= -0.01, `${etiqueta}: ${columna[i - 1].id} y ${columna[i].id} se solapan (${hueco.toFixed(1)}px)`);
    }
  }
}

// --- Entrada por defecto: la línea directa desplegada y lo demás en contadores ---
const inicial = layout("p25");
revisar(inicial, "p25", "p25 sin expandir");
assert.ok(inicial.nodos.some((n) => n.esPuntoDeVista && n.id === "p25"), "el punto de vista está en el lienzo");
assert.ok(inicial.nodos.length < 60, `sin expandir caben pocos nodos, fueron ${inicial.nodos.length}`);
assert.ok(inicial.contadores.length > 0, "hay ramas colapsadas");
assert.ok(inicial.nodos.every((n) => Math.abs(n.nivel) <= 4), "nueve columnas como mucho (−4..+4)");

// Los padres a la izquierda y los hijos a la derecha: el tiempo avanza al leer.
const pov = inicial.nodos.find((n) => n.id === "p25")!;
assert.strictEqual(pov.nivel, 0, "el punto de vista ancla la columna 0");
assert.strictEqual(pov.x, 0, "…y va en x = 0");
for (const padre of ["p124", "p125"]) {
  assert.ok(inicial.nodos.find((n) => n.id === padre)!.x < 0, "los padres, a la izquierda");
}
assert.ok(inicial.nodos.find((n) => n.id === "p26")!.x > 0, "los hijos, a la derecha");
// Y la pareja comparte columna, uno encima del otro.
const pareja = inicial.nodos.filter((n) => n.nivel === 0 && [...g.unionesDePartner.get("p25")!].length > 0 && n.x === 0);
assert.strictEqual(pareja.length, 2, "el punto de vista y su pareja, en la misma columna");
assert.notStrictEqual(pareja[0].y, pareja[1].y, "…a distinta altura");

// --- Determinista: mismo estado, mismo dibujo ---
assert.deepStrictEqual(layout("p25"), inicial, "dos cálculos idénticos dan el mismo layout");

// --- Los hermanos llegan colapsados y el contador los trae ---
const unionPadres = g.unionDeHijo.get("p25")!;
const contadorHermanos = inicial.contadores.find((c) => c.unionId === unionPadres && c.sentido === "hijos");
assert.ok(contadorHermanos, "los hermanos del punto de vista están tras un contador");
assert.strictEqual(contadorHermanos!.cantidad, 2, "son dos hermanos");
const conHermanos = layout("p25", new Set([unionPadres]));
revisar(conHermanos, "p25", "p25 con hermanos");
for (const hermano of ["p126", "p131"]) {
  assert.ok(conHermanos.nodos.some((n) => n.id === hermano), `${hermano} aparece al abrir`);
}
assert.ok(
  !conHermanos.contadores.some((c) => c.unionId === unionPadres && c.sentido === "hijos"),
  "el contador desaparece al abrirlo",
);
// Pero solo a los hijos: la pareja de cada uno llega al abrir la unión de ese hijo.
const cunada = [...parejaDirecta(g, "p131")];
assert.ok(cunada.length === 1, "el hermano tiene pareja documentada");
assert.ok(!conHermanos.nodos.some((n) => cunada.includes(n.id)), "…que no entra con él");
const suUnion = g.unionesDePartner.get("p131")![0];
assert.ok(
  layout("p25", new Set([unionPadres, suUnion])).nodos.some((n) => cunada.includes(n.id)),
  "y aparece al abrir la unión del hermano",
);

// Y cerrar deshace exactamente lo que abrió.
assert.deepStrictEqual(layout("p25", new Set()), inicial, "quitar la unión de las expandidas vuelve al inicio");

// El botón de plegar sale solo donde plegar se lleva a alguien: la unión que se abrió,
// no las de la línea directa, que están puestas se pidan o no.
assert.ok(!inicial.vinculos.some((v) => v.colapsable), "sin abrir nada no hay nada que plegar");
assert.deepStrictEqual(
  conHermanos.vinculos.filter((v) => v.colapsable).map((v) => v.unionId),
  [unionPadres],
  "solo la unión abierta a mano",
);
const unionPropia = g.unionesDePartner.get("p25")![0];
assert.ok(
  !layout("p25", new Set([unionPropia])).vinculos.find((v) => v.unionId === unionPropia)!.colapsable,
  "abrir una unión que ya salía sola no ofrece plegarla",
);

// --- Abrirlo todo alcanza el árbol entero desde cualquier punto de vista ---
for (const pid of ["p25", "p26", "p126", "p1"]) {
  const todo = layout(pid, TODAS);
  assert.strictEqual(todo.nodos.length, 416, `${pid} alcanza las 416 personas abriéndolo todo`);
  assert.strictEqual(todo.contadores.length, 0, `${pid} no deja contadores pendientes`);
  revisar(todo, pid, `${pid} todo abierto`);
}

// --- Con el interruptor de ocultar, el alcance es justo la fórmula de "conectado" ---
for (const pid of ["p25", "p26", "p126", "p131", "p124"]) {
  const acotado = layout(pid, TODAS, true);
  assert.strictEqual(acotado.nodos.length, visibles(g, pid).size, `${pid} acotado a sus conectados`);
  revisar(acotado, pid, `${pid} acotado`);
}
assert.strictEqual(layout("p126", TODAS, true).nodos.length, 342, "desde un hermano se ven 342");
assert.strictEqual(layout("p26", TODAS, true).nodos.length, 416, "solo desde el hijo se llega a todas");

// Y sin abrir nada, ocultar no deja ni un contador hacia una rama no conectada.
const conectados = visibles(g, "p126");
for (const c of layout("p126", new Set(), true).contadores) {
  const union = g.unionPorId.get(c.unionId)!;
  const gente = c.sentido === "padres" ? union.partners : union.children;
  assert.ok(gente.some((p) => conectados.has(p)), `el contador de ${c.unionId} lleva a gente no conectada`);
}

// --- El contador de padres es lo que permite salir de la propia sangre ---
assert.ok(
  layout("p126", TODAS).nodos.length > visibles(g, "p126").size,
  "sin el interruptor se llega más allá de los conectados",
);

// --- Quien se casó dos veces sale una vez, entre sus dos parejas ---
const todoAbierto = layout("p25", TODAS);
const pepeYSusMujeres = ["p441", "p16", "p17"].map((id) => todoAbierto.nodos.find((n) => n.id === id)!);
assert.ok(pepeYSusMujeres.every((n) => n?.x === pepeYSusMujeres[1].x), "los tres comparten columna");
assert.deepStrictEqual(
  [...pepeYSusMujeres].sort((a, b) => a.y - b.y).map((n) => n.id),
  ["p441", "p16", "p17"],
  "y él queda en medio, para que cada trazo una a dos vecinos",
);

// --- La sangre llega más lejos que la línea directa: los tíos sí, sus parejas no ---
const desdeElHijo = layout("p26", TODAS);
const nodo = (id: string) => desdeElHijo.nodos.find((n) => n.id === id)!;
assert.ok(nodo("p126").consanguineo && !nodo("p126").lineaDirecta, "un tío comparte sangre y no está en la línea directa");
for (const suya of parejaDirecta(g, "p126")) assert.ok(!nodo(suya).consanguineo, "…y su pareja no la comparte");
assert.ok(desdeElHijo.nodos.every((n) => !n.lineaDirecta || n.consanguineo), "la línea directa siempre es sangre");

// --- Vínculos: cada uno cuelga de algo pintado, y reparte hacia la derecha ---
for (const l of [inicial, conHermanos, layout("p126", TODAS)]) {
  for (const v of l.vinculos) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `vínculo ${v.unionId} sin ancla`);
    for (const h of v.hijos) assert.ok(h.x > v.x, `vínculo ${v.unionId}: los hijos van a la derecha`);
  }
}

console.log("layout.test.ts OK");
