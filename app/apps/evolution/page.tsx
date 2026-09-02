"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import { useTema } from "../../components/usePersistedTheme";
import { CONFIG_DIA, amanecer, anochecer, crearDia, tickDia } from "./dia";
import { CONFIG, crearMundo, resumen, tick as tickMundo } from "./engine";
import { paletaDe, pintar, pintarDia, vistaDe, type Paleta, type Vista } from "./render";

// Cuántos ticks se intentan por fotograma. Es un objetivo, no una promesa: el bucle corta por
// presupuesto de tiempo (abajo), así que en un mundo lleno x64 va tan rápido como dé la máquina.
// Que corte no toca el determinismo — el mundo depende de cuántos ticks ha dado, no de cuándo.
const VELOCIDADES = [1, 8, 64] as const;
const PRESUPUESTO_MS = 12;   // por fotograma, para que la interfaz siga respondiendo a 60 fps
const SALTO_GEN = 100;       // lo que adelanta el botón de saltar generaciones
const PAUSA_NOCHE = 1300;    // ms que el mundo por días se queda parado al anochecer, para ver nacer a las crías

const SEMILLA_POR_DEFECTO = "brizna";

const ACENTO = (x: string | number) => `<span style="color:var(--t-accent)">${x}</span>`;

/**
 * Un mundo ya sembrado, detrás de la única superficie que esta página necesita: dar un paso de
 * reloj, pintarse y decir cómo va. Lo que hay dentro —qué es un tick, qué cierra un ciclo— se
 * queda en su motor.
 */
type Sim = {
  /** Un paso de reloj. `saltando` avisa de que nadie está mirando: nada de pausas para la galería. */
  tick(saltando: boolean): void;
  /** La vuelta completa en curso. Se consulta en cada paso del bucle, así que tiene que ser barato. */
  ciclo(): number;
  extinto(): boolean;
  pintar(ctx: CanvasRenderingContext2D, p: Paleta, v: Vista, W: number, H: number, dpr: number): void;
  /** La línea de estado, en HTML y una vez por fotograma. */
  linea(): string;
};

/**
 * **Los dos mundos compiten**: el de energía cerrada —suelo, parches y presupuesto que no crece—
 * y el de días —comida que amanece, casa en el borde y cuenta al anochecer—, y solo se queda uno.
 * Están aquí los dos para poder mirarlos con la misma semilla y decidir viendo, en vez de a ojo
 * y de memoria.
 */
type Motor = {
  /** Va en la URL, así que en ASCII; lo que se lee en el botón es `etiqueta`. */
  id: string;
  etiqueta: string;
  ancho: number;
  alto: number;
  /** Cómo se llama su vuelta completa: para el botón de adelantar y para la línea de extinción. */
  ciclo: { corto: string; frase: string };
  pista: string;
  crear(semilla: string): Sim;
};

