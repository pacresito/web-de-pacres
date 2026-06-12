// Motor de Fluidos: autómata celular de partículas sobre una cuadrícula plana.
// Lógica pura, sin React — page.tsx lo conecta a los eventos y render.ts lo pinta.

export const CELL = 2; // píxeles por celda

export type Mat = 0 | 1 | 2 | 3 | 4 | 5;
export const EMPTY: Mat = 0;
export const SAND: Mat = 1;
export const WATER: Mat = 2;
export const FIRE: Mat = 3;
export const WALL: Mat = 4;
export const VAPOR: Mat = 5;

// Herramientas que no son un material
export const MOVE = 98 as const;
export const ERASE = 99 as const;
export type Tool = Mat | typeof MOVE | typeof ERASE;

export const WATER_HEAT_MAX = 55;     // ticks para que el agua calentada se evapore
export const VAPOR_CONDENSE_MAX = 90; // ticks para que el vapor atascado condense a agua
const SAND_EXCESS_MAX = 1700;         // exceso máximo de K sobre los 300 K ambiente (= 2000 K absolutos)
const SAND_HEAT_RATE = 50;            // K de exceso ganados por tick (pintando o con fuego adyacente)
const SAND_COOL_RATE = 5;             // K de exceso perdidos por tick al enfriarse

const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

// ── Estado ───────────────────────────────────────────────────────────────────

export type Sim = {
  W: number;
  H: number;
  grid: Uint8Array;      // material de cada celda
  ages: Uint16Array;     // contador por material: vida del fuego, calor del agua, condensación del vapor, quemado de la madera (hasta ~800)
  upd: Uint8Array;       // marca "ya actualizada en este tick"
  comp: Uint16Array;     // id de componente conexo de cada celda de madera
  sandHeat: Uint16Array; // exceso de K sobre los 300 K ambiente de cada celda de tierra
  nextComp: number;      // siguiente id de componente a asignar
};

export type Carried = { dx: number; dy: number; type: Mat; age: number };

type Cell = { cx: number; cy: number };

// Crea la simulación; si se pasa la anterior, conserva el contenido que cabe
export function createSim(W: number, H: number, prev?: Sim): Sim {
  const sim: Sim = {
    W,
    H,
    grid: new Uint8Array(W * H),
    ages: new Uint16Array(W * H),
    upd: new Uint8Array(W * H),
    comp: new Uint16Array(W * H),
    sandHeat: new Uint16Array(W * H),
    nextComp: prev?.nextComp ?? 1,
  };
  if (prev) {
    const copyW = Math.min(W, prev.W);
    const copyH = Math.min(H, prev.H);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        sim.grid[y * W + x] = prev.grid[y * prev.W + x];
        sim.ages[y * W + x] = prev.ages[y * prev.W + x];
        sim.comp[y * W + x] = prev.comp[y * prev.W + x];
        sim.sandHeat[y * W + x] = prev.sandHeat[y * prev.W + x];
      }
    }
  }
  return sim;
}

export function clearSim(sim: Sim) {
  sim.grid.fill(0);
  sim.ages.fill(0);
  sim.comp.fill(0);
  sim.sandHeat.fill(0);
}

// Cuántas de las 4 celdas adyacentes contienen el material dado
function countNeighbors(sim: Sim, x: number, y: number, mat: Mat): number {
  const { W, H, grid } = sim;
  let n = 0;
  for (const [dx, dy] of DIRS4) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < W && ny >= 0 && ny < H && grid[ny * W + nx] === mat) n++;
  }
  return n;
}

// ── Pincel (pintar / borrar) ─────────────────────────────────────────────────

// Union-find sencillo: asigna id de componente a una celda nueva de madera,
// fusionando los componentes adyacentes si toca varios
function assignWoodComp(sim: Sim, idx: number, x: number, y: number) {
  const { W, H, grid, comp } = sim;
  const adjCids: number[] = [];
  for (const [dx, dy] of DIRS4) {
    const ax = x + dx, ay = y + dy;
    if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
    if (grid[ay * W + ax] === WALL) {
      const cid = comp[ay * W + ax];
      if (cid && !adjCids.includes(cid)) adjCids.push(cid);
    }
  }
  if (adjCids.length === 0) {
    comp[idx] = sim.nextComp;
    if (++sim.nextComp > 65534) sim.nextComp = 1;
    return;
  }
  const finalCid = adjCids[0];
  for (let j = 1; j < adjCids.length; j++) {
    const oldCid = adjCids[j];
    for (let k = 0; k < W * H; k++) {
      if (comp[k] === oldCid) comp[k] = finalCid;
    }
  }
  comp[idx] = finalCid;
}

