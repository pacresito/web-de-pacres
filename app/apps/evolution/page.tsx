"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { useTema } from "../../components/usePersistedTheme";
import { CONFIG, RASGOS, TABLA, amanecer, anochecer, azarCon, banda, copiar, crearMundo, evaDe, tick, type Mundo } from "./engine";
import Leyenda, { type Perfil } from "./leyenda";
import { paletaDe, pintar, vistaDe, type Paleta } from "./render";
import { IconoPantallaCompleta } from "../../components/Iconos";

// Cuántos ticks se intentan por fotograma. Es un objetivo, no una promesa: el bucle corta por
// presupuesto de tiempo (abajo), así que en un mundo lleno x64 va tan rápido como dé la máquina.
// Que corte no toca el determinismo — el mundo depende de cuántos ticks ha dado, no de cuándo.
/**
 * Ticks por fotograma. **×1 es un tick por fotograma**, y eso deja el día en unos diecisiete
 * segundos: es la velocidad de mirar a un bicho concreto e ir siguiéndolo, que es para lo que está
 * el ×1. Para ver pasar generaciones están las otras dos. El motor no es el límite —un tick cuesta
 * 0,2 µs, así que en el presupuesto de abajo caben cincuenta mil—: lo es el ojo.
 */
const VELOCIDADES = [1, 8, 64] as const;
const PRESUPUESTO_MS = 12;   // por fotograma, para que la interfaz siga respondiendo a 60 fps
const SALTO_DIAS = 100;      // lo que adelanta el botón de saltar días
const RETROCESO = 10;        // lo que echa atrás el botón de volver
/**
 * Amaneceres guardados: seis retrocesos seguidos. Solo harían falta `RETROCESO`, pero volver una
 * vez y quedarse sin historia es peor que no poder volver — y cada amanecer es una copia del mundo
 * entero, que con censos de decenas son kilobytes. Solo con censos de cientos llega a megas, y ahí
 * lo que manda es cuánto quieres poder deshacer, no la memoria.
 */
const HISTORIA = 60;
/**
 * Milisegundos que el mundo se queda parado al anochecer, para ver nacer a las crías — **a ×1**.
 * Las velocidades lo dividen: si no, ×64 adelanta los días a toda prisa y luego se planta 1,3 s en
 * cada noche, que es donde se iba casi todo el tiempo de mirar. Es reloj de pared, no de mundo,
 * así que no toca el determinismo: el mundo depende de cuántos ticks ha dado, no de cuándo.
 */
const PAUSA_NOCHE = 1500;

const SEMILLA_POR_DEFECTO = "hola";

const ACENTO = (x: string | number) => `<span style="color:var(--t-accent)">${x}</span>`;

/**
 * El reparto de cada gen en la población viva, para la leyenda: dónde está hoy cada gen. `null` si
 * no queda nadie vivo — quien pinta tiene que decidir qué hacer con un mundo extinto.
 */
function perfilDe(bichos: { g: Record<string, number> }[]): Perfil | null {
  if (bichos.length === 0) return null;
  const p: Perfil = {};
  for (const r of RASGOS) {
    const b = banda(bichos.map((x) => x.g[r]));
    if (b) p[r] = b;
  }
  return p;
}

/**
 * Cuánto lleva corrida la noche en curso, en reloj de pared. Lo lleva la página y no el motor,
 * que no sabe de milisegundos ni debe: adelantando 100 días no hay nadie mirando.
 */
type Noche = { fin: number; dura: number };

/**
 * Un paso de reloj. El tick es siempre el mismo; quien sabe cuándo se acaba el día es el motor,
 * que lo cierra en cuanto están todos en casa o se agota la jornada. **La noche se queda a la
 * vista un momento** —las crías nacen pegadas a su madre y sin esa parada no se ven nunca—, y esa
 * parada dura menos cuanto más rápido va el mundo: segundo y medio a ×1, dos décimas a ×8.
 * `saltando` avisa de que nadie está mirando: ahí no hay pausa que valga.
 */
