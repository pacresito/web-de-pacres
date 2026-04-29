"use client";

import { useEffect, useRef, useState } from "react";

const CELL = 36;
const TOLERANCE = 13;
const SPEED = 0.8;

function buildPath() {
  const points: { x: number; y: number }[] = [];
  let cx = 0, cy = 0;
  points.push({ x: cx, y: cy });

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
  ];

  let dirIdx = 0;
  let steps = 1;
  let count = 0;

  while (steps <= 9) {
    const { dx, dy } = dirs[dirIdx % 4];
    for (let i = 0; i < steps; i++) {
      cx += dx;
      cy += dy;
      points.push({ x: cx, y: cy });
    }
    dirIdx++;
    count++;
    if (count === 2) {
      count = 0;
      steps++;
    }
  }

  return points;
}

const PATH_CELLS = buildPath();
// Espejo horizontal de PATH_CELLS al revés: misma forma reflejada, recorrida desde el extremo hacia el centro
const PATH_RIGHT = [...PATH_CELLS].reverse().map(p => ({ x: -p.x, y: p.y }));

function cellToPixel(cell: { x: number; y: number }, origin: { x: number; y: number }) {
  return { x: origin.x + cell.x * CELL, y: origin.y + cell.y * CELL };
}

function pointToSegmentDist(
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

type GameState = "idle" | "playing" | "dead" | "win";

interface BoardState {
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  segIdx: number;
  gameState: GameState;
}

function initBoard(path: typeof PATH_CELLS, origin: { x: number; y: number }, vel: { x: number; y: number }): BoardState {
  const start = cellToPixel(path[0], origin);
  return {
    pos: { ...start },
    vel: { ...vel },
    segIdx: 0,
    gameState: "idle",
  };
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  size: number,
  path: typeof PATH_CELLS,
  origin: { x: number; y: number },
  state: BoardState,
  goalCell: { x: number; y: number }
) {
  ctx.clearRect(0, 0, size, size);

  // Fondo
  ctx.fillStyle = "#0f0c29";
  ctx.fillRect(0, 0, size, size);

  // Paredes del camino
  ctx.strokeStyle = "rgba(120,80,255,0.25)";
  ctx.lineWidth = CELL - 2;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  path.forEach((cell, i) => {
    const p = cellToPixel(cell, origin);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Meta
  const goal = cellToPixel(goalCell, origin);
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#a78bfa";
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Punto jugador
  if (state.gameState !== "idle") {
    ctx.beginPath();
    ctx.arc(state.pos.x, state.pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function useBoard(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  path: typeof PATH_CELLS,
  turnDir: 1 | -1,
  initialVel: { x: number; y: number }
) {
  const originRef = useRef({ x: 0, y: 0 });
  const stateRef = useRef<BoardState>({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, segIdx: 0, gameState: "idle" });
  const animRef = useRef(0);
  const [gameState, setGameState] = useState<GameState>("idle");

  const goalCell = path[path.length - 1];

  function isCloserToNext(pos: { x: number; y: number }, segIdx: number) {
    const origin = originRef.current;
    const cur = cellToPixel(path[segIdx], origin);
    const next = cellToPixel(path[segIdx + 1], origin);
    const next2 = cellToPixel(path[Math.min(segIdx + 2, path.length - 1)], origin);
    return pointToSegmentDist(pos, next, next2) < pointToSegmentDist(pos, cur, next) - 2;
  }

  function loop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;
    const origin = originRef.current;
    const size = canvas.width;

    if (s.gameState !== "playing") {
      drawBoard(ctx, size, path, origin, s, goalCell);
      return;
    }

    s.pos.x += s.vel.x;
    s.pos.y += s.vel.y;

    while (s.segIdx < path.length - 2 && isCloserToNext(s.pos, s.segIdx)) {
      s.segIdx++;
    }

    const goalPx = cellToPixel(goalCell, origin);
    if (Math.hypot(s.pos.x - goalPx.x, s.pos.y - goalPx.y) < CELL / 2) {
      s.gameState = "win";
      setGameState("win");
      drawBoard(ctx, size, path, origin, s, goalCell);
      return;
    }

    const segStart = cellToPixel(path[s.segIdx], origin);
    const segEnd = cellToPixel(path[s.segIdx + 1], origin);
    const offDist = pointToSegmentDist(s.pos, segStart, segEnd);

    if (offDist > TOLERANCE) {
      s.gameState = "dead";
      setGameState("dead");
      drawBoard(ctx, size, path, origin, s, goalCell);
      return;
    }

    drawBoard(ctx, size, path, origin, s, goalCell);
    animRef.current = requestAnimationFrame(loop);
  }

  function start() {
    const origin = originRef.current;
    stateRef.current = initBoard(path, origin, initialVel);
    stateRef.current.gameState = "playing";
    setGameState("playing");
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(loop);
  }

  function turn() {
    const s = stateRef.current;
    if (s.gameState !== "playing") return;
    const { x, y } = s.vel;
    if (turnDir === -1) s.vel = { x: y, y: -x };  // izquierda
    else s.vel = { x: -y, y: x };                  // derecha
  }

  function press() {
    if (stateRef.current.gameState === "playing") turn();
    else start();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SIZE = Math.min(Math.floor((window.innerWidth - 80) / 2), 400);
    canvas.width = SIZE;
    canvas.height = SIZE;
    originRef.current = { x: SIZE / 2, y: SIZE / 2 };
    stateRef.current = initBoard(path, originRef.current, initialVel);
    const ctx = canvas.getContext("2d")!;
    drawBoard(ctx, SIZE, path, originRef.current, stateRef.current, goalCell);
  }, []);

  useEffect(() => {
    if (gameState === "playing") {
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState]);

  return { gameState, press };
}

export default function Espiral() {
  const canvasL = useRef<HTMLCanvasElement>(null);
  const canvasR = useRef<HTMLCanvasElement>(null);

  const r0 = PATH_RIGHT[0], r1 = PATH_RIGHT[1];
  const rdx = r1.x - r0.x, rdy = r1.y - r0.y;
  const rlen = Math.hypot(rdx, rdy);
  const rightVel = { x: (rdx / rlen) * SPEED, y: (rdy / rlen) * SPEED };

  const left = useBoard(canvasL, PATH_CELLS, -1, { x: SPEED, y: 0 });
  const right = useBoard(canvasR, PATH_RIGHT, -1, rightVel);

  const bothWin = left.gameState === "win" && right.gameState === "win";
  const anyPlaying = left.gameState === "playing" || right.gameState === "playing" ||
    (left.gameState === "win" && right.gameState !== "win") ||
    (right.gameState === "win" && left.gameState !== "win");

  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isActive = left.gameState === "playing" || right.gameState === "playing";
    const hasStarted = left.gameState !== "idle" || right.gameState !== "idle";

    if (hasStarted && !bothWin && startTimeRef.current === null) {
      startTimeRef.current = Date.now() - elapsed * 1000;
    }

    if (isActive && !timerRef.current) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null)
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    }

    if (bothWin && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset al reiniciar ambos
    if (left.gameState === "idle" && right.gameState === "idle") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      setElapsed(0);
    }
  }, [left.gameState, right.gameState, bothWin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); left.press(); }
      if (e.key === "ArrowRight") { e.preventDefault(); right.press(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [left, right]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 30%, #24243e 55%, #0f3460 75%, #16213e 100%)" }}
    >
      <div className="flex items-center gap-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">Espiral</h1>
        <span className="text-white/40 text-sm tabular-nums">{elapsed}s</span>
      </div>

      {bothWin && (
        <p className="text-white text-lg font-semibold">¡Enhorabuena! {elapsed}s</p>
      )}

      <div className="flex gap-6 items-start">
        <Board canvasRef={canvasL} gameState={left.gameState} label="←" />
        <Board canvasRef={canvasR} gameState={right.gameState} label="→" />
      </div>

      <p className="text-white/30 text-xs">← izquierda · → derecha</p>
    </div>
  );
}

function Board({
  canvasRef,
  gameState,
  label,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-white/30 text-xs">{label}</p>
      <div className="relative">
        <canvas ref={canvasRef} className="rounded-xl" style={{ display: "block" }} />
        {gameState === "idle" && (
          <Overlay><p className="text-white/50 text-sm">Pulsa {label}</p></Overlay>
        )}
        {gameState === "dead" && (
          <Overlay>
            <p className="text-white text-base font-semibold">Fuera</p>
            <p className="text-white/40 text-xs mt-1">Pulsa {label} para reintentar</p>
          </Overlay>
        )}
        {gameState === "win" && (
          <Overlay>
            <p className="text-white text-lg font-semibold">¡Enhorabuena!</p>
            <p className="text-white/50 text-xs mt-1">Pulsa {label} para repetir</p>
          </Overlay>
        )}
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm">
      {children}
    </div>
  );
}
