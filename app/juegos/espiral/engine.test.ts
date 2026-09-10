// npx tsx app/juegos/espiral/engine.test.ts
//
// Lo que protegen estos tests es la SIMETRÍA de los dos tableros: el de la derecha es el
// izquierdo invertido y espejado, y si esa relación se rompe el juego pide a cada mano un
// movimiento distinto sin que nada falle de forma visible.
import {
  PATH_CELLS, PATH_RIGHT, SPEED, SPEED_MULTIPLIERS, SPEED_ORDER,
  LEFT_INITIAL_VEL, RIGHT_INITIAL_VEL,
  buildPath, calcCell, calcTolerance, calcOrigin, cellToPixel, initBoard, pathCenter,
  pointToSegmentDist, distToPath,
} from "./engine";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}
const casi = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

// Trazado

test("buildPath arranca en el origen", PATH_CELLS[0].x === 0 && PATH_CELLS[0].y === 0);
test("buildPath es determinista", JSON.stringify(buildPath()) === JSON.stringify(PATH_CELLS));
test(
  "buildPath solo da pasos de una celda en ortogonal",
  PATH_CELLS.slice(1).every((p, i) =>
    Math.abs(p.x - PATH_CELLS[i].x) + Math.abs(p.y - PATH_CELLS[i].y) === 1),
);
test(
  "buildPath no repite celda",
  new Set(PATH_CELLS.map((p) => `${p.x},${p.y}`)).size === PATH_CELLS.length,
);

// Simetría de los dos tableros

test("los dos trazados tienen la misma longitud", PATH_RIGHT.length === PATH_CELLS.length);
test(
  "el trazado derecho es el izquierdo invertido y espejado en X",
  PATH_RIGHT.every((p, i) => {
    const espejo = PATH_CELLS[PATH_CELLS.length - 1 - i];
    return p.x === -espejo.x && p.y === espejo.y;
  }),
);
test(
  "las dos velocidades iniciales tienen el módulo de SPEED",
  casi(Math.hypot(LEFT_INITIAL_VEL.x, LEFT_INITIAL_VEL.y), SPEED) &&
    casi(Math.hypot(RIGHT_INITIAL_VEL.x, RIGHT_INITIAL_VEL.y), SPEED),
  `izq=${Math.hypot(LEFT_INITIAL_VEL.x, LEFT_INITIAL_VEL.y)} der=${Math.hypot(RIGHT_INITIAL_VEL.x, RIGHT_INITIAL_VEL.y)}`,
);
// Cada tablero arranca en la dirección de su primer segmento — la derecha hacia abajo,
// porque la espiral termina en vertical y ese trazado se recorre del revés. Si la
// velocidad inicial dejara de ir alineada con el trazado, la bola se saldría en el
// primer frame sin que nada más lo delatara.
const alineada = (vel: { x: number; y: number }, path: { x: number; y: number }[]) => {
  const [p0, p1] = path;
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  return casi(vel.x, ((p1.x - p0.x) / len) * SPEED) && casi(vel.y, ((p1.y - p0.y) / len) * SPEED);
};
test(
  "cada mano arranca en la dirección de su primer segmento",
  alineada(LEFT_INITIAL_VEL, PATH_CELLS) && alineada(RIGHT_INITIAL_VEL, PATH_RIGHT),
);

// Velocidades

test(
  "SPEED_ORDER cubre las mismas velocidades que SPEED_MULTIPLIERS",
  JSON.stringify(Object.keys(SPEED_ORDER).sort()) === JSON.stringify(Object.keys(SPEED_MULTIPLIERS).sort()),
);
test(
  "las velocidades van de menor a mayor multiplicador",
  (Object.keys(SPEED_ORDER) as (keyof typeof SPEED_ORDER)[])
    .sort((a, b) => SPEED_ORDER[a] - SPEED_ORDER[b])
    .every((k, i, arr) => i === 0 || SPEED_MULTIPLIERS[k] > SPEED_MULTIPLIERS[arr[i - 1]]),
);

// Geometría

test("calcCell y calcTolerance crecen con el tamaño", calcCell(420) > calcCell(210) && calcTolerance(35) > calcTolerance(17));
test("la tolerancia siempre cabe dentro de la celda", [120, 240, 420].every((s) => calcTolerance(calcCell(s)) < calcCell(s)));