// Pinta celdas en la posición (px, py) en píxeles de canvas, con las reglas de
// interacción entre materiales. MOVE nunca llega aquí: page.tsx lo enruta a moveAt.
export function paintAt(sim: Sim, px: number, py: number, tool: Tool, r: number) {
  const { W, H, grid, ages, comp, sandHeat } = sim;
  const gx = Math.floor(px / CELL);
  const gy = Math.floor(py / CELL);

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const i = ny * W + nx;
      const existing = grid[i];

      // Borrar: siempre limpia
      if (tool === ERASE) {
        grid[i] = EMPTY; ages[i] = 0; comp[i] = 0;
        continue;
      }

      if (existing === EMPTY || existing === FIRE) {
        grid[i] = tool as Mat;
        ages[i] = tool === FIRE ? 60 + Math.floor(Math.random() * 80) : 0;
        if (tool === WALL) assignWoodComp(sim, i, nx, ny);

      } else if (existing === WALL) {
        if (tool === FIRE && ages[i] === 0) ages[i] = 600 + Math.floor(Math.random() * 200);

      } else if (existing === WATER) {
        if (tool === SAND || tool === WALL || tool === FIRE) {
          grid[i] = tool as Mat;
          ages[i] = tool === FIRE ? 60 + Math.floor(Math.random() * 80) : 0;
          if (tool === WALL) assignWoodComp(sim, i, nx, ny);
        }

      } else if (existing === SAND) {
        if (tool === SAND || tool === WALL) {
          grid[i] = tool as Mat;
          ages[i] = 0;
          sandHeat[i] = 0;
          if (tool === WALL) assignWoodComp(sim, i, nx, ny);
        } else if (tool === FIRE) {
          sandHeat[i] = Math.min(SAND_EXCESS_MAX, sandHeat[i] + SAND_HEAT_RATE);
        }
      }
    }
  }
}

// ── Herramienta Mover ────────────────────────────────────────────────────────

// Orden: las celdas más alejadas en la dirección de empuje primero
const byFurthest = (dirX: number, dirY: number) => (a: Cell, b: Cell) =>
  dirX !== 0 ? (dirX > 0 ? b.cx - a.cx : a.cx - b.cx) : (dirY > 0 ? b.cy - a.cy : a.cy - b.cy);

// Desplaza una cadena desde (cx, cy) hasta el hueco en (ex, ey), avanzando en (ddx, ddy)
function shiftInDir(sim: Sim, cx: number, cy: number, ex: number, ey: number, ddx: number, ddy: number) {
  const { W, grid, ages, sandHeat } = sim;
  let tx = ex, ty = ey;
  while (tx !== cx || ty !== cy) {
    const bx = tx - ddx, by = ty - ddy;
    grid[ty * W + tx] = grid[by * W + bx];
    ages[ty * W + tx] = ages[by * W + bx];
    sandHeat[ty * W + tx] = sandHeat[by * W + bx];
    tx = bx; ty = by;
  }
  grid[cy * W + cx] = EMPTY;
  ages[cy * W + cx] = 0;
  sandHeat[cy * W + cx] = 0;
}

// Primera celda vacía en dirección (ddx, ddy), cascadeando a través del mismo
// material. La tierra también cascadea a través del agua (se hunde).
function findEndInDir(sim: Sim, cx: number, cy: number, mat: number, ddx: number, ddy: number): { ex: number; ey: number } | null {
  const { W, H, grid } = sim;
  let ex = cx + ddx, ey = cy + ddy;
  while (ex >= 0 && ex < W && ey >= 0 && ey < H) {
    const obs = grid[ey * W + ex];
    if (obs === EMPTY) return { ex, ey };
    if (obs !== mat && !(mat === SAND && obs === WATER)) return null;
    ex += ddx; ey += ddy;
  }
  return null;
}