function paso(m: Mundo, saltando: boolean, vel: number, noche: Noche): boolean {
  if (m.extinto) return false;
  if (m.noche) {
    if (!saltando && performance.now() < noche.fin) return false;
    amanecer(m);
    return true;   // acaba de empezar un día: es donde se puede volver
  }
  if (tick(m)) {
    anochecer(m);
    noche.dura = PAUSA_NOCHE / vel;
    noche.fin = performance.now() + noche.dura;
  }
  return false;
}

/** La línea de estado, en HTML y una vez por fotograma. De noche cuenta lo que se acaba de ver. */
function linea(m: Mundo): string {
  if (m.noche) {
    let crias = 0, madres = 0;
    for (const b of m.bichos) if (b.hijos > 0) { crias += b.hijos; madres++; }
    const cria = crias === 1 ? "cría" : "crías", madre = madres === 1 ? "madre" : "madres";
    return `anochece · ${ACENTO(`${crias} ${cria}`)} de ${madres} ${madre} · censo ${m.bichos.length}`;
  }
  return `día ${ACENTO(m.dia)} · censo ${m.bichos.length} · viajes ${m.viajes}` +
    ` · comida ${m.comida.length} · tick ${m.t}`;
}


const ExpandIcon = () => <IconoPantallaCompleta size={14} />;
const CollapseIcon = () => <IconoPantallaCompleta size={16} salir />;

