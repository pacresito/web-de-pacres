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
  ctx.fillStyle = "#f0f6ff";
  ctx.fillRect(0, 0, size, size);

  // Paredes del camino
  ctx.strokeStyle = "rgba(96,165,250,0.22)";
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
  ctx.fillStyle = "#3b82f6";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Punto jugador
  if (state.gameState !== "idle") {
    ctx.beginPath();
    ctx.arc(state.pos.x, state.pos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#1e40af";
    ctx.shadowColor = "#3b82f6";
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
  const [startCount, setStartCount] = useState(0);

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
    cancelAnimationFrame(animRef.current);
    stateRef.current = initBoard(path, origin, initialVel);
    stateRef.current.gameState = "playing";
    setGameState("playing");
    setStartCount((c) => c + 1);
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
  }, [gameState, startCount]);

  return { gameState, press, start };
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

  const [firstWin, setFirstWin] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    if (left.gameState === "win" && right.gameState !== "win" && firstWin === null) {
      setFirstWin("left");
    } else if (right.gameState === "win" && left.gameState !== "win" && firstWin === null) {
      setFirstWin("right");
    }
    if (left.gameState !== "win" && right.gameState !== "win") {
      setFirstWin(null);
    }
  }, [left.gameState, right.gameState]);

  const STORAGE_KEY = "espiral_start_time";

  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recuperar tiempo guardado al montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedStart = parseInt(saved, 10);
      startTimeRef.current = savedStart;
      setElapsed(Math.floor((Date.now() - savedStart) / 1000));
    }
  }, []);

  useEffect(() => {
    const isActive = left.gameState === "playing" || right.gameState === "playing";
    const hasStarted = left.gameState !== "idle" || right.gameState !== "idle";

    if (hasStarted && !bothWin && startTimeRef.current === null) {
      setElapsed(0);
      const newStart = Date.now();
      startTimeRef.current = newStart;
      localStorage.setItem(STORAGE_KEY, String(newStart));
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
      localStorage.removeItem(STORAGE_KEY);
      setFinalTime(elapsed);
      startTimeRef.current = null;
    }

    // Reset al reiniciar ambos
    if (left.gameState === "idle" && right.gameState === "idle") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      setElapsed(0);
      setFinalTime(null);
    }
  }, [left.gameState, right.gameState, bothWin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (bothWin) {
          left.start();
          right.start();
        } else if (e.key === "ArrowLeft" && left.gameState !== "win") {
          left.press();
        } else if (e.key === "ArrowRight" && right.gameState !== "win") {
          right.press();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [left, right, bothWin]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
      style={{ background: "#ffffff", position: "relative" }}
    >
      <div className="flex items-center gap-6">
        <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Espiral</h1>
        <span style={{ color: "#9ca3af", fontSize: "0.85rem", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono, monospace)" }}>{elapsed}s</span>
      </div>

      {bothWin && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>¡Enhorabuena!</p>
          <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>{finalTime}s</p>
        </div>
      )}

      <div className="flex gap-6 items-start">
        <Board canvasRef={canvasL} gameState={left.gameState} label="←" bothWin={bothWin} isFirst={firstWin === "left"} />
        <Board canvasRef={canvasR} gameState={right.gameState} label="→" bothWin={bothWin} isFirst={firstWin === "right"} />
      </div>

      <a
        href="/"
        style={{
          position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
          fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)",
          textDecoration: "none", transition: "color 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
      >
        pacr.es
      </a>
    </div>
  );
}

function Board({
  canvasRef,
  gameState,
  label,
  bothWin,
  isFirst,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  label: string;
  bothWin: boolean;
  isFirst: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-white/30 text-xs">{label}</p>
      <div className="relative">
        <canvas ref={canvasRef} style={{ display: "block", borderRadius: "8px", border: "1px solid rgba(96,165,250,0.2)" }} />
        {gameState === "idle" && (
          <Overlay><p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Pulsa {label}</p></Overlay>
        )}
        {gameState === "dead" && (
          <Overlay>
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 600 }}>Fuera</p>
            <p style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: "0.25rem" }}>Pulsa {label} para reintentar</p>
          </Overlay>
        )}
        {gameState === "win" && (
          <Overlay>
            <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>
              {bothWin ? "¡Listo!" : isFirst ? "Ya falta poco..." : "¡Listo!"}
            </p>
            {bothWin && (
              <p style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: "0.25rem" }}>Pulsa cualquier tecla para repetir</p>
            )}
          </Overlay>
        )}
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ borderRadius: "8px", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
      {children}
    </div>
  );
}