// Busca escape probando cada dirección de `dirs` (empuje primero, luego perpendiculares)
function findEndAny(sim: Sim, cx: number, cy: number, mat: number, dirs: [number, number][]): { ex: number; ey: number; ddx: number; ddy: number } | null {
  for (const [ddx, ddy] of dirs) {
    const end = findEndInDir(sim, cx, cy, mat, ddx, ddy);
    if (end) return { ...end, ddx, ddy };
  }
  // La tierra cascadea a través de tierra hasta desplazar agua cuando no hay hueco vacío
  if (mat === SAND) {
    const { W, H, grid } = sim;
    for (const [ddx, ddy] of dirs) {
      let nx = cx + ddx, ny = cy + ddy;
      while (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        const cell = grid[ny * W + nx];
        if (cell === WATER) return { ex: nx, ey: ny, ddx, ddy };
        if (cell !== SAND) break;
        nx += ddx; ny += ddy;
      }
    }
  }
  return null;
}

// BFS: recoge el componente conexo de madera desde (sx, sy) con el mismo id,
// excluyendo las celdas de excludeSet
function collectWood(sim: Sim, sx: number, sy: number, excludeSet: Set<number>): { cells: Cell[]; idxSet: Set<number> } {
  const { W, H, grid, comp } = sim;
  const targetCid = comp[sy * W + sx];
  const cells: Cell[] = [{ cx: sx, cy: sy }];
  const idxSet = new Set<number>([sy * W + sx]);
  for (let qi = 0; qi < cells.length; qi++) {
    const { cx, cy } = cells[qi];
    for (const [dx, dy] of DIRS4) {
      const ax = cx + dx, ay = cy + dy;
      if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
      const ai = ay * W + ax;
      if (idxSet.has(ai) || excludeSet.has(ai) || grid[ai] !== WALL || comp[ai] !== targetCid) continue;
      idxSet.add(ai);
      cells.push({ cx: ax, cy: ay });
    }
  }
  return { cells, idxSet };
}

