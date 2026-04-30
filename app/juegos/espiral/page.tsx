"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function calcSize() {
  const isLandscape = window.innerWidth > window.innerHeight;
  if (isLandscape) {
    return Math.min(Math.floor((window.innerWidth - 96) / 2), window.innerHeight - 80, 420);
  }
  return Math.min(Math.floor(window.innerWidth - 32), Math.floor((window.innerHeight - 120) / 2), 420);
}

function useCanvasSize() {
  const [size, setSize] = useState(0);
  useEffect(() => {
    setSize(calcSize());
    const onResize = () => setSize(calcSize());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return size;
}

// El espiral ocupa 10 celdas — 1 celda de margen a cada lado = 12
function calcCell(size: number) { return Math.floor(size / 12); }
function calcTolerance(cell: number) { return Math.floor(cell * 0.36); }

const SPEED = 0.8;

function buildPath() {
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

const PATH_CELLS = buildPath();
const PATH_RIGHT = [...PATH_CELLS].reverse().map(p => ({ x: -p.x, y: p.y }));

function pathCenter(path: { x: number; y: number }[]) {
  const xs = path.map(p => p.x), ys = path.map(p => p.y);
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function calcOrigin(size: number, cell_size: number, path: { x: number; y: number }[]) {
  const { cx, cy } = pathCenter(path);
  return { x: size / 2 - cx * cell_size, y: size / 2 - cy * cell_size };
}

function cellToPixel(cell: { x: number; y: number }, origin: { x: number; y: number }, cell_size: number) {
  return { x: origin.x + cell.x * cell_size, y: origin.y + cell.y * cell_size };
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

function initBoard(path: typeof PATH_CELLS, origin: { x: number; y: number }, vel: { x: number; y: number }, cell_size: number): BoardState {
  const start = cellToPixel(path[0], origin, cell_size);
  return { pos: { ...start }, vel: { ...vel }, segIdx: 0, gameState: "idle" };
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  size: number,
  path: typeof PATH_CELLS,
  origin: { x: number; y: number },
  state: BoardState,
  goalCell: { x: number; y: number },
  cell_size: number
) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#f0f6ff";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(96,165,250,0.22)";
  ctx.lineWidth = cell_size - 2;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  path.forEach((cell, i) => {
    const p = cellToPixel(cell, origin, cell_size);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  const goal = cellToPixel(goalCell, origin, cell_size);
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, Math.max(4, cell_size / 6), 0, Math.PI * 2);
  ctx.fillStyle = "#3b82f6";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (state.gameState !== "idle") {
    ctx.beginPath();
    ctx.arc(state.pos.x, state.pos.y, Math.max(5, cell_size / 4.5), 0, Math.PI * 2);
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
  initialVel: { x: number; y: number },
  size: number
) {
  const originRef = useRef({ x: 0, y: 0 });
  const stateRef = useRef<BoardState>({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, segIdx: 0, gameState: "idle" });
  const animRef = useRef(0);
  const cellRef = useRef(calcCell(size));
  const [gameState, setGameState] = useState<GameState>("idle");
  const [startCount, setStartCount] = useState(0);
  const goalCell = path[path.length - 1];

  function isCloserToNext(pos: { x: number; y: number }, segIdx: number) {
    const origin = originRef.current;
    const cs = cellRef.current;
    const cur = cellToPixel(path[segIdx], origin, cs);
    const next = cellToPixel(path[segIdx + 1], origin, cs);
    const next2 = cellToPixel(path[Math.min(segIdx + 2, path.length - 1)], origin, cs);
    return pointToSegmentDist(pos, next, next2) < pointToSegmentDist(pos, cur, next) - 2;
  }

  function loop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;
    const origin = originRef.current;
    const sz = canvas.width;
    const cs = cellRef.current;

    if (s.gameState !== "playing") { drawBoard(ctx, sz, path, origin, s, goalCell, cs); return; }

    s.pos.x += s.vel.x;
    s.pos.y += s.vel.y;

    while (s.segIdx < path.length - 2 && isCloserToNext(s.pos, s.segIdx)) s.segIdx++;

    const goalPx = cellToPixel(goalCell, origin, cs);
    if (Math.hypot(s.pos.x - goalPx.x, s.pos.y - goalPx.y) < cs / 2) {
      s.gameState = "win"; setGameState("win");
      drawBoard(ctx, sz, path, origin, s, goalCell, cs); return;
    }

    const offDist = pointToSegmentDist(s.pos, cellToPixel(path[s.segIdx], origin, cs), cellToPixel(path[s.segIdx + 1], origin, cs));
    if (offDist > calcTolerance(cs)) {
      s.gameState = "dead"; setGameState("dead");
      drawBoard(ctx, sz, path, origin, s, goalCell, cs); return;
    }

    drawBoard(ctx, sz, path, origin, s, goalCell, cs);
    animRef.current = requestAnimationFrame(loop);
  }

  function start() {
    cancelAnimationFrame(animRef.current);
    stateRef.current = initBoard(path, originRef.current, initialVel, cellRef.current);
    stateRef.current.gameState = "playing";
    setGameState("playing");
    setStartCount((c) => c + 1);
  }

  function press() {
    const s = stateRef.current;
    if (s.gameState !== "playing") { start(); return; }
    const { x, y } = s.vel;
    if (turnDir === -1) s.vel = { x: y, y: -x };
    else s.vel = { x: -y, y: x };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size === 0) return;
    const cs = calcCell(size);
    cellRef.current = cs;
    canvas.width = size;
    canvas.height = size;
    originRef.current = calcOrigin(size, cs, path);
    if (stateRef.current.gameState === "idle") {
      stateRef.current = initBoard(path, originRef.current, initialVel, cs);
    } else {
      stateRef.current.pos = cellToPixel(path[stateRef.current.segIdx], originRef.current, cs);
    }
    const ctx = canvas.getContext("2d")!;
    drawBoard(ctx, size, path, originRef.current, stateRef.current, goalCell, cs);
  }, [size]);

  useEffect(() => {
    if (gameState === "playing") {
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, startCount]);

  function cheat() {
    const s = stateRef.current;
    if (s.gameState === "win") return;
    cancelAnimationFrame(animRef.current);
    s.gameState = "win";
    s.pos = cellToPixel(goalCell, originRef.current, cellRef.current);
    setGameState("win");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      drawBoard(ctx, canvas.width, path, originRef.current, s, goalCell, cellRef.current);
    }
  }

  return { gameState, press, start, cheat };
}

export default function Espiral() {
  const canvasL = useRef<HTMLCanvasElement>(null);
  const canvasR = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const r0 = PATH_RIGHT[0], r1 = PATH_RIGHT[1];
  const rlen = Math.hypot(r1.x - r0.x, r1.y - r0.y);
  const rightVel = { x: ((r1.x - r0.x) / rlen) * SPEED, y: ((r1.y - r0.y) / rlen) * SPEED };

  const size = useCanvasSize();
  const left = useBoard(canvasL, PATH_CELLS, -1, { x: SPEED, y: 0 }, size);
  const right = useBoard(canvasR, PATH_RIGHT, -1, rightVel, size);

  const bothWin = left.gameState === "win" && right.gameState === "win";
  const [firstWin, setFirstWin] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    if (left.gameState === "win" && right.gameState !== "win" && firstWin === null) setFirstWin("left");
    else if (right.gameState === "win" && left.gameState !== "win" && firstWin === null) setFirstWin("right");
    if (left.gameState !== "win" && right.gameState !== "win") setFirstWin(null);
  }, [left.gameState, right.gameState]);

  const STORAGE_KEY = "espiral_start_time";
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [alias, setAlias] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      }, 500);
    }
    if (bothWin && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      localStorage.removeItem(STORAGE_KEY);
      if (startTimeRef.current !== null)
        setFinalTime(Math.round((Date.now() - startTimeRef.current) / 100) / 10);
      startTimeRef.current = null;
    }
    if (left.gameState === "idle" && right.gameState === "idle") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      setElapsed(0);
      setFinalTime(null);
      setSubmitted(false);
      setAlias("");
    }
  }, [left.gameState, right.gameState, bothWin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "q") { left.cheat(); return; }
      if (e.key === "p") { right.cheat(); return; }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      if (bothWin) { left.start(); right.start(); return; }
      if (e.key === "ArrowLeft" && left.gameState !== "win") left.press();
      if (e.key === "ArrowRight" && right.gameState !== "win") right.press();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [left, right, bothWin]);

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    if (!alias.trim() || finalTime === null) return;
    setSubmitting(true);
    await fetch("/api/ranking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: alias.trim(), score: finalTime }),
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  function replay() {
    left.start();
    right.start();
    setSubmitted(false);
    setAlias("");
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-8"
      style={{ background: "#ffffff", position: "relative", minHeight: "100dvh" }}
    >
      <div className="flex items-center gap-6">
        <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Espiral</h1>
        <span style={{ color: "#9ca3af", fontSize: "0.85rem", fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-geist-mono, monospace)" }}>{elapsed}s</span>
        <a
          href="/juegos/espiral/ranking"
          style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
        >
          ranking
        </a>
      </div>

      {bothWin && (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>¡Enhorabuena! — {finalTime?.toFixed(1)}s</p>

          {!submitted ? (
            <form onSubmit={submitScore} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="text"
                value={alias}
                onChange={e => setAlias(e.target.value)}
                placeholder="Tu nombre"
                maxLength={20}
                style={{
                  padding: "0.35rem 0.65rem",
                  border: "1px solid rgba(96,165,250,0.4)",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  outline: "none",
                  color: "#111827",
                  background: "#f8faff",
                  fontFamily: "var(--font-geist-mono, monospace)",
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
                  cursor: alias.trim() ? "pointer" : "default",
                  opacity: alias.trim() ? 1 : 0.4,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}
              >
                {submitting ? "..." : "Guardar"}
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <button
                onClick={() => router.push("/juegos/espiral/ranking")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                Ver ranking →
              </button>
              <button
                onClick={replay}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                Repetir
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 items-center landscape:flex-row landscape:justify-center landscape:items-start">
        <Board canvasRef={canvasL} gameState={left.gameState} label="←" bothWin={bothWin} isFirst={firstWin === "left"} onPress={() => { if (bothWin) { replay(); } else if (left.gameState !== "win") left.press(); }} />
        <Board canvasRef={canvasR} gameState={right.gameState} label="→" bothWin={bothWin} isFirst={firstWin === "right"} onPress={() => { if (bothWin) { replay(); } else if (right.gameState !== "win") right.press(); }} />
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
  canvasRef, gameState, label, bothWin, isFirst, onPress,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  label: string;
  bothWin: boolean;
  isFirst: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-white/30 text-xs landscape:block hidden">{label}</p>
      <div className="relative" onClick={onPress} style={{ cursor: "pointer" }}>
        <canvas ref={canvasRef} style={{ display: "block", borderRadius: "8px", border: "1px solid rgba(96,165,250,0.2)" }} />
        {gameState === "idle" && (
          <Overlay><p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Toca para empezar</p></Overlay>
        )}
        {gameState === "dead" && (
          <Overlay>
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 600 }}>Fuera</p>
            <p style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: "0.25rem" }}>Toca para reintentar</p>
          </Overlay>
        )}
        {gameState === "win" && (
          <Overlay>
            <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>
              {bothWin ? "¡Listo!" : isFirst ? "Ya falta poco..." : "¡Listo!"}
            </p>
            {bothWin && <p style={{ color: "#9ca3af", fontSize: "0.72rem", marginTop: "0.25rem" }}>Toca para repetir</p>}
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
