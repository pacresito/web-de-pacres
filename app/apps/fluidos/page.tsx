"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const CELL = 2;
const EMPTY = 0, SAND = 1, WATER = 2, FIRE = 3, WALL = 4, VAPOR = 5;
const WATER_HEAT_MAX = 55;   // ticks for heated water to vaporize
const VAPOR_CONDENSE_MAX = 90; // ticks for stuck vapor to condense back to water
const MOVE = 98;
type Mat = 0 | 1 | 2 | 3 | 4 | 5;
type Tool = Mat | 98 | 99;

const TOOL_DEFS: { id: Tool; label: string; key: string; color: string; border: string }[] = [
  { id: WATER as Tool, label: "Agua",  key: "1", color: "#3b82f6", border: "rgba(59,130,246,0.4)" },
  { id: FIRE  as Tool, label: "Fuego", key: "2", color: "#f97316", border: "rgba(249,115,22,0.4)" },
  { id: SAND  as Tool, label: "Tierra",key: "3", color: "#c2a96e", border: "rgba(194,169,110,0.4)" },
  { id: WALL  as Tool, label: "Madera",key: "4", color: "#8b5e3c", border: "rgba(139,94,60,0.4)" },
  { id: MOVE  as Tool, label: "Mover", key: "5", color: "#a78bfa", border: "rgba(167,139,250,0.4)" },
  { id: 99    as Tool, label: "Borrar",key: "6", color: "#111827", border: "rgba(17,24,39,0.4)" },
];

