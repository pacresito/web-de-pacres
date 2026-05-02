"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const COLS = 9;
const ROWS = 9;
const CELL = 54;
const WALL_W = 6;
const BALL_R = 10;
const BOARD_W = COLS * CELL + WALL_W;
const BOARD_H = ROWS * CELL + WALL_W;
const START_X = CELL / 2 + WALL_W / 2;
const START_Y = CELL / 2 + WALL_W / 2;

const MAX_TILT = 14;
const TILT_SPEED = 2.0;
const GRAVITY = 1750;
const FRICTION = 0.983;
const RESTITUTION = 0.2;

const MN = 1, MS = 2, ME = 4, MW = 8;

type MazeCell = { walls: number };
type Seg = { x1: number; y1: number; x2: number; y2: number };
type Hole = { row: number; col: number; cx: number; cy: number };

// ─── Maze generators ─────────────────────────────────────────────────────────

function generateMaze(): MazeCell[][] {
  const grid: MazeCell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ walls: MN | MS | ME | MW }))
  );
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  function carve(r: number, c: number) {
    vis[r][c] = true;
    const dirs = [
      { dr: -1, dc: 0, a: MN, b: MS },
      { dr: 1, dc: 0, a: MS, b: MN },
      { dr: 0, dc: 1, a: ME, b: MW },
      { dr: 0, dc: -1, a: MW, b: ME },
    ].sort(() => Math.random() - 0.5);
    for (const { dr, dc, a, b } of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis[nr][nc]) {
        grid[r][c].walls &= ~a;
        grid[nr][nc].walls &= ~b;
        carve(nr, nc);
      }
    }
  }
  carve(0, 0);
  return grid;
}

const DIRS4 = [
  { dr: -1, dc: 0, a: MN, b: MS },
  { dr: 1,  dc: 0, a: MS, b: MN },
  { dr: 0,  dc: 1, a: ME, b: MW },
  { dr: 0,  dc: -1, a: MW, b: ME },
];

