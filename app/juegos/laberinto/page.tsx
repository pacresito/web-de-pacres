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
const GAME_DURATION = 60;

const MN = 1, MS = 2, ME = 4, MW = 8;

type MazeCell = { walls: number };
type Seg = { x1: number; y1: number; x2: number; y2: number };
type Hole = { row: number; col: number; cx: number; cy: number; radius: number; fallCount: number };

interface RankingData {
  top: { name: string; score: number; date: string | null }[];
  bottom: { name: string; score: number; date: string | null }[];
}

// ─── Maze generators ─────────────────────────────────────────────────────────

const DIRS4 = [
  { dr: -1, dc: 0, a: MN, b: MS },
  { dr: 1,  dc: 0, a: MS, b: MN },
  { dr: 0,  dc: 1, a: ME, b: MW },
  { dr: 0,  dc: -1, a: MW, b: ME },
];

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
  return { maze: mazeFromPath([{ r: 0, c: 0 }]), goalRow: ROWS - 1, goalCol: COLS - 1 };
}

function tryDesafio(nHoles: number, maxAttempts: number): {
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

function generateDesafio(): { maze: MazeCell[][]; goalRow: number; goalCol: number; holes: Hole[] } {
  const result = tryDesafio(4, 2000) ?? tryDesafio(3, 500);
  if (result) return result;
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

function initMaze() {
  const { maze, goalRow, goalCol, holes } = generateDesafio();
  const { gx, gy } = goalCoords(goalRow, goalCol);
  return { maze, goalX: gx, goalY: gy, holes };
}

export default function Laberinto() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<(t: number) => void>(() => {});

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [alias, setAlias] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ranking, setRanking] = useState<RankingData | null>(null);

  const [orientState, setOrientState] = useState<"off" | "needs-permission" | "on">("off");
  const [scale, setScale] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);
  const landscapeRef = useRef(false);

  const initial = initMaze();
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
    score: 0,
    timeLeft: GAME_DURATION,
    lastTimerInt: GAME_DURATION,
    gameOver: false,
    celebrating: false,
    celebrateStartTime: 0,
    holeCountThisMaze: 0,
    holeDisappearedThisMaze: false,
    lastMazePoints: 10,
    trail: [] as { x: number; y: number }[],
    startTime: 0,
    lastTime: 0,
    animId: 0,
    falling: false,
    fallTime: 0,
    fallingT: 0,
    holeTargetX: 0,
    holeTargetY: 0,
  });

  function draw(time?: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const t = time ?? Date.now();
    const { bx, by, segs, goalX, goalY, holes, falling, fallingT, trail, celebrating, celebrateStartTime, lastMazePoints, gameOver: go } = g.current;

    ctx.clearRect(0, 0, BOARD_W, BOARD_H);

    // Floor
    const fg = ctx.createRadialGradient(BOARD_W * 0.32, BOARD_H * 0.28, 20, BOARD_W * 0.5, BOARD_H * 0.55, BOARD_W * 0.85);
    fg.addColorStop(0, "#eef2f7");
    fg.addColorStop(0.55, "#d3dae3");
    fg.addColorStop(1, "#9aa8b8");
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    // Black holes
    for (const hole of holes) {
      const r = hole.radius;
      const ao = ctx.createRadialGradient(hole.cx, hole.cy, r * 0.95, hole.cx, hole.cy, r * 1.5);
      ao.addColorStop(0, "rgba(0,0,0,0.32)");
      ao.addColorStop(0.6, "rgba(0,0,0,0.08)");
      ao.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ao;
      ctx.beginPath();
      ctx.arc(hole.cx, hole.cy, r * 1.5, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createRadialGradient(hole.cx, hole.cy, 0, hole.cx, hole.cy, r);
      body.addColorStop(0, "#000000");
      body.addColorStop(0.55, "#000000");
      body.addColorStop(0.88, "#0a0810");
      body.addColorStop(1, "#1c1a26");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(hole.cx, hole.cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Start marker
    ctx.strokeStyle = "#3b82f625";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(START_X, START_Y, CELL * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    // Goal — pulsing glow
    const pulse = 1 + Math.sin(t * Math.PI / 1000) * 0.1;
    const goalR = CELL * 0.42 * pulse;
    const gg = ctx.createRadialGradient(goalX, goalY, 0, goalX, goalY, goalR);
    gg.addColorStop(0, "#22c55e");
    gg.addColorStop(0.45, "#22c55e40");
    gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(goalX, goalY, goalR, 0, Math.PI * 2);
    ctx.fill();

    // Wall shadows — offscreen canvas para evitar acumulación de alpha
    {
      const sc = document.createElement("canvas");
      sc.width = BOARD_W; sc.height = BOARD_H;
      const sctx = sc.getContext("2d")!;
      sctx.strokeStyle = "#0f172a";
      sctx.lineWidth = WALL_W + 1;
      sctx.lineCap = "square";
      sctx.lineJoin = "miter";
      sctx.beginPath();
      for (const seg of segs) {
        sctx.moveTo(seg.x1 + 3.5, seg.y1 + 4.5);
        sctx.lineTo(seg.x2 + 3.5, seg.y2 + 4.5);
      }
      sctx.stroke();
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(sc, 0, 0);
      ctx.restore();
    }

    // Walls
    ctx.save();
    ctx.lineWidth = WALL_W;
    ctx.lineCap = "square";
    const halfW = WALL_W / 2;
    for (const seg of segs) {
      const isHoriz = Math.abs(seg.y2 - seg.y1) < 0.001;
      const grad = isHoriz
        ? ctx.createLinearGradient(0, seg.y1 - halfW, 0, seg.y1 + halfW)
        : ctx.createLinearGradient(seg.x1 - halfW, 0, seg.x1 + halfW, 0);
      grad.addColorStop(0, "#7dade8");
      grad.addColorStop(0.45, "#3b82f6");
      grad.addColorStop(1, "#1e3a8a");
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    // Highlights — fillRect evita solapamiento en esquinas
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (const seg of segs) {
      const isHoriz = Math.abs(seg.y2 - seg.y1) < 0.001;
      if (isHoriz) {
        ctx.fillRect(seg.x1, seg.y1 - halfW + 0.5, seg.x2 - seg.x1, 1);
      } else {
        ctx.fillRect(seg.x1 - halfW + 0.5, seg.y1, 1, seg.y2 - seg.y1);
      }
    }
    ctx.restore();

    // Ball trail
    for (let i = 0; i < trail.length; i++) {
      const frac = i / trail.length;
      const r = BALL_R * 0.45 * frac;
      if (r < 0.5) continue;
      ctx.fillStyle = `rgba(59,130,246,${frac * 0.2})`;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ball
    if (!go) {
      const r = falling ? BALL_R * (1 - fallingT) : BALL_R;
      if (r > 0.5) {
        if (!falling) {
          ctx.save();
          const sh = ctx.createRadialGradient(bx + 4, by + 5, BALL_R * 0.2, bx + 4, by + 5, BALL_R * 1.7);
          sh.addColorStop(0, "rgba(0,0,0,0.38)");
          sh.addColorStop(0.6, "rgba(0,0,0,0.12)");
          sh.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sh;
          ctx.beginPath();
          ctx.ellipse(bx + 4, by + 5, BALL_R * 1.7, BALL_R * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = falling ? 1 - fallingT * 0.5 : 1;

        const bg = ctx.createRadialGradient(bx - r * 0.4, by - r * 0.5, r * 0.05, bx + r * 0.1, by + r * 0.15, r * 1.15);
        bg.addColorStop(0, "#dbeafe");
        bg.addColorStop(0.18, "#93c5fd");
        bg.addColorStop(0.5, "#3b82f6");
        bg.addColorStop(0.85, "#1e40af");
        bg.addColorStop(1, "#0c1e57");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();

        const spec = ctx.createRadialGradient(bx - r * 0.42, by - r * 0.45, 0, bx - r * 0.42, by - r * 0.45, r * 0.55);
        spec.addColorStop(0, "rgba(255,255,255,0.85)");
        spec.addColorStop(0.4, "rgba(255,255,255,0.3)");
        spec.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = spec;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(bx - r * 0.42, by - r * 0.48, r * 0.13, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Celebrating overlay (+10)
    if (celebrating) {
      const elapsed = t - celebrateStartTime;
      const fadeIn = Math.min(1, elapsed / 150);
      const fadeOut = elapsed > 550 ? Math.max(0, 1 - (elapsed - 550) / 200) : 1;
      const alpha = fadeIn * fadeOut;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.55})`;
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#3b82f6";
      ctx.font = `bold ${Math.round(CELL * 0.55)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${lastMazePoints}`, BOARD_W / 2, BOARD_H / 2);
      ctx.restore();
    }
  }

  function resetMazeState() {
    const state = g.current;
    const { maze, goalX, goalY, holes } = initMaze();
    state.maze = maze;
    state.goalX = goalX;
    state.goalY = goalY;
    state.holes = holes;
    state.segs = buildSegs(state.maze);
    state.bx = START_X; state.by = START_Y;
    state.vx = 0; state.vy = 0;
    state.tiltX = 0; state.tiltY = 0;
    state.trail = [];
    state.holeCountThisMaze = 0;
    state.holeDisappearedThisMaze = false;
    state.lastMazePoints = 10;
    state.falling = false;
    state.celebrating = false;
    state.idle = true;
    if (boardRef.current) boardRef.current.style.transform = "";
  }

  function startLoop() {
    const state = g.current;

    loopRef.current = function loop(time: number) {
      // Celebrating — breve pausa entre laberintos
      if (state.celebrating) {
        if (time - state.celebrateStartTime > 900) {
          state.celebrating = false;
          resetMazeState();
        }
        draw(time);
        state.animId = requestAnimationFrame(loopRef.current);
        return;
      }

      if (state.gameOver) { draw(time); return; }

      // Fall animation
      if (state.falling) {
        const ft = Math.min((time - state.fallTime) / 500, 1);
        state.fallingT = ft;
        state.bx += (state.holeTargetX - state.bx) * 0.12;
        state.by += (state.holeTargetY - state.by) * 0.12;
        if (ft >= 1) {
          state.falling = false;
          state.bx = START_X; state.by = START_Y;
          state.vx = 0; state.vy = 0;
          state.tiltX = 0; state.tiltY = 0;
          state.idle = true;
          if (boardRef.current) boardRef.current.style.transform = "";
        }
        draw(time);
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
          draw(time);
          state.animId = requestAnimationFrame(loopRef.current);
          return;
        }
      }

      const dt = Math.min((time - state.lastTime) / 1000, 0.033);
      state.lastTime = time;

      // Timer
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      const newInt = Math.ceil(state.timeLeft);
      if (newInt !== state.lastTimerInt) {
        state.lastTimerInt = newInt;
        setTimeLeft(newInt);
      }
      if (state.timeLeft <= 0) {
        state.gameOver = true;
        if (boardRef.current) boardRef.current.style.transform = "";
        setScore(state.score);
        setGameOver(true);
        draw(time);
        return;
      }

      // Tilt
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

      // Trail
      const lastT = state.trail[state.trail.length - 1];
      if (!lastT || Math.hypot(state.bx - lastT.x, state.by - lastT.y) > 4) {
        state.trail.push({ x: state.bx, y: state.by });
        if (state.trail.length > 30) state.trail.shift();
      }

      // Hole detection
      for (let hi = 0; hi < state.holes.length; hi++) {
        const hole = state.holes[hi];
        const dx = state.bx - hole.cx, dy = state.by - hole.cy;
        if (Math.sqrt(dx * dx + dy * dy) < hole.radius * 0.95) {
          hole.fallCount++;
          // 1ª: -3 · 2ª: -2 · 3ª: -1 (+ encoge al 70%) · 4ª: desaparece (0 pts)
          const penalties = [3, 2, 1, 0];
          const penalty = penalties[hole.fallCount - 1] ?? 0;
          state.score -= penalty;
          state.trail = [];
          setScore(state.score);
          if (hole.fallCount >= 4) {
            state.holes = state.holes.filter((_, i) => i !== hi);
            state.holeDisappearedThisMaze = true;
          } else if (hole.fallCount === 3) {
            hole.radius *= 0.7;
          }
          state.falling = true;
          state.fallTime = time;
          state.fallingT = 0;
          state.holeTargetX = hole.cx;
          state.holeTargetY = hole.cy;
          break;
        }
      }

      // Win
      if (!state.falling && !state.celebrating) {
        const dx = state.bx - state.goalX, dy = state.by - state.goalY;
        if (Math.sqrt(dx * dx + dy * dy) < CELL * 0.3) {
          const pts = state.holeDisappearedThisMaze ? 0 : 10;
          state.score += pts;
          state.lastMazePoints = pts;
          state.celebrating = true;
          state.celebrateStartTime = time;
          state.holeCountThisMaze = 0;
          setScore(state.score);
        }
      }

      draw(time);
      state.animId = requestAnimationFrame(loopRef.current);
    };

    state.animId = requestAnimationFrame((t) => {
      state.lastTime = t;
      loopRef.current(t);
    });
  }

  function fullRestart() {
    const state = g.current;
    cancelAnimationFrame(state.animId);
    resetMazeState();
    state.score = 0;
    state.timeLeft = GAME_DURATION;
    state.lastTimerInt = GAME_DURATION;
    state.gameOver = false;
    Object.assign(state.keys, { up: false, down: false, left: false, right: false });
    state.hasMouse = false;
    state.orientX = 0; state.orientY = 0;
    state.hasOrient = false;
    state.orientRefBeta = 0; state.orientRefGamma = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setSubmitted(false);
    setAlias("");
    setRanking(null);
    startLoop();
  }

  useEffect(() => {
    if (!gameOver) return;
    fetch("/api/ranking/laberinto")
      .then(r => r.json())
      .then(data => setRanking(data));
  }, [gameOver]);

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    if (!alias.trim()) return;
    setSubmitting(true);
    const data = await fetch("/api/ranking/laberinto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: alias.trim(), score: g.current.score }),
    }).then(r => r.json());
    setRanking(data);
    setSubmitted(true);
    setSubmitting(false);
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

  const scoreColor = score < 0 ? "#ef4444" : "#3b82f6";
  const timerColor = timeLeft <= 10 ? "#ef4444" : "#9ca3af";

  const gameOverOverlay = gameOver ? (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(255,255,255,0.93)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: "1rem", zIndex: 10,
    }}>
      <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>
        ¡Tiempo!
      </p>
      <p style={{ color: scoreColor, fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-geist-mono, monospace)", lineHeight: 1 }}>
        {score >= 0 ? "+" : ""}{score}
        <span style={{ fontSize: "1rem", fontWeight: 400, color: "#9ca3af", marginLeft: "0.4rem" }}>pts</span>
      </p>

      {!submitted ? (
        <>
          <form onSubmit={submitScore} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="text"
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
              autoFocus
              autoComplete="off"
              style={{
                padding: "0.35rem 0.65rem",
                border: "1px solid rgba(96,165,250,0.4)",
                borderRadius: "6px",
                fontSize: "0.85rem",
                outline: "none",
                color: "#111827",
                background: "#f8faff",
                fontFamily: "var(--font-geist-mono, monospace)",
                width: "130px",
              }}
            />
            <button
              type="submit"
              disabled={submitting || !alias.trim()}
              style={{
                padding: "0.35rem 0.85rem",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.85rem",
                cursor: alias.trim() && !submitting ? "pointer" : "default",
                opacity: alias.trim() && !submitting ? 1 : 0.4,
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            >
              {submitting ? "..." : "Guardar"}
            </button>
          </form>
          <button
            onClick={fullRestart}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.8rem", fontFamily: "var(--font-geist-mono, monospace)" }}
          >
            Jugar de nuevo
          </button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
          {ranking && (
            <p style={{ color: "#9ca3af", fontSize: "0.75rem", fontFamily: "var(--font-geist-mono, monospace)" }}>
              Top: {ranking.top[0]?.name ?? "—"} ({ranking.top[0]?.score ?? 0} pts)
            </p>
          )}
          <div style={{ display: "flex", gap: "1rem" }}>
            <a
              href="/juegos/laberinto/ranking"
              style={{ color: "#3b82f6", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none" }}
            >
              Ver ranking →
            </a>
            <button
              onClick={fullRestart}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)" }}
            >
              Repetir
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
      <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Laberinto</h1>
      <span style={{ color: timerColor, fontSize: "0.85rem", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono, monospace)", minWidth: "2.5rem" }}>
        {timeLeft}s
      </span>
      <span style={{ color: scoreColor, fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 600 }}>
        {score >= 0 ? "+" : ""}{score}
      </span>
      <a
        href="/juegos/laberinto/ranking"
        style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
      >
        ranking
      </a>
    </div>
  );

  const boardEl = (
    <div
      style={{ width: BOARD_W * scale, height: BOARD_H * scale, flexShrink: 0, position: "relative" }}
      className="touch-none"
    >
      {gameOverOverlay}
      <div style={{ perspective: "600px", transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div
          ref={boardRef}
          style={{
            width: BOARD_W,
            height: BOARD_H,
            position: "relative",
            transformStyle: "preserve-3d",
            boxShadow: "0 4px 8px #00000020, 0 16px 40px #00000030, 0 32px 80px #00000022",
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
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 28, background: "linear-gradient(to bottom, #1e3a8a, #2563eb 45%, #3b82f6)", transformOrigin: "top center", transform: "rotateX(90deg)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 28, background: "linear-gradient(to top, #0f1f5c, #1e3a8a 45%, #2563eb)", transformOrigin: "bottom center", transform: "rotateX(-90deg)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: "100%", background: "linear-gradient(to right, #1e3a8a, #2563eb 45%, #3b82f6)", transformOrigin: "left center", transform: "rotateY(-90deg)", boxShadow: "inset 1px 0 0 rgba(255,255,255,0.3)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 28, height: "100%", background: "linear-gradient(to left, #0f1f5c, #1e3a8a 45%, #2563eb)", transformOrigin: "right center", transform: "rotateY(90deg)" }} />
        </div>
      </div>
    </div>
  );

  if (isLandscape) {
    return (
      <main style={{ background: "#ffffff", height: "100dvh", overflow: "hidden" }} className="flex flex-row items-center justify-center gap-2 px-2">
        <div style={{ width: 120, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-3 h-full">
          <h1 style={{ color: "#111827", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center" }}>Laberinto</h1>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <span style={{ color: timerColor, fontSize: "0.8rem", fontFamily: "var(--font-geist-mono, monospace)" }}>{timeLeft}s</span>
            <span style={{ color: scoreColor, fontSize: "0.8rem", fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 600 }}>{score >= 0 ? "+" : ""}{score}</span>
          </div>
          <a
            href="/juegos/laberinto/ranking"
            style={{ fontSize: "0.65rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
          >
            ranking
          </a>
          <p style={{ fontSize: "0.65rem", color: "#d1d5db", textAlign: "center", lineHeight: 1.4 }}>
            {orientState === "on" ? "Toca para calibrar · Inclina el móvil" : "Mueve el ratón para inclinar"}
          </p>
          <a href="/" style={{ fontSize: "0.7rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
            pacr.es
          </a>
        </div>

        {boardEl}

        <div style={{ width: 120, flexShrink: 0 }} className="flex flex-col items-center justify-center gap-3 h-full">
          <button onClick={fullRestart} className="text-gray-400 hover:text-gray-600 text-xs transition-colors">
            nuevo laberinto
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
    <main style={{ background: "#ffffff", minHeight: "100dvh", position: "relative" }} className="flex flex-col items-center justify-start px-4 py-12 gap-8 overflow-x-auto">
      {header}

      {boardEl}

      <button onClick={fullRestart} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
        nuevo laberinto
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
