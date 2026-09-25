"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { useTema } from "../../components/usePersistedTheme";
import { CONFIG, amanecer, anochecer, copiar, crearMundo, tick, type Bicho, type Mundo } from "./engine";
import Leyenda from "./leyenda";
import Diario from "./diario";
import Tira from "./tira";
import Estratos from "./estratos";
import Inspector from "./inspector";
import Reglas from "./reglas";
import Asa from "./asa";
import { paletaDe, pintar, vistaDe, vistaSobre, type Vista as Camara } from "./render";
import { designFor, type Design, type Paleta } from "./designs";
import { crearHistoria, registrar, type Historia } from "./reparto";
import { crearDiario, narrar, olvidar, type Diario as Cronica, type Evento } from "./narrador";
import { MAX_SEMILLA, tirarDado } from "./semillas";
import { IconoAyuda, IconoInfo, IconoPantallaCompleta, IconoRanking } from "../../components/Iconos";
import BarraEstado from "../../components/BarraEstado";

/** Ticks por fotograma; −1 es hacia atrás. ×1 deja el día en unos diecisiete segundos. */
const VELOCIDADES = [-1, 1, 8, 64] as const;
const NORMAL = VELOCIDADES.indexOf(1);
/** Cada cuántos ticks se guarda un hito del día que se rebobina: revivir un tramo y no el día entero. */
const TRAMO = 25;
const PRESUPUESTO_MS = 12;   // por fotograma, para que la interfaz siga a 60 fps
const SALTO_DIAS = 100;
const RETROCESO = 10;
/** Amaneceres guardados: seis retrocesos seguidos. */
const HISTORIA = 60;
/** Lo que se para el mundo al anochecer para ver nacer a las crías, a ×1; las velocidades lo dividen. */
const PAUSA_NOCHE = 1500;

/** La del prerender; al montar se cambia por la del enlace o por una del dado. */
const SEMILLA_PRERENDER = "marea";

/** El panel abierto, uno o ninguno: todos compiten por el alto del lienzo. */
type Vista = "leyenda" | "poblacion" | "partida" | "diario" | "reglas" | null;

