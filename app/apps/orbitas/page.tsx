"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { IconoPantallaCompleta } from "../../components/Iconos";
import BarraEstado from "../../components/BarraEstado";
import {
  createWorld, clearWorld, addBody, makeBody, step, pruneEscaped,
  radiusForMass, totalMass, presetSolar, presetBinary, presetCluster,
  presetThreeBody, PRESET_MAX_MASS, heldMass, deadzoneFor, launchVelocity,
  type World, type View,
} from "./engine";
import {
  fadeCanvas, drawBody, drawRadarArrow, drawDragPreview, drawExplosion,
  massToColor, massToReadableColor,
} from "./render";

// Presets: cada botón se colorea con el color del cuerpo más pesado que genera.
// `dots` es el icono mínimo (en viewBox 24×24) para los botones sutiles de pantalla completa:
// tantos puntos como evoca el preset — 1 sol, 2 del binario, 3 del problema de tres cuerpos,
// un puñado del cúmulo — pintados con el mismo color que su botón.
type PresetDef = {
  label: string;
  build: (W: number, H: number, zoom: number) => World;
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

// Distancia de cámara. La física no cambia en absoluto: el mundo se sigue midiendo en px CSS
// del lienzo; alejarse solo dibuja todo más pequeño y deja ver el espacio de alrededor (por
// donde escapan los cuerpos). Los presets se construyen con el tamaño del lienzo — salvo el
// cúmulo, que llena la vista y por tanto nace más esparcido cuanto más lejos esté la cámara.
// `dotR` es el radio del círculo del icono en viewBox 24×24: se encoge igual que la escena.
const ZOOM_LEVELS = [
  { label: "Cerca",     zoom: 1,    dotR: 6 },
  { label: "Lejos",     zoom: 0.5,  dotR: 3 },
  { label: "Muy lejos", zoom: 0.25, dotR: 1.5 },
];

// Trozo de mundo visible: el lienzo W×H a zoom 1, creciendo alrededor del mismo centro.
function viewFor(W: number, H: number, zoom: number): View {
  const w = W / zoom, h = H / zoom;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

// Explosión visual al eliminar una estrella (clic). Vive fuera del motor: es solo pintado.
type Explosion = { x: number; y: number; r: number; color: [number, number, number]; start: number };
const EXPLOSION_MS = 480;
const HIT_PAD = 6; // margen extra para acertar al pinchar estrellas pequeñas

// Iconos de pantalla completa (definidos una vez): entrar y salir. Mismo trazo que el resto.
const ExpandIcon = () => <IconoPantallaCompleta size={14} />;
const CollapseIcon = () => <IconoPantallaCompleta size={16} salir />;

// Icono de distancia (solo pantalla completa): el recuadro de la vista, siempre igual, con
// la escena dentro encogiéndose conforme la cámara se aleja.
const ZoomIcon = ({ r }: { r: number }) => (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
    <circle cx="12" cy="12" r={r} fill="currentColor" />
  </svg>
);

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
  const [zoomIdx, setZoomIdx] = useState(0);
  const zoomRef = useRef(ZOOM_LEVELS[0].zoom); // el bucle y los gestos lo leen sin re-suscribirse
  const zoomLevel = ZOOM_LEVELS[zoomIdx];

  // Al cambiar de distancia, las estelas ya pintadas están a la escala anterior: se borran
  // de golpe en vez de dejar que se desvanezcan con la escena nueva encima.
  useEffect(() => {
    zoomRef.current = ZOOM_LEVELS[zoomIdx].zoom;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [zoomIdx]);

  const loadPreset = useCallback((build: PresetDef["build"]) => {
    const { W, H } = sizeRef.current;
    if (W > 0 && H > 0) worldRef.current = build(W, H, zoomRef.current);
  }, []);

  const clearAll = useCallback(() => clearWorld(worldRef.current), []);

  // Estado del gesto en curso: masa según lo que lleve pulsado y velocidad del tirachinas.
  const gestureAt = useCallback((nowMs: number) => {
    const mass = heldMass(nowMs - pressTsRef.current);
    const radius = radiusForMass(mass);
    const deadzone = deadzoneFor(radius, zoomRef.current);
    const origin = originRef.current, pointer = pointerRef.current;
    return { mass, radius, deadzone, vel: launchVelocity(origin.x - pointer.x, origin.y - pointer.y, deadzone) };
  }, []);

  const cycleZoom = useCallback(() => setZoomIdx(i => (i + 1) % ZOOM_LEVELS.length), []);

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
      const zoom = zoomRef.current;
      const view = viewFor(W, H, zoom);
      pruneEscaped(world, view); // los cuerpos que escapan dejan de existir (y de contar)

      const dpr = dprRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // px CSS: el velo de las estelas cubre el lienzo entero
      fadeCanvas(ctx, W, H);
      // A partir de aquí se dibuja en coordenadas de mundo: escala `zoom` alrededor del centro.
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2) * (1 - zoom), dpr * (H / 2) * (1 - zoom));
      for (const b of world.bodies) drawBody(ctx, b);
      for (const b of world.bodies) drawRadarArrow(ctx, view, b, zoom);

      // estrellas eliminadas con clic: explosión que se desvanece y luego se descarta
      for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
        const ex = explosionsRef.current[i];
        const p = (now - ex.start) / EXPLOSION_MS;
        if (p >= 1) { explosionsRef.current.splice(i, 1); continue; }
        drawExplosion(ctx, ex.x, ex.y, ex.r, ex.color, p);
      }

      if (creatingRef.current) {
        const { mass, radius, deadzone, vel } = gestureAt(now);
        drawDragPreview(ctx, originRef.current, vel, mass, radius, deadzone, zoom);
      }

      if (++frameRef.current % 15 === 0 && statsLabelRef.current) {
        const n = world.bodies.length;
        const M = Math.round(totalMass(world));
        const [cr, cg, cb] = massToReadableColor(M, 2); // color real; los valores bajos se oscurecen un poco para leerse
        // verde = sistema estable (1-3 cuerpos); rojo = más de 3 (propenso al caos)
        const nColor = n === 0 ? "var(--t-ink2)" : n <= 3 ? "var(--t-accent)" : "#e55";
        statsLabelRef.current.innerHTML =
          `<span style="white-space:nowrap"><span class="be-etq">cuerpos:</span> <span style="color:${nColor}">${n}</span></span>` +
          ` · <span style="white-space:nowrap"><span class="be-etq">masa total:</span> <span style="color:rgb(${cr},${cg},${cb})">${M}</span></span>`;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gestureAt]);

  // Entrada unificada ratón + táctil vía Pointer Events, deshaciendo el zoom: px CSS del
  // lienzo → unidades del mundo (a zoom 1 es la identidad).
  const getPos = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { W, H } = sizeRef.current;
    const zoom = zoomRef.current;
    return {
      x: W / 2 + (e.clientX - rect.left - W / 2) / zoom,
      y: H / 2 + (e.clientY - rect.top - H / 2) / zoom,
    };
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
        if (Math.hypot(b.x - pos.x, b.y - pos.y) <= b.radius + HIT_PAD / zoomRef.current) {
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
      const { mass, vel } = gestureAt(performance.now());
      addBody(worldRef.current, makeBody(origin.x, origin.y, vel.vx, vel.vy, mass));
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
  }, [getPos, gestureAt]);

  return (
    <TerminalShell
      title="orbitas"
      prompt={{ host: "orbitas", path: "~/apps", command: "./orbitas --G=6.67e-11 --merge=on" }}
      hideChrome={fullscreen}
    >
      <style>{`
        /* Alias locales bajo main; referencian los tokens --t-*, que viran con el tema
           (data-theme en <html>). --sim-bg es fijo. */
        main { --accent: var(--t-accent); --muted: var(--t-ink3); --border: var(--t-rule); --sim-bg: #000; }
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

        {/* Entrar en pantalla completa. La salida la hace el botón .fs-exit, que en fullscreen
            tapa la barra → aquí solo hace falta el icono de entrar. */}
        <BarraEstado
          estilo={{ marginTop: "1rem" }}
          acciones={
            <button
              className="be-icono hover-accent"
              onClick={() => setFullscreen(true)}
              title="Pantalla completa"
              aria-label="Pantalla completa"
            >
              <ExpandIcon />
            </button>
          }
        >
          <span ref={statsLabelRef} className="be-elastico" />
        </BarraEstado>

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
          <button className="orb-btn muted" onClick={cycleZoom} title="Distancia de la cámara">
            {zoomLevel.label}
          </button>
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
            <button className="fs-preset-btn" style={{ color: "var(--t-ink3)" }} title={`Distancia: ${zoomLevel.label.toLowerCase()}`} aria-label="Distancia de la cámara" onClick={cycleZoom}>
              <ZoomIcon r={zoomLevel.dotR} />
            </button>
          </div>
        )}

        {fullscreen && (
          <button className="fs-exit" onClick={() => setFullscreen(false)} title="Salir de pantalla completa" aria-label="Salir de pantalla completa">
            <CollapseIcon />
          </button>
        )}

        {!fullscreen && (
          <>
            <div className="hint-row">
              Mantén pulsado para crear un cuerpo · arrastra fuera del círculo para lanzarlo
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