const MOTORES: readonly Motor[] = [
  {
    id: "cerrado", etiqueta: "cerrado",
    ancho: CONFIG.ancho, alto: CONFIG.alto,
    ciclo: { corto: "gen", frase: "la generación" },
    pista: "Tamaño = masa · tono y filo = fiereza · aura = sociabilidad · claridad = reserva",
    crear(semilla) {
      const m = crearMundo(semilla);
      return {
        tick: () => { tickMundo(m); },   // aquí no hay pausas que saltarse: el ciclo no para nunca
        ciclo: () => m.gen,
        extinto: () => m.extinto,
        pintar: (ctx, p, v, W, H, dpr) => pintar(ctx, m, p, v, W, H, dpr),
        linea: () => {
          const r = resumen(m);
          return `gen ${ACENTO(r.gen)} · censo ${r.censo} · comida ${r.comida} · tick ${r.t}`;
        },
      };
    },
  },
  {
    id: "dias", etiqueta: "días",
    ancho: CONFIG_DIA.ancho, alto: CONFIG_DIA.alto,
    ciclo: { corto: "días", frase: "el día" },
    pista: "Franja = casa · aro = energía que le queda · puntos = bocados que lleva · tono y filo = fiereza",
    crear(semilla) {
      const m = crearDia(semilla);
      let finNoche = 0;
      return {
        // El reloj de la página es siempre el mismo tick; quien sabe cuándo se acaba el ciclo es
        // el motor, que aquí cierra el día en cuanto están todos en casa o se agota la jornada.
        // **La noche se queda a la vista un momento** —las crías nacen pegadas a su madre y sin
        // esa parada no se ven nunca—, y el reloj de esa parada vive aquí y no en el motor, que
        // no sabe de milisegundos ni debe: adelantando 100 días no hay nadie mirando.
        tick: (saltando) => {
          if (m.extinto) return;
          if (m.noche) {
            if (!saltando && performance.now() < finNoche) return;
            amanecer(m);
            return;
          }
          if (tickDia(m)) { anochecer(m); finNoche = performance.now() + PAUSA_NOCHE; }
        },
        ciclo: () => m.dia,
        extinto: () => m.extinto,
        // Cuánto lleva corrida la noche, para que las crías crezcan en vez de aparecer hechas.
        pintar: (ctx, p, v, W, H, dpr) => pintarDia(ctx, m, p, v, W, H, dpr,
          m.noche ? Math.min(1, Math.max(0, 1 - (finNoche - performance.now()) / PAUSA_NOCHE)) : 1),
        linea: () => {
          if (m.noche) {
            let crias = 0, madres = 0;
            for (const b of m.bichos) if (b.hijos > 0) { crias += b.hijos; madres++; }
            const cria = crias === 1 ? "cría" : "crías", madre = madres === 1 ? "madre" : "madres";
            return `anochece · ${ACENTO(`${crias} ${cria}`)} de ${madres} ${madre} · censo ${m.bichos.length}`;
          }
          let enCasa = 0;
          for (const b of m.bichos) if (b.aSalvo) enCasa++;
          return `día ${ACENTO(m.dia)} · censo ${m.bichos.length} · en casa ${enCasa}` +
            ` · comida ${m.comida.length} · tick ${m.t}`;
        },
      };
    },
  },
];

const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
    <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
  </svg>
);