// Mueve un componente de madera un paso en (dirX, dirY).
// Billar: si la cara delantera toca otra pieza de madera, intenta empujarla primero.
// El agua nunca bloquea; la tierra solo bloquea si no tiene ruta de escape.
function tryMoveWood(sim: Sim, wCells: Cell[], wIdxSet: Set<number>, dirX: number, dirY: number, allDirs: [number, number][], depth = 0): boolean {
  const { W, H, grid, ages, comp, sandHeat } = sim;
  if (depth > 5) return false;

  const face: Cell[] = [];
  const faceSet = new Set<number>();
  for (const { cx, cy } of wCells) {
    const nx = cx + dirX, ny = cy + dirY;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false;
    const ni = ny * W + nx;
    if (wIdxSet.has(ni)) continue;
    const obs = grid[ni];
    if (obs === EMPTY || obs === FIRE) continue;
    if (obs === WALL) {
      const { cells: bCells, idxSet: bIdxSet } = collectWood(sim, nx, ny, wIdxSet);
      if (!tryMoveWood(sim, bCells, bIdxSet, dirX, dirY, allDirs, depth + 1)) return false;
      continue;
    }
    if (!faceSet.has(ni)) { faceSet.add(ni); face.push({ cx: nx, cy: ny }); }
  }

  // La tierra necesita ruta de escape; el agua siempre es atravesable
  for (const { cx, cy } of face) {
    const mat = grid[cy * W + cx];
    if (mat !== WATER && !findEndAny(sim, cx, cy, mat, allDirs)) return false;
  }

  // Empuja el material de la cara (el más lejano primero) y después mueve la madera
  face.sort(byFurthest(dirX, dirY));
  for (const { cx, cy } of face) {
    const mat = grid[cy * W + cx];
    if (mat === EMPTY) continue;
    const end = findEndAny(sim, cx, cy, mat, allDirs);
    if (!end) continue;
    const destMat = grid[end.ey * W + end.ex];
    const destAge = ages[end.ey * W + end.ex];
    shiftInDir(sim, cx, cy, end.ex, end.ey, end.ddx, end.ddy);
    // Si el destino era agua (no vacío), quedó sobrescrita — recolocarla cerca
    if (destMat === WATER) {
      // El agua desplazada flota hacia arriba desde donde estaba
      const wx0 = end.ex, wy0 = end.ey;
      let placed = false;
      if (wy0 > 0 && grid[(wy0 - 1) * W + wx0] === EMPTY) {
        grid[(wy0 - 1) * W + wx0] = WATER; ages[(wy0 - 1) * W + wx0] = destAge; placed = true;
      }
      if (!placed) {
        for (const d of Math.random() > 0.5 ? [-1, 1] : [1, -1]) {
          const sx = wx0 + d;
          if (sx >= 0 && sx < W && grid[wy0 * W + sx] === EMPTY) {
            grid[wy0 * W + sx] = WATER; ages[wy0 * W + sx] = destAge; placed = true; break;
          }
        }
      }
      if (!placed && cy > 0 && grid[(cy - 1) * W + cx] === EMPTY) {
        grid[(cy - 1) * W + cx] = WATER; ages[(cy - 1) * W + cx] = destAge; placed = true;
      }
      if (!placed) {
        grid[cy * W + cx] = WATER; ages[cy * W + cx] = destAge;
      }
    }
  }

  // Movimiento rígido: snapshot → vaciar → escribir (conserva id de componente y calor)
  const snap = wCells.map(({ cx, cy }) => ({
    cx, cy,
    val: grid[cy * W + cx],
    age: ages[cy * W + cx],
    cid: comp[cy * W + cx],
    sh: sandHeat[cy * W + cx],
  }));
  for (const { cx, cy } of snap) {
    grid[cy * W + cx] = EMPTY; ages[cy * W + cx] = 0; comp[cy * W + cx] = 0; sandHeat[cy * W + cx] = 0;
  }
  for (const { cx, cy, val, age, cid, sh } of snap) {
    const ni = (cy + dirY) * W + (cx + dirX);
    grid[ni] = val; ages[ni] = age; comp[ni] = cid; sandHeat[ni] = sh;
  }
  wIdxSet.clear();
  for (let i = 0; i < wCells.length; i++) {
    wCells[i] = { cx: wCells[i].cx + dirX, cy: wCells[i].cy + dirY };
    wIdxSet.add(wCells[i].cy * W + wCells[i].cx);
  }
  return true;
}

// Empuja celdas en la dirección del movimiento del ratón, en cadenas que cascadean.
// La madera tocada se agarra como componente rígido completo.
export function moveAt(sim: Sim, px: number, py: number, dpx: number, dpy: number, r: number) {
  const { W, H, grid } = sim;
  const gx = Math.floor(px / CELL);
  const gy = Math.floor(py / CELL);
  const dirX = dpx === 0 ? 0 : dpx > 0 ? 1 : -1;
  const dirY = dpy === 0 ? 0 : dpy > 0 ? 1 : -1;
  if (dirX === 0 && dirY === 0) return;

  // max(ceil|dpx|, ceil|dpy|) — mantiene la respuesta fluida y evita doblar en diagonal
  const steps = Math.min(8, Math.max(1, Math.max(Math.ceil(Math.abs(dpx) / CELL), Math.ceil(Math.abs(dpy) / CELL))));

  // Dirección de empuje primero, luego perpendiculares — deja escapar tierra/agua de lado
  const perps: [number, number][] = dirX !== 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
  const allDirs: [number, number][] = [[dirX, dirY], ...perps];

  // Recoge las celdas del pincel; la madera tocada se expande a su componente completo (agarre)
  const visited = new Set<number>();
  const woodCells: Cell[] = [];
  const otherCells: Cell[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const ni = ny * W + nx;
      if (grid[ni] === EMPTY || visited.has(ni)) continue;
      if (grid[ni] === WALL) {
        for (const cell of collectWood(sim, nx, ny, visited).cells) {
          visited.add(cell.cy * W + cell.cx);
          woodCells.push(cell);
        }
      } else {
        visited.add(ni);
        otherCells.push({ cx: nx, cy: ny });
      }
    }
  }

  otherCells.sort(byFurthest(dirX, dirY));
  const woodIdxSet = new Set<number>(woodCells.map(c => c.cy * W + c.cx));

  for (let s = 0; s < steps; s++) {
    if (woodCells.length > 0) tryMoveWood(sim, woodCells, woodIdxSet, dirX, dirY, allDirs);

    for (let i = 0; i < otherCells.length; i++) {
      const { cx, cy } = otherCells[i];
      const mat = grid[cy * W + cx];
      if (mat === EMPTY) continue;
      const end = findEndInDir(sim, cx, cy, mat, dirX, dirY);
      if (!end) continue;
      shiftInDir(sim, cx, cy, end.ex, end.ey, dirX, dirY);
      otherCells[i] = { cx: cx + dirX, cy: cy + dirY };
    }
  }
}