const Trazo = ({ children, size = 14 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IconoPausa = () => <Trazo><path d="M7 4.5v11" /><path d="M13 4.5v11" /></Trazo>;
// Seguir va relleno y ×1 hueco: en pausa serían el mismo triángulo.
const IconoSeguir = () => <Trazo><path d="M6.5 4.5l9 5.5-9 5.5z" fill="currentColor" /></Trazo>;
const IconoAdelante = () => <Trazo><path d="M6.5 4.5l9 5.5-9 5.5z" /></Trazo>;
const IconoAtras = () => <Trazo><path d="M13.5 4.5l-9 5.5 9 5.5z" /></Trazo>;
const IconoDado = () => (
  <Trazo>
    <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
    <circle cx="7" cy="7" r="0.6" fill="currentColor" /><circle cx="10" cy="10" r="0.6" fill="currentColor" />
    <circle cx="13" cy="13" r="0.6" fill="currentColor" />
  </Trazo>
);
const IconoBicho = ({ size = 14 }: { size?: number }) => (
  <Trazo size={size}>
    <ellipse cx="10" cy="11.5" rx="3.6" ry="5" />
    <path d="M8.6 6.8L6.8 3.6" /><path d="M11.4 6.8l1.8-3.2" />
    <path d="M6.4 9.5L3.5 8" /><path d="M13.6 9.5l2.9-1.5" />
    <path d="M6.4 12h-3" /><path d="M13.6 12h3" />
    <path d="M6.6 14.5l-2.6 2" /><path d="M13.4 14.5l2.6 2" />
  </Trazo>
);

// Las reglas van en la barra y no en la cabecera, que en pantalla completa no está.
const VISTAS_ICONO: [Vista, string, typeof IconoInfo][] = [
  ["poblacion", "La población", IconoBicho], ["partida", "La partida", IconoRanking], ["leyenda", "La leyenda", IconoInfo], ["reglas", "Las reglas del mundo", IconoAyuda],
];

/** Margen de acierto al pulsar un bicho, en px de pantalla: lo que tiene que caber es un dedo. */
const TACTO = 9;
/** Lo que la cámara recorta por fotograma de lo que le falta. Solo el desplazamiento: la escala salta. */
const SEGUIMIENTO = 0.14;
/** Ms que la cámara se queda donde estaba el marcado cuando ya no queda ni su cuerpo. */
const COLA = 2000;

const ACENTO = (x: string | number) => `<span style="color:var(--t-accent)">${x}</span>`;
const ETQ = (x: string) => `<span class="be-etq">${x}</span>`;
/* La pareja etiqueta-valor no se parte: en móvil el corte cae en el `·`. */
const PAR = (etq: string, val: string | number) =>
  `<span style="white-space:nowrap">${ETQ(etq)} ${val}</span>`;

/** Cuánto lleva la noche en curso, en reloj de pared: el motor no sabe de milisegundos. */
type Noche = { fin: number; dura: number };

/**
 * Un paso de reloj: un tick o, de noche, esperar y amanecer. `saltando` es que nadie mira, y ahí
 * no se espera. Devuelve si acaba de amanecer.
 */
function paso(m: Mundo, saltando: boolean, vel: number, noche: Noche): boolean {
  if (m.extinto) return false;
  if (m.noche) {
    if (!saltando && performance.now() < noche.fin) return false;
    amanecer(m);
    return true;
  }
  if (tick(m)) {
    anochecer(m);
    noche.dura = PAUSA_NOCHE / vel;
    noche.fin = performance.now() + noche.dura;
  }
  return false;
}

/** La línea de estado, en HTML. De noche cuenta las crías. */
function linea(m: Mundo): string {
  if (m.noche) {
    let crias = 0, madres = 0;
    for (const b of m.bichos) if (b.hijos > 0) { crias += b.hijos; madres++; }
    const cria = crias === 1 ? "cría" : "crías", madre = madres === 1 ? "madre" : "madres";
    return `anochece · ${ACENTO(`${crias} ${cria}`)} de ${madres} ${madre} · ${PAR("censo", m.bichos.length)}`;
  }
  return [
    PAR("día", ACENTO(m.dia)), PAR("censo", m.bichos.length),
    PAR("comida", m.comida.length), PAR("tick", m.t),
  ].join(" · ");
}

export default function Evolution() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mundoRef = useRef<Mundo | null>(null);
  const nocheRef = useRef<Noche>({ fin: 0, dura: PAUSA_NOCHE });
  /** Los últimos amaneceres, del más viejo al más nuevo: volver es copiar uno, no resembrar. */
  const historiaRef = useRef<Mundo[]>([]);
  /** El reparto de cada día, para los estratos. Se corta solo al volver atrás. */
  const repartoRef = useRef<Historia>(crearHistoria());
  const cronicaRef = useRef<Cronica>(crearDiario());
  const ultimoRef = useRef<Evento | null>(null);
  const hayAtrasRef = useRef(false);
  /** El bicho marcado, o 0. En ref además de en estado porque lo lee el bucle. */
  const selRef = useRef(0);
  /** Dónde está la cámara ahora, que es también con lo que un clic se traduce al mundo. */
  const camRef = useRef<Camara | null>(null);
  /** Dónde se quedó el marcado y hasta cuándo se le espera; `hasta` 0 es que sigue en el campo. */
  const esperaRef = useRef<{ id: number; x: number; y: number; hasta: number } | null>(null);
  const rafRef = useRef(0);
  const sizeRef = useRef({ W: 0, H: 0 });
  const arribaRef = useRef(false);   // el mundo pegado arriba: móvil maximizado
  const topeRef = useRef(0);         // lo que tapan los botones flotando sobre el lienzo maximizado
  const barraRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(1);
  const estadoRef = useRef<HTMLSpanElement>(null);
  const ultimoElRef = useRef<HTMLSpanElement>(null);
  const ultimoPintadoRef = useRef("?");   // un sello que ningún evento tiene: la primera vuelta escribe
  const paletaRef = useRef<Paleta>(paletaDe(SEMILLA_PRERENDER, "light"));
  const disenoRef = useRef<Design>(designFor(SEMILLA_PRERENDER));
  const corriendoRef = useRef(true);
  const velRef = useRef<number>(VELOCIDADES[NORMAL]);
  /** Hitos del día que se rebobina, uno cada `TRAMO` ticks. Caché: se tira si el mundo cambia por otro camino. */
  const rebRef = useRef<{ dia: number; hitos: Mundo[] } | null>(null);
  const saltoRef = useRef(0);          // día objetivo mientras se adelanta; 0 = no se adelanta
  const repintarRef = useRef(true);    // el mundo cambió sin que corra el reloj

  const [semilla, setSemilla] = useState(SEMILLA_PRERENDER);
  const [texto, setTexto] = useState(SEMILLA_PRERENDER);
  const [corriendo, setCorriendo] = useState(true);
  const [velIdx, setVelIdx] = useState(NORMAL);
  const [saltando, setSaltando] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [vista, setVista] = useState<Vista>(null);
  const [sel, setSel] = useState(0);
  const [hayAtras, setHayAtras] = useState(false);
  const tema = useTema();
  const eva = CONFIG.fundador;
  const paleta = paletaDe(semilla, tema ?? "light");
  const diseno = designFor(semilla);

  useEffect(() => { corriendoRef.current = corriendo; }, [corriendo]);
  useEffect(() => { velRef.current = VELOCIDADES[velIdx]; }, [velIdx]);
  useEffect(() => {
    disenoRef.current = designFor(semilla);
    paletaRef.current = paletaDe(semilla, tema ?? "light");
    repintarRef.current = true;
  }, [semilla, tema]);

  // La semilla del enlace manda; sin enlace, una del dado. Del `location` y no de
  // `useSearchParams`, que pide Suspense en el prerender. Una sola vez aunque StrictMode monte
  // dos: la segunda leería la URL que ya ha reescrito el efecto de sembrar.
  const urlLeidaRef = useRef(false);
  useEffect(() => {
    if (urlLeidaRef.current) return;
    urlLeidaRef.current = true;
    const s = new URLSearchParams(window.location.search).get("semilla")?.slice(0, MAX_SEMILLA) || tirarDado("");
    setSemilla(s); setTexto(s);
  }, []);

  /** Mundo nuevo para la semilla, y fuera todo lo que colgaba del anterior. */
  const reiniciar = useCallback((s: string) => {
    const m = crearMundo(s);
    mundoRef.current = m;
    historiaRef.current = [copiar(m)];   // el amanecer del día 0: sin él no se rebobina el primer día
    rebRef.current = null;
    repartoRef.current = crearHistoria();
    cronicaRef.current = crearDiario();
    ultimoRef.current = null;
    ultimoPintadoRef.current = "?";
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    repintarRef.current = true;
  }, []);

  useEffect(() => {
    reiniciar(semilla);
    const url = new URL(window.location.href);
    url.searchParams.set("semilla", semilla);
    window.history.replaceState(null, "", url);
  }, [semilla, reiniciar]);

  const marcar = useCallback((id: number) => {
    selRef.current = id;
    setSel(id);
    repintarRef.current = true;
  }, []);

  /** Marcar al que se pulsa, o soltarlo si ya lo estaba. */
  const alternar = useCallback((id: number) => {
    marcar(id === selRef.current ? 0 : id);
  }, [marcar]);

  /** Sembrar la caja, o `palabra` si se da. La misma palabra reinicia el mismo mundo. */
  const sembrar = useCallback((palabra?: string) => {
    const s = (palabra ?? texto).trim().slice(0, MAX_SEMILLA);
    if (!s) return;
    saltoRef.current = 0;
    setSaltando(false);
    if (selRef.current) marcar(0);   // el mundo nuevo reparte los mismos ids entre otros
    if (s === semilla) reiniciar(s);
    else setSemilla(s);
  }, [texto, semilla, marcar, reiniciar]);

  /** Volver `RETROCESO` días al amanecer guardado más cercano; lo de después se vuelve a vivir igual. */
  const volver = useCallback(() => {
    const h = historiaRef.current, m = mundoRef.current;
    if (!m || h.length === 0) return;
    const objetivo = m.dia - RETROCESO;
    let i = 0;
    for (let k = h.length - 1; k >= 0; k--) if (h[k].dia <= objetivo) { i = k; break; }
    const vuelto = copiar(h[i]);
    mundoRef.current = vuelto;
    rebRef.current = null;
    h.length = i + 1;
    // El diario se corta ya: en pausa no llega ningún amanecer que lo haga.
    olvidar(cronicaRef.current, vuelto.dia + 1);
    ultimoRef.current = cronicaRef.current.eventos[cronicaRef.current.eventos.length - 1] ?? null;
    saltoRef.current = 0;
    setSaltando(false);
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    repintarRef.current = true;
  }, []);

  /** El mundo del día `dia` en el tick `t`, revivido desde su amanecer: el motor no es reversible. */
  const estadoEn = useCallback((dia: number, t: number): Mundo | null => {
    let reb = rebRef.current;
    if (!reb || reb.dia !== dia) {
      const base = historiaRef.current.find((h) => h.dia === dia);
      if (!base) return null;
      reb = rebRef.current = { dia, hitos: [copiar(base)] };
    }
    const i = Math.min(Math.floor(t / TRAMO), reb.hitos.length - 1);
    const w = copiar(reb.hitos[i]);
    for (let k = i * TRAMO; k < t; ) {
      tick(w);
      if (++k % TRAMO === 0 && reb.hitos.length === k / TRAMO) reb.hitos.push(copiar(w));
    }
    return w;
  }, []);

  /** Un tick atrás: el anterior, o desde el alba la noche de antes, o desde la noche su último tick. */
  const atrasar = useCallback((): Mundo | null => {
    const m = mundoRef.current;
    if (!m) return null;
    const w = m.noche ? estadoEn(m.dia - 1, m.duracion)
      : m.t > 0 ? estadoEn(m.dia, m.t - 1)
      : estadoEn(m.dia - 1, CONFIG.ticksDia);
    if (!w) return null;
    if (!m.noche && m.t === 0) anochecer(w);
    mundoRef.current = w;
    olvidar(cronicaRef.current, w.noche ? w.dia : w.dia + 1);
    ultimoRef.current = cronicaRef.current.eventos[cronicaRef.current.eventos.length - 1] ?? null;
    nocheRef.current = { fin: 0, dura: PAUSA_NOCHE };
    return w;
  }, [estadoEn]);

  /** Guarda el amanecer (para volver), el reparto y la línea del diario del día cerrado. */
  const guardar = useCallback((m: Mundo) => {
    const h = historiaRef.current;
    if (!h.length || h[h.length - 1].dia < m.dia) {   // rebobinando se revive lo ya guardado
      h.push(copiar(m));
      if (h.length > HISTORIA) h.shift();
    }
    registrar(repartoRef.current, m);
    const ev = narrar(cronicaRef.current, m, CONFIG.fundador);
    if (ev) ultimoRef.current = ev;
  }, []);

  // Los paneles leen el mundo con su propio reloj: el bucle vive en refs y no re-renderiza React.
  const mundoVivo = useCallback(() => mundoRef.current, []);
  const cronicaDe = useCallback(() => cronicaRef.current, []);
  const climaDe = useCallback(() => mundoRef.current?.cfg.comidas ?? 0, []);
  const reparto = useCallback(() => repartoRef.current, []);
  const diaDe = useCallback(() => mundoRef.current?.dia ?? 0, []);
  /** Cerrar el panel no suelta al marcado: la marca es del mundo. */
  const cerrar = useCallback(() => setVista(null), []);
  const soltar = useCallback(() => marcar(0), [marcar]);
  const abrir = useCallback((v: Vista) => setVista((x) => (x === v ? null : v)), []);

  /** Marca al bicho —o al cuerpo— más cercano al clic, o suelta si se pulsa el suelo. */
  const pulsar = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = mundoRef.current, v = camRef.current, cv = canvasRef.current;
    if (!m || !v || !cv) return;
    const caja = cv.getBoundingClientRect();
    const x = (e.clientX - caja.left - v.ox) / v.escala, y = (e.clientY - caja.top - v.oy) / v.escala;
    const margen = TACTO / v.escala;
    let mejor: Bicho | null = null, cerca = 0;
    for (const b of [...m.bichos, ...m.restos.map((z) => z.b)]) {
      const dx = b.x - x, dy = b.y - y, d2 = dx * dx + dy * dy;
      const alcance = b.radio + margen;
      if (d2 > alcance * alcance) continue;
      if (!mejor || d2 < cerca) { mejor = b; cerca = d2; }
    }
    alternar(mejor ? mejor.id : 0);
  }, [alternar]);

  const saltar = useCallback(() => {
    const m = mundoRef.current;
    if (!m || m.extinto || saltoRef.current) return;
    saltoRef.current = m.dia + SALTO_DIAS;
    setSaltando(true);
  }, []);

  // El lienzo toma la forma del mundo dentro del hueco libre; estirarlo daría partidas distintas
  // en cada pantalla. Maximizado toma el hueco entero, y lo que sobra alrededor se pinta de casa.
  useEffect(() => {
    const canvas = canvasRef.current, caja = wrapRef.current;
    if (!canvas || !caja) return;
    const resize = () => {
      const libre = { W: caja.clientWidth, H: caja.clientHeight };
      if (libre.W < 2 || libre.H < 2) return;
      arribaRef.current = fullscreen && window.matchMedia("(max-width: 640px)").matches;
      // Lo que tapan los botones flotantes se mide: envuelven distinto con cada ancho.
      const tope = fullscreen ? barraRef.current?.offsetHeight ?? 0 : 0;
      if (tope !== topeRef.current) { topeRef.current = tope; repintarRef.current = true; }
      caja.style.setProperty("--tope", `${tope}px`);
      const { ancho, alto } = mundoRef.current?.cfg ?? CONFIG;
      const escala = Math.min(libre.W / ancho, libre.H / alto);
      const W = fullscreen ? libre.W : Math.round(ancho * escala);
      const H = fullscreen ? libre.H : Math.round(alto * escala);
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
    if (barraRef.current) ro.observe(barraRef.current);
    return () => ro.disconnect();
  }, [fullscreen, semilla]);

  useEffect(() => {
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      let m = mundoRef.current;
      const { W, H } = sizeRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!m || !ctx || W === 0) return;

      const t0 = performance.now();
      const vel = velRef.current;
      let dados = 0;

      // Todo en trozos dentro del presupuesto del fotograma: de una vez, la pestaña se colgaría.
      if (saltoRef.current) {
        while (m.dia < saltoRef.current && !m.extinto && performance.now() - t0 < PRESUPUESTO_MS) {
          if (paso(m, true, vel, nocheRef.current)) guardar(m);
          dados++;
        }
        if (m.dia >= saltoRef.current || m.extinto) { saltoRef.current = 0; setSaltando(false); }
      } else if (corriendoRef.current && vel < 0) {
        // Hacia atrás también extinto, hasta donde llegue la historia guardada.
        for (let k = 0; k < -vel; k++) {
          const w = atrasar();
          if (!w) { setCorriendo(false); break; }
          m = w;
          dados++;
        }
      } else if (corriendoRef.current && !m.extinto) {
        while (dados < vel && performance.now() - t0 < PRESUPUESTO_MS) {
          if (paso(m, false, vel, nocheRef.current)) guardar(m);
          dados++;
        }
      }

      // La extinción se narra aquí: ese día no amanece, y `guardar` cuelga del amanecer.
      if (dados && m.extinto) {
        const fin = narrar(cronicaRef.current, m, CONFIG.fundador);
        if (fin) ultimoRef.current = fin;
      }

      // La cámara, siempre: también la mueve un clic en pausa. Sigue al marcado o a su cuerpo, y
      // cuando ya no queda nada, se queda `COLA` ms donde estaba.
      const elegido = selRef.current ? m.bichos.find((b) => b.id === selRef.current) ?? null : null;
      const marcado = elegido ?? (selRef.current
        ? m.restos.find((z) => z.b.id === selRef.current)?.b ?? null
        : null);
      const ahora = performance.now();
      let espera = esperaRef.current;
      if (espera && espera.id !== selRef.current) espera = null;
      if (marcado) {
        espera = { id: marcado.id, x: marcado.x, y: marcado.y, hasta: marcado.vivo ? 0 : ahora + COLA };
      } else if (espera && !espera.hasta) espera.hasta = ahora + COLA;   // se fue sin dejar cuerpo
      esperaRef.current = espera;
      const foco = espera && (!espera.hasta || espera.hasta > ahora) ? espera : null;
      const meta = foco
        ? vistaSobre(W, H, m.cfg.ancho, m.cfg.alto, foco.x, foco.y, arribaRef.current, topeRef.current)
        : vistaDe(W, H, m.cfg.ancho, m.cfg.alto, arribaRef.current, topeRef.current);
      const antes = camRef.current;
      let v = meta;
      if (antes && antes.escala === meta.escala) {
        // Remata el último trozo, o repintaría para siempre por centésimas de píxel.
        const cerca = (de: number, a: number) => {
          const p = de + (a - de) * SEGUIMIENTO;
          return Math.abs(a - p) < 0.05 ? a : p;
        };
        v = { escala: meta.escala, ox: cerca(antes.ox, meta.ox), oy: cerca(antes.oy, meta.oy) };
      }
      const movida = !antes || antes.escala !== v.escala || antes.ox !== v.ox || antes.oy !== v.oy;
      camRef.current = v;

      if (dados || movida || repintarRef.current) {
        repintarRef.current = false;
        // Lo que lleva la noche, para que las crías crezcan.
        const noche = m.noche
          ? Math.min(1, Math.max(0, 1 - (nocheRef.current.fin - performance.now()) / nocheRef.current.dura))
          : 1;
        pintar(ctx, m, disenoRef.current, paletaRef.current, v, W, H, dprRef.current, noche, marcado);
      }

      // Hay atrás si el mundo no está en el amanecer más viejo guardado.
      const h0 = historiaRef.current[0];
      const atras = !!h0 && (m.dia > h0.dia || m.t > 0 || m.noche);
      if (atras !== hayAtrasRef.current) { hayAtrasRef.current = atras; setHayAtras(atras); }

      const texto = m.extinto
        ? `<span style="color:var(--rojo)">extinción</span> en el día ${m.dia}`
        : `${linea(m)}${saltoRef.current ? ` · adelantando… ${ACENTO(`día ${m.dia}/${saltoRef.current}`)}` : ""}`;
      if (estadoRef.current) estadoRef.current.innerHTML = texto;

      const ev = ultimoRef.current;
      const sello = ev ? `${ev.dia}·${ev.clave}` : "";
      if (sello !== ultimoPintadoRef.current) {
        ultimoPintadoRef.current = sello;
        if (ultimoElRef.current) {
          ultimoElRef.current.textContent = ev
            ? `día ${ev.dia} · ${ev.texto}`
            : `el clima de esta partida · ${m.cfg.comidas} bocados al día`;
        }
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [guardar, atrasar]);

  /** Elegir velocidad es también arrancar. */
  const elegir = (i: number) => { setVelIdx(i); setCorriendo(true); };
  const barra = (
    <div className="toolbar" ref={barraRef}>
      <button className="ev-btn icono tinta" onClick={() => setCorriendo((c) => !c)}
        title={corriendo ? "Pausa" : "Seguir"} aria-label={corriendo ? "Pausa" : "Seguir"}>
        {corriendo ? <IconoPausa /> : <IconoSeguir />}
      </button>
      {VELOCIDADES.map((v, i) => {
        const on = i === velIdx ? " on" : "";
        if (v === -1 || v === 1) {
          const nombre = v < 0 ? "Hacia atrás" : "Velocidad normal";
          return (
            <button key={v} className={`ev-btn icono tinta${on}`} onClick={() => elegir(i)} title={nombre} aria-label={nombre}>
              {v < 0 ? <IconoAtras /> : <IconoAdelante />}
            </button>
          );
        }
        return <button key={v} className={`ev-btn${on}`} onClick={() => elegir(i)}>×{v}</button>;
      })}
      <button className="ev-btn muted" onClick={volver} disabled={!hayAtras} title={`Volver ${RETROCESO} días`}>
        −{RETROCESO} d
      </button>
      <button className="ev-btn muted" onClick={saltar} disabled={saltando} title={`Adelantar ${SALTO_DIAS} días`}>
        {saltando ? "adelantando…" : `+${SALTO_DIAS} d`}
      </button>
      <div className="ev-sembrado">
        <input
          className="ev-semilla" value={texto} spellCheck={false} aria-label="Semilla"
          onChange={(e) => setTexto(e.target.value)}
          maxLength={MAX_SEMILLA}
          onKeyDown={(e) => { if (e.key === "Enter") sembrar(); }}
        />
        <button className="ev-dado hover-accent" title="Una semilla al azar" aria-label="Una semilla al azar"
          onClick={() => { const w = tirarDado(semilla); setTexto(w); sembrar(w); }}>
          <IconoDado />
        </button>
        <button className="ev-btn muted" onClick={() => sembrar()}>Sembrar</button>
      </div>
      {VISTAS_ICONO.map(([v, nombre, Icono]) => (
        <button key={v} className={`ev-btn icono${vista === v ? " on" : ""}`} onClick={() => abrir(v)}
          title={nombre} aria-label={nombre}>
          <Icono size={14} />
        </button>
      ))}
    </div>
  );

  return (
    <TerminalShell
      title="evolution"
      prompt={{ host: "evolution", path: "~/apps", command: `./evolution --semilla=${semilla}` }}
      hideChrome={fullscreen}
    >
      <style>{`
        main { --border: var(--t-rule); --muted: var(--t-ink3); --rojo: #e55; }
        /* El papel lo pone el shell; aquí, el candado del desplazamiento: se desplaza el main. */
        html, body { height: 100%; overflow: hidden; }

        .toolbar { display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem 0; flex-wrap: wrap; }
        .ev-btn {
          padding: 0.4rem 0.75rem; border-radius: 4px; border: 1px solid var(--border);
          cursor: pointer; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em; color: var(--t-ink);
          transition: border-color 0.15s, background 0.15s; -webkit-user-select: none; user-select: none;
        }
        .ev-btn:hover {
          border-color: color-mix(in srgb, var(--t-accent) 40%, transparent);
          background: color-mix(in srgb, var(--t-accent) 4%, transparent);
        }
        .ev-btn.on { border-color: var(--t-accent); color: var(--t-accent); }
        .ev-btn.muted { color: var(--muted); }
        .ev-btn.icono { display: inline-flex; align-items: center; align-self: stretch; padding: 0.4rem 0.55rem; color: var(--muted); }
        .ev-btn.icono.tinta { color: var(--t-ink); }   /* transporte: se usa, no se consulta */
        .ev-btn.icono.on { color: var(--t-accent); }
        .ev-btn:disabled { opacity: 0.45; cursor: default; }
        .ev-sembrado {
          display: inline-flex; align-self: stretch; border: 1px solid var(--border); border-radius: 4px;
          overflow: hidden; transition: border-color 0.15s;
        }
        .ev-sembrado:focus-within { border-color: var(--t-accent); }
        .ev-semilla { padding: 0.4rem 0.6rem; font-size: 0.72rem; color: var(--t-ink); width: 6.5rem; }
        .ev-semilla:focus { outline: none; }
        .ev-sembrado .ev-btn { border: none; border-left: 1px solid var(--border); border-radius: 0; }
        .ev-dado { display: inline-flex; align-items: center; padding: 0 0.45rem; cursor: pointer; }

        /* La escena: controles, mundo y lo que va debajo, en mono. Sin min-height 0: el suelo de
           la caja se defiende, y lo que no cabe lo desplaza el main. */
        .escena { display: flex; flex-direction: column; flex: 1 1 auto; font-family: var(--t-mono); }
        .escena.fs {
          position: fixed; inset: 0; z-index: 1000; background: var(--t-paper);
          padding: 0 clamp(0.75rem, 2vw, 1.5rem) 0.75rem;
        }
        /* El alto libre lo mide el JS, que es donde vive la forma del mundo. Con suelo: una caja a
           cero no falla, desaparece. */
        .sim-box { flex: 1 1 auto; min-height: 200px; position: relative; }
        /* Fuera del flujo: con su ancho en px dentro, sostendría el ancho de la caja que se mide. */
        .sim-canvas {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          display: block; border-radius: 6px; touch-action: none; cursor: pointer;
        }
        .escena.fs .sim-canvas { border-radius: 0; }
        /* Maximizada, la caja se come el relleno lateral: el lienzo la llena de casa. */
        .escena.fs .sim-box { margin-inline: calc(clamp(0.75rem, 2vw, 1.5rem) * -1); }
        /* Maximizada, la barra flota sobre la casa y deja pasar los toques por sus huecos. */
        .escena.fs .toolbar {
          position: absolute; top: 0; left: 0; right: 0; z-index: 6; pointer-events: none;
          padding-inline: clamp(0.75rem, 2vw, 1.5rem);
        }
        .escena.fs .toolbar > * { pointer-events: auto; }
        .escena.fs .toolbar .ev-btn, .escena.fs .ev-sembrado { background: var(--t-paper); }
        .escena.fs .ev-sembrado .ev-btn { background: transparent; }
        @media (min-width: 641px) { .escena.fs .ev-panel { top: var(--tope, 0px); } }

        /* Los paneles que se abren sobre el mundo. */
        .ev-panel {
          position: absolute; inset: 0; z-index: 5; overflow-y: auto; overscroll-behavior: contain;
          background: var(--t-paper);
        }
        .ev-cabecera { display: flex; align-items: center; gap: 0.8rem; }
        .ev-cabecera b { font-size: 0.78rem; letter-spacing: 0.08em; color: var(--t-accent); }
        .ev-cabecera .ev-cerrar { margin-left: auto; }
        .ev-rango { font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; }

        /* El carril del diario, en rejilla: un botón no encoge por debajo de su texto, y la línea
           larga ensancharía la página. */
        .dr-carril {
          flex: 0 0 auto; width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto;
          align-items: baseline; gap: 0.6rem;
          border-top: 1px solid var(--border); padding: 0.35rem 0 0.1rem; cursor: pointer;
          font-size: 0.66rem; color: var(--t-accent); text-align: left;
        }
        .dr-viva { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .dr-abrir { color: var(--muted); }
        .dr-carril:hover .dr-abrir, .dr-carril:active .dr-abrir { color: var(--t-accent); }

        /* Lo que va bajo el mundo. Dice su ancho: en columna flex lo decidiría su hijo más ancho. */
        .cajon { flex: 0 0 auto; width: 100%; }

        @media (max-width: 500px) {
          .toolbar { gap: 0.25rem; }
          .ev-btn { padding: 0.4rem 0.55rem; }
          .ev-semilla { width: 5rem; padding-inline: 0.45rem; }   /* para que quepa la barra en un renglón */
        }

        /* Móvil: el mundo lo limita el ancho, así que se come el relleno lateral, va arriba del
           todo y los paneles suben desde abajo como cajones, sin tapar lo que se mira. */
        @media (max-width: 640px) {
          .sim-box { margin-inline: calc(clamp(1.25rem, 4vw, 2rem) * -1); }
          .sim-canvas { border-radius: 0; top: 0; transform: translateX(-50%); }
          .toolbar > * { flex: 0 0 auto; }
          main .ev-panel, main .cajon {
            position: fixed; inset: auto 0 0 0; z-index: 1002;
            max-height: 76dvh; overflow-y: auto; overscroll-behavior: contain;
            background: var(--t-paper); border: 1px solid var(--border); border-bottom: none;
            border-radius: 14px 14px 0 0; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.28);
            padding: 0 1rem 1rem; animation: cj-subir 0.22s ease-out;
          }
          .ev-cerrar { display: none; }   /* en el cajón cierra el asa */
          .cajon > .asa + * { border-top: none; }
          @keyframes cj-subir { from { transform: translateY(100%); } }
        }
      `}</style>

      {/* El ancho, dicho: en la columna flex del shell lo decidiría la barra que no envuelve. El
          desplazamiento, del main y no del documento, que en móvil tiene la raíz bloqueada. */}
      <main style={{
        width: "100%", maxWidth: 900, margin: "0 auto",
        padding: `0 clamp(1.25rem, 4vw, 2rem) clamp(1.25rem, 4vw, 2rem)`,
        height: "100%",
        overflowX: "hidden", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        <div className={`escena${fullscreen ? " fs" : ""}`}>
          <BarraEstado
            estilo={{ marginTop: "1rem" }}
            acciones={
              <button className="be-icono hover-accent" onClick={() => setFullscreen((f) => !f)}
                title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>
                <IconoPantallaCompleta size={fullscreen ? 16 : 14} salir={fullscreen} />
              </button>
            }
          >
            <span ref={estadoRef} className="be-elastico" />
          </BarraEstado>

          {!fullscreen && barra}

          <div className="sim-box" ref={wrapRef}>
            {fullscreen && barra}
            {/* `pointerdown` y no `click`: el click táctil llega tarde. */}
            <canvas className="sim-canvas" ref={canvasRef} onPointerDown={pulsar} />
            {vista === "partida" && <Estratos historia={reparto} eva={eva} dia={diaDe} cerrar={cerrar} />}
            {vista === "diario" && <Diario diario={cronicaDe} dia={diaDe} clima={climaDe} cerrar={cerrar} />}
            {vista === "reglas" && <Reglas mundo={mundoVivo} cerrar={cerrar} />}
            {vista === "leyenda" && <Leyenda eva={eva} paleta={paleta} diseno={diseno} cerrar={cerrar} />}
          </div>

          <button className="dr-carril" onClick={() => abrir("diario")} title="Abrir el diario de la partida">
            <span ref={ultimoElRef} className="dr-viva" />
            <span className="dr-abrir">el diario ›</span>
          </button>

          {/* Ficha y tira, en un cajón: en móvil son una sola hoja. La ficha se ve siempre que se
              vea el mundo, y en corto si la tira ya cuenta los genes. */}
          {(vista === "poblacion" || (sel > 0 && vista === null)) && (
            <div className="cajon">
              <Asa cerrar={vista === "poblacion" ? cerrar : soltar} />
              {sel > 0 && (
                <Inspector key={sel} mundo={mundoVivo} id={sel} eva={eva} cerrar={soltar} genes={vista === null} />
              )}
              {vista === "poblacion" && (
                <Tira mundo={mundoVivo} eva={eva} paleta={paleta} diseno={diseno} sel={sel} marcar={alternar} />
              )}
            </div>
          )}
        </div>

        {!fullscreen && (
          <WhyFooter question="¿Por qué un simulador de evolución?" date="2 de septiembre de 2026" style={{ marginTop: "auto" }}>
            <p>Que de unas reglas simples salga algo que nadie ha escrito me parece la idea más bonita que tiene la biología. Y es de las que cuesta creerse si no la ves pasar.</p>
            <p>Aquí nadie decide cómo se comporta un bicho. Solo hay seis números que se heredan con pequeños errores y un mundo en el que solo lo que llega a casa se convierte en hijos. Con eso basta.</p>
            <p>Al rato la población es otra y hace cosas que yo no programé: cazar, apartarse, volver antes de tiempo. No hay guion — es lo que ha quedado vivo.</p>
          </WhyFooter>
        )}
      </main>
    </TerminalShell>
  );
}