const centro = pathCenter(PATH_CELLS);
const origen = calcOrigin(420, calcCell(420), PATH_CELLS);
test(
  "calcOrigin centra el trazado en el lienzo",
  casi(cellToPixel({ x: centro.cx, y: centro.cy }, origen, calcCell(420)).x, 210) &&
    casi(cellToPixel({ x: centro.cx, y: centro.cy }, origen, calcCell(420)).y, 210),
);
test(
  "el trazado entero cabe en el lienzo",
  PATH_CELLS.every((c) => {
    const p = cellToPixel(c, origen, calcCell(420));
    return p.x >= 0 && p.x <= 420 && p.y >= 0 && p.y <= 420;
  }),
);

// Distancia punto-segmento (es lo que decide si te has salido)

const a = { x: 0, y: 0 }, b = { x: 10, y: 0 };
test("sobre el segmento la distancia es 0", pointToSegmentDist({ x: 5, y: 0 }, a, b) === 0);
test("en perpendicular mide la separación", pointToSegmentDist({ x: 5, y: 3 }, a, b) === 3);
test("más allá del extremo mide al extremo", pointToSegmentDist({ x: 14, y: 3 }, a, b) === 5);
test("un segmento degenerado mide al punto", pointToSegmentDist({ x: 3, y: 4 }, a, a) === 5);

// Salirse: lo que mide el motor tiene que ser el desvío lateral y nada más

test(
  "la tolerancia llega al centro de la pared y no la pasa",
  [12, 24, 35, 48].every((c) => calcTolerance(c) * 2 === c),
);

// Regresión: yendo recto con un desvío por debajo de la tolerancia no se sale nadie. Medido
// solo contra el segmento en curso, el adelanto que la bola lleva dentro de la celda se
// sumaba al desvío como hipotenusa y mataba en plena recta a quien iba pegado a la pared.
const recta = (() => {
  const cell = calcCell(292);
  const org = calcOrigin(292, cell, PATH_CELLS);
  const px = (i: number) => cellToPixel(PATH_CELLS[i], org, cell);
  // El tramo recto más largo del trazado, que es donde el error se acumulaba.
  let mejor = { ini: 0, len: 0 }, ini = 0;
  for (let i = 1; i < PATH_CELLS.length - 1; i++) {
    const o = PATH_CELLS[ini], a = PATH_CELLS[i], b = PATH_CELLS[i + 1];
    if ((a.x - o.x) * (b.y - a.y) !== (a.y - o.y) * (b.x - a.x)) {
      if (i - ini > mejor.len) mejor = { ini, len: i - ini };
      ini = i;
    }
  }
  const a = px(mejor.ini), b = px(mejor.ini + mejor.len);
  const dir = { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
  const perp = { x: -dir.y, y: dir.x };
  const lat = calcTolerance(cell) - 0.5;  // pegado a la pared, pero dentro
  const pos = { x: a.x + perp.x * lat, y: a.y + perp.y * lat };
  let segIdx = mejor.ini, peor = 0;
  for (let paso = 0; paso < Math.hypot(b.x - a.x, b.y - a.y); paso++) {
    pos.x += dir.x; pos.y += dir.y;
    while (
      segIdx < PATH_CELLS.length - 2 &&
      pointToSegmentDist(pos, px(segIdx + 1), px(Math.min(segIdx + 2, PATH_CELLS.length - 1))) <
        pointToSegmentDist(pos, px(segIdx), px(segIdx + 1)) - 2
    ) segIdx++;
    peor = Math.max(peor, distToPath(pos, PATH_CELLS, segIdx, org, cell));
  }
  return { peor, tol: calcTolerance(cell), lat };
})();
test(
  "en recta, pegado a la pared, el desvío medido no crece",
  recta.peor <= recta.tol,
  `desvío ${recta.lat} · peor medida ${recta.peor.toFixed(2)} · tolerancia ${recta.tol}`,
);

const tablero = initBoard(PATH_CELLS, origen, LEFT_INITIAL_VEL, calcCell(420));
test("initBoard empieza en la primera celda del trazado",
  tablero.pos.x === cellToPixel(PATH_CELLS[0], origen, calcCell(420)).x &&
  tablero.pos.y === cellToPixel(PATH_CELLS[0], origen, calcCell(420)).y);
test("initBoard empieza parado en idle", tablero.segIdx === 0 && tablero.gameState === "idle");
test("initBoard copia la velocidad, no la comparte",
  (() => { const t = initBoard(PATH_CELLS, origen, LEFT_INITIAL_VEL, 35); t.vel.x = 99; return LEFT_INITIAL_VEL.x !== 99; })());

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