// ¿Hay madera dentro del radio del pincel? (decide si Mover agarra un bloque)
export function woodInBrush(sim: Sim, px: number, py: number, r: number): boolean {
  const { W, H, grid } = sim;
  const gx = Math.floor(px / CELL);
  const gy = Math.floor(py / CELL);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      if (grid[ny * W + nx] === WALL) return true;
    }
  }
  return false;
}

// Levanta las celdas no-madera del pincel (las vacía del grid) para llevarlas con el cursor
export function pickUp(sim: Sim, px: number, py: number, r: number): Carried[] {
  const { W, H, grid, ages } = sim;
  const gx = Math.floor(px / CELL);
  const gy = Math.floor(py / CELL);
  const picked: Carried[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const i = ny * W + nx;
      if (grid[i] !== EMPTY && grid[i] !== WALL) {
        picked.push({ dx, dy, type: grid[i] as Mat, age: ages[i] });
        grid[i] = EMPTY;
        ages[i] = 0;
      }
    }
  }
  return picked;
}

// Suelta las celdas transportadas alrededor de (cx, cy) — solo sobre celdas vacías
export function drop(sim: Sim, carried: Carried[], cx: number, cy: number) {
  const { W, H, grid, ages } = sim;
  for (const { dx, dy, type, age } of carried) {
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
    const i = ny * W + nx;
    if (grid[i] === EMPTY) { grid[i] = type; ages[i] = age; }
  }
}

// ── Física (un tick) ─────────────────────────────────────────────────────────

// Suma un tick de condensación; devuelve true si el vapor se convirtió en agua
function condenseVapor(sim: Sim, i: number): boolean {
  const { grid, ages, upd } = sim;
  ages[i] = Math.min(ages[i] + 1, VAPOR_CONDENSE_MAX);
  if (ages[i] < VAPOR_CONDENSE_MAX) return false;
  grid[i] = WATER; ages[i] = 0; upd[i] = 1;
  return true;
}

// Intercambia tierra con la celda destino (vacía o agua), arrastrando su calor
function swapSand(sim: Sim, i: number, ni: number) {
  const { grid, upd, sandHeat } = sim;
  const was = grid[ni];
  grid[ni] = SAND; upd[ni] = 1;
  grid[i] = was; upd[i] = 1;
  const sh = sandHeat[i];
  sandHeat[i] = sandHeat[ni];
  sandHeat[ni] = sh;
}

// Tierra: cae y se hunde en el agua; el fuego adyacente solo la calienta (color)
function stepSand(sim: Sim, x: number, y: number, i: number) {
  const { W, H, grid, sandHeat } = sim;

  if (countNeighbors(sim, x, y, FIRE) > 0) {
    sandHeat[i] = Math.min(SAND_EXCESS_MAX, sandHeat[i] + SAND_HEAT_RATE);
  } else if (sandHeat[i] > 0) {
    sandHeat[i] = Math.max(0, sandHeat[i] - SAND_COOL_RATE);
  }

  if (y >= H - 1) return;
  const bi = (y + 1) * W + x;
  if (grid[bi] === EMPTY || grid[bi] === WATER) {
    swapSand(sim, i, bi);
    return;
  }
  for (const d of Math.random() > 0.5 ? [-1, 1] : [1, -1]) {
    const nx = x + d;
    if (nx < 0 || nx >= W) continue;
    const ni = (y + 1) * W + nx;
    if (grid[ni] === EMPTY || grid[ni] === WATER) {
      swapSand(sim, i, ni);
      return;
    }
  }
}

