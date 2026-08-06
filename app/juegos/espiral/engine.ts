// Motor del Espiral: el trazado, la geometría del tablero y el estado de una partida.
// Puro, sin React ni canvas — page.tsx lo conecta a los eventos y render.ts lo pinta.
//
// El tablero es una espiral cuadrada recorrida a velocidad constante: el jugador solo
// gobierna cuándo gira, y fallar el giro es salirse. El de la derecha es el mismo trazado
// invertido y espejado, para que las dos manos hagan el movimiento simétrico.

export function calcCell(size: number) { return Math.floor(size / 12); }
export function calcTolerance(cell: number) { return Math.floor(cell * 0.36); }

export const SPEED = 1.0;
export const SPEED_MULTIPLIERS = { slow: 1.0, normal: 1.5, fast: 2.0 } as const;
export type SpeedLevel = keyof typeof SPEED_MULTIPLIERS;
export const SPEED_ORDER: Record<SpeedLevel, number> = { slow: 0, normal: 1, fast: 2 };

export function buildPath() {
  const points: { x: number; y: number }[] = [];
  let cx = 0, cy = 0;
  points.push({ x: cx, y: cy });
  const dirs = [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }];
  let dirIdx = 0, steps = 1, count = 0;
  while (steps <= 9) {
    const { dx, dy } = dirs[dirIdx % 4];
    for (let i = 0; i < steps; i++) { cx += dx; cy += dy; points.push({ x: cx, y: cy }); }
    dirIdx++; count++;
    if (count === 2) { count = 0; steps++; }
  }
  return points;
}

export const PATH_CELLS = buildPath();
export const PATH_RIGHT = [...PATH_CELLS].reverse().map(p => ({ x: -p.x, y: p.y }));

// Velocidades iniciales de cada tablero: derivadas solo de constantes, así que son
// estables y viven fuera del render (necesario para que el effect de init no se reinicie).
export const LEFT_INITIAL_VEL = { x: SPEED, y: 0 };
export const RIGHT_INITIAL_VEL = (() => {
  const [r0, r1] = PATH_RIGHT;
  const len = Math.hypot(r1.x - r0.x, r1.y - r0.y);
  return { x: ((r1.x - r0.x) / len) * SPEED, y: ((r1.y - r0.y) / len) * SPEED };
})();

export function pathCenter(path: { x: number; y: number }[]) {
  const xs = path.map(p => p.x), ys = path.map(p => p.y);
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

export function calcOrigin(size: number, cell_size: number, path: { x: number; y: number }[]) {
  const { cx, cy } = pathCenter(path);
  return { x: size / 2 - cx * cell_size, y: size / 2 - cy * cell_size };
}

export function cellToPixel(cell: { x: number; y: number }, origin: { x: number; y: number }, cell_size: number) {
  return { x: origin.x + cell.x * cell_size, y: origin.y + cell.y * cell_size };
}

export function pointToSegmentDist(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export type GameState = "idle" | "playing" | "dead" | "win";

export interface BoardState {
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  segIdx: number;
  gameState: GameState;
}

export function initBoard(path: typeof PATH_CELLS, origin: { x: number; y: number }, vel: { x: number; y: number }, cell_size: number): BoardState {
  const start = cellToPixel(path[0], origin, cell_size);
  return { pos: { ...start }, vel: { ...vel }, segIdx: 0, gameState: "idle" };
}
