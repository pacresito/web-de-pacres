// Motor del Laberinto: generación del tablero, geometría de muros y física de la bola.
// Puro, sin React ni canvas — page.tsx lo conecta a los eventos y render.ts lo pinta.
//
// El tablero se genera a partir de un camino hamiltoniano (Warnsdorff: se avanza siempre
// a la casilla con menos salidas libres). Que el camino pase por todas las casillas es lo
// que garantiza un laberinto conexo y sin zonas muertas, y su última casilla es la meta:
// así la meta siempre está a la distancia máxima de la salida.
//
// En modo desafío, los agujeros son casillas EXCLUIDAS del camino a las que además se les
// abre la pared por la que el camino pasa de largo. De ahí la condición de ≥2 impactos por
// agujero: un agujero al que solo se puede caer desde un lado es una trampa invisible.

export const COLS = 9;
export const ROWS = 9;
export const CELL = 54;
export const WALL_W = 6;
export const BALL_R = 10;
export const BOARD_W = COLS * CELL + WALL_W;
export const BOARD_H = ROWS * CELL + WALL_W;
export const START_X = CELL / 2 + WALL_W / 2;
export const START_Y = CELL / 2 + WALL_W / 2;

export const MAX_TILT = 15;
export const TILT_SPEED = 2.0;
export const GRAVITY = 1750;
export const FRICTION = 0.983;
const RESTITUTION = 0.2;
export const GAME_DURATION = 60;

// Paredes de una casilla, como bits: norte, sur, este, oeste.
const MN = 1, MS = 2, ME = 4, MW = 8;

export type MazeCell = { walls: number };
export type Seg = { x1: number; y1: number; x2: number; y2: number };
export type Hole = { row: number; col: number; cx: number; cy: number; radius: number; fallCount: number };

const DIRS4 = [
  { dr: -1, dc: 0, a: MN, b: MS },
  { dr: 1,  dc: 0, a: MS, b: MN },
  { dr: 0,  dc: 1, a: ME, b: MW },
  { dr: 0,  dc: -1, a: MW, b: ME },
];

/** Camino que visita una vez cada casilla no prohibida, arrancando en (0,0). Heurística
 *  de Warnsdorff; `null` si se queda sin salida (es voraz, no exhaustiva: quien llama
 *  reintenta). */
export function warnsdorffPath(forbidden: Set<string>): { r: number; c: number }[] | null {
  if (forbidden.has("0,0")) return null;
  const target = ROWS * COLS - forbidden.size;
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  forbidden.forEach(k => { const [r, c] = k.split(",").map(Number); vis[r][c] = true; });

  function degree(r: number, c: number) {
    return DIRS4.filter(({ dr, dc }) => {
      const nr = r + dr, nc = c + dc;
      return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis[nr][nc];
    }).length;
  }

  const path: { r: number; c: number }[] = [{ r: 0, c: 0 }];
  let cr = 0, cc = 0;
  vis[0][0] = true;

  while (path.length < target) {
    const avail = DIRS4
      .filter(({ dr, dc }) => {
        const nr = cr + dr, nc = cc + dc;
        return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis[nr][nc];
      })
      .sort((x, y) => {
        const da = degree(cr + x.dr, cc + x.dc);
        const db = degree(cr + y.dr, cc + y.dc);
        return da !== db ? da - db : Math.random() - 0.5;
      });
    if (avail.length === 0) return null;
    const { dr, dc } = avail[0];
    cr += dr; cc += dc;
    vis[cr][cc] = true;
    path.push({ r: cr, c: cc });
  }
  return path;
}

/** Rejilla toda cerrada a la que se le abren las paredes que el camino atraviesa. */
export function mazeFromPath(path: { r: number; c: number }[]): MazeCell[][] {
  const grid: MazeCell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ walls: MN | MS | ME | MW }))
  );
  for (let i = 0; i < path.length - 1; i++) {
    const { r: r1, c: c1 } = path[i];
    const { r: r2, c: c2 } = path[i + 1];
    const dir = DIRS4.find(d => d.dr === r2 - r1 && d.dc === c2 - c1)!;
    grid[r1][c1].walls &= ~dir.a;
    grid[r2][c2].walls &= ~dir.b;
  }
  return grid;
}