// Agua: cae, se escurre en diagonal y se extiende; el fuego adyacente la evapora poco a poco
function stepWater(sim: Sim, x: number, y: number, i: number) {
  const { W, H, grid, ages, upd } = sim;

  if (countNeighbors(sim, x, y, FIRE) > 0) {
    ages[i]++;
    if (ages[i] >= WATER_HEAT_MAX) { grid[i] = VAPOR; ages[i] = 0; upd[i] = 1; return; }
  } else if (ages[i] > 0) {
    ages[i]--;
  }

  if (y < H - 1) {
    const bi = (y + 1) * W + x;
    if (grid[bi] === EMPTY) {
      grid[bi] = WATER; upd[bi] = 1; grid[i] = EMPTY;
      return;
    }
    for (const d of Math.random() > 0.5 ? [-1, 1] : [1, -1]) {
      const nx = x + d;
      if (nx < 0 || nx >= W) continue;
      const ni = (y + 1) * W + nx;
      if (grid[ni] === EMPTY) {
        grid[ni] = WATER; upd[ni] = 1; grid[i] = EMPTY;
        return;
      }
    }
  }
  // Extenderse a los lados
  for (const d of Math.random() > 0.5 ? [-1, 1] : [1, -1]) {
    const nx = x + d;
    if (nx < 0 || nx >= W) continue;
    const ni = y * W + nx;
    if (grid[ni] === EMPTY) {
      grid[ni] = WATER; upd[ni] = 1; grid[i] = EMPTY;
      return;
    }
  }
}

// Vapor: sube lento y errático (también a través del agua), condensa en el techo
function stepVapor(sim: Sim, x: number, y: number, i: number) {
  const { W, H, grid, ages, upd } = sim;
  if (Math.random() > 0.45) return;

  const atTop = y === 0;
  const above = atTop ? WALL : grid[(y - 1) * W + x];

  // En el techo: quedarse y condensar; deriva lateral lenta para ensanchar la nube
  if (atTop || above === WALL) {
    if (condenseVapor(sim, i)) return;
    if (Math.random() < 0.15) {
      const nx = x + (Math.random() < 0.5 ? -1 : 1);
      if (nx >= 0 && nx < W && grid[y * W + nx] === EMPTY) {
        grid[y * W + nx] = VAPOR; ages[y * W + nx] = ages[i]; upd[y * W + nx] = 1;
        grid[i] = EMPTY;
      }
    }
    return;
  }

  // Vapor justo encima → adhesión fuerte: se apila bajo la nube del techo
  if (above === VAPOR && Math.random() < 0.85) {
    condenseVapor(sim, i);
    return;
  }

  // Vapor en diagonal encima → adhesión media: bordes de nube dispersos
  const vaporDiagAbove =
    (x > 0 && grid[(y - 1) * W + (x - 1)] === VAPOR) ||
    (x < W - 1 && grid[(y - 1) * W + (x + 1)] === VAPOR);
  if (vaporDiagAbove && Math.random() < 0.55) {
    condenseVapor(sim, i);
    return;
  }

  // Libre: intenta subir (por agua o vacío), salvo deriva errática ocasional
  if (Math.random() >= 0.15) {
    const ai = (y - 1) * W + x;
    if (above === WATER) {
      grid[ai] = VAPOR; ages[ai] = ages[i]; upd[ai] = 1;
      grid[i] = WATER; ages[i] = 0; upd[i] = 1;
      return;
    }
    if (above === EMPTY) {
      grid[ai] = VAPOR; ages[ai] = ages[i]; upd[ai] = 1;
      grid[i] = EMPTY; ages[i] = 0;
      return;
    }
  }
  const rnd = Math.random();
  const dirs: [number, number][] = rnd < 0.33
    ? [[-1, 0], [1, 0], [-1, -1], [1, -1]]
    : rnd < 0.66
    ? [[1, 0], [-1, 0], [1, -1], [-1, -1]]
    : [[-1, -1], [1, -1], [-1, 0], [1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
    if (grid[ny * W + nx] === EMPTY) {
      grid[ny * W + nx] = VAPOR; ages[ny * W + nx] = ages[i]; upd[ny * W + nx] = 1;
      grid[i] = EMPTY; ages[i] = 0;
      return;
    }
  }
  condenseVapor(sim, i);
}

// Fuego: se consume (más rápido rodeado de agua), prende madera, sube y chispea de lado
function stepFire(sim: Sim, x: number, y: number, i: number) {
  const { W, H, grid, ages, upd } = sim;

  const waterNeighbors = countNeighbors(sim, x, y, WATER);
  ages[i] = Math.max(0, ages[i] - 1 - (Math.random() > 0.6 ? 1 : 0) - waterNeighbors);
  if (ages[i] === 0) {
    // Si murió rodeado de agua, produce vapor (conserva la masa)
    grid[i] = waterNeighbors > 0 ? VAPOR : EMPTY;
    upd[i] = 1;
    return;
  }

  // Prende la madera adyacente
  for (const [dx, dy] of DIRS4) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
    const ni = ny * W + nx;
    if (grid[ni] === WALL && ages[ni] === 0 && Math.random() > 0.82) {
      ages[ni] = 600 + Math.floor(Math.random() * 200);
    }
  }

  // Sube
  if (y > 0) {
    const ai = (y - 1) * W + x;
    if (grid[ai] === EMPTY && Math.random() > 0.3) {
      grid[ai] = FIRE;
      ages[ai] = Math.floor(ages[i] * (0.45 + Math.random() * 0.3));
      upd[ai] = 1;
      grid[i] = EMPTY;
      return;
    }
  }

  // Chispea de lado de vez en cuando
  if (Math.random() > 0.82) {
    const nx = x + (Math.random() > 0.5 ? -1 : 1);
    if (nx >= 0 && nx < W) {
      const ni = y * W + nx;
      if (grid[ni] === EMPTY) {
        grid[ni] = FIRE;
        ages[ni] = Math.floor(ages[i] * 0.5);
        upd[ni] = 1;
      }
    }
  }
}