// Warnsdorff Hamiltonian path. forbidden = Set of "r,c" strings to skip.
function warnsdorffPath(forbidden: Set<string>): { r: number; c: number }[] | null {
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

function mazeFromPath(path: { r: number; c: number }[]): MazeCell[][] {
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

function generateCircuit(): { maze: MazeCell[][]; goalRow: number; goalCol: number } {
  for (let i = 0; i < 50; i++) {
    const path = warnsdorffPath(new Set());
    if (!path || path.length !== ROWS * COLS) continue;
    const last = path[path.length - 1];
    return { maze: mazeFromPath(path), goalRow: last.r, goalCol: last.c };
  }
  return { maze: generateMaze(), goalRow: ROWS - 1, goalCol: COLS - 1 };
}

// Desafío: 78-cell corridor + 3 black holes.
// Strategy: pick 3 random interior cells as holes, generate the real path
// directly (no scout), then verify the path's own turns point at each hole
// 2+ times. Opens both wall sides (like mazeFromPath) to fix south/east holes.
function generateDesafio(): {
  maze: MazeCell[][];
  goalRow: number;
  goalCol: number;
  holes: Hole[];
} {
  const candidates: { r: number; c: number }[] = [];
  for (let r = 1; r < ROWS - 1; r++)
    for (let c = 1; c < COLS - 1; c++)
      candidates.push({ r, c });

  for (let attempt = 0; attempt < 2000; attempt++) {
    const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
    const holeList: { r: number; c: number }[] = [];
    for (const cell of shuffled) {
      if (holeList.length === 3) break;
      if (holeList.some(h => Math.abs(h.r - cell.r) + Math.abs(h.c - cell.c) < 3)) continue;
      holeList.push(cell);
    }
    if (holeList.length < 3) continue;

    const holeSet = new Set(holeList.map(h => `${h.r},${h.c}`));
    const path = warnsdorffPath(holeSet);
    if (!path || path.length !== ROWS * COLS - 3) continue;

    const grid = mazeFromPath(path);
    const hitCount = new Map<string, number>();

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
      })),
    };
  }

  const { maze, goalRow, goalCol } = generateCircuit();
  return { maze, goalRow, goalCol, holes: [] };
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function buildSegs(maze: MazeCell[][]): Seg[] {
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

function resolveCollisions(
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

function goalCoords(row: number, col: number) {
  return {
    gx: col * CELL + CELL / 2 + WALL_W / 2,
    gy: row * CELL + CELL / 2 + WALL_W / 2,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Mode = "laberinto" | "circuito" | "desafío";

function initState(m: Mode) {
  if (m === "desafío") {
    const { maze, goalRow, goalCol, holes } = generateDesafio();
    const { gx, gy } = goalCoords(goalRow, goalCol);
    return { maze, goalX: gx, goalY: gy, holes };
  }
  if (m === "circuito") {
    const { maze, goalRow, goalCol } = generateCircuit();
    const { gx, gy } = goalCoords(goalRow, goalCol);
    return { maze, goalX: gx, goalY: gy, holes: [] as Hole[] };
  }
  const maze = generateMaze();
  const { gx, gy } = goalCoords(ROWS - 1, COLS - 1);
  return { maze, goalX: gx, goalY: gy, holes: [] as Hole[] };
}

export default function Laberinto() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<(t: number) => void>(() => {});
  const [won, setWon] = useState(false);
  const [mode, setMode] = useState<Mode>("laberinto");

  const [orientState, setOrientState] = useState<"off" | "needs-permission" | "on">("off");
  const [scale, setScale] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);
  const landscapeRef = useRef(false);

  const initial = initState("laberinto");
  const g = useRef({
    ...initial,
    segs: [] as Seg[],
    bx: START_X, by: START_Y,
    vx: 0, vy: 0,
    tiltX: 0, tiltY: 0,
    mouseX: 0, mouseY: 0, hasMouse: false,
    orientX: 0, orientY: 0, hasOrient: false,
    orientRefBeta: 0, orientRefGamma: 0,
    keys: { up: false, down: false, left: false, right: false },
    idle: true,
    won: false,
    startTime: 0,
    lastTime: 0,
    animId: 0,
    falling: false,
    fallTime: 0,
    fallingT: 0,
    holeTargetX: 0,
    holeTargetY: 0,
  });

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { bx, by, segs, won: gameWon, goalX, goalY, holes, falling, fallingT } = g.current;

    ctx.clearRect(0, 0, BOARD_W, BOARD_H);

    // Floor
    const fg = ctx.createRadialGradient(BOARD_W / 2, BOARD_H / 2, 30, BOARD_W / 2, BOARD_H / 2, BOARD_W);
    fg.addColorStop(0, "#dde3ea");
    fg.addColorStop(1, "#c8d3de");
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    // Black holes
    for (const hole of holes) {
      const pulse = 0.88 + 0.12 * Math.sin(Date.now() / 300 + hole.col);
      const grad = ctx.createRadialGradient(hole.cx, hole.cy, 0, hole.cx, hole.cy, CELL * 0.44 * pulse);
      grad.addColorStop(0, "#000000");
      grad.addColorStop(0.55, "#0d0010");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hole.cx, hole.cy, CELL * 0.44 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Start marker
    ctx.strokeStyle = "#3b82f625";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(START_X, START_Y, CELL * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    // Goal glow
    const gg = ctx.createRadialGradient(goalX, goalY, 0, goalX, goalY, CELL * 0.42);
    gg.addColorStop(0, gameWon ? "#16a34a" : "#22c55e");
    gg.addColorStop(0.45, "#22c55e40");
    gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(goalX, goalY, CELL * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = gameWon ? "#16a34a" : "#22c55e";
    ctx.font = `bold ${Math.round(CELL * 0.3)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓", goalX, goalY + 1);

    // Wall shadows
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.13)";
    ctx.lineWidth = WALL_W;
    ctx.lineCap = "square";
    for (const seg of segs) {
      ctx.beginPath();
      ctx.moveTo(seg.x1 + 2.5, seg.y1 + 3);
      ctx.lineTo(seg.x2 + 2.5, seg.y2 + 3);
      ctx.stroke();
    }
    ctx.restore();

    // Walls
    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = WALL_W;
    ctx.lineCap = "square";
    for (const seg of segs) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.restore();

    // Ball
    if (!gameWon) {
      const r = falling ? BALL_R * (1 - fallingT) : BALL_R;
      if (r > 0.5) {
        ctx.save();
        ctx.globalAlpha = falling ? 1 - fallingT * 0.6 : 0.18;
        if (!falling) {
          ctx.fillStyle = "#1e3a8a";
          ctx.beginPath();
          ctx.ellipse(bx + 2, by + 3, BALL_R * 1.0, BALL_R * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.shadowColor = "#3b82f650";
        ctx.shadowBlur = 10;
        const bg = ctx.createRadialGradient(
          bx - r * 0.35, by - r * 0.35, r * 0.05,
          bx, by, r
        );
        bg.addColorStop(0, "#93c5fd");
        bg.addColorStop(0.35, "#3b82f6");
        bg.addColorStop(1, "#1e3a8a");
        ctx.fillStyle = bg;
        ctx.globalAlpha = falling ? 1 - fallingT * 0.5 : 1;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();

        const spec = ctx.createRadialGradient(
          bx - r * 0.4, by - r * 0.4, 0,
          bx - r * 0.35, by - r * 0.35, r * 0.45
        );
        spec.addColorStop(0, "rgba(255,255,255,0.88)");
        spec.addColorStop(0.5, "rgba(255,255,255,0.25)");
        spec.addColorStop(1, "rgba(255,255,255,0)");
        ctx.shadowBlur = 0;
        ctx.fillStyle = spec;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function startLoop() {
    const state = g.current;

    loopRef.current = function loop(time: number) {
      if (state.won) { draw(); return; }

      // Fall animation
      if (state.falling) {
        const t = Math.min((time - state.fallTime) / 500, 1);
        state.fallingT = t;
        state.bx += (state.holeTargetX - state.bx) * 0.12;
        state.by += (state.holeTargetY - state.by) * 0.12;
        if (t >= 1) {
          state.falling = false;
          state.bx = START_X; state.by = START_Y;
          state.vx = 0; state.vy = 0;
          state.tiltX = 0; state.tiltY = 0;
          state.idle = true;
          if (boardRef.current) boardRef.current.style.transform = "";
        }
        draw();
        state.animId = requestAnimationFrame(loopRef.current);
        return;
      }

      const anyKey = state.keys.up || state.keys.down || state.keys.left || state.keys.right;
      const started = state.hasMouse || anyKey;

      if (state.idle) {
        if (started) {
          state.idle = false;
          state.startTime = time;
          state.lastTime = time;
        } else {
          draw();
          state.animId = requestAnimationFrame(loopRef.current);
          return;
        }
      }

      const dt = Math.min((time - state.lastTime) / 1000, 0.033);
      state.lastTime = time;

      // Tilt: giroscopio > ratón > D-pad
      if (state.hasOrient) {
        const targetY = Math.max(-MAX_TILT, Math.min(MAX_TILT, state.orientY));
        const targetX = Math.max(-MAX_TILT, Math.min(MAX_TILT, state.orientX));
        state.tiltY += (targetY - state.tiltY) * 0.15;
        state.tiltX += (targetX - state.tiltX) * 0.15;
      } else if (state.hasMouse) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const range = Math.min(window.innerWidth, window.innerHeight) * 0.22;
        const targetY = Math.max(-MAX_TILT, Math.min(MAX_TILT, (state.mouseX - cx) / range * MAX_TILT));
        const targetX = Math.max(-MAX_TILT, Math.min(MAX_TILT, (state.mouseY - cy) / range * MAX_TILT));
        state.tiltY += (targetY - state.tiltY) * 0.1;
        state.tiltX += (targetX - state.tiltX) * 0.1;
      } else {
        if (state.keys.right) state.tiltY = Math.min(state.tiltY + TILT_SPEED, MAX_TILT);
        else if (state.keys.left) state.tiltY = Math.max(state.tiltY - TILT_SPEED, -MAX_TILT);
        else state.tiltY *= 0.85;
        if (state.keys.down) state.tiltX = Math.min(state.tiltX + TILT_SPEED, MAX_TILT);
        else if (state.keys.up) state.tiltX = Math.max(state.tiltX - TILT_SPEED, -MAX_TILT);
        else state.tiltX *= 0.85;
      }

      if (boardRef.current) {
        boardRef.current.style.transform = `rotateX(${-state.tiltX}deg) rotateY(${state.tiltY}deg)`;
      }

      // Physics
      const ax = GRAVITY * Math.sin((state.tiltY * Math.PI) / 180);
      const ay = GRAVITY * Math.sin((state.tiltX * Math.PI) / 180);
      state.vx += ax * dt;
      state.vy += ay * dt;
      state.vx *= Math.pow(FRICTION, dt * 60);
      state.vy *= Math.pow(FRICTION, dt * 60);
      state.bx += state.vx * dt;
      state.by += state.vy * dt;

      [state.bx, state.by, state.vx, state.vy] = resolveCollisions(
        state.bx, state.by, state.vx, state.vy, state.segs
      );

      // Hole detection
      for (const hole of state.holes) {
        const dx = state.bx - hole.cx, dy = state.by - hole.cy;
        if (Math.sqrt(dx * dx + dy * dy) < CELL * 0.38) {
          state.falling = true;
          state.fallTime = time;
          state.fallingT = 0;
          state.holeTargetX = hole.cx;
          state.holeTargetY = hole.cy;
          break;
        }
      }

      // Win
      if (!state.falling) {
        const dx = state.bx - state.goalX, dy = state.by - state.goalY;
        if (Math.sqrt(dx * dx + dy * dy) < CELL * 0.3) {
          state.won = true;
          setWon(true);
        }
      }

      draw();
      state.animId = requestAnimationFrame(loopRef.current);
    };

    state.animId = requestAnimationFrame((t) => {
      state.lastTime = t;
      loopRef.current(t);
    });
  }

  function restart(m: Mode) {
    const state = g.current;
    cancelAnimationFrame(state.animId);
    const { maze, goalX, goalY, holes } = initState(m);
    state.maze = maze;
    state.goalX = goalX;
    state.goalY = goalY;
    state.holes = holes;
    state.segs = buildSegs(state.maze);
    state.bx = START_X; state.by = START_Y;
    state.vx = 0; state.vy = 0;
    state.tiltX = 0; state.tiltY = 0;
    Object.assign(state.keys, { up: false, down: false, left: false, right: false });
    state.hasMouse = false;
    state.orientX = 0; state.orientY = 0;
    state.hasOrient = false;
    state.orientRefBeta = 0; state.orientRefGamma = 0;
    state.idle = true;
    state.won = false;
    state.falling = false;
    if (boardRef.current) boardRef.current.style.transform = "";
    setWon(false);
    startLoop();
  }

  const attachOrientListener = useCallback(() => {
    const state = g.current;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const ORIENT_SCALE = MAX_TILT / 25;
      const dBeta = e.beta - state.orientRefBeta;
      const dGamma = e.gamma - state.orientRefGamma;
      if (landscapeRef.current) {
        state.orientY = dBeta * ORIENT_SCALE;
        state.orientX = -dGamma * ORIENT_SCALE;
      } else {
        state.orientY = dGamma * ORIENT_SCALE;
        state.orientX = dBeta * ORIENT_SCALE;
      }
      state.hasOrient = true;
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);

  const calibrateOrientation = useCallback(() => {
    const onFirst = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      g.current.orientRefBeta = e.beta;
      g.current.orientRefGamma = e.gamma;
      window.removeEventListener("deviceorientation", onFirst);
    };
    window.addEventListener("deviceorientation", onFirst);
  }, []);

  useEffect(() => {
    const state = g.current;
    state.segs = buildSegs(state.maze);

    const onMouseMove = (e: MouseEvent) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      state.hasMouse = true;
    };
    window.addEventListener("mousemove", onMouseMove);

    const updateScale = () => {
      const padding = 32;
      const landscape = window.innerWidth > window.innerHeight && window.innerWidth < 1024;
      setIsLandscape(landscape);
      landscapeRef.current = landscape;
      if (landscape) {
        const sideWidth = 140;
        const availH = window.innerHeight - padding;
        const availW = window.innerWidth - sideWidth * 2 - padding;
        setScale(Math.min(1, Math.min(availH, availW) / BOARD_W));
      } else {
        const available = Math.min(window.innerWidth - padding, window.innerHeight * 0.7);
        setScale(Math.min(1, available / BOARD_W));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);

    const isIOS = typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";
    if (!isIOS && window.DeviceOrientationEvent) {
      const cleanup = attachOrientListener();
      setOrientState("on");
      draw();
      startLoop();
      return () => {
        cancelAnimationFrame(state.animId);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", updateScale);
        cleanup();
      };
    } else if (isIOS) {
      setOrientState("needs-permission");
    }

    draw();
    startLoop();

    return () => {
      cancelAnimationFrame(state.animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  const requestOrientPermission = useCallback(async () => {
    try {
      const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (perm === "granted") {
        attachOrientListener();
        setOrientState("on");
        calibrateOrientation();
      }
    } catch {
      setOrientState("off");
    }
  }, [attachOrientListener, calibrateOrientation]);

  function touchKey(key: "up" | "down" | "left" | "right", val: boolean) {
    g.current.keys[key] = val;
  }

  function ArrowBtn({ dir, label }: { dir: "up" | "down" | "left" | "right"; label: string }) {
    return (
      <button
        className="w-14 h-14 flex items-center justify-center rounded-xl text-xl select-none touch-none bg-gray-100 active:bg-blue-500 active:text-white text-gray-600 border border-gray-200 transition-colors"
        onPointerDown={() => touchKey(dir, true)}
        onPointerUp={() => touchKey(dir, false)}
        onPointerLeave={() => touchKey(dir, false)}
      >
        {label}
      </button>
    );
  }

  function ModeSelector() {
    const modes: Mode[] = ["laberinto", "circuito", "desafío"];
    return (
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); restart(m); }}
            style={{
              fontSize: "0.72rem",
              fontWeight: mode === m ? 600 : 400,
              color: mode === m ? (m === "desafío" ? "#b91c1c" : "#1d4ed8") : "#9ca3af",
              background: mode === m ? "#ffffff" : "transparent",
              border: "none",
              borderRadius: "0.4rem",
              padding: "0.25rem 0.6rem",
              cursor: "pointer",
              boxShadow: mode === m ? "0 1px 3px #0000001a" : "none",
              transition: "all 0.15s",
            }}
          >
            {m}
          </button>
        ))}
      </div>
    );
  }

  const buttonLabel = `nuevo ${mode}`;

  const boardEl = (
    <div
      style={{ width: BOARD_W * scale, height: BOARD_H * scale, flexShrink: 0 }}
      className="touch-none"
    >
      <div style={{ perspective: "600px", transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div
          ref={boardRef}
          style={{
            width: BOARD_W,
            height: BOARD_H,
            position: "relative",
            transformStyle: "preserve-3d",
            boxShadow: "0 8px 32px #00000025, 0 20px 60px #00000018",
          }}
        >
          <canvas
            ref={canvasRef}
            width={BOARD_W}
            height={BOARD_H}
            style={{ display: "block" }}
            onTouchStart={() => {
              if (orientState === "on") calibrateOrientation();
              else if (orientState === "needs-permission") requestOrientPermission();
            }}
          />
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 20, background: "linear-gradient(to bottom, #1d4ed8, #3b82f6)", transformOrigin: "top center", transform: "rotateX(90deg)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 20, background: "linear-gradient(to top, #1d4ed8, #3b82f6)", transformOrigin: "bottom center", transform: "rotateX(-90deg)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: "100%", background: "linear-gradient(to right, #1d4ed8, #3b82f6)", transformOrigin: "left center", transform: "rotateY(-90deg)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: "100%", background: "linear-gradient(to left, #1d4ed8, #3b82f6)", transformOrigin: "right center", transform: "rotateY(90deg)" }} />
        </div>
      </div>
    </div>
  );

  if (isLandscape) {
    return (
      <main style={{ background: "#ffffff", height: "100dvh", overflow: "hidden" }} className="flex flex-row items-center justify-center gap-2 px-2">
        <div style={{ width: 120, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-3 h-full">
          <h1 style={{ color: "#111827", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center" }}>Laberinto</h1>
          <ModeSelector />
          <p style={{ fontSize: "0.65rem", color: "#d1d5db", textAlign: "center", lineHeight: 1.4 }}>
            {orientState === "on"
              ? "Toca el tablero para calibrar · Inclina el móvil"
              : "Mueve el ratón para inclinar el tablero"}
          </p>
          <a href="/" style={{ fontSize: "0.7rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
            pacr.es
          </a>
        </div>

        {boardEl}

        <div style={{ width: 120, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-3 h-full">
          {won && <p style={{ color: "#3b82f6", fontSize: "0.9rem", fontWeight: 600, textAlign: "center" }}>¡Enhorabuena!</p>}
          <button onClick={() => restart(mode)} className="text-gray-400 hover:text-gray-600 text-xs transition-colors">
            {buttonLabel}
          </button>
          {orientState !== "on" && (
            <div className="flex flex-col items-center gap-1">
              <ArrowBtn dir="up" label="↑" />
              <div className="flex gap-1">
                <ArrowBtn dir="left" label="←" />
                <ArrowBtn dir="down" label="↓" />
                <ArrowBtn dir="right" label="→" />
              </div>
            </div>
          )}
          {orientState === "needs-permission" && (
            <button onClick={requestOrientPermission} className="px-3 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-semibold">
              Usar giroscopio
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: "#ffffff", minHeight: "100dvh", position: "relative" }} className="flex flex-col items-center justify-start px-4 py-12 gap-10 overflow-x-auto">
      <div className="flex items-center gap-6">
        <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Laberinto</h1>
        <ModeSelector />
      </div>

      {boardEl}

      {won && <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>¡Enhorabuena!</p>}
      <button onClick={() => restart(mode)} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
        {buttonLabel}
      </button>

      {orientState !== "on" && (
        <div className="flex flex-col items-center gap-1 md:hidden">
          <ArrowBtn dir="up" label="↑" />
          <div className="flex gap-1">
            <ArrowBtn dir="left" label="←" />
            <ArrowBtn dir="down" label="↓" />
            <ArrowBtn dir="right" label="→" />
          </div>
        </div>
      )}

      {orientState === "needs-permission" && (
        <button onClick={requestOrientPermission} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold">
          Usar giroscopio
        </button>
      )}

      <div className="mt-auto flex flex-col items-center gap-2 pb-10">
        <p style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
          {orientState === "on"
            ? "Toca el tablero para calibrar · Inclina el móvil para mover la bola"
            : "Mueve el ratón para inclinar el tablero"}
        </p>
        <a href="/" style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
          pacr.es
        </a>
      </div>
    </main>
  );
}
