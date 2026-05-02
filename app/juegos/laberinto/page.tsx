"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Cambio 3: Bloquear landscape en móvil — estilos globales inyectados en <head> via <style>
const LANDSCAPE_BLOCK_CSS = `
@media (orientation: landscape) and (max-width: 1024px) {
  #landscape-overlay { display: flex !important; }
}
`;

const COLS = 9;
const ROWS = 9;
const CELL = 54;
const WALL_W = 6;
const BALL_R = 10;
const BOARD_W = COLS * CELL + WALL_W;
const BOARD_H = ROWS * CELL + WALL_W;
const GOAL_X = (COLS - 1) * CELL + CELL / 2 + WALL_W / 2;
const GOAL_Y = (ROWS - 1) * CELL + CELL / 2 + WALL_W / 2;
const START_X = CELL / 2 + WALL_W / 2;
const START_Y = CELL / 2 + WALL_W / 2;

const MAX_TILT = 14;
const TILT_SPEED = 2.0;
const GRAVITY = 1400;
const FRICTION = 0.983;
const RESTITUTION = 0.2;

const MN = 1, MS = 2, ME = 4, MW = 8;

type MazeCell = { walls: number };
type Seg = { x1: number; y1: number; x2: number; y2: number };

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

export default function Laberinto() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<(t: number) => void>(() => {});
  const [won, setWon] = useState(false);

  const [orientState, setOrientState] = useState<"off" | "needs-permission" | "on">("off");
  const [scale, setScale] = useState(1);

  const g = useRef({
    maze: generateMaze(),
    segs: [] as Seg[],
    bx: START_X, by: START_Y,
    vx: 0, vy: 0,
    tiltX: 0, tiltY: 0,
    mouseX: 0, mouseY: 0, hasMouse: false,
    orientX: 0, orientY: 0, hasOrient: false,
    orientRefBeta: 0,
    orientRefGamma: 0,
    keys: { up: false, down: false, left: false, right: false },
    idle: true,
    won: false,
    startTime: 0,
    lastTime: 0,
    animId: 0,
  });

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { bx, by, segs, won: gameWon } = g.current;

    ctx.clearRect(0, 0, BOARD_W, BOARD_H);

    // Floor (claro)
    const fg = ctx.createRadialGradient(BOARD_W / 2, BOARD_H / 2, 30, BOARD_W / 2, BOARD_H / 2, BOARD_W);
    fg.addColorStop(0, "#dde3ea");
    fg.addColorStop(1, "#c8d3de");
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    // Start marker
    ctx.strokeStyle = "#3b82f625";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(START_X, START_Y, CELL * 0.32, 0, Math.PI * 2);
    ctx.stroke();

    // Goal glow
    const gg = ctx.createRadialGradient(GOAL_X, GOAL_Y, 0, GOAL_X, GOAL_Y, CELL * 0.42);
    gg.addColorStop(0, gameWon ? "#16a34a" : "#22c55e");
    gg.addColorStop(0.45, "#22c55e40");
    gg.addColorStop(1, "transparent");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(GOAL_X, GOAL_Y, CELL * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Goal label
    ctx.fillStyle = gameWon ? "#16a34a" : "#22c55e";
    ctx.font = `bold ${Math.round(CELL * 0.3)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓", GOAL_X, GOAL_Y + 1);

    // Sombra de paredes (simula grosor)
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

    // Paredes
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

    // Bola
    if (!gameWon) {
      // Sombra de contacto en el suelo
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.ellipse(bx + 2, by + 3, BALL_R * 1.0, BALL_R * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cuerpo esférico (gradiente con foco arriba-izquierda)
      ctx.save();
      ctx.shadowColor = "#3b82f650";
      ctx.shadowBlur = 10;
      const bg = ctx.createRadialGradient(
        bx - BALL_R * 0.35, by - BALL_R * 0.35, BALL_R * 0.05,
        bx, by, BALL_R
      );
      bg.addColorStop(0, "#93c5fd");
      bg.addColorStop(0.35, "#3b82f6");
      bg.addColorStop(1, "#1e3a8a");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      // Brillo especular
      const spec = ctx.createRadialGradient(
        bx - BALL_R * 0.4, by - BALL_R * 0.4, 0,
        bx - BALL_R * 0.35, by - BALL_R * 0.35, BALL_R * 0.45
      );
      spec.addColorStop(0, "rgba(255,255,255,0.88)");
      spec.addColorStop(0.5, "rgba(255,255,255,0.25)");
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.shadowBlur = 0;
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function startLoop() {
    const state = g.current;

    loopRef.current = function loop(time: number) {
      if (state.won) { draw(); return; }

      const anyKey = state.keys.up || state.keys.down || state.keys.left || state.keys.right;
      const started = state.hasMouse || anyKey;

      // Idle: esperar movimiento de ratón o D-pad táctil
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

      // Win
      const dx = state.bx - GOAL_X, dy = state.by - GOAL_Y;
      if (Math.sqrt(dx * dx + dy * dy) < CELL * 0.3) {
        state.won = true;
        setWon(true);
      }

      draw();
      state.animId = requestAnimationFrame(loopRef.current);
    };

    state.animId = requestAnimationFrame((t) => {
      state.lastTime = t;
      loopRef.current(t);
    });
  }

  function restart() {
    const state = g.current;
    cancelAnimationFrame(state.animId);
    state.maze = generateMaze();
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
    if (boardRef.current) boardRef.current.style.transform = "";
    setWon(false);
    startLoop();
  }

  // Cambio 2: attachOrientListener ya no calibra en el primer evento.
  // La calibración se hace en el touchstart del canvas (calibrateOrientation).
  const attachOrientListener = useCallback(() => {
    const state = g.current;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma: inclinación izquierda/derecha (-90..90), beta: adelante/atrás
      const ORIENT_SCALE = MAX_TILT / 25; // 25° de inclinación = tilt máximo
      state.orientY = (e.gamma - state.orientRefGamma) * ORIENT_SCALE;
      state.orientX = (e.beta - state.orientRefBeta) * ORIENT_SCALE;
      state.hasOrient = true;
    };

    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);

  // Cambio 2: captura la orientación actual como referencia neutra al tocar el canvas
  const calibrateOrientation = useCallback(() => {
    // Pedimos un único evento de orientación y guardamos esos valores como referencia
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
      const available = Math.min(window.innerWidth - padding, window.innerHeight * 0.7);
      setScale(Math.min(1, available / BOARD_W));
    };
    updateScale();
    window.addEventListener("resize", updateScale);

    // Cambio 3: intentar bloquear orientación portrait en móvil via JS
    if (typeof screen !== "undefined" && screen.orientation && typeof (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock === "function") {
      (screen.orientation as unknown as { lock: (o: string) => Promise<void> }).lock("portrait").catch(() => {
        // silenciar error — no todos los navegadores lo soportan
      });
    }

    // Detectar si el dispositivo tiene giroscopio
    const isIOS = typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";
    if (!isIOS && window.DeviceOrientationEvent) {
      // Android y otros: no requiere permiso — el giroscopio se activa al tocar (calibración en touchstart)
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
        // Cambio 2: calibrar inmediatamente tras conceder permiso en iOS
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

  return (
    <main style={{ background: "#ffffff", minHeight: "100dvh", position: "relative" }} className="flex flex-col items-center justify-start px-4 py-8 gap-6 overflow-x-auto">
      {/* Cambio 3: Inyectar CSS para bloquear landscape */}
      <style>{LANDSCAPE_BLOCK_CSS}</style>

      {/* Cambio 3: Overlay "gira el móvil" — oculto por defecto, visible con media query landscape */}
      <div
        id="landscape-overlay"
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#ffffff",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <span style={{ fontSize: "3rem" }}>🔄</span>
        <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", textAlign: "center", padding: "0 2rem" }}>
          Por favor, gira el móvil a modo vertical
        </p>
      </div>
      <div className="flex items-center gap-6">
        <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em" }}>Laberinto</h1>
      </div>

      {/* 3D board */}
      <div
        style={{
          width: BOARD_W * scale,
          height: BOARD_H * scale,
          flexShrink: 0,
        }}
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
          {/* Cambio 2: touchstart en el canvas calibra el giroscopio */}
          <canvas
            ref={canvasRef}
            width={BOARD_W}
            height={BOARD_H}
            style={{ display: "block" }}
            onTouchStart={() => {
              if (orientState === "on") {
                calibrateOrientation();
              } else if (orientState === "needs-permission") {
                // iOS: pedir permiso al tocar el canvas
                requestOrientPermission();
              }
            }}
          />
          {/* Cara superior */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: 20,
            background: "linear-gradient(to bottom, #1d4ed8, #3b82f6)",
            transformOrigin: "top center", transform: "rotateX(90deg)",
          }} />
          {/* Cara inferior */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: "100%", height: 20,
            background: "linear-gradient(to top, #1d4ed8, #3b82f6)",
            transformOrigin: "bottom center", transform: "rotateX(-90deg)",
          }} />
          {/* Cara izquierda */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: 20, height: "100%",
            background: "linear-gradient(to right, #1d4ed8, #3b82f6)",
            transformOrigin: "left center", transform: "rotateY(-90deg)",
          }} />
          {/* Cara derecha */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 20, height: "100%",
            background: "linear-gradient(to left, #1d4ed8, #3b82f6)",
            transformOrigin: "right center", transform: "rotateY(90deg)",
          }} />
        </div>
      </div>
      </div>

      {won && (
        <p style={{ color: "#3b82f6", fontSize: "1.1rem", fontWeight: 600 }}>¡Enhorabuena!</p>
      )}
      <button
        onClick={restart}
        className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
      >
        nuevo laberinto
      </button>

      {/* Touch D-pad (solo si no hay giroscopio activo) */}
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

      {/* Botón permiso giroscopio iOS */}
      {orientState === "needs-permission" && (
        <button
          onClick={requestOrientPermission}
          className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold"
        >
          Usar giroscopio
        </button>
      )}

      <div className="mt-auto flex flex-col items-center gap-2 pb-6">
        <p style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
          {orientState === "on"
            ? "Toca el tablero para calibrar · Inclina el móvil para mover la bola"
            : "Mueve el ratón para inclinar el tablero"}
        </p>
        <a
          href="/"
          style={{
            fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)",
            textDecoration: "none", transition: "color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
        >
          pacr.es
        </a>
      </div>
    </main>
  );
}
