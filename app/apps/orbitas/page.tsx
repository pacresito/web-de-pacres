"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import {
  createWorld, clearWorld, addBody, makeBody, step, pruneEscaped,
  radiusForMass, totalMass, presetSolar, presetBinary, presetCluster,
  presetThreeBody, PRESET_MAX_MASS,
  type World,
} from "./engine";
import {
  fadeCanvas, drawBody, drawRadarArrow, drawDragPreview, drawExplosion,
  massToColor, massToReadableColor, massToStatusColor,
} from "./render";

// Presets: cada botón se colorea con el color del cuerpo más pesado que genera.
// `dots` es el icono mínimo (en viewBox 24×24) para los botones sutiles de pantalla completa:
// tantos puntos como evoca el preset — 1 sol, 2 del binario, 3 del problema de tres cuerpos,
// un puñado del cúmulo — pintados con el mismo color que su botón.
type PresetDef = {
  label: string;
  build: (W: number, H: number) => World;
  maxMass: number;
  dots: { cx: number; cy: number; r: number }[];
};
const PRESETS: PresetDef[] = [
  { label: "Sistema solar", build: presetSolar,    maxMass: PRESET_MAX_MASS.solar,
    dots: [{ cx: 12, cy: 12, r: 4.5 }] },
  { label: "Binario",       build: presetBinary,   maxMass: PRESET_MAX_MASS.binary,
    dots: [{ cx: 8, cy: 12, r: 3.4 }, { cx: 16, cy: 12, r: 3.4 }] },
  { label: "Tres cuerpos",  build: presetThreeBody, maxMass: PRESET_MAX_MASS.threebody,
    dots: [{ cx: 12, cy: 7, r: 3 }, { cx: 7.5, cy: 16, r: 3 }, { cx: 16.5, cy: 16, r: 3 }] },
  { label: "Cúmulo",        build: presetCluster,  maxMass: PRESET_MAX_MASS.cluster,
    dots: [{ cx: 7, cy: 8, r: 2 }, { cx: 13, cy: 6, r: 2 }, { cx: 17, cy: 11, r: 2 },
           { cx: 9, cy: 14, r: 2 }, { cx: 16, cy: 16, r: 2 }, { cx: 11, cy: 18, r: 2 }] },
];

// Explosión visual al eliminar una estrella (clic). Vive fuera del motor: es solo pintado.
type Explosion = { x: number; y: number; r: number; color: [number, number, number]; start: number };
const EXPLOSION_MS = 480;
const HIT_PAD = 6; // margen extra para acertar al pinchar estrellas pequeñas

// Gesto de creación
const MASS_MIN = 4;        // masa al tocar (pulsación instantánea)
const MASS_MAX = 6000;     // masa máxima manteniendo pulsado (suficiente para otro sol)
const MASS_TAU = 470;      // ms en multiplicar/dividir la masa por e (ritmo exponencial)
const MASS_RAMP = MASS_TAU * Math.log(MASS_MAX / MASS_MIN); // tiempo de mín↔máx (~3.4 s)
const MASS_HOLD = 200;     // pausa en cada extremo antes de invertir
const MASS_CYCLE = 2 * MASS_RAMP + 2 * MASS_HOLD;
const VEL_SCALE = 0.05;    // (origen − puntero) px → velocidad inicial

// Masa mientras se mantiene pulsado: sube exponencial de mín a máx, espera, baja a mín,
// espera, y repite. Un toque = ligera; mantener deja elegir cualquier tamaño (hasta un sol).
function heldMass(elapsedMs: number): number {
  const t = elapsedMs % MASS_CYCLE;
  if (t < MASS_RAMP) return Math.min(MASS_MAX, MASS_MIN * Math.exp(t / MASS_TAU));          // sube
  if (t < MASS_RAMP + MASS_HOLD) return MASS_MAX;                                           // pausa arriba
  if (t < 2 * MASS_RAMP + MASS_HOLD)                                                        // baja
    return Math.max(MASS_MIN, MASS_MAX * Math.exp(-(t - MASS_RAMP - MASS_HOLD) / MASS_TAU));
  return MASS_MIN;                                                                          // pausa abajo
}

