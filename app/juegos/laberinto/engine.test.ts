// npx tsx app/juegos/laberinto/engine.test.ts
//
// La generación usa Math.random(), así que los tests comprueban INVARIANTES sobre muchas
// tiradas, no tableros concretos: que el laberinto sea recorrible de punta a punta, que
// los agujeros cumplan sus reglas y que la bola nunca acabe dentro de un muro.
import {
  ROWS, COLS, CELL, WALL_W, BALL_R, BOARD_W, BOARD_H, START_X, START_Y,
  buildSegs, generateCircuit, generateDesafio, goalCoords, mazeFromPath,
  pasoBola, resolveCollisions, tryDesafio, warnsdorffPath,
  type MazeCell, type Seg,
} from "./engine";

let fails = 0;
function test(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

// ── Camino de Warnsdorff ──────────────────────────────────────────────────────

const camino = warnsdorffPath(new Set());
test("warnsdorffPath arranca en (0,0)", camino?.[0].r === 0 && camino?.[0].c === 0);
test(
  "warnsdorffPath no repite casilla",
  camino !== null && new Set(camino.map((p) => `${p.r},${p.c}`)).size === camino.length,
);
test(
  "warnsdorffPath solo da pasos ortogonales de 1",
  camino !== null &&
    camino.slice(1).every((p, i) => Math.abs(p.r - camino[i].r) + Math.abs(p.c - camino[i].c) === 1),
);
test("warnsdorffPath devuelve null si (0,0) está prohibida", warnsdorffPath(new Set(["0,0"])) === null);

// ── Conectividad del laberinto ────────────────────────────────────────────────

const MN = 1, MS = 2, ME = 4, MW = 8;

/** Casillas alcanzables desde (0,0) atravesando solo paredes abiertas. */
function alcanzables(maze: MazeCell[][]): Set<string> {
  const vistas = new Set(["0,0"]);
  const cola = [{ r: 0, c: 0 }];
  const pasos = [
    { dr: -1, dc: 0, bit: MN }, { dr: 1, dc: 0, bit: MS },
    { dr: 0, dc: 1, bit: ME }, { dr: 0, dc: -1, bit: MW },
  ];
  while (cola.length) {
    const { r, c } = cola.pop()!;
    for (const { dr, dc, bit } of pasos) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (maze[r][c].walls & bit) continue;          // pared cerrada
      const clave = `${nr},${nc}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      cola.push({ r: nr, c: nc });
    }
  }
  return vistas;
}

const circuito = generateCircuit();
test(
  "generateCircuit deja las 81 casillas alcanzables",
  alcanzables(circuito.maze).size === ROWS * COLS,
  `alcanzables=${alcanzables(circuito.maze).size}`,
);
test(
  "generateCircuit pone la meta dentro del tablero",
  circuito.goalRow >= 0 && circuito.goalRow < ROWS && circuito.goalCol >= 0 && circuito.goalCol < COLS,
);

// ── Modo desafío ──────────────────────────────────────────────────────────────

const TIRADAS = 20;
let sinSalida = 0, agujerosPegados = 0, agujerosEnBorde = 0, metaEnAgujero = 0;
for (let i = 0; i < TIRADAS; i++) {
  const { maze, goalRow, goalCol, holes } = generateDesafio();
  const vivas = alcanzables(maze);
  // Todas las casillas, agujeros incluidos: al agujero se le abre pared a propósito para
  // que la bola pueda caer dentro, así que también tiene que ser alcanzable.
  const huecos = new Set(holes.map((h) => `${h.row},${h.col}`));
  if (vivas.size !== ROWS * COLS) sinSalida++;
  for (const h of holes) {
    if (h.row === 0 || h.row === ROWS - 1 || h.col === 0 || h.col === COLS - 1) agujerosEnBorde++;
    for (const o of holes) {
      if (o === h) continue;
      if (Math.abs(o.row - h.row) + Math.abs(o.col - h.col) < 3) agujerosPegados++;
    }
  }
  if (huecos.has(`${goalRow},${goalCol}`)) metaEnAgujero++;
}
test(`generateDesafio deja todo lo no-agujero alcanzable (${TIRADAS} tiradas)`, sinSalida === 0, `fallos=${sinSalida}`);
test("generateDesafio nunca pone un agujero en el borde", agujerosEnBorde === 0, `fallos=${agujerosEnBorde}`);
test("generateDesafio separa los agujeros (Manhattan ≥ 3)", agujerosPegados === 0, `fallos=${agujerosPegados}`);
test("generateDesafio nunca pone la meta en un agujero", metaEnAgujero === 0, `fallos=${metaEnAgujero}`);

const conAgujeros = tryDesafio(4, 2000);
test("tryDesafio(4) da exactamente 4 agujeros", conAgujeros === null || conAgujeros.holes.length === 4);
test("tryDesafio devuelve null si pide demasiados agujeros", tryDesafio(30, 20) === null);

// ── Geometría de muros ────────────────────────────────────────────────────────

const todoCerrado: MazeCell[][] = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => ({ walls: MN | MS | ME | MW })),
);
const segsCerrado = buildSegs(todoCerrado);
test(
  "buildSegs emite norte+oeste de cada casilla más los dos bordes",
  segsCerrado.length === ROWS * COLS * 2 + 2,
  `segs=${segsCerrado.length}`,
);
test(
  "buildSegs no emite segmentos degenerados",
  segsCerrado.every((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) > 0.001),
);
test(
  "un laberinto abierto tiene menos muros que uno cerrado",
  buildSegs(mazeFromPath(warnsdorffPath(new Set())!)).length < segsCerrado.length,
);

const { gx, gy } = goalCoords(ROWS - 1, COLS - 1);
test(
  "goalCoords cae en el centro de su casilla",
  gx === (COLS - 1) * CELL + CELL / 2 + WALL_W / 2 && gy === (ROWS - 1) * CELL + CELL / 2 + WALL_W / 2,
);

// ── Colisiones ────────────────────────────────────────────────────────────────

/** Distancia de un punto al segmento más cercano: si es menor que el radio de la bola
 *  más medio muro, la bola está incrustada. */
function penetracion(bx: number, by: number, segs: Seg[]): number {
  const r = BALL_R + WALL_W / 2;
  let peor = 0;
  for (const s of segs) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((bx - s.x1) * dx + (by - s.y1) * dy) / len2));
    const d = Math.hypot(bx - (s.x1 + t * dx), by - (s.y1 + t * dy));
    peor = Math.max(peor, r - d);
  }
  return peor;
}

// Bola metida en el muro superior izquierdo: tiene que salir empujada.
const [ex, ey] = resolveCollisions(WALL_W / 2 + 1, WALL_W / 2 + 1, 0, 0, segsCerrado);
test("resolveCollisions expulsa una bola incrustada", penetracion(ex, ey, segsCerrado) < 0.01,
  `penetración=${penetracion(ex, ey, segsCerrado).toFixed(3)}`);

// Una bola quieta en el centro de una casilla cerrada no se mueve sola.
const centro = resolveCollisions(START_X, START_Y, 0, 0, segsCerrado);
test("resolveCollisions no toca una bola que no roza nada",
  centro[0] === START_X && centro[1] === START_Y && centro[2] === 0 && centro[3] === 0);

// Rebote: una bola que va hacia arriba contra el muro norte acaba yendo hacia abajo.
const rebote = resolveCollisions(START_X, WALL_W / 2 + BALL_R + 0.5, 0, -200, segsCerrado);
test("resolveCollisions invierte la velocidad contra el muro", rebote[3] > 0, `vy=${rebote[3].toFixed(1)}`);

// ── Integración ───────────────────────────────────────────────────────────────

const quieta = { bx: START_X, by: START_Y, vx: 0, vy: 0 };
test("pasoBola con el tablero plano no mueve la bola",
  (() => { const p = pasoBola(quieta, 0, 0, 1 / 60, segsCerrado); return p.bx === START_X && p.by === START_Y; })());

test("pasoBola acelera hacia donde se inclina",
  (() => { const p = pasoBola(quieta, 10, 0, 1 / 60, segsCerrado); return p.vy > 0 && p.by > START_Y; })());

test("pasoBola frena una bola lanzada sin inclinación",
  (() => { const p = pasoBola({ ...quieta, vx: 100 }, 0, 0, 1 / 60, segsCerrado); return p.vx < 100 && p.vx > 0; })());

// La bola nunca se escapa del tablero por mucho que se incline y por muchos frames.
const desafio = generateDesafio();
const segsJuego = buildSegs(desafio.maze);
let fuera = 0, dentro = { bx: START_X, by: START_Y, vx: 0, vy: 0 };
for (let i = 0; i < 3000; i++) {
  dentro = pasoBola(dentro, 15, 15, 1 / 60, segsJuego);
  if (dentro.bx < 0 || dentro.bx > BOARD_W || dentro.by < 0 || dentro.by > BOARD_H) fuera++;
}
test("pasoBola nunca deja salir la bola del tablero (3.000 frames a tope de inclinación)",
  fuera === 0, `fugas=${fuera}`);

console.log(fails === 0 ? "\nTodo OK" : `\n${fails} fallo(s)`);
process.exit(fails === 0 ? 0 : 1);
