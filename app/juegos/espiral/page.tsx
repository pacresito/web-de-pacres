"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { useTema } from "../../components/usePersistedTheme";
import { IconoRanking, IconoPantallaCompleta } from "../../components/Iconos";

// Descuento del panel que envuelve los tableros (padding + junta + aire a los lados), que
// va por fuera del canvas: sin restarlo el tablero se sale por el lado en vertical.
const PANEL_H = 97;  // apaisado: 22+22 de marco, 1 de junta, 26+26 de aire
const PANEL_V = 44;  // vertical: 22+22 de marco
const AIRE_JUNTA = 53;  // 26 + 1 + 26: lo que separa los dos tableros

function calcSize() {
  const isLandscape = window.innerWidth > window.innerHeight;
  if (isLandscape) {
    return Math.min(Math.floor((window.innerWidth - 96 - PANEL_H) / 2), window.innerHeight - 80, 420);
  }
  return Math.min(Math.floor(window.innerWidth - 32 - PANEL_V), Math.floor((window.innerHeight - 120) / 2), 420);
}

function useCanvasSize() {
  // El tamaño depende de `window`, que no existe en el server: useSyncExternalStore
  // devuelve 0 en SSR y el valor real tras hidratar, suscrito a resize/orientación.
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      window.addEventListener("orientationchange", onChange);
      return () => {
        window.removeEventListener("resize", onChange);
        window.removeEventListener("orientationchange", onChange);
      };
    },
    calcSize,
    () => 0,
  );
}

import {
  SPEED_MULTIPLIERS, SPEED_ORDER, PATH_CELLS, PATH_RIGHT,
  LEFT_INITIAL_VEL, RIGHT_INITIAL_VEL,
  calcCell, calcTolerance, calcOrigin, cellToPixel, pointToSegmentDist, initBoard,
  type BoardState, type GameState, type SpeedLevel,
} from "./engine";
import { drawBoard, buildSurcoLayer, leerTokens, surcoKey, type Tokens } from "./render";