export default function Evolution() {
  // El porqué abre debajo del lienzo, y la página está montada para no desplazarse: mientras esté
  // abierto se le devuelve el desplazamiento al documento, y al cerrarlo se le quita.
  const [porque, setPorque] = useState(false);
  useEffect(() => {
    const raiz = document.documentElement;
    const soltar = () => { raiz.style.height = ""; raiz.style.overflow = ""; document.body.style.overflow = ""; };
    if (porque) { raiz.style.height = "auto"; raiz.style.overflow = "auto"; document.body.style.overflow = "auto"; }
    else soltar();
    return soltar;
  }, [porque]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mundoRef = useRef<Mundo | null>(null);
  const nocheRef = useRef<Noche>({ fin: 0, dura: PAUSA_NOCHE });
  // Los últimos amaneceres, del más viejo al más nuevo. El mundo es determinista, así que volver
  // atrás también se podría hacer resembrando y corriendo hasta el día que toca — pero eso crece
  // con la partida y a los doscientos días son segundos de espera. Copiar el mundo es constante.
  const historiaRef = useRef<Mundo[]>([]);
  const hayAtrasRef = useRef(false);   // espejo de `historiaRef.length > 0`, para poder pintar el botón
  const rafRef = useRef(0);
  const sizeRef = useRef({ W: 0, H: 0 });
  const dprRef = useRef(1);
  const estadoRef = useRef<HTMLSpanElement>(null);
  const paletaRef = useRef<Paleta>(paletaDe("light"));
  const corriendoRef = useRef(true);
  const velRef = useRef<number>(VELOCIDADES[0]);
  const saltoRef = useRef(0);          // día objetivo mientras se adelanta; 0 = no se adelanta
  const repintarRef = useRef(true);    // el mundo cambió sin que corra el reloj: hay que repintar

  const [semilla, setSemilla] = useState(SEMILLA_POR_DEFECTO);
  const [texto, setTexto] = useState(SEMILLA_POR_DEFECTO);
  const [corriendo, setCorriendo] = useState(true);
  const [velIdx, setVelIdx] = useState(0);
  const [saltando, setSaltando] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [leyenda, setLeyenda] = useState(false);
  const [hayAtras, setHayAtras] = useState(false);
  const tema = useTema();
  // El fundador de la partida en curso, calculado y no guardado: el mundo vive en un ref que no
  // re-renderiza nada, así que un estado en paralelo solo podría quedarse viejo.
  const eva = useMemo(() => evaDe(azarCon(semilla), CONFIG), [semilla]);

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
    const s = new URLSearchParams(window.location.search).get("semilla");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: en el servidor no hay URL que leer
    if (s) { setSemilla(s); setTexto(s); }
  }, []);

  // Sembrar: mundo nuevo, y la semilla a la URL sin apilar una entrada de historial por tecla.
  useEffect(() => {
    const m = crearMundo(semilla);
    mundoRef.current = m;
    historiaRef.current = [];
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    repintarRef.current = true;
    const url = new URL(window.location.href);
    url.searchParams.set("semilla", semilla);
    window.history.replaceState(null, "", url);
  }, [semilla]);

  const sembrar = useCallback(() => {
    const s = texto.trim();
    if (!s) return;
    // Sembrar cancela el salto en curso, y lo hace aquí y no en el efecto: al montar no hay
    // ninguno, así que el efecto solo tendría un `setState` que no cambia nada.
    saltoRef.current = 0;
    setSaltando(false);
    if (s === semilla) {          // misma palabra = mismo mundo: reinicia
      mundoRef.current = crearMundo(s);
      historiaRef.current = [];
      nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    } else setSemilla(s);
    repintarRef.current = true;
  }, [texto, semilla]);

  /**
   * Volver `RETROCESO` días: se restaura el amanecer guardado más reciente que no pase de ahí, y
   * **lo que venía después deja de ser historia** — se vuelve a vivir desde ahí, y como el mundo
   * es determinista se vive igual. Si no hay tanto guardado, se va al más viejo que quede.
   */
  const volver = useCallback(() => {
    const h = historiaRef.current, m = mundoRef.current;
    if (!m || h.length === 0) return;
    const objetivo = m.dia - RETROCESO;
    let i = 0;
    for (let k = h.length - 1; k >= 0; k--) if (h[k].dia <= objetivo) { i = k; break; }
    mundoRef.current = copiar(h[i]);
    h.length = i;
    saltoRef.current = 0;
    setSaltando(false);
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    repintarRef.current = true;
  }, []);

  // La leyenda mira el mundo con su propio reloj: el bucle de pintado vive en refs y no
  // re-renderiza React, así que preguntarle en cada fotograma sería re-renderizar la página entera
  // 60 veces por segundo para mover una barra que se mueve en generaciones.
  const perfil = useCallback(() => (mundoRef.current ? perfilDe(mundoRef.current.bichos) : null), []);

  /** Guarda el amanecer que acaba de ocurrir y tira el más viejo si ya sobran. */
  const guardar = useCallback((m: Mundo) => {
    const h = historiaRef.current;
    h.push(copiar(m));
    if (h.length > HISTORIA) h.shift();
  }, []);
  const cerrarLeyenda = useCallback(() => setLeyenda(false), []);

  const saltar = useCallback(() => {
    const m = mundoRef.current;
    if (!m || m.extinto || saltoRef.current) return;
    saltoRef.current = m.dia + SALTO_DIAS;
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
      const escala = Math.min(libre.W / CONFIG.ancho, libre.H / CONFIG.alto);
      const W = Math.round(CONFIG.ancho * escala), H = Math.round(CONFIG.alto * escala);
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
  }, []);

  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const m = mundoRef.current;
      const { W, H } = sizeRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!m || !ctx || W === 0) return;

      const t0 = performance.now();
      const vel = velRef.current;
      let dados = 0;

      if (saltoRef.current) {
        // Adelantar días sin pintar, pero en trozos dentro del fotograma: correrlos de una vez
        // son segundos de pestaña colgada, y el navegador no distingue eso de un cuelgue.
        while (m.dia < saltoRef.current && !m.extinto && performance.now() - t0 < PRESUPUESTO_MS) {
          if (paso(m, true, vel, nocheRef.current)) guardar(m);
          dados++;
        }
        if (m.dia >= saltoRef.current || m.extinto) { saltoRef.current = 0; setSaltando(false); }
      } else if (corriendoRef.current && !m.extinto) {
        while (dados < vel && performance.now() - t0 < PRESUPUESTO_MS) {
          if (paso(m, false, vel, nocheRef.current)) guardar(m);
          dados++;
        }
      }

      // Se repinta cuando el mundo ha cambiado, y también cuando algo de fuera lo pide —el tema,
      // un cambio de tamaño—: en pausa no hay ticks y sin esa segunda razón el lienzo se quedaría
      // con la paleta anterior hasta que alguien le diera al play.
      if (dados || repintarRef.current) {
        repintarRef.current = false;
        const v = vistaDe(W, H, CONFIG.ancho, CONFIG.alto);
        // Cuánto lleva corrida la noche, para que las crías crezcan en vez de aparecer hechas.
        const noche = m.noche
          ? Math.min(1, Math.max(0, 1 - (nocheRef.current.fin - performance.now()) / nocheRef.current.dura))
          : 1;
        pintar(ctx, m, paletaRef.current, v, W, H, dprRef.current, noche);
      }

      // El botón de volver se pinta desde React y la historia vive en un ref, así que el espejo se
      // sincroniza aquí —una comparación por fotograma— y no en los cuatro sitios que la tocan.
      const atras = historiaRef.current.length > 0;
      if (atras !== hayAtrasRef.current) { hayAtrasRef.current = atras; setHayAtras(atras); }

      if (estadoRef.current) {
        estadoRef.current.innerHTML = m.extinto
          ? `↳ <span style="color:#e55">extinción</span> en el día ${m.dia}`
          : `↳ ${linea(m)}${saltoRef.current ? ` · adelantando… ${ACENTO(`día ${m.dia}/${saltoRef.current}`)}` : ""}`;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [guardar]);

  return (
    <TerminalShell
      title="evolution"
      prompt={{ host: "evolution", path: "~/apps", command: `./evolution --semilla=${semilla}` }}
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
        .sim-box { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; position: relative; }
        .sim-canvas { display: block; border-radius: 6px; touch-action: none; }
        .sim-box.fs { position: fixed; inset: 0; z-index: 1000; }
        .sim-box.fs .sim-canvas { border-radius: 0; }
        .fs-exit {
          position: fixed; top: 14px; right: 16px; z-index: 1001;
          background: none; border: none; cursor: pointer; padding: 6px; display: flex;
          color: var(--t-accent); transition: opacity 0.15s; opacity: 0.7;
        }
        .fs-exit:hover { opacity: 1; }

        /* ── Leyenda ──────────────────────────────────────────────────────────
           Encima del lienzo y no debajo: el hueco vertical ya se lo reparten el mundo y la barra
           de controles, y meter aquí ocho filas dejaría el mundo en una rendija. Va dentro de
           .sim-box para que en pantalla completa —donde la caja es fixed— salga sin otro camino. */
        .lg-panel {
          position: absolute; inset: 0; z-index: 5; overflow-y: auto; overscroll-behavior: contain;
          background: var(--t-paper); border: 1px solid var(--border); border-radius: 6px;
          font-family: var(--t-mono); padding: 0.9rem 1rem 1.2rem;
        }
        .lg-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .lg-cabecera b { font-size: 0.78rem; letter-spacing: 0.08em; color: var(--t-accent); }
        .lg-intro { font-size: 0.68rem; line-height: 1.55; color: var(--muted); margin: 0.6rem 0 0; max-width: 62ch; }
        .lg-aviso b { color: var(--t-ink2); }

        .lg-filas { margin-top: 0.5rem; }
        .lg-fila { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.7rem 0; border-top: 1px solid var(--border); }
        .lg-muestras { flex: 0 0 auto; }
        .lg-celdas { display: flex; gap: 4px; }
        .lg-celdas canvas { border-radius: 3px; display: block; }
        .lg-muestras canvas { border-radius: 3px; display: block; }
        .lg-pies { display: flex; justify-content: space-between; font-size: 0.58rem; color: var(--t-ink3); padding-top: 3px; }
        .lg-vacio { width: 170px; font-size: 0.62rem; color: var(--t-ink3); font-style: italic; padding-top: 0.4rem; }

        .lg-datos { flex: 1 1 auto; min-width: 0; }
        .lg-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; font-size: 0.72rem; }
        .lg-cab b { color: var(--t-ink); letter-spacing: 0.04em; }
        .lg-cifra { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .lg-flecha { color: var(--t-ink4); }
        .lg-viaje { color: var(--t-accent); margin-left: 0.5rem; }

        /* La barra: fundador en el centro, ÷4 a la izquierda y ×4 a la derecha (la escala, en reparto.ts). */
        .lg-eje { position: relative; height: 14px; margin: 0.45rem 0 0.35rem; }
        .lg-eje::before { content: ""; position: absolute; left: 0; right: 0; top: 6px; height: 1px; background: var(--border); }
        .lg-eje i { position: absolute; display: block; }
        .lg-bigote { top: 6px; height: 1px; background: var(--t-ink4); }
        .lg-tramo { top: 3px; height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--t-accent) 30%, transparent); }
        .lg-med { top: 1px; width: 5px; height: 11px; margin-left: -2.5px; border-radius: 3px; background: var(--t-accent); }
        .lg-eva { top: -2px; width: 1px; height: 17px; background: var(--t-ink2); }
        .lg-tick { top: 3px; width: 1px; height: 7px; background: var(--border); }

        .lg-que { font-size: 0.68rem; line-height: 1.5; color: var(--t-ink); margin: 0.2rem 0 0; }
        .lg-nota { font-size: 0.62rem; line-height: 1.5; color: var(--t-ink3); margin-top: 0.2rem; }
        .lg-paga, .lg-cobra { color: var(--t-ink2); }

        @media (max-width: 620px) {
          .lg-fila { flex-direction: column; gap: 0.4rem; }
          .lg-datos { width: 100%; }
        }

        @media (max-width: 500px) { .toolbar { gap: 0.25rem; } .ev-btn { padding: 0.4rem 0.55rem; } }
      `}</style>

      <main style={{
        maxWidth: 900, margin: "0 auto",
        padding: `0 clamp(1.25rem, 4vw, 2rem) clamp(1.25rem, 4vw, 2rem)`,
        height: porque ? "auto" : "100%", minHeight: "100%",
        overflowX: "hidden", overflowY: porque ? "auto" : "hidden",
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
          <button className="ev-btn muted" onClick={volver} disabled={!hayAtras}>
            −{RETROCESO} días
          </button>
          <button className="ev-btn muted" onClick={saltar} disabled={saltando}>
            {saltando ? "adelantando…" : `+${SALTO_DIAS} días`}
          </button>
          <input
            className="ev-semilla" value={texto} spellCheck={false} aria-label="Semilla"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sembrar(); }}
          />
          <button className="ev-btn muted" onClick={sembrar}>Sembrar</button>
          <button className={`ev-btn${leyenda ? " on" : ""}`} onClick={() => setLeyenda((v) => !v)}>
            leyenda
          </button>
        </div>

        <div className={`sim-box${fullscreen ? " fs" : ""}`} ref={wrapRef}>
          <canvas className="sim-canvas" ref={canvasRef} />
          {leyenda && (
            <Leyenda
              rasgos={RASGOS} tabla={TABLA}
              eva={eva}
              ancho={CONFIG.ancho} alto={CONFIG.alto}
              perfil={perfil} paleta={paletaDe(tema ?? "light")} cerrar={cerrarLeyenda}
            />
          )}
        </div>

        {fullscreen && (
          <button className="fs-exit" onClick={() => setFullscreen(false)} title="Salir de pantalla completa" aria-label="Salir de pantalla completa">
            <CollapseIcon />
          </button>
        )}

        {!fullscreen && (
          <>
            <WhyFooter question="¿Por qué un simulador de evolución?" date="2 de septiembre de 2026" onOpenChange={setPorque} style={{ marginTop: "auto" }}>
              <p>Que de unas reglas simples salga algo que nadie ha escrito me parece la idea más bonita que tiene la biología. Y es de las que cuesta creerse si no la ves pasar.</p>
              <p>Aquí nadie decide cómo se comporta un bicho. Solo hay seis números que se heredan con pequeños errores y un mundo en el que solo lo que llega a casa se convierte en hijos. Con eso basta.</p>
              <p>Al rato la población es otra y hace cosas que yo no programé: cazar, apartarse, volver antes de tiempo. No hay guion — es lo que ha quedado vivo.</p>
            </WhyFooter>
          </>
        )}
      </main>
    </TerminalShell>
  );
}
