// Test de lógica pura: `npx tsx lib/arbol/recuento.test.ts`. Fuera del build.
// Lee seed/arbol.json (gitignoreado, datos privados): sin él no hay nada que verificar.
//
// Los números de aquí son el producto: si cambian, cambió el panel. Y lo que prueba que
// desplegar funciona es el layout —que pinte a los que la fracción prometía—, no la
// intención de las uniones que devuelve.
import assert from "assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { construirGrafo } from "./grafo";
import { calcularLayout } from "./layout";
import { calcularRecuento, type Recuento } from "./recuento";
import type { ArbolData } from "./tree";

const data: ArbolData = JSON.parse(readFileSync(resolve("seed/arbol.json"), "utf-8"));
const g = construirGrafo(data);

const estado = (pov: string, ocultar = true, expandidas = new Set<string>()) => ({
  puntoDeVista: pov,
  expandidas,
  parejas: new Set<string>(),
  ocultarNoConectados: ocultar,
});

/** El panel tal como se lee, que es lo que se está fijando. */
function panel(opciones: ReturnType<typeof estado>): { recuento: Recuento; lineas: string[] } {
  const layout = calcularLayout(g, opciones);
  const recuento = calcularRecuento(g, opciones, new Set(layout.nodos.map((n) => n.id)));
  return {
    recuento,
    lineas: recuento.filas.map(
      (f) => `${f.nivel} ${f.fracciones.map((x) => `${x.termino} ${x.puestos.length}/${x.todos.length}`).join(" · ")}`,
    ),
  };
}

// La vista de arranque desde Pablo
const inicial = panel(estado("p25"));
assert.deepStrictEqual(inicial.lineas, [
  "3 bisabuelos 8/8",
  "2 abuelos 4/4 · tíos abuelos 0/10 · parejas 0/10",
  "1 padres 2/2 · tíos 0/8 · tíos segundos 0/39 · parejas 0/45",
  "0 hermanos 1/3 · primos 0/15 · primos segundos 0/75 · parejas 1/55",
  "-1 hijos 3/3 · sobrinos 0/5 · sobrinos segundos 0/15 · otros sobrinos 0/71 · parejas 0/2 · sin parentesco 0/1",
  // Manuela estrena generación, y con ella la fila que no existía.
  "-2 otra sobrina nieta 0/1",
]);
assert.strictEqual(inicial.recuento.puestos, 19, "de arranque hay 19 puestos");
assert.strictEqual(inicial.recuento.alcanzables, 372, "y 372 alcanzables, los conectados con él");

// El punto de vista se cuenta entre sus hermanos y su pareja en el cajón de la fila.
const fila0 = inicial.recuento.filas.find((f) => f.nivel === 0)!;
assert.deepStrictEqual(fila0.fracciones[0].puestos, ["p25"], "el único hermano puesto es él");
assert.deepStrictEqual(fila0.fracciones[3].puestos, ["p24"], "y en parejas está la suya");
// El cajón trae a los suyos y no solo cuántos son: pulsar el parentesco los lista.
assert.ok(fila0.fracciones[0].todos.includes("p25"), "el cajón lleva dentro a los que cuenta");
assert.ok(
  inicial.recuento.filas.every((f) => f.fracciones.every((x) => x.puestos.every((id) => x.todos.includes(id)))),
  "y los puestos son siempre parte de los suyos",
);

// Sin el filtro entra la política de la política, en su propio cajón
const sinFiltro = panel(estado("p25", false));
assert.strictEqual(sinFiltro.recuento.alcanzables, data.people.length, "sin filtro se alcanza el árbol entero");
assert.deepStrictEqual(
  sinFiltro.recuento.filas.map((f) => f.fracciones[f.fracciones.length - 1].termino),
  [...Array(5).fill("sin parentesco"), "otra sobrina nieta"],
  "«sin parentesco» cierra la fila en cuanto entra alguien de fuera; en la de Manuela no hay nadie de fuera",
);
assert.strictEqual(
  sinFiltro.recuento.puestos,
  27,
  "el arranque trae 8 más: la ascendencia de su mujer, que no es familia de nadie más",
);