export default function Orbitas() {
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (whyOpen) {
      root.style.height = "auto"; root.style.overflow = "auto"; document.body.style.overflow = "auto";
    } else {
      root.style.height = ""; root.style.overflow = ""; document.body.style.overflow = "";
    }
    return () => {
      root.style.height = ""; root.style.overflow = ""; document.body.style.overflow = "";
    };
  }, [whyOpen]);

  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const worldRef      = useRef<World>(createWorld());
  const rafRef        = useRef(0);
  const sizeRef       = useRef({ W: 0, H: 0 }); // en px CSS = unidades del mundo
  const dprRef        = useRef(1);
  const statsLabelRef = useRef<HTMLSpanElement>(null);
  const frameRef      = useRef(0);
  const explosionsRef = useRef<Explosion[]>([]);

  // Gesto: estado del puntero mientras se mantiene pulsado
  const creatingRef = useRef(false);
  const originRef   = useRef({ x: 0, y: 0 });
  const pointerRef  = useRef({ x: 0, y: 0 });
  const pressTsRef  = useRef(0);

  const [fullscreen, setFullscreen] = useState(false);

  const loadPreset = useCallback((build: (W: number, H: number) => World) => {
    const { W, H } = sizeRef.current;
    if (W > 0 && H > 0) worldRef.current = build(W, H);
  }, []);

  const clearAll = useCallback(() => clearWorld(worldRef.current), []);

  // Redimensionado del canvas (cámara fija: el mundo no se reescala, solo el lienzo)
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const W = wrap.clientWidth, H = wrap.clientHeight;
      if (W < 2 || H < 2) return; // aún sin layout (TerminalShell oculta el contenido al teclear)
      if (W === sizeRef.current.W && H === sizeRef.current.H) return;
      // Backing store escalado por DPR (nitidez) manteniendo la relación de aspecto del lienzo
      // → los cuerpos se ven redondos aunque se estire la ventana o se abra el "por qué".
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      sizeRef.current = { W, H };
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Bucle: física a 60 pasos/seg fijos + render con estelas
  useEffect(() => {
    const STEP_MS = 1000 / 60;
    const MAX_ACCUM = STEP_MS * 5;
    let accum = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (document.hidden) { lastTime = now; accum = 0; return; }
      const world = worldRef.current;
      const { W, H } = sizeRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || W === 0) return;

      const delta = now - lastTime;
      lastTime = now;
      accum = Math.min(accum + delta, MAX_ACCUM);
      while (accum >= STEP_MS) {
        step(world, 1);
        accum -= STEP_MS;
      }
      pruneEscaped(world, W, H); // los cuerpos que escapan dejan de existir (y de contar)

      ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0); // dibujar en px CSS
      fadeCanvas(ctx, W, H);
      for (const b of world.bodies) drawBody(ctx, b);
      for (const b of world.bodies) drawRadarArrow(ctx, W, H, b);

      // estrellas eliminadas con clic: explosión que se desvanece y luego se descarta
      for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
        const ex = explosionsRef.current[i];
        const p = (now - ex.start) / EXPLOSION_MS;
        if (p >= 1) { explosionsRef.current.splice(i, 1); continue; }
        drawExplosion(ctx, ex.x, ex.y, ex.r, ex.color, p);
      }

      if (creatingRef.current) {
        const mass = heldMass(now - pressTsRef.current);
        drawDragPreview(ctx, originRef.current, pointerRef.current, mass, radiusForMass(mass));
      }

      if (++frameRef.current % 15 === 0 && statsLabelRef.current) {
        const n = world.bodies.length;
        const M = Math.round(totalMass(world));
        const [cr, cg, cb] = massToStatusColor(M, 2); // color real; los valores bajos se oscurecen un poco para leerse
        // verde = sistema estable (1-3 cuerpos); rojo = más de 3 (propenso al caos)
        const nColor = n === 0 ? "var(--t-ink2)" : n <= 3 ? "var(--t-accent)" : "#e55";
        statsLabelRef.current.innerHTML =
          `↳ cuerpos: <span style="color:${nColor}">${n}</span>` +
          ` · masa total: <span style="color:rgb(${cr},${cg},${cb})">${M}</span>`;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Entrada unificada ratón + táctil vía Pointer Events (en px CSS = unidades del mundo)
  const getPos = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // pointerdown en el canvas; move/up en window para no perder el gesto si el puntero
    // sale del lienzo (sin setPointerCapture, que lanzaba errores con punteros ya soltados).
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // solo botón principal / toque
      e.preventDefault();
      const pos = getPos(e);

      // ¿se pincha sobre una estrella existente? Dos toques, sin crear nada:
      //  1º — se congela (fixed): deja de moverse y atrae como un sol; le sale un punto negro.
      //  2º — explota y desaparece.
      // De atrás hacia delante: actúa sobre la de encima (la última dibujada).
      const bodies = worldRef.current.bodies;
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        if (Math.hypot(b.x - pos.x, b.y - pos.y) <= b.radius + HIT_PAD) {
          if (!b.fixed) {
            b.fixed = true; b.vx = 0; b.vy = 0; // primer toque: congelar en el sitio
          } else {
            // segundo toque: explosión y se elimina
            explosionsRef.current.push({ x: b.x, y: b.y, r: b.radius, color: massToColor(b.mass), start: performance.now() });
            bodies.splice(i, 1);
          }
          return;
        }
      }

      creatingRef.current = true;
      originRef.current = pos;
      pointerRef.current = pos;
      pressTsRef.current = performance.now();
    };

    const onMove = (e: PointerEvent) => {
      if (!creatingRef.current) return;
      pointerRef.current = getPos(e);
    };

    const onUp = () => {
      if (!creatingRef.current) return;
      creatingRef.current = false;
      const origin = originRef.current;
      const mass = heldMass(performance.now() - pressTsRef.current);
      // Tirachinas: arrastrar "hacia atrás" lanza en sentido contrario
      const vx = (origin.x - pointerRef.current.x) * VEL_SCALE;
      const vy = (origin.y - pointerRef.current.y) * VEL_SCALE;
      addBody(worldRef.current, makeBody(origin.x, origin.y, vx, vy, mass));
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [getPos]);

  return (
    <TerminalShell
      title="orbitas"
      prompt={{ host: "orbitas", path: "~/apps", command: "./orbitas --G=6.67e-11 --merge=on" }}
      hideChrome={fullscreen}
    >
      <style>{`
        :root { --accent: var(--t-accent); --muted: var(--t-ink3); --border: var(--t-rule); --sim-bg: #000; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        .toolbar { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0; flex-wrap: wrap; }
        .orb-btn {
          padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid var(--border);
          background: transparent; cursor: pointer; font-size: 0.72rem; font-weight: 600;
          font-family: var(--t-mono); letter-spacing: 0.05em; color: var(--t-ink);
          transition: border-color 0.15s, background 0.15s; -webkit-user-select: none; user-select: none;
        }
        .orb-btn:hover { border-color: rgba(0,184,122,0.4); background: rgba(0,184,122,0.04); }
        .orb-btn.muted { color: var(--muted); }
        .orb-btn.muted:hover { color: var(--t-ink); border-color: rgba(55,65,81,0.4); }

        .sim-wrap { flex: 1; min-height: 320px; background: var(--sim-bg); border-radius: 6px; overflow: hidden; position: relative; }
        .sim-canvas { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }

        /* Pantalla completa de verdad: ocupa todo el viewport, fondo negro absoluto */
        .sim-wrap.fs { position: fixed; inset: 0; z-index: 1000; border-radius: 0; background: #000; min-height: 0; }
        .fs-exit {
          position: fixed; top: 14px; right: 16px; z-index: 1001;
          background: none; border: none; cursor: pointer; padding: 6px; display: flex;
          color: var(--t-accent); transition: color 0.15s, opacity 0.15s; opacity: 0.7;
        }
        .fs-exit:hover { opacity: 1; }

        /* Acceso sutil a los presets en pantalla completa: iconos minúsculos arriba a la izquierda */
        .fs-presets {
          position: fixed; top: 14px; left: 16px; z-index: 1001;
          display: flex; align-items: center; gap: 6px;
        }
        .fs-preset-btn {
          background: none; border: none; cursor: pointer; padding: 4px; display: flex;
          align-items: center; justify-content: center; opacity: 0.4; transition: opacity 0.15s;
          -webkit-user-select: none; user-select: none;
        }
        .fs-preset-btn:hover { opacity: 1; }

        .hint-row { padding: 0.55rem 0 0; font-size: 0.7rem; color: var(--muted); font-family: var(--t-mono); }

        @media (max-width: 500px) { .toolbar { gap: 0.25rem; } .orb-btn { padding: 0.4rem 0.55rem; } }
      `}</style>

      <main style={{
        maxWidth: 900, margin: "0 auto",
        padding: `0 clamp(1.25rem, 4vw, 2rem) ${fullscreen ? "clamp(1.25rem, 4vw, 2rem)" : "0"}`,
        height: whyOpen ? "auto" : "100%", minHeight: "100%",
        overflowX: "hidden", overflowY: whyOpen ? "auto" : "hidden",
        display: "flex", flexDirection: "column",
      }}>

        {/* Header: línea de estado + botón pantalla completa */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontFamily: "var(--t-mono)", paddingTop: "1rem", paddingBottom: "0.6rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span ref={statsLabelRef} style={{ fontSize: "0.75rem", color: "var(--t-ink3)", fontVariantNumeric: "tabular-nums" }} />
          </div>
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

        {/* Toolbar: presets + borrar */}
        <div className="toolbar">
          {PRESETS.map(({ label, build, maxMass }) => {
            const [r, g, b] = massToReadableColor(maxMass);
            return (
              <button key={label} className="orb-btn" style={{ color: `rgb(${r},${g},${b})` }} onClick={() => loadPreset(build)}>
                {label}
              </button>
            );
          })}
          <button className="orb-btn muted" onClick={clearAll}>Vaciar</button>
        </div>

        {/* Canvas */}
        <div className={`sim-wrap${fullscreen ? " fs" : ""}`} ref={wrapRef}>
          <canvas className="sim-canvas" ref={canvasRef} />
        </div>

        {fullscreen && (
          <div className="fs-presets">
            {PRESETS.map(({ label, build, maxMass, dots }) => {
              const [r, g, b] = massToColor(maxMass);
              return (
                <button key={label} className="fs-preset-btn" title={label} aria-label={label} onClick={() => loadPreset(build)}>
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    {dots.map((d, i) => (
                      <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={`rgb(${r},${g},${b})`} />
                    ))}
                  </svg>
                </button>
              );
            })}
            <button className="fs-preset-btn" title="Vaciar" aria-label="Vaciar" onClick={clearAll}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--t-ink3)" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        )}

        {fullscreen && (
          <button className="fs-exit" onClick={() => setFullscreen(false)} title="Salir de pantalla completa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
              <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
            </svg>
          </button>
        )}

        {!fullscreen && (
          <>
            <div className="hint-row">
              Mantén pulsado para crear un cuerpo · arrastra para lanzarlo
            </div>
            <WhyFooter question="¿Por qué un simulador de gravedad?" date="14 de junio de 2026" onOpenChange={setWhyOpen} style={{ marginTop: "auto" }}>
              <p>De pequeño me pasaba horas con un simulador de gravedad: lanzabas cuerpos al espacio y los veías orbitar, chocar o perderse para siempre.</p>
              <p>Aquí cada cuerpo tira de todos los demás. Cuanta más masa tiene, más fuerte atrae. De una regla tan simple salen órbitas, vueltas imposibles y choques.</p>
              <p>Quería revivir aquella fascinación con mi propio estilo.</p>
            </WhyFooter>
          </>
        )}

      </main>
    </TerminalShell>
  );
}