function useBoard(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  path: typeof PATH_CELLS,
  turnDir: 1 | -1,
  initialVel: { x: number; y: number },
  size: number,
  speedRef: React.RefObject<SpeedLevel>,
  tema: ReturnType<typeof useTema>
) {
  const originRef = useRef({ x: 0, y: 0 });
  const stateRef = useRef<BoardState>({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, segIdx: 0, gameState: "idle", trail: [] });
  const animRef = useRef(0);
  const cellRef = useRef(calcCell(size));
  // Tamaño lógico (px CSS): el canvas tiene el backing store escalado por devicePixelRatio,
  // así que canvas.width ya no sirve como medida del tablero.
  const sizeRef = useRef(size);
  const dprRef = useRef(1);
  const surcoRef = useRef<{ key: string; layer: HTMLCanvasElement } | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [startCount, setStartCount] = useState(0);
  const goalCell = path[path.length - 1];

  // Velocidad mínima usada durante el run (para el ranking): la rastrea el propio loop,
  // que ya lee la velocidad cada frame. `winSpeedRef` la congela al ganar.
  const runMinSpeedRef = useRef<SpeedLevel>("fast");
  const winSpeedRef = useRef<SpeedLevel | null>(null);

  const isCloserToNext = useCallback((pos: { x: number; y: number }, segIdx: number) => {
    const origin = originRef.current;
    const cs = cellRef.current;
    const cur = cellToPixel(path[segIdx], origin, cs);
    const next = cellToPixel(path[segIdx + 1], origin, cs);
    const next2 = cellToPixel(path[Math.min(segIdx + 2, path.length - 1)], origin, cs);
    return pointToSegmentDist(pos, next, next2) < pointToSegmentDist(pos, cur, next) - 2;
  }, [path]);

  /** Pinta el frame actual, reconstruyendo la capa del surco si cambió el tamaño o el tema. */
  const pintar = useCallback(() => {
    const canvas = canvasRef.current;
    const s = sizeRef.current;
    if (!canvas || !s) return;
    const ctx = canvas.getContext("2d")!;
    const C: Tokens = leerTokens(canvas);
    const key = surcoKey(s, dprRef.current, C);
    if (!surcoRef.current || surcoRef.current.key !== key) {
      surcoRef.current = { key, layer: buildSurcoLayer(s, dprRef.current, path, originRef.current, cellRef.current, C) };
    }
    drawBoard(ctx, s, originRef.current, stateRef.current, goalCell, cellRef.current, surcoRef.current.layer, C);
  }, [canvasRef, path, goalCell]);

  const lastTimeRef = useRef(0);
  const accumRef = useRef(0);
  const loopRef = useRef<(now: number) => void>(() => {});

  const loop = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const cs = cellRef.current;

    if (s.gameState !== "playing") {
      pintar();
      return;
    }

    if (document.hidden) { lastTimeRef.current = now; accumRef.current = 0; animRef.current = requestAnimationFrame(loopRef.current); return; }

    // Rastrea el mínimo de velocidad del run (solo baja).
    if (SPEED_ORDER[speedRef.current] < SPEED_ORDER[runMinSpeedRef.current]) runMinSpeedRef.current = speedRef.current;

    const STEP_MS = 1000 / 60;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;
    accumRef.current = Math.min(accumRef.current + delta, STEP_MS * 5);

    while (accumRef.current >= STEP_MS) {
      const mult = SPEED_MULTIPLIERS[speedRef.current] ?? 1;
      s.pos.x += s.vel.x * mult;
      s.pos.y += s.vel.y * mult;

      const ult = s.trail[s.trail.length - 1];
      if (!ult || Math.hypot(s.pos.x - ult.x, s.pos.y - ult.y) >= 2) s.trail.push({ x: s.pos.x, y: s.pos.y });

      while (s.segIdx < path.length - 2 && isCloserToNext(s.pos, s.segIdx)) s.segIdx++;

      const goalPx = cellToPixel(goalCell, originRef.current, cs);
      if (Math.hypot(s.pos.x - goalPx.x, s.pos.y - goalPx.y) < cs / 2) {
        s.gameState = "win"; winSpeedRef.current = runMinSpeedRef.current; setGameState("win");
        pintar(); return;
      }

      const offDist = pointToSegmentDist(s.pos, cellToPixel(path[s.segIdx], originRef.current, cs), cellToPixel(path[s.segIdx + 1], originRef.current, cs));
      if (offDist > calcTolerance(cs)) {
        s.gameState = "dead"; setGameState("dead");
        pintar(); return;
      }

      accumRef.current -= STEP_MS;
    }

    pintar();
    animRef.current = requestAnimationFrame(loopRef.current);
  }, [path, goalCell, isCloserToNext, speedRef, canvasRef, pintar]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  function start() {
    cancelAnimationFrame(animRef.current);
    stateRef.current = initBoard(path, originRef.current, initialVel, cellRef.current);
    stateRef.current.gameState = "playing";
    runMinSpeedRef.current = speedRef.current;
    winSpeedRef.current = null;
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
    sizeRef.current = size;
    // El backing store va al devicePixelRatio real y el contexto se escala una vez: a 1x los
    // biseles del surco (un 5% de celda) se comen el subpíxel y el canal deja de leerse
    // excavado en retina. Tope en 3 para no cuadruplicar el coste en pantallas muy densas.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    dprRef.current = dpr;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    originRef.current = calcOrigin(size, cs, path);
    if (stateRef.current.gameState === "idle") {
      stateRef.current = initBoard(path, originRef.current, initialVel, cs);
    } else {
      // La traza guardada está en píxeles del tablero anterior: al redimensionar ya no
      // describe por dónde pasó la bola, así que se descarta en vez de reescalarse.
      stateRef.current.pos = cellToPixel(path[stateRef.current.segIdx], originRef.current, cs);
      stateRef.current.trail = [];
    }
    pintar();
  }, [size, path, initialVel, goalCell, canvasRef, pintar]);

  // El canvas no vira con la cascada: sus colores se pintaron con los tokens de un frame
  // concreto. Fuera de "playing" no hay bucle que lo rehaga, así que el toggle de tema lo
  // dejaba con el papel del tema anterior — repintar aquí es lo que lo mete en la cascada.
  useEffect(() => { pintar(); }, [tema, pintar]);

  useEffect(() => {
    if (gameState === "playing") {
      cancelAnimationFrame(animRef.current);
      lastTimeRef.current = performance.now();
      accumRef.current = 0;
      animRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, startCount, loop]);

  function reset() {
    cancelAnimationFrame(animRef.current);
    stateRef.current = initBoard(path, originRef.current, initialVel, cellRef.current);
    winSpeedRef.current = null;
    runMinSpeedRef.current = "fast";
    setGameState("idle");
    pintar();
  }

  function cheat() {
    const s = stateRef.current;
    if (s.gameState === "win") return;
    cancelAnimationFrame(animRef.current);
    s.gameState = "win";
    winSpeedRef.current = runMinSpeedRef.current;
    s.pos = cellToPixel(goalCell, originRef.current, cellRef.current);
    setGameState("win");
    pintar();
  }

  return { gameState, press, start, reset, cheat, winSpeedRef };
}

