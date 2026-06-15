"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import {
  CELL, SAND, WATER, FIRE, WALL, MOVE, ERASE,
  createSim, clearSim, paintAt, moveAt, step, woodInBrush, pickUp, drop,
  type Carried, type Sim, type Tool,
} from "./engine";
import { render } from "./render";

const TOOL_DEFS: { id: Tool; label: string; key: string; color: string; border: string }[] = [
  { id: WATER, label: "Agua",   key: "1", color: "#3b82f6", border: "rgba(59,130,246,0.4)" },
  { id: FIRE,  label: "Fuego",  key: "2", color: "#f97316", border: "rgba(249,115,22,0.4)" },
  { id: SAND,  label: "Tierra", key: "3", color: "#c2a96e", border: "rgba(194,169,110,0.4)" },
  { id: WALL,  label: "Madera", key: "4", color: "#8b5e3c", border: "rgba(139,94,60,0.4)" },
  { id: MOVE,  label: "Mover",  key: "5", color: "#a78bfa", border: "rgba(167,139,250,0.4)" },
  { id: ERASE, label: "Borrar", key: "6", color: "#111827", border: "rgba(17,24,39,0.4)" },
];

export default function Fluidos() {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyOpenRef = useRef(false);

  useEffect(() => {
    whyOpenRef.current = whyOpen;
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

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const simRef        = useRef<Sim | null>(null);
  const toolRef       = useRef<Tool>(WATER);
  const brushRef      = useRef(5);
  const paintRef      = useRef(false);
  const lastPosRef    = useRef<{ x: number; y: number } | null>(null);
  const rafRef        = useRef(0);
  const statsFrameRef = useRef(0);
  const statsLabelRef = useRef<HTMLSpanElement>(null);
  const woodAnchorRef = useRef<{ x: number; y: number } | null>(null); // ancla en píxeles del agarre
  const woodMovedRef  = useRef({ x: 0, y: 0 });                        // celdas movidas desde el inicio del agarre
  const woodGrabRef   = useRef(false);                                 // si hay madera agarrada
  const carriedRef    = useRef<Carried[]>([]);
  const carryPosRef   = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>(WATER);
  const [fullscreen, setFullscreen] = useState(false);

  const setToolSync = useCallback((t: Tool) => {
    toolRef.current = t;
    brushRef.current = t === MOVE || t === ERASE ? 8 : 5;
    setTool(t);
  }, []);

  const clearGrid = useCallback(() => {
    if (simRef.current) clearSim(simRef.current);
  }, []);

  // Redimensionado: recrea la simulación conservando el contenido que cabe
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      if (whyOpenRef.current) return;
      const W = Math.floor(wrap.clientWidth  / CELL);
      const H = Math.floor(wrap.clientHeight / CELL);
      const prev = simRef.current;
      if (prev && prev.W === W && prev.H === H) return;
      canvas.width  = W * CELL;
      canvas.height = H * CELL;
      simRef.current = createSim(W, H, prev ?? undefined);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Bucle de animación — 60 pasos/seg fijos, independiente del refresco de pantalla
  useEffect(() => {
    const STEP_MS = 1000 / 60;
    const MAX_ACCUM = STEP_MS * 5; // tope: nunca más de 5 pasos por frame
    let accum = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (document.hidden) { lastTime = now; accum = 0; return; }
      const sim = simRef.current;
      if (!sim) return;

      const delta = now - lastTime;
      lastTime = now;
      accum = Math.min(accum + delta, MAX_ACCUM);

      while (accum >= STEP_MS) {
        if (paintRef.current && lastPosRef.current && toolRef.current !== MOVE) {
          paintAt(sim, lastPosRef.current.x, lastPosRef.current.y, toolRef.current, brushRef.current);
        }
        step(sim);
        statsFrameRef.current++;
        accum -= STEP_MS;
      }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) render(ctx, sim, carriedRef.current, carryPosRef.current);

      if (statsFrameRef.current % 20 === 0 && statsLabelRef.current) {
        const counts = [0, 0, 0, 0, 0, 0];
        for (let i = 0; i < sim.grid.length; i++) counts[sim.grid[i]]++;
        const body = TOOL_DEFS
          .filter(({ id }) => id !== MOVE && id !== ERASE)
          .map(({ id, label, color }) =>
            `<span style="white-space:nowrap"><span style="color:${color}">${label.toLowerCase()}</span>: ${counts[id]}</span>`)
          .join(" · ");
        statsLabelRef.current.innerHTML = `<span style="color:var(--t-ink3)">↳ elements:</span> ${body}`;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Atajos de teclado: las teclas de TOOL_DEFS, "e" borrar y "c" limpiar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const def = TOOL_DEFS.find(d => d.key === e.key);
      if (def) setToolSync(def.id);
      else if (e.key === "e") setToolSync(ERASE);
      else if (e.key === "c" || e.key === "C") clearGrid();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setToolSync, clearGrid]);

  // Eventos de entrada del canvas (ratón + táctil, nativos para evitar listeners pasivos)
  const getCanvasPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx   = canvas.width  / rect.width;
    const sy   = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: (touch.clientX - rect.left) * sx, y: (touch.clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      paintRef.current = true;
      const pos = getCanvasPos(e);
      const sim = simRef.current;
      if (!pos || !sim) return;
      lastPosRef.current = pos;
      if (toolRef.current === MOVE) {
        // Decide si agarra madera y levanta el resto de celdas del pincel
        woodGrabRef.current = woodInBrush(sim, pos.x, pos.y, brushRef.current);
        woodAnchorRef.current = pos;
        woodMovedRef.current = { x: 0, y: 0 };
        carriedRef.current = pickUp(sim, pos.x, pos.y, brushRef.current);
        carryPosRef.current = { x: Math.floor(pos.x / CELL), y: Math.floor(pos.y / CELL) };
      } else {
        paintAt(sim, pos.x, pos.y, toolRef.current, brushRef.current);
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!paintRef.current) return;
      const pos = getCanvasPos(e);
      const sim = simRef.current;
      if (!pos || !sim) return;
      if (toolRef.current === MOVE) {
        carryPosRef.current = { x: Math.floor(pos.x / CELL), y: Math.floor(pos.y / CELL) };
        const anchor = woodAnchorRef.current;
        if (anchor && woodGrabRef.current) {
          // Seguimiento del ancla: delta de celdas acumulado desde el inicio del agarre
          const targetX = Math.round((pos.x - anchor.x) / CELL);
          const targetY = Math.round((pos.y - anchor.y) / CELL);
          const dcx = targetX - woodMovedRef.current.x;
          const dcy = targetY - woodMovedRef.current.y;
          if (dcx !== 0 || dcy !== 0) {
            moveAt(sim, pos.x, pos.y, dcx * CELL, dcy * CELL, brushRef.current);
            woodMovedRef.current = { x: targetX, y: targetY };
          }
        } else if (anchor && lastPosRef.current) {
          // Sin madera agarrada — empuja fluidos con el delta del evento
          const last = lastPosRef.current;
          moveAt(sim, pos.x, pos.y, pos.x - last.x, pos.y - last.y, brushRef.current);
        }
      } else {
        paintAt(sim, pos.x, pos.y, toolRef.current, brushRef.current);
      }
      lastPosRef.current = pos;
    };

    const onUp = () => {
      const sim = simRef.current;
      if (sim && carryPosRef.current && carriedRef.current.length > 0) {
        drop(sim, carriedRef.current, carryPosRef.current.x, carryPosRef.current.y);
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
  }, [getCanvasPos]);

  return (
    <TerminalShell title="fluidos" prompt={{ host: "fluidos", path: "~/apps", command: "./fluidos --elementos=4" }} hideChrome={fullscreen}>
      <style>{`
        :root {
          --blue:    var(--t-accent);
          --text:    var(--t-ink);
          --muted:   var(--t-ink3);
          --border:  var(--t-rule);
          --sim-bg:  #0f1117;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        .sim-header { padding: 1rem 0 0.6rem; }
        .sim-title {
          font-size: clamp(1.8rem, 5vw, 3rem);
          font-weight: 800; letter-spacing: -0.03em; line-height: 1;
        }
        .sim-title span {
          color: var(--t-ink);
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
          font-family: var(--t-mono);
          letter-spacing: 0.05em; color: var(--text);
          transition: border-color 0.15s, background 0.15s;
          -webkit-user-select: none; user-select: none;
        }
        @media (hover: hover) { .tool-btn:hover { border-color: rgba(0,184,122,0.4); background: rgba(0,184,122,0.04); } }
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
          font-family: var(--t-mono);
          color: var(--muted); letter-spacing: 0.05em;
          transition: color 0.15s, border-color 0.15s;
          -webkit-user-select: none; user-select: none;
        }
        @media (hover: hover) { .clear-btn:hover { color: var(--text); border-color: rgba(55,65,81,0.4); } }

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
          font-family: var(--t-mono);
          display: flex; gap: 1.2rem; flex-wrap: wrap;
        }
        .hint-item { display: flex; gap: 0.35rem; align-items: center; }
        .hint-key {
          background: rgba(0,0,0,0.06); border-radius: 2px;
          padding: 0.05rem 0.3rem; font-size: 0.62rem;
        }

        .pacres-link {
          font-size: 0.75rem; color: var(--muted);
          font-family: var(--t-mono);
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
        padding: `0 clamp(1.25rem, 4vw, 2rem) ${fullscreen ? "clamp(1.25rem, 4vw, 2rem)" : "0"}`,
        height: whyOpen ? "auto" : "100%",
        minHeight: "100%",
        overflowX: "hidden",
        overflowY: whyOpen ? "auto" : "hidden",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontFamily: "var(--t-mono)", paddingTop: "1rem", paddingBottom: "0.6rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span ref={statsLabelRef} style={{ fontSize: "0.75rem", color: "var(--t-ink4)", fontVariantNumeric: "tabular-nums" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <button
              className="hover-accent"
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
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

          <button className="clear-btn" onClick={clearGrid}>
            <span className="tool-label">Limpiar </span><span className="tool-key">C</span>
          </button>
        </div>

        {/* Canvas */}
        <div className="sim-wrap" ref={wrapRef}>
          <canvas className={`sim-canvas${tool === MOVE ? " tool-move" : ""}`} ref={canvasRef} />
        </div>

        {!fullscreen && (
          <>
            {/* Hints */}
            <div style={{ padding: "0.45rem 0 0" }}>
              <div className="hint-row">
                <span className="hint-item">La tierra se hunde en el agua · El agua apaga el fuego · El fuego quema la madera</span>
              </div>
            </div>

            {/* Footer */}
            <WhyFooter question="¿Por qué un simulador de fluidos?" date="8 de mayo de 2026" onOpenChange={setWhyOpen} style={{ marginTop: "auto" }}>
              <p>Un autómata celular de partículas es una simulación sobre una cuadrícula donde cada celda sigue reglas locales simples.</p>
              <p>De esas reglas emergen comportamientos complejos: agua fluyendo, arena acumulándose, fuego propagándose.</p>
              <p>Este enfoque se usa en videojuegos, simulaciones físicas y sistemas educativos por su simplicidad y eficiencia.</p>
              <p>En este experimento: la arena cae, el agua fluye, el fuego se expande, y cada elemento interactúa solo con sus vecinos inmediatos.</p>
            </WhyFooter>
          </>
        )}

      </main>
    </TerminalShell>
  );
}
