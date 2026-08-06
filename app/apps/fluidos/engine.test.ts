// npx tsx app/apps/fluidos/engine.test.ts
//
// Un autómata celular no tiene un resultado "correcto" que comparar: lo que se puede
// afirmar son sus INVARIANTES. Las dos que de verdad importan son que nunca se escriba
// fuera de la rejilla (el motor indexa a mano sobre arrays planos) y que la materia no
// se cree ni se destruya sola donde no debe.
//
// WALL es la madera de la interfaz: el mismo material, otro nombre.
//
// FUERA DE COBERTURA: la evaporación y la condensación. Dependen de cuándo le toca a cada
// celda dentro del barrido (`upd`), no solo del número de ticks, así que un test por
// conteo de ticks pasa o falla por motivos que no son la regla que quiere proteger.
import {
  createSim, clearSim, paintAt, step, pickUp, drop, woodInBrush,
  CELL, EMPTY, SAND, WATER, FIRE, WALL, VAPOR, ERASE,
  type Sim, type Mat, type Tool,
} from "./engine";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

const W = 40, H = 30;
const nuevo = () => createSim(W, H);
const contar = (sim: Sim, mat: Mat) => sim.grid.reduce((n, v) => n + (v === mat ? 1 : 0), 0);
const set = (sim: Sim, x: number, y: number, mat: Mat) => { sim.grid[y * sim.W + x] = mat; };
const get = (sim: Sim, x: number, y: number) => sim.grid[y * sim.W + x];
// paintAt/pickUp/drop trabajan en PÍXELES (dividen por CELL); el radio, en celdas.
const pintar = (sim: Sim, cx: number, cy: number, tool: Tool, r: number) =>
  paintAt(sim, cx * CELL, cy * CELL, tool, r);

// ── Creación y borrado ────────────────────────────────────────────────────────

const s0 = nuevo();
test("createSim arranca vacío", contar(s0, EMPTY) === W * H);
test("createSim dimensiona todos los buffers",
  s0.grid.length === W * H && s0.ages.length === W * H && s0.comp.length === W * H && s0.sandHeat.length === W * H);

set(s0, 5, 5, SAND);
const s1 = createSim(W + 10, H + 10, s0);
test("createSim conserva el contenido al agrandar", get(s1, 5, 5) === SAND);
const s2 = createSim(3, 3, s0);
test("createSim recorta sin salirse al empequeñecer", s2.grid.length === 9);

const s3 = nuevo();
pintar(s3, 10, 10, WATER, 5);
clearSim(s3);
test("clearSim deja la rejilla vacía", contar(s3, EMPTY) === W * H);

// ── Pintado ───────────────────────────────────────────────────────────────────

const s4 = nuevo();
pintar(s4, 20, 15, WATER, 3);
test("paintAt pinta en el centro del pincel", get(s4, 20, 15) === WATER);
test("paintAt no pinta más allá del radio", get(s4, 20 + 6, 15) === EMPTY);
test("paintAt pinta algo pero no toda la rejilla",
  contar(s4, WATER) > 0 && contar(s4, WATER) < W * H, `celdas=${contar(s4, WATER)}`);

// Pintar en el borde no debe escribirse fuera del array ni envolver a la otra punta.
const s5 = nuevo();
pintar(s5, 0, 0, SAND, 6);
test("paintAt en la esquina no desborda la rejilla", s5.grid.length === W * H);
test("paintAt en la esquina no se envuelve al otro lado", get(s5, W - 1, H - 1) === EMPTY);

const s6 = nuevo();
pintar(s6, 10, 10, WALL, 3);
test("woodInBrush ve la madera que hay bajo el pincel", woodInBrush(s6, 10 * CELL, 10 * CELL, 3));
test("woodInBrush no la ve donde no la hay", !woodInBrush(s6, 30 * CELL, 25 * CELL, 3));
pintar(s6, 10, 10, ERASE, 4);
test("ERASE borra lo que hay bajo el pincel", contar(s6, WALL) === 0);

// ── Física: la arena cae ──────────────────────────────────────────────────────

const s7 = nuevo();
set(s7, 20, 2, SAND);
for (let i = 0; i < 40; i++) step(s7);
test("la arena cae hasta el fondo", get(s7, 20, H - 1) === SAND, `fila final=${
  [...Array(H).keys()].find((y) => get(s7, 20, y) === SAND)}`);
test("la arena no se duplica al caer", contar(s7, SAND) === 1, `celdas=${contar(s7, SAND)}`);

// La arena no atraviesa la madera.
const s8 = nuevo();
set(s8, 20, 2, SAND);
for (let x = 0; x < W; x++) set(s8, x, 10, WALL);
for (let i = 0; i < 60; i++) step(s8);
test("la arena se queda encima de la madera",
  [...Array(H).keys()].every((y) => y > 10 ? get(s8, 20, y) !== SAND : true));

// ── Física: el agua se extiende ───────────────────────────────────────────────

const s9 = nuevo();
for (let i = 0; i < 20; i++) set(s9, 20, 5 + i, WATER);
const antesAgua = contar(s9, WATER);
for (let i = 0; i < 60; i++) step(s9);
test("el agua se conserva al asentarse", contar(s9, WATER) === antesAgua,
  `${antesAgua} → ${contar(s9, WATER)}`);
const anchoFinal = new Set(
  [...Array(W).keys()].filter((x) => [...Array(H).keys()].some((y) => get(s9, x, y) === WATER)),
).size;
test("el agua se extiende a los lados al caer", anchoFinal > 1, `columnas=${anchoFinal}`);

// ── Física: el fuego se apaga ─────────────────────────────────────────────────

const s10 = nuevo();
pintar(s10, 20, 15, FIRE, 3);
test("el fuego se pinta", contar(s10, FIRE) > 0);
for (let i = 0; i < 400; i++) step(s10);
test("el fuego acaba apagándose sin combustible", contar(s10, FIRE) === 0, `quedan=${contar(s10, FIRE)}`);

// ── Coger y soltar ────────────────────────────────────────────────────────────

const s12 = nuevo();
pintar(s12, 20, 15, SAND, 3);
const cogido = pickUp(s12, 20 * CELL, 15 * CELL, 3);
test("pickUp se lleva las celdas del pincel", cogido.length > 0 && contar(s12, SAND) === 0,
  `cogidas=${cogido.length}`);
drop(s12, cogido, 30, 20);
test("drop devuelve todo lo cogido", contar(s12, SAND) === cogido.length,
  `${cogido.length} → ${contar(s12, SAND)}`);

// Soltar fuera de la rejilla no debe escribir fuera ni perder la cuenta.
const s13 = nuevo();
pintar(s13, 20, 15, SAND, 2);
drop(s13, pickUp(s13, 20 * CELL, 15 * CELL, 2), W + 50, H + 50);
test("drop fuera de la rejilla no desborda", s13.grid.length === W * H);

// ── Estabilidad general ───────────────────────────────────────────────────────

const s14 = nuevo();
pintar(s14, 10, 5, WATER, 4);
pintar(s14, 25, 5, SAND, 4);
pintar(s14, 18, 20, WALL, 3);
pintar(s14, 30, 12, FIRE, 2);
let materialInvalido = 0;
for (let i = 0; i < 300; i++) {
  step(s14);
  if (s14.grid.some((v) => v > VAPOR)) materialInvalido++;
}
test("300 ticks con los cuatro materiales no producen material inválido",
  materialInvalido === 0, `ticks malos=${materialInvalido}`);

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