// Hay fila mientras quede alguien alcanzable, aunque no haya nadie puesto
// Desde el hijo, el vocabulario se estira hasta el tope por los dos extremos.
assert.deepStrictEqual(panel(estado("p26")).lineas, [
  "4 tatarabuelos 12/12",
  "3 bisabuelos 6/6 · tíos bisabuelos 0/17 · parejas 0/13",
  "2 abuelos 4/4 · tíos abuelos 0/12 · tíos abuelos segundos 0/48 · parejas 0/56",
  "1 padres 2/2 · tíos 0/4 · tíos segundos 0/20 · otros tíos 0/89 · parejas 0/60",
  "0 hermanos 1/3 · primos 0/5 · primos segundos 0/21 · primos terceros 0/72 · parejas 0/2 · sin parentesco 0/1",
  "-1 otra sobrina 0/1",
]);

// Cada fracción es un botón: lo que promete es lo que el layout acaba pintando
for (const pov of ["p25", "p26", "p131"]) {
  for (const ocultar of [true, false]) {
    const base = estado(pov, ocultar);
    const partida = panel(base);
    for (const fila of partida.recuento.filas) {
      for (const fraccion of fila.fracciones) {
        const abierta = panel(estado(pov, ocultar, new Set(fraccion.uniones)));
        const llena = abierta.recuento.filas.find((f) => f.nivel === fila.nivel)!.fracciones.find((x) => x.termino === fraccion.termino)!;
        assert.strictEqual(
          llena.puestos.length,
          llena.todos.length,
          `${pov}/${ocultar}: pulsar «${fila.nivel} ${fraccion.termino}» deja ${llena.puestos.length} de ${llena.todos.length}`,
        );
      }
    }
  }
}

// Plegar una fracción llena se lleva lo suyo y deja en pie lo demás
// Los tíos llegan por las uniones de los abuelos y los sobrinos por las de los hermanos:
// quitar unas no toca a las otras. Cuando sí se tocan —los primos cuelgan de los tíos— es
// que el árbol es así, y replegar arrastra por arriba.
const fraccion = (p: ReturnType<typeof panel>, nivel: number, termino: string) =>
  p.recuento.filas.find((f) => f.nivel === nivel)!.fracciones.find((x) => x.termino === termino)!;
const tios = fraccion(inicial, 1, "tíos").uniones;
const sobrinos = fraccion(inicial, -1, "sobrinos").uniones;
const ambas = panel(estado("p25", true, new Set([...tios, ...sobrinos])));
assert.strictEqual(fraccion(ambas, 1, "tíos").puestos.length, 8);
assert.strictEqual(fraccion(ambas, -1, "sobrinos").puestos.length, 5);
const soloTios = panel(estado("p25", true, new Set([...tios, ...sobrinos].filter((u) => !sobrinos.includes(u)))));
assert.strictEqual(fraccion(soloTios, 1, "tíos").puestos.length, 8, "plegar los sobrinos no se lleva a los tíos");
assert.strictEqual(fraccion(soloTios, -1, "sobrinos").puestos.length, 0, "…y los sobrinos vuelven al núcleo");

// La línea directa ya está puesta de arranque: no hay nada que abrir ni que plegar.
for (const fila of inicial.recuento.filas) {
  const directa = fila.fracciones[0];
  const llena = directa.puestos.length === directa.todos.length;
  assert.strictEqual(directa.uniones.length === 0, llena, `${fila.nivel} ${directa.termino}: llena si y solo si no pide uniones`);
}

// Desplegarlo todo llena el panel entero
const todo = panel(estado("p25", true, new Set(g.unionPorId.keys())));
assert.strictEqual(todo.recuento.puestos, 372, "abriéndolo todo se llega a todos los conectados");
for (const fila of todo.recuento.filas) {
  for (const fraccion of fila.fracciones) {
    assert.strictEqual(fraccion.puestos.length, fraccion.todos.length, `${fila.nivel} ${fraccion.termino} se queda a medias`);
  }
}

console.log("recuento.test.ts OK");