/** Modo circuito: camino por las 81 casillas, sin agujeros. El fallback de un solo punto
 *  solo se alcanza si 50 intentos de Warnsdorff fallan seguidos. */
export function generateCircuit(): { maze: MazeCell[][]; goalRow: number; goalCol: number } {
  for (let i = 0; i < 50; i++) {
    const path = warnsdorffPath(new Set());
    if (!path || path.length !== ROWS * COLS) continue;
    const last = path[path.length - 1];
    return { maze: mazeFromPath(path), goalRow: last.r, goalCol: last.c };
  }
  return { maze: mazeFromPath([{ r: 0, c: 0 }]), goalRow: ROWS - 1, goalCol: COLS - 1 };
}

/** Un intento de tablero con `nHoles` agujeros. Devuelve null si no cuaja: los agujeros
 *  van separados (distancia Manhattan ≥ 3), fuera del borde, y cada uno tiene que quedar
 *  alcanzable desde al menos dos lados del camino. */
export function tryDesafio(nHoles: number, maxAttempts: number): {
  maze: MazeCell[][];
  goalRow: number;
  goalCol: number;
  holes: Hole[];
} | null {
  const candidates: { r: number; c: number }[] = [];
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++)
      candidates.push({ r, c });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
    const holeList: { r: number; c: number }[] = [];
    for (const cell of shuffled) {
      if (holeList.length === nHoles) break;
      if (holeList.some(h => Math.abs(h.r - cell.r) + Math.abs(h.c - cell.c) < 3)) continue;
      holeList.push(cell);
    }
    if (holeList.length < nHoles) continue;

    const holeSet = new Set(holeList.map(h => `${h.r},${h.c}`));
    const path = warnsdorffPath(holeSet);
    if (!path || path.length !== ROWS * COLS - nHoles) continue;

    const grid = mazeFromPath(path);
    const hitCount = new Map<string, number>();

    // Cada vez que el camino GIRA, la casilla que tenía delante queda "apuntada": si es un
    // agujero, se le abre esa pared. Ir recto no cuenta — la bola no se desvía sola.
    for (let i = 1; i < path.length - 1; i++) {
      const prevDr = path[i].r - path[i - 1].r;
      const prevDc = path[i].c - path[i - 1].c;
      const nextDr = path[i + 1].r - path[i].r;
      const nextDc = path[i + 1].c - path[i].c;
      if (prevDr === nextDr && prevDc === nextDc) continue;
      const hr = path[i].r + prevDr;
      const hc = path[i].c + prevDc;
      if (hr < 0 || hr >= ROWS || hc < 0 || hc >= COLS) continue;
      const key = `${hr},${hc}`;
      if (!holeSet.has(key)) continue;
      const dir = DIRS4.find(d => d.dr === prevDr && d.dc === prevDc)!;
      grid[path[i].r][path[i].c].walls &= ~dir.a;
      grid[hr][hc].walls &= ~dir.b;
      hitCount.set(key, (hitCount.get(key) ?? 0) + 1);
    }

    if (!holeList.every(h => (hitCount.get(`${h.r},${h.c}`) ?? 0) >= 2)) continue;

    const last = path[path.length - 1];
    return {
      maze: grid,
      goalRow: last.r,
      goalCol: last.c,
      holes: holeList.map(h => ({
        row: h.r,
        col: h.c,
        cx: h.c * CELL + CELL / 2 + WALL_W / 2,
        cy: h.r * CELL + CELL / 2 + WALL_W / 2,
        radius: CELL * 0.4,
        fallCount: 0,
      })),
    };
  }
  return null;
}

