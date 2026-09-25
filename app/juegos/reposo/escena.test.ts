// npx tsx app/juegos/reposo/escena.test.ts
//
// Lo que protegen estos tests: que escena() sea pura y determinista, y que lo que decide un
// cambio sea el hueco entre dos visitas, no el instante concreto en el que ocurren.
import { CATALOGO, construirCalle, diferencia, escena, evidentes, fechasDe, nivelDe, snapshot } from "./escena";

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

const hueco = 40 * DIA;
const cuentas = [t0, t0 + 17 * DIA, t0 + 200 * DIA].map(
  (desde) => diferencia(snapshot(escena(SEMILLA, desde)), escena(SEMILLA, desde + hueco)).length,
);
test("un hueco de 40 días produce cambios sea cual sea el punto de partida",
  cuentas.every((n) => n > 0), cuentas.join(", "));

// Nada crece para siempre

const niveles = (id: string, dias: number) => {
  const obj = construirCalle(SEMILLA).find((o) => o.id === id)!;
  return Array.from({ length: dias }, (_, d) => nivelDe(obj, t0 + d * DIA));
};
const arbol = niveles("arbol", 1200);
test("el árbol crece de uno en uno y lo podan", arbol.every((n, i) => i === 0 || n === arbol[i - 1]
  || n === arbol[i - 1] + 1 || (arbol[i - 1] === 7 && n === 0)) && arbol.includes(0) && arbol.includes(7));

const obra = niveles("obra", 1290);
const acabada = obra.filter((n) => n % 3 === 2).length / obra.length;
test("la obra pasa por sus nueve estados y casi siempre está acabada",
  new Set(obra).size === 9 && acabada > 0.7, `${(acabada * 100).toFixed(0)} % del tiempo acabada`);

// El cartel sabe cuándo lo pegaron
const cartel = construirCalle(SEMILLA).find((o) => o.id === "cartel")!;
const fechas = fechasDe(SEMILLA, "cartel", 12);
test("la fecha de cada cartel es cuando su nivel sube",
  fechas.every((t, i) => nivelDe(cartel, t) === i + 1 && nivelDe(cartel, t - 1) === i));

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