const MONO = "var(--t-mono)";

const SPEED_COLOR: Record<SpeedLevel, string> = {
  slow: "#60a5fa",
  normal: "var(--t-accent)",
  fast: "#f97316",
};

const STATE_LABEL: Record<GameState, string> = {
  idle: "idle",
  playing: "run",
  dead: "dead",
  win: "win",
};

export default function EspiralPage() {
  const canvasL = useRef<HTMLCanvasElement>(null);
  const canvasR = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const [fullscreen, setFullscreen] = useState(false);

  const [speed, setSpeed] = useState<SpeedLevel>("slow");
  const speedRef = useRef<SpeedLevel>("slow");
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const SPEED_CYCLE: SpeedLevel[] = ["slow", "normal", "fast"];
  function cycleSpeed() {
    setSpeed(s => SPEED_CYCLE[(SPEED_CYCLE.indexOf(s) + 1) % SPEED_CYCLE.length]);
  }

  const size = useCanvasSize();
  const tema = useTema();
  const left = useBoard(canvasL, PATH_CELLS, -1, LEFT_INITIAL_VEL, size, speedRef, tema);
  const right = useBoard(canvasR, PATH_RIGHT, -1, RIGHT_INITIAL_VEL, size, speedRef, tema);

  const bothWin = left.gameState === "win" && right.gameState === "win";
  const [firstWin, setFirstWin] = useState<"left" | "right" | null>(null);

  // Quién ganó primero: se ajusta durante el render cuando cambian los estados (sin effect).
  // El guardado solo al estar en null da la memoria de "primero"; se resetea al volver a no-win.
  if (left.gameState !== "win" && right.gameState !== "win") {
    if (firstWin !== null) setFirstWin(null);
  } else if (firstWin === null) {
    if (left.gameState === "win" && right.gameState !== "win") setFirstWin("left");
    else if (right.gameState === "win" && left.gameState !== "win") setFirstWin("right");
  }

  const STORAGE_KEY = "espiral_start_time";
  const [elapsed, setElapsed] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [alias, setAlias] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const savedStart = parseInt(saved, 10);
      if (Date.now() - savedStart > 100 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        startTimeRef.current = savedStart;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: localStorage no existe en SSR; es una lectura única con removeItem, no un store reactivo
        setElapsed(Math.floor((Date.now() - savedStart) / 1000));
        // Con ambos tableros en idle tras el refresh, el effect de gameState no arranca
        // el interval. Lo iniciamos aquí directamente para que el crono siga subiendo.
        timerRef.current = setInterval(() => {
          if (startTimeRef.current !== null)
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 500);
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
      setSubmitError(false);
      setAlias("");
    }
  }, [left.gameState, right.gameState, bothWin]);

  // `left`/`right` son objetos nuevos en cada render: si fueran deps del effect,
  // re-suscribiríamos el listener ~1/seg (tick del cronómetro). Lo leemos vía ref
  // (actualizado en un effect, no en render) y suscribimos el listener una sola vez.
  const kbRef = useRef({ left, right, bothWin });
  useEffect(() => { kbRef.current = { left, right, bothWin }; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { left, right, bothWin } = kbRef.current;
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
  }, []);

  async function submitScore(e: React.FormEvent) {
    e.preventDefault();
    if (!alias.trim() || finalTime === null) return;
    const lws = left.winSpeedRef.current;
    const rws = right.winSpeedRef.current;
    let finalSpeed: SpeedLevel = speed;
    if (lws && rws) {
      finalSpeed = SPEED_ORDER[lws] <= SPEED_ORDER[rws] ? lws : rws;
    } else if (lws) {
      finalSpeed = lws;
    } else if (rws) {
      finalSpeed = rws;
    }
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/ranking/espiral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: alias.trim(), score: finalTime, speed: finalSpeed }),
      });
      if (!res.ok) { setSubmitError(true); return; }
      setSubmitted(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function replay() {
    left.reset();
    right.reset();
    setSubmitted(false);
    setSubmitError(false);
    setAlias("");
  }

  function resetTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    localStorage.removeItem(STORAGE_KEY);
    startTimeRef.current = null;
    setElapsed(0);
    left.reset();
    right.reset();
  }

  return (
    <TerminalShell
      title="espiral"
      version="v4.0.0 · zsh"
      prompt={{ host: "espiral", path: "~/juegos", command: "./espiral --mode=dual" }}
      hideChrome={fullscreen}
    >
      <style>{`
        .esp-input {
          padding: 9px 12px;
          border: 1px solid var(--t-rule);
          border-radius: 5px;
          font-size: 13px;
          outline: none;
          color: var(--t-ink);
          background: var(--t-paper);
          font-family: var(--t-mono);
        }
        .esp-input:focus { border-color: var(--t-accent); }

        .esp-submit {
          padding: 9px 16px;
          background: var(--t-accent);
          color: var(--t-paper);
          border: 1px solid var(--t-accent2);
          border-radius: 5px;
          font-size: 13px;
          font-weight: 500;
          font-family: var(--t-mono);
          cursor: pointer;
          transition: opacity 0.12s ease, background 0.12s ease;
        }
        .esp-submit:disabled { opacity: 0.4; cursor: default; }

        /* Fila de estado */
        /* Envuelve en estrecho: con los iconos empujados a la derecha, sin wrap la fila
           los saca del viewport en móvil en vez de bajarlos de línea. */
        .esp-status { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 18px;
          font-size: 13px; padding-bottom: 14px; border-bottom: 1px solid var(--t-rule2); }
        .esp-status-fin { display: flex; align-items: center; gap: 14px; margin-left: auto; }
        @media (min-width: 640px) { .esp-status { gap: 26px; } }
        .esp-chip {
          padding: 2px 8px; border-radius: 4px; font-weight: 500;
          font-family: inherit; font-size: inherit; cursor: pointer;
          color: var(--c); background: color-mix(in oklab, var(--c) 10%, var(--t-paper));
          border: 1px solid color-mix(in oklab, var(--c) 26%, var(--t-paper));
          transition: color 0.12s ease, background 0.12s ease, border-color 0.12s ease;
        }
        .esp-icon { color: var(--t-ink3); display: flex; align-items: center;
          background: none; border: none; padding: 0; cursor: pointer; transition: color 0.12s ease; }
        @media (hover: hover) { .esp-icon:hover { color: var(--t-ink2); } }
        .esp-icon:active { color: var(--t-ink2); }

        /* Los dos tableros como una sola pieza: el panel los envuelve y la junta central
           marca el eje de simetría. En vertical el eje gira con ellos. */
        .esp-panel {
          display: flex; align-items: stretch; justify-content: center;
          background: var(--t-paper2); border: 1px solid var(--t-rule2);
          border-radius: 8px; flex-direction: column; padding: 22px;
        }
        .esp-junta { background: var(--t-rule); height: 1px; margin: 26px 0; }
        .esp-mitad { display: flex; flex: 1; justify-content: center; }
        /* Las etiquetas van fuera del panel: dentro engordaban su marco por arriba y el
           beige dejaba de tener el mismo ancho por los cuatro lados. */
        .esp-labels { display: none; justify-content: center; }
        @media (orientation: landscape) {
          .esp-panel { flex-direction: row; }
          .esp-junta { width: 1px; height: auto; margin: 0 26px; }
          .esp-labels { display: flex; }
        }

        /* Panel de victoria */
        .esp-win {
          width: 520px; max-width: 100%;
          display: flex; flex-direction: column; gap: 18px;
          padding: 22px 24px; background: var(--t-accent-bg);
          border: 1px solid var(--t-accent-soft); border-radius: 8px;
        }
        .esp-win-link {
          background: none; border: none; padding: 0; cursor: pointer;
          font-family: var(--t-mono); font-size: 12.5px; color: var(--t-accent2);
          transition: color 0.12s ease;
        }
        @media (hover: hover) { .esp-win-link:hover { color: var(--t-accent); text-decoration: underline; } }
        .esp-win-link:active { color: var(--t-accent); text-decoration: underline; }

        .esp-overlay { animation: esp-fade 0.12s ease; }
        @keyframes esp-fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* game area */}
      <div style={{ padding: fullscreen ? "16px" : "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", minHeight: fullscreen ? "100%" : undefined, justifyContent: fullscreen ? "center" : undefined }}>

        {/* status row + hint */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 960 }}>
        <div className="esp-status" style={{ fontFamily: MONO }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", whiteSpace: "nowrap" }}>
            <span style={{ color: "var(--t-ink4)" }}>↳</span>
            <span style={{ color: "var(--t-ink3)" }}>status:</span>
            <span style={{ fontWeight: 500 }}>
              <span style={{ color: left.gameState === "win" ? "var(--t-accent)" : left.gameState === "dead" ? "#e55" : "var(--t-ink2)" }}>
                {STATE_LABEL[left.gameState]}
              </span>
              <span style={{ color: "var(--t-ink4)" }}>{" / "}</span>
              <span style={{ color: right.gameState === "win" ? "var(--t-accent)" : right.gameState === "dead" ? "#e55" : "var(--t-ink2)" }}>
                {STATE_LABEL[right.gameState]}
              </span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--t-ink3)" }}>speed:</span>
            <button
              className="esp-chip"
              onClick={cycleSpeed}
              title="Cambiar velocidad"
              style={{ "--c": SPEED_COLOR[speed] } as React.CSSProperties}
            >{speed}</button>
          </div>

          {(elapsed > 0 || left.gameState !== "idle" || right.gameState !== "idle") && !bothWin && (
            <span style={{ color: "var(--t-ink2)", fontVariantNumeric: "tabular-nums" }}>{elapsed}s</span>
          )}

          <div className="esp-status-fin">
            <a className="esp-icon" href="/juegos/espiral/ranking" title="Ranking" aria-label="Ranking">
              <IconoRanking />
            </a>
            <button
              className="esp-icon"
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              <IconoPantallaCompleta salir={fullscreen} />
            </button>
          </div>
        </div>

        {elapsed >= 100 && !bothWin && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--t-ink3)", fontFamily: MONO }}>
            <span>¿Quieres empezar de cero?</span>
            <button
              onClick={resetTimer}
              className="esp-chip"
              style={{ "--c": "var(--t-accent)", fontSize: "12px" } as React.CSSProperties}
            >
              Reiniciar cronómetro
            </button>
          </div>
        )}
        </div>

        {/* win panel */}
        {bothWin && (
          <div className="esp-win" style={{ fontFamily: MONO }}>
            <p style={{ color: "var(--t-accent2)", fontSize: "16px", fontWeight: 500 }}>
              ✓ completed in {finalTime?.toFixed(1)}s
            </p>

            {!submitted ? (
              <>
                <form onSubmit={submitScore} style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={alias}
                    onChange={e => setAlias(e.target.value)}
                    placeholder="Tu nombre"
                    maxLength={20}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    className="esp-input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button type="submit" disabled={submitting || !alias.trim()} className="esp-submit">
                    {submitting ? "..." : "$ guardar"}
                  </button>
                </form>
                {submitError && (
                  <span style={{ color: "#cc3333", fontSize: "12px" }}>
                    No se pudo guardar. Inténtalo de nuevo.
                  </span>
                )}
                <div style={{ borderTop: "1px solid var(--t-accent-soft)", paddingTop: "14px" }}>
                  <button onClick={replay} className="esp-win-link">jugar de nuevo</button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid var(--t-accent-soft)", paddingTop: "14px" }}>
                <button onClick={replay} className="esp-win-link">jugar de nuevo</button>
                <span style={{ color: "var(--t-ink4)", fontSize: "12.5px" }}>·</span>
                <button onClick={() => router.push("/juegos/espiral/ranking")} className="esp-win-link">ranking</button>
              </div>
            )}
          </div>
        )}

        {/* boards */}
        <div className="esp-labels" style={{ gap: AIRE_JUNTA, fontFamily: MONO }}>
          <span style={{ width: size, textAlign: "center", color: "var(--t-ink3)", fontSize: "12px", letterSpacing: "0.04em" }}>←</span>
          <span style={{ width: size, textAlign: "center", color: "var(--t-ink3)", fontSize: "12px", letterSpacing: "0.04em" }}>→</span>
        </div>

        <div className="esp-panel">
          <div className="esp-mitad">
            <Board canvasRef={canvasL} gameState={left.gameState} label="←" bothWin={bothWin} isFirst={firstWin === "left"} onPress={() => { if (bothWin) { replay(); } else if (left.gameState !== "win") left.press(); }} monoFont={MONO} />
          </div>
          <div className="esp-junta" />
          <div className="esp-mitad">
            <Board canvasRef={canvasR} gameState={right.gameState} label="→" bothWin={bothWin} isFirst={firstWin === "right"} onPress={() => { if (bothWin) { replay(); } else if (right.gameState !== "win") right.press(); }} monoFont={MONO} />
          </div>
        </div>

        {/* footer */}
        {!fullscreen && (
          <WhyFooter question="¿Por qué una espiral?" date="30 de abril de 2026" style={{ marginTop: "auto", width: "100%", maxWidth: 720, paddingTop: "18px", borderTop: "1px solid var(--t-rule2)" }}>
            <p>Este fue el primer experimento de la web. La idea era partir de una estructura mínima y fácil de entender, pero difícil de dominar.</p>
            <p>Me gusta distinguir tres conceptos que se mezclan a menudo.</p>
            <p>Simple se refiere a la cantidad de elementos y reglas: dos espirales, dos pelotas, dos controles. Sencillo describe lo fácil que es entender el objetivo: se comprende de inmediato. Difícil hace referencia a lo que cuesta dominarlo: coordinar ambas acciones a la vez exige atención y precisión.</p>
            <p>En el extremo opuesto estaría un juego de rol con cien reglas cuya primera misión es "habla con el aldeano de enfrente": complejo, complicado, pero fácil.</p>
          </WhyFooter>
        )}
      </div>
    </TerminalShell>
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
    <div className="flex flex-col items-center">
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
            <p style={{ color: "var(--t-ink2)", fontSize: "16px" }}>
              <span style={{ color: "var(--t-accent2)" }}>$</span> toca {label}
            </p>
          </Overlay>
        )}
        {gameState === "dead" && (
          <Overlay monoFont={monoFont}>
            <p style={{ color: "#cc3333", fontSize: "16px", fontWeight: 500 }}>✗ fuera</p>
            <p style={{ color: "var(--t-ink3)", fontSize: "12px" }}>toca {label} para reintentar</p>
          </Overlay>
        )}
        {gameState === "win" && (
          <Overlay monoFont={monoFont}>
            {bothWin || !isFirst ? (
              <p style={{ color: "var(--t-accent2)", fontSize: "16px", fontWeight: 500 }}>✓ listo</p>
            ) : (
              <p style={{ color: "var(--t-ink2)", fontSize: "14px" }}>ya falta poco...</p>
            )}
            {bothWin && <p style={{ color: "var(--t-ink3)", fontSize: "12px" }}>toca para repetir</p>}
          </Overlay>
        )}
      </div>
    </div>
  );
}

function Overlay({ children, monoFont }: { children: React.ReactNode; monoFont: string }) {
  return (
    <div
      className="esp-overlay absolute inset-0 flex flex-col items-center justify-center"
      style={{
        borderRadius: "6px",
        gap: "10px",
        background: "color-mix(in srgb, var(--t-paper) 88%, transparent)",
        backdropFilter: "blur(4px)",
        fontFamily: monoFont,
      }}
    >
      {children}
    </div>
  );
}
