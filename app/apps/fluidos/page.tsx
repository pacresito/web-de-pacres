"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const CELL = 4;
const EMPTY = 0, SAND = 1, WATER = 2, FIRE = 3, WALL = 4;
const MOVE = 98;
type Mat = 0 | 1 | 2 | 3 | 4;
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
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const gridRef    = useRef<Uint8Array | null>(null);
  const agesRef    = useRef<Uint8Array | null>(null);
  const updRef     = useRef<Uint8Array | null>(null);
  const dimRef     = useRef({ W: 0, H: 0 });
  const toolRef    = useRef<Tool>(WATER as Tool);
  const brushRef   = useRef(4);
  const paintRef   = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef     = useRef(0);

  const [tool, setTool] = useState<Tool>(WATER as Tool);

  const setToolSync = useCallback((t: Tool) => {
    toolRef.current = t;
    setTool(t);
  }, []);

  // Init grid
  const initGrid = useCallback((W: number, H: number) => {
    dimRef.current = { W, H };
    gridRef.current = new Uint8Array(W * H);
    agesRef.current = new Uint8Array(W * H);
    updRef.current  = new Uint8Array(W * H);
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
    if (!grid || !ages) return;

    const gx = Math.floor(px / CELL);
    const gy = Math.floor(py / CELL);
    const r  = brushRef.current;
    const t  = toolRef.current;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const i = ny * W + nx;
        const existing = grid[i];

        // Eraser: always clears
        if (t === 99) { grid[i] = EMPTY; ages[i] = 0; continue; }

        if (existing === EMPTY || existing === FIRE) {
          // Empty or fire: place anything
          grid[i] = t as Mat;
          ages[i] = t === FIRE ? 60 + Math.floor(Math.random() * 80)
                  : t === WALL ? 0
                  : 0;

        } else if (existing === WALL) {
          // Wood: only fire can interact (ignites it)
          if (t === FIRE && ages[i] === 0) {
            ages[i] = 600 + Math.floor(Math.random() * 200);
          }
          // water and sand: blocked

        } else if (existing === WATER) {
          // Water: sand and wood can be placed (physics handles displacement)
          // Fire: blocked (extinguished by water, no-op)
          if (t === SAND || t === WALL) {
            grid[i] = t as Mat; ages[i] = 0;
          }

        } else if (existing === SAND) {
          // Sand: more sand or wood can be placed (sand falls around wood); water and fire blocked
          if (t === SAND || t === WALL) {
            grid[i] = t as Mat; ages[i] = 0;
          }
          // water: blocked · fire: smothered, blocked
        }
      }
    }
  }, []);

  // Push cells in the direction of mouse movement, cascading into chains
  const moveAt = useCallback((px: number, py: number, dpx: number, dpy: number) => {
    const { W, H } = dimRef.current;
    const grid = gridRef.current;
    const ages = agesRef.current;
    if (!grid || !ages) return;

    const gx  = Math.floor(px / CELL);
    const gy  = Math.floor(py / CELL);
    const r   = brushRef.current;
    const dirX = dpx === 0 ? 0 : (dpx > 0 ? 1 : -1);
    const dirY = dpy === 0 ? 0 : (dpy > 0 ? 1 : -1);
    if (dirX === 0 && dirY === 0) return;

    const steps = Math.min(8, Math.max(1, Math.ceil(Math.hypot(dpx, dpy) / CELL)));

    // Collect brush cells; expand wood to its connected component
    const visited = new Set<number>();
    const woodCells: { cx: number; cy: number }[] = [];
    const otherCells: { cx: number; cy: number }[] = [];

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const ni = ny * W + nx;
        if (grid[ni] === EMPTY || visited.has(ni)) continue;
        visited.add(ni);
        if (grid[ni] === WALL) {
          woodCells.push({ cx: nx, cy: ny });
          const queue = [{ cx: nx, cy: ny }];
          for (let qi = 0; qi < queue.length; qi++) {
            const { cx: qx, cy: qy } = queue[qi];
            for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
              const ax = qx + ddx, ay = qy + ddy;
              if (ax < 0 || ax >= W || ay < 0 || ay >= H) continue;
              const ai = ay * W + ax;
              if (visited.has(ai) || grid[ai] !== WALL) continue;
              visited.add(ai);
              woodCells.push({ cx: ax, cy: ay });
              queue.push({ cx: ax, cy: ay });
            }
          }
        } else {
          otherCells.push({ cx: nx, cy: ny });
        }
      }
    }

    const sortFn = (a: {cx:number;cy:number}, b: {cx:number;cy:number}) =>
      dirX !== 0 ? (dirX > 0 ? b.cx - a.cx : a.cx - b.cx)
                 : (dirY > 0 ? b.cy - a.cy : a.cy - b.cy);
    otherCells.sort(sortFn);

    // Sand/water: cascade through same material, stop at foreign
    const findEnd = (cx: number, cy: number, mat: number): { ex: number; ey: number } | null => {
      let ex = cx + dirX, ey = cy + dirY;
      while (ex >= 0 && ex < W && ey >= 0 && ey < H) {
        const obs = grid[ey * W + ex];
        if (obs === EMPTY) return { ex, ey };
        if (obs !== mat) return null;
        ex += dirX; ey += dirY;
      }
      return null;
    };

    const shiftChain = (cx: number, cy: number, ex: number, ey: number) => {
      let tx = ex, ty = ey;
      while (tx !== cx || ty !== cy) {
        const bx = tx - dirX, by = ty - dirY;
        grid[ty * W + tx] = grid[by * W + bx];
        ages[ty * W + tx]  = ages[by * W + bx];
        tx = bx; ty = by;
      }
      grid[cy * W + cx] = EMPTY;
      ages[cy * W + cx] = 0;
    };

    // Index set of wood cell positions — lets canMove check skip intra-component cells
    const woodIdxSet = new Set<number>(woodCells.map(c => c.cy * W + c.cx));

    for (let s = 0; s < steps; s++) {
      // Wood: rigid body — snapshot → clear → write (simultaneous move, no chain artifacts)
      if (woodCells.length > 0) {
        let woodCanMove = true;
        for (const { cx, cy } of woodCells) {
          const nx = cx + dirX, ny = cy + dirY;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) { woodCanMove = false; break; }
          const obs = grid[ny * W + nx];
          // Blocked by sand or any non-component wood; water/fire/empty are passable
          if (obs === SAND || (obs === WALL && !woodIdxSet.has(ny * W + nx))) {
            woodCanMove = false; break;
          }
        }
        if (woodCanMove) {
          const snap = woodCells.map(({ cx, cy }) => ({
            cx, cy, val: grid[cy * W + cx], age: ages[cy * W + cx],
          }));
          for (const { cx, cy } of snap) { grid[cy * W + cx] = EMPTY; ages[cy * W + cx] = 0; }
          for (const { cx, cy, val, age } of snap) {
            grid[(cy + dirY) * W + (cx + dirX)] = val;
            ages[(cy + dirY) * W + (cx + dirX)] = age;
          }
          woodIdxSet.clear();
          for (let i = 0; i < woodCells.length; i++) {
            woodCells[i] = { cx: woodCells[i].cx + dirX, cy: woodCells[i].cy + dirY };
            woodIdxSet.add(woodCells[i].cy * W + woodCells[i].cx);
          }
        }
      }

      // Sand / water: independent, stop at foreign material
      for (let i = 0; i < otherCells.length; i++) {
        const { cx, cy } = otherCells[i];
        const mat = grid[cy * W + cx];
        if (mat === EMPTY) continue;
        const end = findEnd(cx, cy, mat);
        if (!end) continue;
        shiftChain(cx, cy, end.ex, end.ey);
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

        // FIRE
        if (type === FIRE) {
          // Extinguish if water adjacent
          let wet = false;
          for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x+dx, ny2 = y+dy;
            if (nx < 0 || nx >= W || ny2 < 0 || ny2 >= H) continue;
            if (grid[ny2*W+nx] === WATER) { wet = true; break; }
          }
          if (wet) { grid[i] = EMPTY; ages[i] = 0; continue; }

          ages[i] = Math.max(0, ages[i] - 1 - (Math.random() > 0.6 ? 1 : 0));
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

        if (type === SAND) {
          // Stable per-grain hash → consistent texture across frames
          const h = ((x * 374761393 + y * 668265263) >>> 0) & 0xff;
          const v1 = h % 38, v2 = (h >> 5) % 18;
          color = `rgb(${178 + v1},${146 + Math.floor(v1 * 0.5)},${82 + Math.floor(v1 * 0.15) - v2})`;

        } else if (type === WATER) {
          // Darker, deeper blue with gentle shimmer
          const wave = Math.sin((x * 0.35 + t / 500)) * 4;
          const depth = Math.min(y / H, 1);
          const w = Math.floor(wave);
          color = `rgb(${Math.max(18, 32 - Math.floor(depth * 12) + w)},${Math.max(70, 105 - Math.floor(depth * 25) + w)},${215 + w})`;

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

        ctx.fillStyle = color;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
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
      if (e.key === "2") setToolSync(SAND  as Tool);
      if (e.key === "3") setToolSync(FIRE  as Tool);
      if (e.key === "4") setToolSync(WALL  as Tool);
      if (e.key === "5") setToolSync(MOVE  as Tool);
      if (e.key === "6" || e.key === "e") setToolSync(99 as Tool);
      if (e.key === "c" || e.key === "C") {
        gridRef.current?.fill(0);
        agesRef.current?.fill(0);
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
      if (toolRef.current !== MOVE) paintAt(pos.x, pos.y);
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!paintRef.current) return;
      const pos = getCanvasPos(e);
      if (!pos) return;
      const last = lastPosRef.current;
      if (toolRef.current === MOVE && last) {
        moveAt(pos.x, pos.y, pos.x - last.x, pos.y - last.y);
      } else {
        paintAt(pos.x, pos.y);
      }
      lastPosRef.current = pos;
    };
    const onUp = () => { paintRef.current = false; lastPosRef.current = null; };

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
        height: "100dvh",
        overflow: "hidden",
        overflowX: "hidden",
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
            <span className="hint-item">La tierra se hunde en el agua · El agua apaga el fuego · El fuego quema la madera</span>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "auto", paddingTop: "1.5rem", paddingBottom: "1.25rem", display: "flex", justifyContent: "center" }}>
          <Link href="/extras" className="pacres-link">pacr.es</Link>
        </footer>

      </main>
    </>
  );
}
