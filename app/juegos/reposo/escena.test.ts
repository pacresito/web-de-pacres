// npx tsx app/juegos/reposo/escena.test.ts
//
// Lo que protegen estos tests: que escena() sea pura y determinista, y que lo que decide un
// cambio sea el hueco entre dos visitas, no el instante concreto en el que ocurren.
import { CATALOGO, construirCalle, diferencia, escena, evidentes, snapshot } from "./escena";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

const SEMILLA = "reposo-test";
const DIA = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2027, 5, 1);

// Pureza y determinismo

test("escena(semilla, t) da el mismo resultado dos veces",
  JSON.stringify(escena(SEMILLA, t0)) === JSON.stringify(escena(SEMILLA, t0)));

test("construirCalle es estable entre llamadas",
  JSON.stringify(construirCalle(SEMILLA)) === JSON.stringify(construirCalle(SEMILLA)));

test("dos semillas distintas dan calles distintas",
  JSON.stringify(construirCalle("otra-semilla")) !== JSON.stringify(construirCalle(SEMILLA)));

test("todos los objetos del catálogo aparecen en la escena",
  escena(SEMILLA, t0).length === CATALOGO.length);

// El hueco decide, no el instante

const cambiosInstante = diferencia(snapshot(escena(SEMILLA, t0)), escena(SEMILLA, t0 + 1));
test("un hueco de un milisegundo no cruza ningún escalón", cambiosInstante.length === 0,
  `${cambiosInstante.length} cambio(s)`);

const cambiosAno = diferencia(snapshot(escena(SEMILLA, t0)), escena(SEMILLA, t0 + 365 * DIA));
test("un hueco de un año sí produce cambios", cambiosAno.length > 0, `${cambiosAno.length} cambio(s)`);
test("un hueco de un año incluye algún cambio evidente", evidentes(cambiosAno).length > 0,
  `${evidentes(cambiosAno).length} evidente(s) de ${cambiosAno.length}`);

// Mismo hueco, puntos de partida distintos: el desfase de cada ciclo mueve el reparto exacto,
// pero un hueco que dobla varios relojes lentos no se queda nunca a cero por dónde empiece.
const hueco = 40 * DIA;
const cuentas = [t0, t0 + 17 * DIA, t0 + 200 * DIA].map(
  (desde) => diferencia(snapshot(escena(SEMILLA, desde)), escena(SEMILLA, desde + hueco)).length,
);
test("un hueco de 40 días produce cambios sea cual sea el punto de partida",
  cuentas.every((n) => n > 0), cuentas.join(", "));

// Un monótono nunca retrocede: el nivel es una función no decreciente del tiempo, sin
// memoria de quién lo consultó ni cuándo — la única fuente de "pérdida" es que un diff que
// no cruza un escalón no se reporta, no que el reloj vaya hacia atrás.
let monotonoOk = true;
let anterior = -1;
for (let dias = 0; dias <= 900; dias += 5) {
  const nivel = escena(SEMILLA, t0 + dias * DIA).find((o) => o.id === "arbol")!.nivel;
  if (nivel < anterior) monotonoOk = false;
  anterior = nivel;
}
test("el nivel de un objeto monótono nunca baja al avanzar el tiempo", monotonoOk);

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
