// Test de lógica pura: `npx tsx lib/arbol/layout.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo, descendientes, parejaDirecta, visibles } from "./grafo";
import { ordenarPareja } from "./personas";
import { ALTO_CONTADOR, ALTO_NODO, ANCHO_COLUMNA, ANCHO_NODO, calcularLayout, type Layout } from "./layout";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);
const TODAS = new Set(g.unionPorId.keys());
const VACIO = new Set<string>();
const layout = (pov: string, expandidas = VACIO, ocultar = false, parejas = VACIO, plegados = VACIO) =>
  calcularLayout(g, { puntoDeVista: pov, expandidas, parejas, plegados, ocultarNoConectados: ocultar });

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

  // El reparto arranca fuera de todo recuadro. El de una pareja sale del hueco entre los
  // dos, pero el de quien tuvo hijos sin ella ancla en su propio centro, y como el nodo es
  // traslúcido el tramo se leía cruzándole la caja de lado a lado en vez de quedar tapado.
  for (const v of l.vinculos) {
    for (const n of l.nodos) {
      const dentro = Math.abs(v.y - n.y) < ALTO_NODO / 2 && Math.abs(v.salida - n.x) < ANCHO_NODO / 2;
      assert.ok(!dentro, `${etiqueta}: el reparto de ${v.unionId} arranca dentro de ${n.id}`);
    }
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

// Entrada por defecto: la línea directa desplegada y lo demás en contadores
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

// Los hermanos salen en el orden en que vinieron, mire quien mire
// Quien mira es uno de ellos y no por eso se pone el primero de la fila. Y el que sube con
// pareja se va al extremo del lado que ocupa en ella, para que la familia de ella quepa
// debajo sin cruzar a sus hermanos. Vale para toda la línea de subida, que es por la que
// se ordena el árbol.
for (const pid of ["p25", "p26", "p126"]) {
  const l = layout(pid, TODAS);
  const donde = new Map(l.nodos.map((n) => [n.id, n.y]));
  let quien: string | undefined = pid;
  for (let union = g.unionDeHijo.get(quien); union; union = g.unionDeHijo.get(quien!)) {
    const u = g.unionPorId.get(union)!;
    const suya = donde.get(quien!)!;
    const hermanos = u.children.filter((c) => c !== quien).map((c) => donde.get(c)!).filter((y) => y !== undefined);
    assert.deepStrictEqual(hermanos, [...hermanos].sort((a, b) => a - b), `${pid}: los hermanos de ${quien} desordenados`);
    if (l.nodos.find((n) => n.id === quien)!.esPareja && hermanos.length > 0) {
      const fuera = suya < Math.min(...hermanos) || suya > Math.max(...hermanos);
      assert.ok(fuera, `${pid}: ${quien} sube con pareja y se queda en medio de sus hermanos`);
    }
    [quien] = ordenarPareja(u.partners, (p) => g.personaPorId.get(p));
  }
}

// Cada rama se acomoda junto a la suya
// Un reparto que cruza media pantalla delata una rama entera desterrada al fondo de otra:
// es lo que pasaba cuando los abuelos paternos y los maternos acababan en el mismo sitio.
const reparto = (l: Layout) => Math.max(...l.vinculos.flatMap((v) => v.hijos.map((h) => Math.abs(h.y - v.y))));
/** De dónde a dónde llega el trazo vertical de una unión. */
const tramo = (v: Layout["vinculos"][number]): [number, number] => [
  Math.min(v.y, ...v.hijos.map((h) => h.y)),
  Math.max(v.y, ...v.hijos.map((h) => h.y)),
];
for (const pid of ["p25", "p26", "p126", "p131"]) {
  const salto = reparto(layout(pid));
  // El tope sube con la familia: el reparto más largo del arranque es el que va de Carmen a
  // sus padres, y se estira cada vez que engorda la columna en la que se empaqueta su bloque.
  assert.ok(salto < 900, `${pid}: el reparto más largo del arranque mide ${salto.toFixed(0)}px`);
}

// Lo plegado se queda fuera con su descendencia, y su contador lo devuelve
// Es la única excepción a que centrar en alguien enseñe a todos los suyos, y la deshace un clic.
{
  const entero = layout("p271", VACIO, true);
  const maestre = new Set([...descendientes(g, "p289")]);
  const podado = layout("p271", VACIO, true, VACIO, new Set(["p289"]));
  const fuera = podado.nodos.filter((n) => maestre.has(n.id));
  assert.deepStrictEqual(fuera, [], "la descendencia de un plegado no se pinta");
  assert.ok(entero.nodos.length - podado.nodos.length > 50, "y era la mitad del árbol de José Velasco");
  assert.ok(
    podado.nodos.some((n) => n.id === "p289"),
    "el plegado sí sale: lo que se pliega es lo suyo, no él",
  );
  const suya = [...g.unionPorId.values()].find((u) => u.partners.includes("p289"))!;
  assert.ok(
    podado.contadores.some((c) => c.unionId === suya.id && c.sentido === "hijos"),
    "y sus hijos quedan tras el contador de su unión",
  );
  // Abrir ese contador es lo que lo deshace: `expandidas` se aplica después del pliegue.
  const abierto = layout("p271", new Set([suya.id]), true, VACIO, new Set(["p289"]));
  assert.ok(abierto.nodos.length > podado.nodos.length, "pulsar el contador trae a los suyos");
}

// Un desnivel de tres píxeles no es un quiebro, es un defecto
// Nadie cae exactamente enfrente de sus padres, porque lo que se centra ante ellos es el
// paquete entero de hermanos: ese resto se dibujaba como dos esquinas seguidas.
const desdeLosPadres = inicial.vinculos.find((v) => v.unionId === g.unionDeHijo.get("p25"))!;
const haciaElPov = desdeLosPadres.hijos.find((h) => h.y === pov.y)!;
assert.ok(haciaElPov, "el reparto de los padres alcanza al punto de vista");
assert.ok(haciaElPov.recto, "…y le llega de un tirón, sin codo");
for (const v of inicial.vinculos) {
  for (const h of v.hijos) {
    assert.ok(h.recto || Math.abs(h.y - v.y) >= 10, `${v.unionId}: codo de ${Math.abs(h.y - v.y).toFixed(1)}px`);
  }
}

// Y el dibujo de arranque no lleva ninguno: ahí no se cruza nada.
assert.strictEqual(
  inicial.vinculos.reduce((n, v) => n + v.saltos.length + v.hijos.reduce((m, h) => m + h.saltos.length, 0), 0),
  0,
  "el arranque se dibuja sin saltos",
);

// Determinista: mismo estado, mismo dibujo
assert.deepStrictEqual(layout("p25"), inicial, "dos cálculos idénticos dan el mismo layout");

// Los hermanos llegan colapsados y el contador los trae
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

// La pareja que falta se anuncia en el nodo del que sí está, y no ocupa sitio
const hermano = conHermanos.nodos.find((n) => n.id === "p131")!;
assert.deepStrictEqual(
  hermano.pendientes.map((p) => p.unionId),
  [suUnion],
  "el hermano lleva la marca de la pareja que no entró",
);

// Y el «+» trae a la pareja y solo a ella: los hijos siguen tras su contador.
const sobrinos = g.unionPorId.get(suUnion)!.children;
assert.ok(sobrinos.length > 0, "la unión del hermano tiene hijos que dejar fuera");
const conCunada = layout("p25", new Set([unionPadres]), false, new Set([suUnion]));
assert.ok(conCunada.nodos.some((n) => cunada.includes(n.id)), "el + trae a la pareja");
assert.ok(!conCunada.nodos.some((n) => sobrinos.includes(n.id)), "…y no a sus hijos");
assert.ok(
  conCunada.contadores.some((c) => c.unionId === suUnion && c.sentido === "hijos" && c.cantidad === sobrinos.length),
  "…que se quedan enteros tras su contador",
);
// Y se puede deshacer: la manija sale sobre la unión que trajo a la pareja.
assert.ok(
  conCunada.vinculos.find((v) => v.unionId === suUnion)!.colapsable,
  "la unión de la que se pidió la pareja ofrece plegarse",
);

// Y no se queda ninguna sin anunciar: si alguien está en el lienzo y la suya no, su nodo
// la marca. Es lo que hace alcanzable a quien no tuvo hijos, que hasta entonces no tenía
// contador ninguno del que colgar.
for (const pov of ["p25", "p26"]) {
  for (const abierta of g.unionPorId.keys()) {
    const l = layout(pov, new Set([abierta]));
    revisar(l, pov, `${pov} con ${abierta} abierta`);
    const dentro = new Set(l.nodos.map((n) => n.id));
    for (const n of l.nodos) {
      for (const uid of g.unionesDePartner.get(n.id) ?? []) {
        if (g.unionPorId.get(uid)!.partners.every((p) => dentro.has(p))) continue;
        assert.ok(
          n.pendientes.some((p) => p.unionId === uid),
          `${pov} con ${abierta} abierta: la pareja de ${n.id} en ${uid} no se anuncia`,
        );
      }
      // Dos marcas nunca comparten borde: se taparían la una a la otra.
      assert.strictEqual(new Set(n.pendientes.map((p) => p.arriba)).size, n.pendientes.length, `${n.id}: dos + en el mismo borde`);
    }
    // Cada salto cae sobre la vertical de otro reparto y dentro del tramo que lo lleva:
    // un arco donde no se cruza nada se leería como un cruce que no existe.
    const canales = new Set(l.vinculos.filter((v) => v.hijos.length > 0).map((v) => v.canal));
    for (const v of l.vinculos) {
      const dentro = (x: number, a: number, b: number) => x > Math.min(a, b) && x < Math.max(a, b);
      for (const x of v.saltos) {
        assert.ok(canales.has(x) && dentro(x, v.salida, v.canal), `${pov} con ${abierta}: salto suelto en ${v.unionId}`);
      }
      for (const h of v.hijos) {
        for (const x of h.saltos) {
          const arranca = h.recto ? v.salida : v.canal;
          assert.ok(canales.has(x) && dentro(x, arranca, h.x), `${pov} con ${abierta}: salto suelto en ${v.unionId}`);
        }
      }
    }
    // Y dos repartos que bajan por el mismo hueco y se pisan de altura no comparten trazo:
    // sobre la misma vertical se leen como una sola línea, y una rama parece colgar de otra.
    const bajan = l.vinculos.filter((v) => v.hijos.length > 0);
    for (const a of bajan) {
      for (const b of bajan) {
        if (a === b || a.canal !== b.canal) continue;
        const [desdeA, hastaA] = tramo(a);
        const [desdeB, hastaB] = tramo(b);
        assert.ok(hastaA <= desdeB || hastaB <= desdeA, `${pov} con ${abierta} abierta: ${a.unionId} y ${b.unionId} se dibujan encima`);
      }
    }
  }
}

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

// Abrirlo todo alcanza el árbol entero desde cualquier punto de vista
for (const pid of ["p25", "p26", "p126", "p1"]) {
  const todo = layout(pid, TODAS);
  assert.strictEqual(todo.nodos.length, data.people.length, `${pid} no alcanza el árbol entero abriéndolo todo`);
  assert.strictEqual(todo.contadores.length, 0, `${pid} no deja contadores pendientes`);
  revisar(todo, pid, `${pid} todo abierto`);
}

// Con el interruptor de ocultar, el alcance es justo la fórmula de "conectado"
for (const pid of ["p25", "p26", "p126", "p131", "p124"]) {
  const acotado = layout(pid, TODAS, true);
  assert.strictEqual(acotado.nodos.length, visibles(g, pid).size, `${pid} acotado a sus conectados`);
  revisar(acotado, pid, `${pid} acotado`);
}
assert.strictEqual(layout("p126", TODAS, true).nodos.length, 373, "desde un hermano se ven 373");
// Ni siquiera el hijo llega a todas: las familias dadas de alta que solo atan por un
// matrimonio lateral no comparten ancestro con nadie, y el interruptor las esconde.
assert.ok(layout("p26", TODAS, true).nodos.length < data.people.length, "ocultar siempre esconde algo");

// Y sin abrir nada, ocultar no deja ni un contador hacia una rama no conectada.
const conectados = visibles(g, "p126");
for (const c of layout("p126", new Set(), true).contadores) {
  const union = g.unionPorId.get(c.unionId)!;
  const gente = c.sentido === "padres" ? union.partners : union.children;
  assert.ok(gente.some((p) => conectados.has(p)), `el contador de ${c.unionId} lleva a gente no conectada`);
}

// El contador de padres es lo que permite salir de la propia sangre
assert.ok(
  layout("p126", TODAS).nodos.length > visibles(g, "p126").size,
  "sin el interruptor se llega más allá de los conectados",
);

// El «+» saca a la pareja por el borde en el que está puesto. Con la regla del sexo, pulsar
// el de arriba sacaba a la mujer por abajo, y un mando que contesta por el lado contrario al
// que se pulsa no se aprende: se sufre.
let pulsadas = 0;
for (const pov of g.personaPorId.keys()) {
  const antes = layout(pov);
  for (const n of antes.nodos) {
    for (const marca of n.pendientes) {
      const otro = g.unionPorId.get(marca.unionId)!.partners.find((p) => p !== n.id)!;
      const despues = layout(pov, new Set(), false, new Set([marca.unionId]));
      const ella = despues.nodos.find((x) => x.id === otro);
      if (!ella) continue;
      pulsadas++;
      const yo = despues.nodos.find((x) => x.id === n.id)!;
      assert.strictEqual(ella.y < yo.y, marca.arriba, `desde ${pov}: el + de ${n.id} saca a ${otro} por el otro borde`);
    }
  }
}
assert.ok(pulsadas > 0, "ninguna marca de pareja pendiente que pulsar");

// Quien se casó dos veces sale una vez, entre sus dos parejas
const todoAbierto = layout("p25", TODAS);
const pepeYSusMujeres = ["p441", "p16", "p17"].map((id) => todoAbierto.nodos.find((n) => n.id === id)!);
assert.ok(pepeYSusMujeres.every((n) => n?.x === pepeYSusMujeres[1].x), "los tres comparten columna");
assert.deepStrictEqual(
  [...pepeYSusMujeres].sort((a, b) => a.y - b.y).map((n) => n.id),
  ["p17", "p16", "p441"],
  "él queda en medio y sus mujeres en el orden en que están escritas: Federica fue la primera",
);

// La sangre llega más lejos que la línea directa: los tíos sí, sus parejas no
const desdeElHijo = layout("p26", TODAS);
const nodo = (id: string) => desdeElHijo.nodos.find((n) => n.id === id)!;
assert.ok(nodo("p126").consanguineo && !nodo("p126").lineaDirecta, "un tío comparte sangre y no está en la línea directa");
for (const suya of parejaDirecta(g, "p126")) assert.ok(!nodo(suya).consanguineo, "…y su pareja no la comparte");
assert.ok(desdeElHijo.nodos.every((n) => !n.lineaDirecta || n.consanguineo), "la línea directa siempre es sangre");

// Vínculos: cada uno cuelga de algo pintado, y reparte hacia la derecha
for (const l of [inicial, conHermanos, layout("p126", TODAS)]) {
  for (const v of l.vinculos) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `vínculo ${v.unionId} sin ancla`);
    for (const h of v.hijos) assert.ok(h.x > v.x, `vínculo ${v.unionId}: los hijos van a la derecha`);
  }
}

console.log("layout.test.ts OK");