export default function Fluidos() {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (whyOpen) {
      document.documentElement.style.height = "auto";
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    } else {
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [whyOpen]);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const wrapRef        = useRef<HTMLDivElement>(null);
  const gridRef        = useRef<Uint8Array | null>(null);
  const agesRef        = useRef<Uint8Array | null>(null);
  const updRef         = useRef<Uint8Array | null>(null);
  const compRef        = useRef<Uint16Array | null>(null); // wood component IDs
  const nextCompRef    = useRef(1);                        // next component ID counter
  const dimRef         = useRef({ W: 0, H: 0 });
  const toolRef        = useRef<Tool>(WATER as Tool);
  const brushRef       = useRef(5);
  const paintRef       = useRef(false);
  const lastPosRef     = useRef<{ x: number; y: number } | null>(null);
  const rafRef         = useRef(0);
  const woodAnchorRef  = useRef<{ x: number; y: number } | null>(null); // pixel anchor for grab
  const woodMovedRef   = useRef({ x: 0, y: 0 });                        // cells moved since grab start
  const woodGrabRef    = useRef(false);                                   // whether wood is grabbed
  const carriedRef     = useRef<{dx: number; dy: number; type: Mat; age: number}[]>([]);
  const carryPosRef    = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>(WATER as Tool);

  const setToolSync = useCallback((t: Tool) => {
    toolRef.current = t;
    brushRef.current = (t === MOVE || t === 99) ? 8 : 5;
    setTool(t);
  }, []);

  // Init grid
  const initGrid = useCallback((W: number, H: number) => {
    dimRef.current = { W, H };
    gridRef.current = new Uint8Array(W * H);
    agesRef.current = new Uint8Array(W * H);
    updRef.current  = new Uint8Array(W * H);
    compRef.current  = new Uint16Array(W * H);
  }, []);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const W = Math.floor(wrap.clientWidth  / CELL);
      const H = Math.floor(wrap.clientHeight / CELL);
      if (W === dimRef.current.W && H === dimRef.current.H) return;
      canvas.width  = W * CELL;
      canvas.height = H * CELL;
      initGrid(W, H);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [initGrid]);

  // Paint cells at canvas pixel position — with material interaction rules
  const paintAt = useCallback((px: number, py: number) => {
    const { W, H } = dimRef.current;
    const grid = gridRef.current;
    const ages = agesRef.current;
    const comp = compRef.current;
    if (!grid || !ages) return;

    const gx = Math.floor(px / CELL);
    const gy = Math.floor(py / CELL);
    const r  = brushRef.current;
    const t  = toolRef.current;

    // Union-find: assign compId to new wood cell, merging any adjacent components
    const assignWoodComp = (idx: number, nx: number, ny: number) => {
      if (!comp) return;
      const adjCids: number[] = [];
      for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const ax = nx + ddx, ay = ny + ddy;
        if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
        if (grid[ay * W + ax] === WALL) {
          const cid = comp[ay * W + ax];
          if (cid && !adjCids.includes(cid)) adjCids.push(cid);
        }
      }
      let finalCid: number;
      if (adjCids.length === 0) {
        finalCid = nextCompRef.current;
        if (++nextCompRef.current > 65534) nextCompRef.current = 1;
      } else {
        finalCid = adjCids[0];
        // Merge all other adjacent compIds into finalCid
        for (let j = 1; j < adjCids.length; j++) {
          const oldCid = adjCids[j];
          for (let k = 0; k < W * H; k++) {
            if (comp[k] === oldCid) comp[k] = finalCid;
          }
        }
      }
      comp[idx] = finalCid;
    };

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const i = ny * W + nx;
        const existing = grid[i];

        // Eraser: always clears
        if (t === 99) { grid[i] = EMPTY; ages[i] = 0; if (comp) comp[i] = 0; continue; }

        if (existing === EMPTY || existing === FIRE) {
          grid[i] = t as Mat;
          ages[i] = t === FIRE ? 60 + Math.floor(Math.random() * 80) : 0;
          if (t === WALL) assignWoodComp(i, nx, ny);

        } else if (existing === WALL) {
          if (t === FIRE && ages[i] === 0) ages[i] = 600 + Math.floor(Math.random() * 200);

        } else if (existing === WATER) {
          if (t === SAND || t === WALL || t === FIRE) {
            grid[i] = t as Mat;
            ages[i] = t === FIRE ? 60 + Math.floor(Math.random() * 80) : 0;
            if (t === WALL) assignWoodComp(i, nx, ny);
          }

        } else if (existing === SAND) {
          if (t === SAND || t === WALL) {
            grid[i] = t as Mat; ages[i] = 0;
            if (t === WALL) assignWoodComp(i, nx, ny);
          }
        }
      }
    }
  }, []);

  // Push cells in the direction of mouse movement, cascading into chains
  const moveAt = useCallback((px: number, py: number, dpx: number, dpy: number) => {
    const { W, H } = dimRef.current;
    const grid = gridRef.current;
    const ages = agesRef.current;
    const comp = compRef.current;
    if (!grid || !ages) return;

    const gx  = Math.floor(px / CELL);
    const gy  = Math.floor(py / CELL);
    const r   = brushRef.current;
    const dirX = dpx === 0 ? 0 : (dpx > 0 ? 1 : -1);
    const dirY = dpy === 0 ? 0 : (dpy > 0 ? 1 : -1);
    if (dirX === 0 && dirY === 0) return;

    // max(ceil|dpx|, ceil|dpy|) — preserves fluid responsiveness, fixes diagonal doubling
    const steps = Math.min(8, Math.max(1, Math.max(Math.ceil(Math.abs(dpx) / CELL), Math.ceil(Math.abs(dpy) / CELL))));

    // Shift a chain from (cx,cy) into the empty at (ex,ey), moving in direction (ddx,ddy)
    const shiftInDir = (cx: number, cy: number, ex: number, ey: number, ddx: number, ddy: number) => {
      let tx = ex, ty = ey;
      while (tx !== cx || ty !== cy) {
        const bx = tx - ddx, by = ty - ddy;
        grid[ty * W + tx] = grid[by * W + bx];
        ages[ty * W + tx]  = ages[by * W + bx];
        tx = bx; ty = by;
      }
      grid[cy * W + cx] = EMPTY; ages[cy * W + cx] = 0;
    };

    // Find first empty in direction (ddx,ddy), cascading through same material
    // Sand also cascades through water (it sinks)
    const findEndInDir = (cx: number, cy: number, mat: number, ddx: number, ddy: number): {ex: number; ey: number} | null => {
      let ex = cx + ddx, ey = cy + ddy;
      while (ex >= 0 && ex < W && ey >= 0 && ey < H) {
        const obs = grid[ey * W + ex];
        if (obs === EMPTY) return { ex, ey };
        if (obs !== mat && !(mat === SAND && obs === WATER)) return null;
        ex += ddx; ey += ddy;
      }
      return null;
    };

    // Try push direction first, then perpendiculars — lets sand/water escape sideways
    const perps: [number, number][] = dirX !== 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
    const allDirs: [number, number][] = [[dirX, dirY], ...perps];

    const findEndAny = (cx: number, cy: number, mat: number): {ex: number; ey: number; ddx: number; ddy: number} | null => {
      for (const [ddx, ddy] of allDirs) {
        const end = findEndInDir(cx, cy, mat, ddx, ddy);
        if (end) return { ...end, ddx, ddy };
      }
      // Sand cascades through sand to reach and displace water when no empty escape exists
      if (mat === SAND) {
        for (const [ddx, ddy] of allDirs) {
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
    };

    // BFS: collect connected wood component from (sx,sy) with same compId, excluding excludeSet
    const collectWood = (sx: number, sy: number, excludeSet: Set<number>): {cells: {cx: number; cy: number}[]; idxSet: Set<number>} => {
      const targetCid = comp ? comp[sy * W + sx] : 0;
      const cells: {cx: number; cy: number}[] = [];
      const idxSet = new Set<number>();
      const queue = [{ cx: sx, cy: sy }];
      idxSet.add(sy * W + sx); cells.push({ cx: sx, cy: sy });
      for (let qi = 0; qi < queue.length; qi++) {
        const { cx: qx, cy: qy } = queue[qi];
        for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
          const ax = qx + ddx, ay = qy + ddy;
          if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
          const ai = ay * W + ax;
          if (idxSet.has(ai) || excludeSet.has(ai) || grid[ai] !== WALL || (comp && comp[ai] !== targetCid)) continue;
          idxSet.add(ai); cells.push({ cx: ax, cy: ay }); queue.push({ cx: ax, cy: ay });
        }
      }
      return { cells, idxSet };
    };

    // Try to move a wood component one step in (dirX,dirY).
    // Billiard: if front face has another wood piece, recursively push it first.
    // Water never blocks; sand blocks only if it has no escape route.
    const tryMoveWood = (wCells: {cx: number; cy: number}[], wIdxSet: Set<number>, depth = 0): boolean => {
      if (depth > 5) return false;
      const face: {cx: number; cy: number}[] = [];
      const faceSet = new Set<number>();

      for (const { cx, cy } of wCells) {
        const nx = cx + dirX, ny = cy + dirY;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) return false;
        const ni = ny * W + nx;
        if (wIdxSet.has(ni)) continue;
        const obs = grid[ni];
        if (obs === EMPTY || obs === FIRE) continue;
        if (obs === WALL) {
          // Billiard: try to push the other piece out of the way
          const { cells: bCells, idxSet: bIdxSet } = collectWood(nx, ny, wIdxSet);
          if (!tryMoveWood(bCells, bIdxSet, depth + 1)) return false;
          continue;
        }
        if (!faceSet.has(ni)) { faceSet.add(ni); face.push({ cx: nx, cy: ny }); }
      }

      // Sand must have an escape route; water is always passable
      for (const { cx, cy } of face) {
        const mat = grid[cy * W + cx];
        if (mat !== WATER && !findEndAny(cx, cy, mat)) return false;
      }

      // Push face material first (furthest first), then move wood
      face.sort((a, b) => dirX !== 0 ? (dirX > 0 ? b.cx - a.cx : a.cx - b.cx) : (dirY > 0 ? b.cy - a.cy : a.cy - b.cy));
      for (const { cx, cy } of face) {
        const mat = grid[cy * W + cx];
        if (mat === EMPTY) continue;
        const end = findEndAny(cx, cy, mat);
        if (end) {
          const destMat = grid[end.ey * W + end.ex];
          const destAge = ages[end.ey * W + end.ex];
          shiftInDir(cx, cy, end.ex, end.ey, end.ddx, end.ddy);
          // If destination was water (not empty), it got overwritten — restore it nearby
          if (destMat === WATER) {
            // Water floats up from where it was displaced
            const wx0 = end.ex, wy0 = end.ey;
            let placed = false;
            if (wy0 > 0 && grid[(wy0 - 1) * W + wx0] === EMPTY) {
              grid[(wy0 - 1) * W + wx0] = WATER; ages[(wy0 - 1) * W + wx0] = destAge; placed = true;
            }
            if (!placed) {
              for (const d of (Math.random() > 0.5 ? [-1, 1] : [1, -1])) {
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
      }

      // Rigid-body move: snapshot → clear → write (carry component ID)
      const snap = wCells.map(({ cx, cy }) => ({ cx, cy, val: grid[cy * W + cx], age: ages[cy * W + cx], cid: comp ? comp[cy * W + cx] : 0 }));
      for (const { cx, cy } of snap) { grid[cy * W + cx] = EMPTY; ages[cy * W + cx] = 0; if (comp) comp[cy * W + cx] = 0; }
      for (const { cx, cy, val, age, cid } of snap) {
        grid[(cy + dirY) * W + (cx + dirX)] = val;
        ages[(cy + dirY) * W + (cx + dirX)] = age;
        if (comp) comp[(cy + dirY) * W + (cx + dirX)] = cid;
      }
      wIdxSet.clear();
      for (let i = 0; i < wCells.length; i++) {
        wCells[i] = { cx: wCells[i].cx + dirX, cy: wCells[i].cy + dirY };
        wIdxSet.add(wCells[i].cy * W + wCells[i].cx);
      }
      return true;
    };

    // Collect brush cells; expand any touched wood to its full connected component (grab)
    const visited = new Set<number>();
    const woodCells: {cx: number; cy: number}[] = [];
    const otherCells: {cx: number; cy: number}[] = [];

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const ni = ny * W + nx;
        if (grid[ni] === EMPTY || visited.has(ni)) continue;
        visited.add(ni);
        if (grid[ni] === WALL) {
          const startCid = comp ? comp[ni] : 0;
          woodCells.push({ cx: nx, cy: ny });
          const queue = [{ cx: nx, cy: ny }];
          for (let qi = 0; qi < queue.length; qi++) {
            const { cx: qx, cy: qy } = queue[qi];
            for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
              const ax = qx + ddx, ay = qy + ddy;
              if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
              const ai = ay * W + ax;
              if (visited.has(ai) || grid[ai] !== WALL || (comp && comp[ai] !== startCid)) continue;
              visited.add(ai); woodCells.push({ cx: ax, cy: ay }); queue.push({ cx: ax, cy: ay });
            }
          }
        } else {
          otherCells.push({ cx: nx, cy: ny });
        }
      }
    }

    const sortFn = (a: {cx:number;cy:number}, b: {cx:number;cy:number}) =>
      dirX !== 0 ? (dirX > 0 ? b.cx - a.cx : a.cx - b.cx) : (dirY > 0 ? b.cy - a.cy : a.cy - b.cy);
    otherCells.sort(sortFn);

    const woodIdxSet = new Set<number>(woodCells.map(c => c.cy * W + c.cx));

    for (let s = 0; s < steps; s++) {
      if (woodCells.length > 0) tryMoveWood(woodCells, woodIdxSet);

      for (let i = 0; i < otherCells.length; i++) {
        const { cx, cy } = otherCells[i];
        const mat = grid[cy * W + cx];
        if (mat === EMPTY) continue;
        const end = findEndInDir(cx, cy, mat, dirX, dirY);
        if (!end) continue;
        shiftInDir(cx, cy, end.ex, end.ey, dirX, dirY);
        otherCells[i] = { cx: cx + dirX, cy: cy + dirY };
      }
    }
  }, []);

  // Simulation step
  const step = useCallback(() => {
    const { W, H } = dimRef.current;
    const grid = gridRef.current;
    const ages = agesRef.current;
    const upd  = updRef.current;
    if (!grid || !ages || !upd) return;

    upd.fill(0);

    for (let y = H - 1; y >= 0; y--) {
      const ltr = Math.random() > 0.5;
      for (let xi = 0; xi < W; xi++) {
        const x = ltr ? xi : W - 1 - xi;
        const i = y * W + x;
        if (upd[i]) continue;
        const type = grid[i];
        if (type === EMPTY) continue;
        if (type === WALL && ages[i] === 0) continue; // skip non-burning wood

        // SAND (Tierra)
        if (type === SAND) {
          if (y < H - 1) {
            const bi = (y + 1) * W + x;
            if (grid[bi] === EMPTY || grid[bi] === WATER) {
              const was = grid[bi];
              grid[bi] = SAND; upd[bi] = 1;
              grid[i] = was;  upd[i] = 1; // mark both so no re-processing this frame
              continue;
            }
            const dirs = Math.random() > 0.5 ? [-1, 1] : [1, -1];
            for (const d of dirs) {
              const nx = x + d;
              if (nx < 0 || nx >= W) continue;
              const ni = (y + 1) * W + nx;
              if (grid[ni] === EMPTY || grid[ni] === WATER) {
                const was = grid[ni];
                grid[ni] = SAND; upd[ni] = 1;
                grid[i] = was;  upd[i] = 1;
                break;
              }
            }
          }
          continue;
        }

        // WATER
        if (type === WATER) {
          // Heat from adjacent fire — gradually vaporize
          let fireAdj = false;
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x+dx, ny2 = y+dy;
            if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
            if (grid[ny2*W+nx] === FIRE) { fireAdj = true; break; }
          }
          if (fireAdj) {
            ages[i]++;
            if (ages[i] >= WATER_HEAT_MAX) { grid[i] = VAPOR; ages[i] = 0; upd[i] = 1; continue; }
          } else if (ages[i] > 0) {
            ages[i]--;
          }
          if (y < H - 1) {
            const bi = (y + 1) * W + x;
            if (grid[bi] === EMPTY) {
              grid[bi] = WATER; upd[bi] = 1;
              grid[i] = EMPTY; continue;
            }

            const dirs = Math.random() > 0.5 ? [-1, 1] : [1, -1];
            let moved = false;
            for (const d of dirs) {
              const nx = x + d;
              if (nx < 0 || nx >= W) continue;
              const ni = (y + 1) * W + nx;
              if (grid[ni] === EMPTY) {
                grid[ni] = WATER; upd[ni] = 1;
                grid[i] = EMPTY; moved = true; break;
              }
            }
            if (moved) continue;
          }
          // Spread sideways
          const dirs = Math.random() > 0.5 ? [-1, 1] : [1, -1];
          for (const d of dirs) {
            const nx = x + d;
            if (nx < 0 || nx >= W) continue;
            const ni = y * W + nx;
            if (grid[ni] === EMPTY) {
              grid[ni] = WATER; upd[ni] = 1;
              grid[i] = EMPTY; break;
            }
          }
          continue;
        }

        // VAPOR — rises slowly and erratically (through water too), condenses at ceiling
        if (type === VAPOR) {
          // Slow down: only act ~45% of ticks
          if (Math.random() > 0.45) continue;

          const atTop = y === 0;
          const above = atTop ? WALL : grid[(y - 1) * W + x];
          const atCeiling = atTop || above === WALL;

          // Erratic sideways drift even when rise is possible (~25% chance)
          const driftFirst = !atCeiling && Math.random() < 0.25;

          let moved = false;

          if (!driftFirst && !atTop) {
            if (above === EMPTY) {
              grid[(y-1)*W+x] = VAPOR; ages[(y-1)*W+x] = ages[i]; upd[(y-1)*W+x] = 1;
              grid[i] = EMPTY; ages[i] = 0; moved = true;
            } else if (above === WATER) {
              grid[(y-1)*W+x] = VAPOR; ages[(y-1)*W+x] = ages[i]; upd[(y-1)*W+x] = 1;
              grid[i] = WATER; ages[i] = 0; upd[i] = 1; moved = true;
            }
          }

          if (!moved) {
            // Drift sideways — also try diagonal up
            const r = Math.random();
            const dirs: [number, number][] = r < 0.33
              ? [[-1, 0], [1, 0], [-1, -1], [1, -1]]
              : r < 0.66
              ? [[1, 0], [-1, 0], [1, -1], [-1, -1]]
              : [[-1, -1], [1, -1], [-1, 0], [1, 0]];
            for (const [dx, dy] of dirs) {
              const nx = x + dx, ny2 = y + dy;
              if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
              const ni = ny2 * W + nx;
              if (grid[ni] === EMPTY) {
                grid[ni] = VAPOR; ages[ni] = ages[i]; upd[ni] = 1;
                grid[i] = EMPTY;
                if (!atCeiling) ages[i] = 0;
                moved = true; break;
              }
            }
          }

          if (!moved || atCeiling) {
            ages[i] = Math.min(ages[i] + (atCeiling ? 2 : 1), VAPOR_CONDENSE_MAX);
            if (ages[i] >= VAPOR_CONDENSE_MAX) {
              grid[i] = WATER; ages[i] = 0; upd[i] = 1;
            }
          }
          continue;
        }

        // FIRE
        if (type === FIRE) {
          // Age faster when surrounded by water (fire struggles in water)
          let waterNeighbors = 0;
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x+dx, ny2 = y+dy;
            if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
            if (grid[ny2*W+nx] === WATER) waterNeighbors++;
          }
          ages[i] = Math.max(0, ages[i] - 1 - (Math.random() > 0.6 ? 1 : 0) - waterNeighbors);
          if (ages[i] === 0) { grid[i] = EMPTY; continue; }

          // Ignite adjacent wood
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x+dx, ny2 = y+dy;
            if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
            const ni = ny2*W+nx;
            if (grid[ni] === WALL && ages[ni] === 0 && Math.random() > 0.82) {
              ages[ni] = 600 + Math.floor(Math.random() * 200);
            }
          }

          // Rise upward
          if (y > 0) {
            const ai = (y - 1) * W + x;
            if (grid[ai] === EMPTY && Math.random() > 0.3) {
              grid[ai] = FIRE;
              ages[ai] = Math.floor(ages[i] * (0.45 + Math.random() * 0.3));
              upd[ai] = 1;
              grid[i] = EMPTY; continue;
            }
          }

          // Spread sideways occasionally
          if (Math.random() > 0.82) {
            const d = Math.random() > 0.5 ? -1 : 1;
            const nx = x + d;
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

        // WALL (wood) — burns when ignited, only water stops it
        if (type === WALL && ages[i] > 0) {
          // Extinguish if water adjacent
          let wet = false;
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x+dx, ny2 = y+dy;
            if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
            if (grid[ny2*W+nx] === WATER) { wet = true; break; }
          }
          if (wet) { grid[i] = EMPTY; ages[i] = 0; continue; }
          // Consume slowly — disappears when fully burnt
          ages[i] = Math.max(0, ages[i] - 1);
          if (ages[i] === 0) { grid[i] = EMPTY; continue; }

          // Emit fire upward
          if (y > 0 && Math.random() > 0.45) {
            const ai = (y - 1) * W + x;
            if (grid[ai] === EMPTY) {
              grid[ai] = FIRE; ages[ai] = Math.floor(ages[i] * 0.5); upd[ai] = 1;
            }
          }

          // Spread fire to all adjacent wood cells independently
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x+dx, ny2 = y+dy;
            if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
            const ni = ny2*W+nx;
            if (grid[ni] === WALL && ages[ni] === 0 && Math.random() > 0.90) {
              ages[ni] = 600 + Math.floor(Math.random() * 200);
            }
          }
        }
      }
    }
  }, []);

  // Render frame
  const render = useCallback(() => {
    const { W, H } = dimRef.current;
    const grid   = gridRef.current;
    const ages   = agesRef.current;
    const canvas = canvasRef.current;
    if (!grid || !ages || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i    = y * W + x;
        const type = grid[i];
        if (type === EMPTY) continue;

        let color: string;
        let skipFill = false;

        if (type === SAND) {
          // Stable per-grain hash → consistent texture across frames
          const h = ((x * 374761393 + y * 668265263) >>> 0) & 0xff;
          const v1 = h % 38, v2 = (h >> 5) % 18;
          color = `rgb(${178 + v1},${146 + Math.floor(v1 * 0.5)},${82 + Math.floor(v1 * 0.15) - v2})`;

        } else if (type === WATER) {
          // Darker, deeper blue with gentle shimmer; blends to white when heated
          const wave = Math.sin((x * 0.35 + t / 500)) * 4;
          const depth = Math.min(y / H, 1);
          const w = Math.floor(wave);
          const br = Math.max(18, 32 - Math.floor(depth * 12) + w);
          const bg = Math.max(70, 105 - Math.floor(depth * 25) + w);
          const bb = Math.min(255, 215 + w);
          const heat = ages[i] > 0 ? Math.min(1, ages[i] / WATER_HEAT_MAX) : 0;
          color = `rgb(${Math.round(br + heat*(255-br))},${Math.round(bg + heat*(255-bg))},${Math.round(bb + heat*(255-bb))})`;

        } else if (type === FIRE) {
          // Yellow-white core → orange → dark red as age drops
          const flick = ((x * 7 + y * 11 + Math.floor(t / 50)) & 0x1f) / 31;
          const age_r = Math.min(1, ages[i] / 140) * 0.72 + flick * 0.28;
          let fr: number, fg: number, fb: number;
          if (age_r > 0.6) {
            const p = (age_r - 0.6) / 0.4;
            fr = 255; fg = Math.floor(140 + p * 115); fb = Math.floor(p * 55);
          } else if (age_r > 0.28) {
            const p = (age_r - 0.28) / 0.32;
            fr = 255; fg = Math.floor(40 + p * 100); fb = 0;
          } else {
            const p = age_r / 0.28;
            fr = Math.floor(120 + p * 135); fg = Math.floor(p * 40); fb = 0;
          }
          color = `rgb(${fr},${fg},${fb})`;

        } else if (type === VAPOR) {
          // White → gray → dark as condensation builds; drawn as cross (larger than 1 cell)
          const condensation = Math.min(1, ages[i] / VAPOR_CONDENSE_MAX);
          const base = Math.floor(235 - condensation * 185);
          const flick = ((x * 13 + y * 7 + Math.floor(t / 80)) & 0x1f) / 31 * 20;
          const v = Math.floor(flick);
          const cr = Math.min(255, base + v), cg = Math.min(255, base + 8 + v), cb = Math.min(255, base + 35 + v);
          color = `rgb(${cr},${cg},${cb})`;
          skipFill = true;
          ctx.fillStyle = color;
          const px = x * CELL, py = y * CELL, half = CELL / 2;
          const ext = Math.round(CELL * 2.2), arm = Math.max(1, Math.round(CELL * 0.75));
          ctx.fillRect(px + half - ext, py + half - arm, ext * 2, arm * 2); // horizontal
          ctx.fillRect(px + half - arm, py + half - ext, arm * 2, ext * 2); // vertical

        } else {
          // WALL — wood grain
          const grain = ((y * 4 + (x >> 3)) & 0xff) % 4;
          const h = ((x * 1664525 + y * 1013904223) >>> 0) & 0xff;
          const v = h % 20;
          const g = grain < 2 ? 10 : 0;
          if (ages[i] > 0) {
            // Burning: charred wood with orange glow
            const ratio = ages[i] / 180;
            const glow = Math.floor(ratio * 110);
            color = `rgb(${38 + glow},${18 + Math.floor(glow * 0.25)},${8})`;
          } else {
            color = `rgb(${130 + v + g},${80 + Math.floor(v * 0.7) + g},${38 + Math.floor(v * 0.3)})`;
          }
        }

        if (!skipFill) {
          ctx.fillStyle = color;
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }

    // Carried cells overlay
    const carried = carriedRef.current;
    const carryPos = carryPosRef.current;
    if (carried.length > 0 && carryPos) {
      ctx.globalAlpha = 0.88;
      for (const { dx, dy, type, age } of carried) {
        const cx = carryPos.x + dx, cy = carryPos.y + dy;
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
        let overlayColor: string;
        if (type === SAND) {
          const h = ((cx * 374761393 + cy * 668265263) >>> 0) & 0xff;
          const v1 = h % 38, v2 = (h >> 5) % 18;
          overlayColor = `rgb(${178 + v1},${146 + Math.floor(v1 * 0.5)},${82 + Math.floor(v1 * 0.15) - v2})`;
        } else if (type === WATER) {
          const wave = Math.sin((cx * 0.35 + t / 500)) * 4;
          const depth = Math.min(cy / H, 1);
          const w = Math.floor(wave);
          overlayColor = `rgb(${Math.max(18, 32 - Math.floor(depth * 12) + w)},${Math.max(70, 105 - Math.floor(depth * 25) + w)},${215 + w})`;
        } else {
          const flick = ((cx * 7 + cy * 11 + Math.floor(t / 50)) & 0x1f) / 31;
          const age_r = Math.min(1, age / 140) * 0.72 + flick * 0.28;
          let fr: number, fg: number, fb: number;
          if (age_r > 0.6) {
            const p = (age_r - 0.6) / 0.4;
            fr = 255; fg = Math.floor(140 + p * 115); fb = Math.floor(p * 55);
          } else if (age_r > 0.28) {
            const p = (age_r - 0.28) / 0.32;
            fr = 255; fg = Math.floor(40 + p * 100); fb = 0;
          } else {
            const p = age_r / 0.28;
            fr = Math.floor(120 + p * 135); fg = Math.floor(p * 40); fb = 0;
          }
          overlayColor = `rgb(${fr},${fg},${fb})`;
        }
        ctx.fillStyle = overlayColor;
        ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      }
      ctx.globalAlpha = 1;
    }
  }, []);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      step();
      render();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [step, render]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") setToolSync(WATER as Tool);
      if (e.key === "2") setToolSync(FIRE  as Tool);
      if (e.key === "3") setToolSync(SAND  as Tool);
      if (e.key === "4") setToolSync(WALL  as Tool);
      if (e.key === "5") setToolSync(MOVE  as Tool);
      if (e.key === "6" || e.key === "e") setToolSync(99 as Tool);
      if (e.key === "c" || e.key === "C") {
        gridRef.current?.fill(0);
        agesRef.current?.fill(0);
        compRef.current?.fill(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setToolSync]);

  // Canvas input events (mouse + touch, native to avoid passive issues)
  const getCanvasPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx   = canvas.width  / rect.width;
    const sy   = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = (e as TouchEvent).touches[0];
      if (!touch) return null;
      return { x: (touch.clientX - rect.left) * sx, y: (touch.clientY - rect.top) * sy };
    }
    return { x: ((e as MouseEvent).clientX - rect.left) * sx, y: ((e as MouseEvent).clientY - rect.top) * sy };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      paintRef.current = true;
      const pos = getCanvasPos(e);
      if (!pos) return;
      lastPosRef.current = pos;
      if (toolRef.current === MOVE) {
        // Check for wood in brush to decide if we're grabbing
        const { W, H } = dimRef.current;
        const grid = gridRef.current;
        const gx = Math.floor(pos.x / CELL), gy = Math.floor(pos.y / CELL);
        const r = brushRef.current;
        let found = false;
        outer: for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            if (dx*dx + dy*dy > r*r) continue;
            const nx = gx+dx, ny = gy+dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            if (grid && grid[ny * W + nx] === WALL) { found = true; break outer; }
          }
        }
        woodGrabRef.current = found;
        woodAnchorRef.current = pos;
        woodMovedRef.current = { x: 0, y: 0 };
        // Pick up non-wood cells in brush radius
        if (gridRef.current && agesRef.current) {
          const { W: pW, H: pH } = dimRef.current;
          const pgx = Math.floor(pos.x / CELL), pgy = Math.floor(pos.y / CELL);
          const pr = brushRef.current;
          const picked: {dx: number; dy: number; type: Mat; age: number}[] = [];
          for (let ddy = -pr; ddy <= pr; ddy++) {
            for (let ddx = -pr; ddx <= pr; ddx++) {
              if (ddx*ddx + ddy*ddy > pr*pr) continue;
              const nx = pgx+ddx, ny = pgy+ddy;
              if (nx < 0 || nx >= pW || ny < 0 || ny >= pH) continue;
              const pi = ny*pW+nx;
              if (gridRef.current[pi] !== EMPTY && gridRef.current[pi] !== WALL) {
                picked.push({ dx: ddx, dy: ddy, type: gridRef.current[pi] as Mat, age: agesRef.current[pi] });
                gridRef.current[pi] = EMPTY; agesRef.current[pi] = 0;
              }
            }
          }
          carriedRef.current = picked;
          carryPosRef.current = { x: pgx, y: pgy };
        }
      } else {
        paintAt(pos.x, pos.y);
      }
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!paintRef.current) return;
      const pos = getCanvasPos(e);
      if (!pos) return;
      if (toolRef.current === MOVE) {
        carryPosRef.current = { x: Math.floor(pos.x / CELL), y: Math.floor(pos.y / CELL) };
        const anchor = woodAnchorRef.current;
        if (anchor) {
          if (woodGrabRef.current) {
            // Anchor tracking: accumulated cell delta since grab start
            const totalDx = pos.x - anchor.x;
            const totalDy = pos.y - anchor.y;
            const targetX = Math.round(totalDx / CELL);
            const targetY = Math.round(totalDy / CELL);
            const dcx = targetX - woodMovedRef.current.x;
            const dcy = targetY - woodMovedRef.current.y;
            if (dcx !== 0 || dcy !== 0) {
              moveAt(pos.x, pos.y, dcx * CELL, dcy * CELL);
              woodMovedRef.current = { x: targetX, y: targetY };
            }
          } else {
            // No wood grabbed — push fluids with per-event delta
            const last = lastPosRef.current;
            if (last) moveAt(pos.x, pos.y, pos.x - last.x, pos.y - last.y);
          }
        }
      } else {
        paintAt(pos.x, pos.y);
      }
      lastPosRef.current = pos;
    };
    const onUp = () => {
      if (carriedRef.current.length > 0 && carryPosRef.current) {
        const { W: dW, H: dH } = dimRef.current;
        const dgrid = gridRef.current;
        const dages = agesRef.current;
        if (dgrid && dages) {
          const { x: dpx, y: dpy } = carryPosRef.current;
          for (const { dx, dy, type, age } of carriedRef.current) {
            const nx = dpx + dx, ny = dpy + dy;
            if (nx < 0 || nx >= dW || ny < 0 || ny >= dH) continue;
            const di = ny*dW+nx;
            if (dgrid[di] === EMPTY) { dgrid[di] = type; dages[di] = age; }
          }
        }
      }
      carriedRef.current = [];
      carryPosRef.current = null;
      paintRef.current = false;
      lastPosRef.current = null;
      woodAnchorRef.current = null;
      woodMovedRef.current = { x: 0, y: 0 };
      woodGrabRef.current = false;
    };

    canvas.addEventListener("mousedown",  onDown);
    canvas.addEventListener("mousemove",  onMove);
    window.addEventListener("mouseup",    onUp);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove",  onMove, { passive: false });
    canvas.addEventListener("touchend",   onUp);

    return () => {
      canvas.removeEventListener("mousedown",  onDown);
      canvas.removeEventListener("mousemove",  onMove);
      window.removeEventListener("mouseup",    onUp);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove",  onMove);
      canvas.removeEventListener("touchend",   onUp);
    };
  }, [getCanvasPos, paintAt]);

  const clearAll = () => {
    gridRef.current?.fill(0);
    agesRef.current?.fill(0);
  };

  return (
    <>
      <style>{`
        :root {
          --blue:    #3b82f6;
          --bg:      #ffffff;
          --text:    #111827;
          --muted:   #9ca3af;
          --border:  rgba(0,0,0,0.07);
          --sim-bg:  #0f1117;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { background: var(--bg); color: var(--text); font-family: var(--font-geist-sans), sans-serif; }

        .sim-header { padding: 1rem 0 0.6rem; }
        .sim-title {
          font-size: clamp(1.8rem, 5vw, 3rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1;
        }
        .sim-title span {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sim-sub {
          margin-top: 0.5rem;
          font-size: 0.82rem; color: var(--muted); line-height: 1.5;
        }

        .toolbar {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.6rem 0; flex-wrap: wrap;
        }
        .tool-btn {
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.4rem 0.75rem;
          border-radius: 4px; border: 1px solid var(--border);
          background: transparent; cursor: pointer;
          font-size: 0.72rem; font-weight: 600;
          font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.05em; color: var(--text);
          transition: border-color 0.15s, background 0.15s;
          -webkit-user-select: none; user-select: none;
        }
        .tool-btn:hover { border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.04); }
        .tool-btn.active { border-color: var(--active-border); background: var(--active-bg); color: var(--active-color); }
        .tool-dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0;
        }
        .tool-key {
          font-size: 0.6rem; color: var(--muted);
          background: rgba(0,0,0,0.06); border-radius: 2px;
          padding: 0.05rem 0.3rem; margin-left: 0.1rem;
        }

        .clear-btn {
          padding: 0.4rem 0.75rem; border-radius: 4px;
          border: 1px solid var(--border); background: transparent;
          cursor: pointer; font-size: 0.72rem; font-weight: 600;
          font-family: var(--font-geist-mono), monospace;
          color: var(--muted); letter-spacing: 0.05em;
          transition: color 0.15s, border-color 0.15s;
          -webkit-user-select: none; user-select: none;
        }
        .clear-btn:hover { color: var(--text); border-color: rgba(55,65,81,0.4); }

        .sim-wrap {
          flex: 1;
          min-height: 320px;
          background: var(--sim-bg);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }
        .sim-canvas {
          display: block;
          width: 100%; height: 100%;
          cursor: crosshair;
          touch-action: none;
        }
        .sim-canvas.tool-move { cursor: grab; }
        .sim-canvas.tool-move:active { cursor: grabbing; }

        .hint-row {
          padding: 0.55rem 0 0;
          font-size: 0.7rem; color: var(--muted);
          font-family: var(--font-geist-mono), monospace;
          display: flex; gap: 1.2rem; flex-wrap: wrap;
        }
        .hint-item { display: flex; gap: 0.35rem; align-items: center; }
        .hint-key {
          background: rgba(0,0,0,0.06); border-radius: 2px;
          padding: 0.05rem 0.3rem; font-size: 0.62rem;
        }

        .pacres-link {
          font-size: 0.75rem; color: var(--muted);
          font-family: var(--font-geist-mono), monospace;
          text-decoration: none; transition: color 0.2s;
        }
        .pacres-link:hover { color: var(--blue); }

        @media (max-width: 500px) {
          .tool-label { display: none; }
          .toolbar { gap: 0.25rem; }
          .tool-btn { padding: 0.4rem 0.45rem; gap: 0.25rem; }
          .hint-row { gap: 0.8rem; }
          .sim-sub { display: none; }
        }
      `}</style>

      <main style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 clamp(1.25rem, 4vw, 2rem)",
        height: whyOpen ? "auto" : "100dvh",
        minHeight: "100dvh",
        overflowX: "hidden",
        overflowY: whyOpen ? "auto" : "hidden",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header */}
        <div className="sim-header">
          <h1 className="sim-title"><span>Fluidos</span></h1>
          <p className="sim-sub">Agua, fuego, tierra. Controla los elementos.</p>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          {TOOL_DEFS.map(({ id, label, key, color, border }) => {
            const isActive = tool === id;
            return (
              <button
                key={id}
                className={`tool-btn${isActive ? " active" : ""}`}
                style={isActive ? {
                  "--active-border": border,
                  "--active-bg":     `${color}18`,
                  "--active-color":  color,
                } as React.CSSProperties : {}}
                onClick={() => setToolSync(id)}
              >
                <span
                  className="tool-dot"
                  style={{ background: color, boxShadow: isActive ? `0 0 6px ${color}88` : "none" }}
                />
                <span className="tool-label">{label}</span>
                <span className="tool-key">{key}</span>
              </button>
            );
          })}

          <button className="clear-btn" onClick={clearAll}>
            <span className="tool-label">Limpiar </span><span className="tool-key">C</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="sim-wrap" ref={wrapRef}>
          <canvas className={`sim-canvas${tool === MOVE ? " tool-move" : ""}`} ref={canvasRef} />
        </div>

        {/* Hints */}
        <div style={{ padding: "0.45rem 0 0" }}>
          <div className="hint-row">
            <span className="hint-item">La tierra se hunde en el agua · El fuego vaporiza el agua · El vapor sube y condensa · El fuego quema la madera</span>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "auto", paddingTop: "1.5rem", paddingBottom: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", width: 480, maxWidth: "100%", position: "relative" }}>
            <Link href="/lab" className="pacres-link">pacr.es</Link>
            <button
              onClick={() => { const next = !whyOpen; setWhyOpen(next); if (next) setTimeout(() => whyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50); }}
              style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.7rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono), monospace", transition: "color 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
            >
              ¿Por qué un simulador de fluidos?
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {whyOpen && (
            <div ref={whyRef} style={{ maxWidth: 420, fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.65, textAlign: "center", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <p>Un autómata celular de partículas es una simulación sobre una cuadrícula donde cada celda sigue reglas locales simples.</p>
              <p>De esas reglas emergen comportamientos complejos: agua fluyendo, arena acumulándose, fuego propagándose.</p>
              <p>Este enfoque se usa en videojuegos, simulaciones físicas y sistemas educativos por su simplicidad y eficiencia.</p>
              <p>En este experimento: la arena cae, el agua fluye, el fuego se expande, y cada elemento interactúa solo con sus vecinos inmediatos.</p>
              <p style={{ color: "#9ca3af", fontSize: "0.72rem" }}>Creado el 8 de mayo de 2026.</p>
            </div>
          )}
        </footer>

      </main>
    </>
  );
}
