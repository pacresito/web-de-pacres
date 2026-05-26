"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Game logic (idéntica a espiral) ──────────────────────────────────────────

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

// ─── Canvas con paleta terminal (verde sobre papel cálido) ────────────────────

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
  ctx.fillStyle = "#fafaf7";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0,184,122,0.18)";
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
  ctx.fillStyle = "#00b87a";
  ctx.shadowColor = "#00b87a";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  if (state.gameState !== "idle") {
    ctx.beginPath();
    ctx.arc(state.pos.x, state.pos.y, Math.max(5, cell_size / 4.5), 0, Math.PI * 2);
    ctx.fillStyle = "#006644";
    ctx.shadowColor = "#00b87a";
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

  function reset() {
    cancelAnimationFrame(animRef.current);
    stateRef.current = initBoard(path, originRef.current, initialVel, cellRef.current);
    setGameState("idle");
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      drawBoard(ctx, canvas.width, path, originRef.current, stateRef.current, goalCell, cellRef.current);
    }
  }

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

  return { gameState, press, start, reset, cheat };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EspiralTerminal() {
  const canvasL = useRef<HTMLCanvasElement>(null);
  const canvasR = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  // window maximize state
  const [windowState, setWindowState] = useState<"normal" | "maximized">("maximized");
  const [animClass, setAnimClass] = useState("");
  const [winWidth, setWinWidth] = useState(0);

  useEffect(() => {
    setWinWidth(window.innerWidth);
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleBack = () => {
    setAnimClass("esp-win-unmaximizing");
    setTimeout(() => router.push("/lab"), 900);
  };

  const isMax = windowState === "maximized";

  const r0 = PATH_RIGHT[0], r1 = PATH_RIGHT[1];
  const rlen = Math.hypot(r1.x - r0.x, r1.y - r0.y);
  const rightVel = { x: ((r1.x - r0.x) / rlen) * SPEED, y: ((r1.y - r0.y) / rlen) * SPEED };

  const size = useCanvasSize();
  const left = useBoard(canvasL, PATH_CELLS, -1, { x: SPEED, y: 0 }, size);
  const right = useBoard(canvasR, PATH_RIGHT, -1, rightVel, size);

  const bothWin = left.gameState === "win" && right.gameState === "win";
  const [firstWin, setFirstWin] = useState<"left" | "right" | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const whyRef = useRef<HTMLDivElement>(null);

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

  const [fullscreen, setFullscreen] = useState(false);

  const [alias, setAlias] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedStart = parseInt(saved, 10);
      if (Date.now() - savedStart > 10 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        startTimeRef.current = savedStart;
        setElapsed(Math.floor((Date.now() - savedStart) / 1000));
      }
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
      if (localStorage.getItem(STORAGE_KEY)) return;
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
      if (process.env.NODE_ENV === "development" && e.key === "q") { left.cheat(); return; }
      if (process.env.NODE_ENV === "development" && e.key === "p") { right.cheat(); return; }
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
    await fetch("/api/ranking/espiral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: alias.trim(), score: finalTime }),
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  function replay() {
    left.reset();
    right.reset();
    setSubmitted(false);
    setAlias("");
  }

  const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --t-paper:  #fafaf7;
          --t-paper2: #f4f1ea;
          --t-ink:    #16140f;
          --t-ink2:   #3a382f;
          --t-ink3:   #7a766b;
          --t-ink4:   #b8b3a6;
          --t-rule:   #d9d4c7;
          --t-accent: #00b87a;
          --t-accent2:#009764;
          --t-mono:   ${MONO};
        }

        .esp-t-bg { background: #ece9e0 !important; }

        .esp-t-btn {
          background: none; border: none; cursor: pointer;
          font-family: var(--t-mono); font-size: 0.75rem;
          color: var(--t-ink3); padding: 0;
          transition: color 0.15s;
        }
        .esp-t-btn:hover { color: var(--t-accent); }

        .esp-t-input {
          padding: 0.35rem 0.65rem;
          border: 1px solid var(--t-rule);
          border-radius: 4px;
          font-size: 0.85rem;
          outline: none;
          color: var(--t-ink);
          background: var(--t-paper);
          font-family: var(--t-mono);
        }
        .esp-t-input:focus { border-color: var(--t-accent); }

        .esp-t-submit {
          padding: 0.35rem 0.85rem;
          background: var(--t-accent);
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: var(--t-mono);
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .esp-t-submit:disabled { opacity: 0.4; cursor: default; }

        @keyframes esp-blink { 50% { opacity: 0; } }

        @keyframes esp-win-maximize {
          0%   { width: 900px; border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04); margin-bottom: 3rem; }
          55%  { width: var(--win-w); border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04); margin-bottom: 3rem; }
          100% { width: var(--win-w); border-radius: 0; border: 1px solid transparent; box-shadow: none; margin-bottom: 0; }
        }
        @keyframes esp-win-unmaximize {
          0%   { width: var(--win-w); border-radius: 0; border: 1px solid transparent; box-shadow: none; margin-bottom: 0; }
          45%  { width: var(--win-w); border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04); margin-bottom: 3rem; }
          100% { width: 900px; border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04); margin-bottom: 3rem; }
        }
        @keyframes esp-outer-maximize {
          0%, 55% { padding: 2rem 1rem 3rem; }
          100%    { padding: 0; }
        }
        @keyframes esp-outer-unmaximize {
          0%      { padding: 0; }
          45%, 100% { padding: 2rem 1rem 3rem; }
        }
        .esp-win-maximizing   { animation: esp-win-maximize   1s ease forwards; }
        .esp-win-unmaximizing { animation: esp-win-unmaximize 1s ease forwards; }
        .esp-outer-maximizing   { animation: esp-outer-maximize   1s ease forwards !important; }
        .esp-outer-unmaximizing { animation: esp-outer-unmaximize 1s ease forwards !important; }

        .esp-nav-btn {
          background: none; border: none; cursor: pointer;
          color: var(--t-ink2); padding: 4px;
          display: inline-flex; align-items: center; justify-content: center;
          transition: color 0.15s; border-radius: 4px;
        }
        .esp-nav-btn:hover { color: var(--t-ink); }
        .esp-nav-btn:disabled { color: var(--t-ink4); cursor: default; }

        @keyframes esp-content-fadeout {
          0%, 45% { opacity: 1; }
          100%    { opacity: 0; }
        }
        .esp-content-unmaximizing {
          animation: esp-content-fadeout 0.9s ease forwards;
        }
      `}</style>

      {/* outer: terminal background */}
      <div
        className={`esp-t-bg${animClass === "esp-win-maximizing" ? " esp-outer-maximizing" : animClass === "esp-win-unmaximizing" ? " esp-outer-unmaximizing" : ""}`}
        style={{
          minHeight: "100dvh",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: isMax ? 0 : "2rem 1rem 3rem",
          transition: "padding 1.1s ease",
        }}
      >
        {/* terminal window */}
        <div
          className={animClass}
          style={{
            "--win-w": winWidth ? `${winWidth}px` : "100vw",
            width: winWidth ? (isMax ? winWidth : Math.min(900, winWidth)) : "100%",
            minHeight: isMax ? "100dvh" : undefined,
            maxWidth: "none",
            background: "var(--t-paper)",
            borderRadius: isMax ? 0 : 12,
            border: isMax ? "none" : "1px solid var(--t-rule)",
            boxShadow: isMax ? "none" : "0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04)",
            overflow: "hidden",
            marginBottom: isMax ? 0 : "3rem",
          } as React.CSSProperties}
        >

          {/* chrome bar */}
          <div style={{
            background: "var(--t-paper2)",
            borderBottom: "1px solid var(--t-rule)",
            padding: "14px 18px",
            display: fullscreen ? "none" : "grid",
            gridTemplateColumns: "200px 1fr 140px",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e", flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", flexShrink: 0 }} />
              <div className={animClass === "esp-win-unmaximizing" ? "esp-content-unmaximizing" : ""} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <div style={{ width: 1, height: 16, background: "var(--t-rule)", margin: "0 6px", flexShrink: 0 }} />
                {/* back */}
                <button className="esp-nav-btn" onClick={handleBack} title="Volver a /lab">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {/* forward — siempre desactivado */}
                <button className="esp-nav-btn" disabled title="Adelante">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {/* refresh */}
                <button className="esp-nav-btn" onClick={() => window.location.reload()} title="Recargar">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 12, color: "var(--t-ink2)" }}>
              ⌘&nbsp;&nbsp;pacr.es — espiral
            </div>
            <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 10, color: "var(--t-ink3)" }}>
              v4.0.0 · zsh
            </div>
          </div>

          {/* content: fades out during unmaximize */}
          <div className={animClass === "esp-win-unmaximizing" ? "esp-content-unmaximizing" : ""}>

          {/* prompt header */}
          <div style={{
            padding: "18px 28px 8px",
            display: fullscreen ? "none" : "grid",
            gridTemplateColumns: "44px 1fr auto",
            gap: "0 12px",
            alignItems: "baseline",
            borderBottom: "1px dashed var(--t-rule)",
          }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--t-ink4)" }}>000</span>
            <span style={{ fontFamily: MONO, fontSize: 13.5 }}>
              <span style={{ color: "var(--t-accent2)" }}>pacres</span>
              <span style={{ color: "var(--t-ink3)" }}>@espiral</span>
              <span style={{ color: "var(--t-ink2)" }}>:~/juegos</span>
              <span style={{ color: "var(--t-ink3)" }}>$ </span>
              <span style={{ color: "var(--t-ink)" }}>./espiral --mode=dual</span>
              <span style={{ color: "var(--t-accent)", animation: "esp-blink 1s steps(1) infinite", marginLeft: 2 }}>▍</span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--t-ink3)", fontVariantNumeric: "tabular-nums" }}>
              {elapsed > 0 ? `${elapsed}s` : ""}
            </span>
          </div>

          {/* game area */}
          <div style={{ padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>

            {/* status row */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontFamily: MONO }}>
              <span style={{ fontSize: "0.75rem", color: "var(--t-ink3)" }}>
                ↳ status:{" "}
                <span style={{ color: left.gameState === "win" ? "var(--t-accent)" : left.gameState === "dead" ? "#e55" : "var(--t-ink2)" }}>
                  {left.gameState}
                </span>
                {" / "}
                <span style={{ color: right.gameState === "win" ? "var(--t-accent)" : right.gameState === "dead" ? "#e55" : "var(--t-ink2)" }}>
                  {right.gameState}
                </span>
              </span>
              {(left.gameState !== "idle" || right.gameState !== "idle") && !bothWin && (
                <span style={{ fontSize: "0.75rem", color: "var(--t-ink3)", fontVariantNumeric: "tabular-nums" }}>{elapsed}s</span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
                <a
                  href="/juegos/espiral/ranking"
                  title="Ranking"
                  style={{ color: "var(--t-ink3)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t-accent)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t-ink3)")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </a>
                <button
                  className="esp-t-btn"
                  onClick={() => setFullscreen(f => !f)}
                  title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {fullscreen ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                      <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* win panel */}
            {bothWin && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <p style={{ color: "var(--t-accent)", fontSize: "1rem", fontWeight: 600, fontFamily: MONO }}>
                  ✓ completed in {finalTime?.toFixed(1)}s
                </p>

                {!submitted ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <form onSubmit={submitScore} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="text"
                        value={alias}
                        onChange={e => setAlias(e.target.value)}
                        placeholder="Tu nombre"
                        maxLength={20}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        className="esp-t-input"
                      />
                      <button
                        type="submit"
                        disabled={submitting || !alias.trim()}
                        className="esp-t-submit"
                      >
                        {submitting ? "..." : "$ guardar"}
                      </button>
                    </form>
                    <button onClick={replay} className="esp-t-btn" style={{ fontSize: "0.72rem" }}>
                      reiniciar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <button
                      onClick={() => router.push("/juegos/espiral/ranking")}
                      className="esp-t-btn"
                    >
                      ver ranking →
                    </button>
                    <button onClick={replay} className="esp-t-btn">
                      repetir
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* boards */}
            <div className="flex flex-col gap-6 items-center landscape:flex-row landscape:justify-center landscape:items-start">
              <Board canvasRef={canvasL} gameState={left.gameState} label="←" bothWin={bothWin} isFirst={firstWin === "left"} onPress={() => { if (bothWin) { replay(); } else if (left.gameState !== "win") left.press(); }} monoFont={MONO} />
              <Board canvasRef={canvasR} gameState={right.gameState} label="→" bothWin={bothWin} isFirst={firstWin === "right"} onPress={() => { if (bothWin) { replay(); } else if (right.gameState !== "win") right.press(); }} monoFont={MONO} />
            </div>

            {/* footer */}
            <div style={{ marginTop: "auto", paddingTop: "1rem", width: "100%", display: fullscreen ? "none" : "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                className="esp-t-btn"
                style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                onClick={() => { const next = !whyOpen; setWhyOpen(next); if (next) setTimeout(() => whyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50); }}
              >
                ¿Por qué una espiral?
                <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                  <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {whyOpen && (
                <div ref={whyRef} style={{
                  marginTop: "1rem",
                  padding: "16px 20px",
                  border: "1px solid var(--t-rule)",
                  borderLeft: "3px solid var(--t-accent)",
                  borderRadius: 8,
                  background: "var(--t-paper2)",
                  fontFamily: MONO, fontSize: "0.78rem", color: "var(--t-ink2)", lineHeight: 1.65,
                  display: "flex", flexDirection: "column", gap: "0.65rem",
                }}>
                  <p>Este fue el primer experimento de la web. La idea era partir de una estructura mínima y fácil de entender, pero difícil de dominar.</p>
                  <p>Me gusta distinguir tres conceptos que se mezclan a menudo.</p>
                  <p>Simple se refiere a la cantidad de elementos y reglas: dos espirales, dos pelotas, dos controles. Sencillo describe lo fácil que es entender el objetivo: se comprende de inmediato. Difícil hace referencia a lo que cuesta dominarlo: coordinar ambas acciones a la vez exige atención y precisión.</p>
                  <p>En el extremo opuesto estaría un juego de rol con cien reglas cuya primera misión es "habla con el aldeano de enfrente": complejo, complicado, pero fácil.</p>
                  <p style={{ color: "var(--t-ink4)", fontSize: "0.72rem" }}>↳ Creado el 30 de abril de 2026</p>
                </div>
              )}
            </div>
          </div>

          </div>{/* end fade-out wrapper */}
        </div>
      </div>
    </>
  );
}

function Board({
  canvasRef, gameState, label, bothWin, isFirst, onPress, monoFont,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameState: GameState;
  label: string;
  bothWin: boolean;
  isFirst: boolean;
  onPress: () => void;
  monoFont: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p style={{ color: "var(--t-ink4)", fontSize: "0.75rem", fontFamily: monoFont }} className="landscape:block hidden">{label}</p>
      <div className="relative" onClick={onPress} style={{ cursor: "pointer" }}>
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            borderRadius: "6px",
            border: "1px solid var(--t-rule)",
          }}
        />
        {gameState === "idle" && (
          <Overlay monoFont={monoFont}>
            <p style={{ color: "var(--t-ink3)", fontSize: "0.8rem" }}>
              <span style={{ color: "var(--t-accent2)" }}>$</span> toca {label}
            </p>
          </Overlay>
        )}
        {gameState === "dead" && (
          <Overlay monoFont={monoFont}>
            <p style={{ color: "#cc3333", fontSize: "0.9rem", fontWeight: 600 }}>✗ fuera</p>
            <p style={{ color: "var(--t-ink3)", fontSize: "0.7rem", marginTop: "0.2rem" }}>toca {label} para reintentar</p>
          </Overlay>
        )}
        {gameState === "win" && (
          <Overlay monoFont={monoFont}>
            <p style={{ color: "var(--t-accent)", fontSize: "1rem", fontWeight: 600 }}>
              {bothWin ? "✓ listo" : isFirst ? "ya falta poco..." : "✓ listo"}
            </p>
            {bothWin && <p style={{ color: "var(--t-ink3)", fontSize: "0.7rem", marginTop: "0.2rem" }}>toca para repetir</p>}
          </Overlay>
        )}
      </div>
    </div>
  );
}

function Overlay({ children, monoFont }: { children: React.ReactNode; monoFont: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        borderRadius: "6px",
        background: "rgba(250,250,247,0.88)",
        backdropFilter: "blur(4px)",
        fontFamily: monoFont,
      }}
    >
      {children}
    </div>
  );
}