/** Tablero de juego: 4 agujeros si sale, 3 si no, y circuito pelado como último recurso. */
export function generateDesafio(): { maze: MazeCell[][]; goalRow: number; goalCol: number; holes: Hole[] } {
  const result = tryDesafio(4, 2000) ?? tryDesafio(3, 500);
  if (result) return result;
  const { maze, goalRow, goalCol } = generateCircuit();
  return { maze, goalRow, goalCol, holes: [] };
}

/** Muros como segmentos para la colisión. Solo se emiten norte y oeste de cada casilla
 *  (el sur de una es el norte de la siguiente) más los bordes derecho e inferior: así
 *  cada muro existe una sola vez y la bola no rebota dos veces contra el mismo. */
export function buildSegs(maze: MazeCell[][]): Seg[] {
  const segs: Seg[] = [];
  const h = WALL_W / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * CELL + h, y = r * CELL + h;
      const w = maze[r][c].walls;
      if (w & MN) segs.push({ x1: x, y1: y, x2: x + CELL, y2: y });
      if (w & MW) segs.push({ x1: x, y1: y, x2: x, y2: y + CELL });
    }
  }
  const rX = BOARD_W - h, bY = BOARD_H - h;
  segs.push({ x1: rX, y1: h, x2: rX, y2: bY });
  segs.push({ x1: h, y1: bY, x2: rX, y2: bY });
  return segs;
}

/** Saca la bola de los muros en los que haya penetrado y le rebota la velocidad. Tres
 *  pasadas porque resolver un muro puede meterla en otro (esquinas). */
export function resolveCollisions(
  bx: number, by: number, vx: number, vy: number, segs: Seg[]
): [number, number, number, number] {
  const r = BALL_R + WALL_W / 2;
  for (let pass = 0; pass < 3; pass++) {
    for (const seg of segs) {
      const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 0.001) continue;
      const t = Math.max(0, Math.min(1, ((bx - seg.x1) * dx + (by - seg.y1) * dy) / len2));
      const cx = seg.x1 + t * dx, cy = seg.y1 + t * dy;
      const ex = bx - cx, ey = by - cy;
      const dist = Math.sqrt(ex * ex + ey * ey);
      if (dist < r && dist > 0.001) {
        const nx = ex / dist, ny = ey / dist;
        bx += nx * (r - dist);
        by += ny * (r - dist);
        const dot = vx * nx + vy * ny;
        if (dot < 0) {
          vx -= (1 + RESTITUTION) * dot * nx;
          vy -= (1 + RESTITUTION) * dot * ny;
        }
      }
    }
  }
  return [bx, by, vx, vy];
}

/** Un paso de integración: la inclinación del tablero da la aceleración, la fricción se
 *  aplica por segundo real (de ahí el ^dt*60, para que no dependa de los FPS) y las
 *  colisiones cierran el paso. */
export function pasoBola(
  b: { bx: number; by: number; vx: number; vy: number },
  tiltX: number, tiltY: number, dt: number, segs: Seg[],
): { bx: number; by: number; vx: number; vy: number } {
  const ax = GRAVITY * Math.sin((tiltY * Math.PI) / 180);
  const ay = GRAVITY * Math.sin((tiltX * Math.PI) / 180);
  let vx = (b.vx + ax * dt) * Math.pow(FRICTION, dt * 60);
  let vy = (b.vy + ay * dt) * Math.pow(FRICTION, dt * 60);
  let bx = b.bx + vx * dt;
  let by = b.by + vy * dt;
  [bx, by, vx, vy] = resolveCollisions(bx, by, vx, vy, segs);
  return { bx, by, vx, vy };
}

export function goalCoords(row: number, col: number) {
  return {
    gx: col * CELL + CELL / 2 + WALL_W / 2,
    gy: row * CELL + CELL / 2 + WALL_W / 2,
  };
}

export function initMaze() {
  const { maze, goalRow, goalCol, holes } = generateDesafio();
  const { gx, gy } = goalCoords(goalRow, goalCol);
  return { maze, goalX: gx, goalY: gy, holes };
}