// Madera ardiendo: el agua adyacente la apaga; si no, se consume emitiendo fuego
function stepBurningWood(sim: Sim, x: number, y: number, i: number) {
  const { W, H, grid, ages, upd } = sim;

  if (countNeighbors(sim, x, y, WATER) > 0) {
    grid[i] = EMPTY; ages[i] = 0;
    return;
  }

  // Se consume despacio — desaparece al quemarse del todo
  ages[i] = Math.max(0, ages[i] - 1);
  if (ages[i] === 0) { grid[i] = EMPTY; return; }

  // Emite fuego hacia arriba
  if (y > 0 && Math.random() > 0.45) {
    const ai = (y - 1) * W + x;
    if (grid[ai] === EMPTY) {
      grid[ai] = FIRE; ages[ai] = Math.floor(ages[i] * 0.5); upd[ai] = 1;
    }
  }

  // Propaga el fuego a cada madera adyacente de forma independiente
  for (const [dx, dy] of DIRS4) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
    const ni = ny * W + nx;
    if (grid[ni] === WALL && ages[ni] === 0 && Math.random() > 0.90) {
      ages[ni] = 600 + Math.floor(Math.random() * 200);
    }
  }
}

// Un tick de simulación: barre de abajo arriba con dirección horizontal aleatoria
export function step(sim: Sim) {
  const { W, H, grid, ages, upd } = sim;
  upd.fill(0);

  for (let y = H - 1; y >= 0; y--) {
    const ltr = Math.random() > 0.5;
    for (let xi = 0; xi < W; xi++) {
      const x = ltr ? xi : W - 1 - xi;
      const i = y * W + x;
      if (upd[i]) continue;
      const type = grid[i];
      if (type === EMPTY) continue;
      if (type === SAND) stepSand(sim, x, y, i);
      else if (type === WATER) stepWater(sim, x, y, i);
      else if (type === VAPOR) stepVapor(sim, x, y, i);
      else if (type === FIRE) stepFire(sim, x, y, i);
      else if (ages[i] > 0) stepBurningWood(sim, x, y, i); // WALL: la madera sin arder es inerte
    }
  }
}