export default function Evolution() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Sim | null>(null);
  const motorRef = useRef<Motor>(MOTORES[0]);
  const rafRef = useRef(0);
  const sizeRef = useRef({ W: 0, H: 0 });
  const dprRef = useRef(1);
  const estadoRef = useRef<HTMLSpanElement>(null);
  const paletaRef = useRef<Paleta>(paletaDe("light"));
  const corriendoRef = useRef(true);
  const velRef = useRef<number>(VELOCIDADES[0]);
  const saltoRef = useRef(0);          // generación objetivo mientras se adelanta; 0 = no se adelanta
  const repintarRef = useRef(true);    // el mundo cambió sin que corra el reloj: hay que repintar

  const [semilla, setSemilla] = useState(SEMILLA_POR_DEFECTO);
  const [texto, setTexto] = useState(SEMILLA_POR_DEFECTO);
  const [corriendo, setCorriendo] = useState(true);
  const [velIdx, setVelIdx] = useState(0);
  const [motorIdx, setMotorIdx] = useState(0);
  const [saltando, setSaltando] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const tema = useTema();
  const motor = MOTORES[motorIdx];

  useEffect(() => { corriendoRef.current = corriendo; }, [corriendo]);
  useEffect(() => { velRef.current = VELOCIDADES[velIdx]; }, [velIdx]);
  useEffect(() => { if (tema) { paletaRef.current = paletaDe(tema); repintarRef.current = true; } }, [tema]);

  // La semilla de la URL manda sobre la de por defecto: un enlace lleva a un mundo concreto, que
  // es de lo que sirve que la semilla sea una palabra. Se lee del `location` y no de
  // `useSearchParams` para no arrastrar el Suspense que este pide en el prerender.
  //
  // **Y una sola vez de verdad, con un ref que sobreviva al montaje doble de StrictMode.** El
  // efecto de sembrar reescribe la query, así que una segunda lectura no lee el enlace del
  // visitante: lee lo que acabamos de escribir, y la semilla compartida se pierde a favor de la
  // de por defecto. Con `[]` no basta — en desarrollo eso corre dos veces.
  const urlLeidaRef = useRef(false);
  useEffect(() => {
    if (urlLeidaRef.current) return;
    urlLeidaRef.current = true;
    const q = new URLSearchParams(window.location.search);
    const s = q.get("semilla");
    const i = MOTORES.findIndex((x) => x.id === q.get("motor"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: en el servidor no hay URL que leer
    if (s) { setSemilla(s); setTexto(s); }
    if (i >= 0) setMotorIdx(i);
  }, []);

  // Sembrar: mundo nuevo, y motor y semilla a la URL sin apilar una entrada de historial por tecla.
  // Cambiar de motor siembra igual que cambiar de palabra — es el otro mundo, no la otra vista.
  useEffect(() => {
    motorRef.current = motor;
    simRef.current = motor.crear(semilla);
    repintarRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set("semilla", semilla);
    url.searchParams.set("motor", motor.id);
    window.history.replaceState(null, "", url);
  }, [semilla, motor]);

  const sembrar = useCallback(() => {
    const s = texto.trim();
    if (!s) return;
    // Sembrar cancela el salto en curso, y lo hace aquí y no en el efecto: al montar no hay
    // ninguno, así que el efecto solo tendría un `setState` que no cambia nada.
    saltoRef.current = 0;
    setSaltando(false);
    if (s === semilla) simRef.current = motor.crear(s); // misma palabra = mismo mundo: reinicia
    else setSemilla(s);
    repintarRef.current = true;
  }, [texto, semilla, motor]);

  const saltar = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.extinto() || saltoRef.current) return;
    saltoRef.current = sim.ciclo() + SALTO_GEN;
    setSaltando(true);
  }, []);

  // El lienzo toma la forma del mundo dentro del hueco libre, y el mundo mide lo que mide: la
  // vista lo escala y lo centra, pero estirarlo al lienzo daría partidas distintas en cada
  // pantalla y la semilla dejaría de prometer nada.
  useEffect(() => {
    const canvas = canvasRef.current, caja = wrapRef.current;
    if (!canvas || !caja) return;
    const resize = () => {
      const libre = { W: caja.clientWidth, H: caja.clientHeight };
      if (libre.W < 2 || libre.H < 2) return;
      const escala = Math.min(libre.W / motor.ancho, libre.H / motor.alto);
      const W = Math.round(motor.ancho * escala), H = Math.round(motor.alto * escala);
      if (W === sizeRef.current.W && H === sizeRef.current.H) return;
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      sizeRef.current = { W, H };
      repintarRef.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(caja);
    return () => ro.disconnect();
  }, [motor]);

  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const sim = simRef.current, mot = motorRef.current;
      const { W, H } = sizeRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!sim || !ctx || W === 0) return;

      const t0 = performance.now();
      let dados = 0;

      if (saltoRef.current) {
        // Adelantar ciclos sin pintar, pero en trozos dentro del fotograma: correrlos de una vez
        // son segundos de pestaña colgada, y el navegador no distingue eso de un cuelgue.
        while (sim.ciclo() < saltoRef.current && !sim.extinto() && performance.now() - t0 < PRESUPUESTO_MS) {
          sim.tick(true); dados++;
        }
        if (sim.ciclo() >= saltoRef.current || sim.extinto()) { saltoRef.current = 0; setSaltando(false); }
      } else if (corriendoRef.current && !sim.extinto()) {
        const objetivo = velRef.current;
        while (dados < objetivo && performance.now() - t0 < PRESUPUESTO_MS) { sim.tick(false); dados++; }
      }

      // Se repinta cuando el mundo ha cambiado, y también cuando algo de fuera lo pide —el tema,
      // un cambio de tamaño—: en pausa no hay ticks y sin esa segunda razón el lienzo se quedaría
      // con la paleta anterior hasta que alguien le diera al play.
      if (dados || repintarRef.current) {
        repintarRef.current = false;
        const v = vistaDe(W, H, mot.ancho, mot.alto);
        sim.pintar(ctx, paletaRef.current, v, W, H, dprRef.current);
      }

      if (estadoRef.current) {
        const salto = saltoRef.current
          ? ` · adelantando… ${ACENTO(`${mot.ciclo.corto} ${sim.ciclo()}/${saltoRef.current}`)}`
          : "";
        estadoRef.current.innerHTML = sim.extinto()
          ? `↳ <span style="color:#e55">extinción</span> en ${mot.ciclo.frase} ${sim.ciclo()}`
          : `↳ ${sim.linea()}${salto}`;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <TerminalShell
      title="evolution"
      prompt={{ host: "evolution", path: "~/apps", command: `./evolution --mundo=${motor.id} --semilla=${semilla}` }}
      hideChrome={fullscreen}
    >
      <style>{`
        main { --border: var(--t-rule); --muted: var(--t-ink3); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        .toolbar { display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 0; flex-wrap: wrap; }
        .ev-btn {
          padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid var(--border);
          background: transparent; cursor: pointer; font-size: 0.72rem; font-weight: 600;
          font-family: var(--t-mono); letter-spacing: 0.05em; color: var(--t-ink);
          transition: border-color 0.15s, background 0.15s; -webkit-user-select: none; user-select: none;
        }
        .ev-btn:hover { border-color: rgba(0,184,122,0.4); background: rgba(0,184,122,0.04); }
        .ev-btn.on { border-color: var(--t-accent); color: var(--t-accent); }
        .ev-btn.muted { color: var(--muted); }
        .ev-btn:disabled { opacity: 0.45; cursor: default; }
        .ev-semilla {
          padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid var(--border);
          font-family: var(--t-mono); font-size: 0.72rem; color: var(--t-ink);
          background: transparent; width: 8.5rem;
        }
        .ev-semilla:focus { outline: none; border-color: var(--t-accent); }

        /* La caja se queda con el alto libre y el lienzo lo mide el JS (ver resize), que es
           donde vive CONFIG: en CSS, aspect-ratio cede ante uno de los dos límites y deja el
           lienzo o desbordado —empujando la leyenda fuera del overflow, que es cómo desaparecía
           en pantalla ancha— o con dos franjas muertas. */
        .sim-box { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; }
        .sim-canvas { display: block; border-radius: 6px; touch-action: none; }
        .sim-box.fs { position: fixed; inset: 0; z-index: 1000; }
        .sim-box.fs .sim-canvas { border-radius: 0; }
        .fs-exit {
          position: fixed; top: 14px; right: 16px; z-index: 1001;
          background: none; border: none; cursor: pointer; padding: 6px; display: flex;
          color: var(--t-accent); transition: opacity 0.15s; opacity: 0.7;
        }
        .fs-exit:hover { opacity: 1; }
        .hint-row { padding: 0.55rem 0 0; font-size: 0.7rem; color: var(--muted); font-family: var(--t-mono); }

        @media (max-width: 500px) { .toolbar { gap: 0.25rem; } .ev-btn { padding: 0.4rem 0.55rem; } }
      `}</style>

      <main style={{
        maxWidth: 900, margin: "0 auto",
        padding: `0 clamp(1.25rem, 4vw, 2rem) clamp(1.25rem, 4vw, 2rem)`,
        height: "100%", minHeight: "100%",
        overflowX: "hidden", overflowY: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontFamily: "var(--t-mono)", paddingTop: "1rem", paddingBottom: "0.6rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span ref={estadoRef} style={{ fontSize: "0.75rem", color: "var(--t-ink3)", fontVariantNumeric: "tabular-nums" }} />
          </div>
          <button className="hover-accent" onClick={() => setFullscreen(true)} title="Pantalla completa" aria-label="Pantalla completa"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <ExpandIcon />
          </button>
        </div>

        <div className="toolbar">
          <button className="ev-btn" onClick={() => setCorriendo((c) => !c)}>
            {corriendo ? "Pausa" : "Seguir"}
          </button>
          {VELOCIDADES.map((v, i) => (
            <button key={v} className={`ev-btn${i === velIdx ? " on" : ""}`} onClick={() => setVelIdx(i)}>
              ×{v}
            </button>
          ))}
          <button className="ev-btn muted" onClick={saltar} disabled={saltando}>
            {saltando ? "adelantando…" : `+${SALTO_GEN} ${motor.ciclo.corto}`}
          </button>
          {MOTORES.map((mo, i) => (
            <button key={mo.id} className={`ev-btn${i === motorIdx ? " on" : ""}`}
              onClick={() => {
                if (i === motorIdx) return;
                saltoRef.current = 0;   // el objetivo era del otro mundo
                setSaltando(false);
                setMotorIdx(i);
              }}>
              {mo.etiqueta}
            </button>
          ))}
          <input
            className="ev-semilla" value={texto} spellCheck={false} aria-label="Semilla"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sembrar(); }}
          />
          <button className="ev-btn muted" onClick={sembrar}>Sembrar</button>
        </div>

        <div className={`sim-box${fullscreen ? " fs" : ""}`} ref={wrapRef}>
          <canvas className="sim-canvas" ref={canvasRef} />
        </div>

        {fullscreen && (
          <button className="fs-exit" onClick={() => setFullscreen(false)} title="Salir de pantalla completa" aria-label="Salir de pantalla completa">
            <CollapseIcon />
          </button>
        )}

        {!fullscreen && (
          <div className="hint-row">
            {motor.pista}
          </div>
        )}
      </main>
    </TerminalShell>
  );
}
