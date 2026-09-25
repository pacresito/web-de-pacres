"use client";

// La calle a la hora de verdad, vista desde una ventana. La barra dice cuándo miraste y cuántas
// cosas han cambiado, y deja ver la calle como estaba. Lo quieto se repinta cada minuto; lo que
// se mueve (`calle/vida.ts`), doce veces por segundo.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import BarraEstado, { Dato } from "../../components/BarraEstado";
import { IconoPantallaCompleta } from "../../components/Iconos";
import { SEMILLA, diferencia, escena, snapshot, type NivelObjeto, type Snapshot } from "./escena";
import { ANCHO_CSS, LIENZO, PIEZAS, calendarioDe, horaSolar, visible, vistaDe, type Vista } from "./render";
import { componer, pintarCapas, type Capas } from "./calle/animar";
import { agenda } from "./calle/vida";

// La hora, releída cada minuto. En el servidor es 0, o la hidratación traería otra luz; y fija
// entre lecturas, porque un valor que cambia en cada lectura renderiza sin parar.
const reloj = { t: 0 };
function suscribirReloj(avisar: () => void) {
  const id = setInterval(() => { reloj.t = Date.now(); avisar(); }, 60e3);
  return () => clearInterval(id);
}
const leerReloj = () => reloj.t || (reloj.t = Date.now());
const relojDelServidor = () => 0;

// Maximizada, la calle entera con bandas: recortarla dejaría objetos fuera.
function suscribirVentana(avisar: () => void) {
  window.addEventListener("resize", avisar);
  return () => window.removeEventListener("resize", avisar);
}
const leerPantalla = () => Math.floor(Math.min(window.innerWidth, (window.innerHeight * LIENZO.ancho) / LIENZO.alto));
const pantallaDelServidor = () => ANCHO_CSS;

/** Los de un pixel art: a más, se mueve igual de píxel en píxel y gasta el triple. */
const FPS = 12;

// La visita anterior vive en el navegador, sin cuenta. Se guardan los niveles vistos y no solo
// el instante, para que retocar un reloj no reescriba lo que alguien ya miró.
const CLAVE = "reposo:visita";
const MS_DIA = 24 * 3600e3;
interface Visita { t: number; niveles: Snapshot }

function cargarVisita(): Visita | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    return v && typeof v.t === "number" && v.niveles ? v : null;
  } catch { return null; }
}
function guardarVisita(t: number) {
  try { localStorage.setItem(CLAVE, JSON.stringify({ t, niveles: snapshot(escena(SEMILLA, t)) })); } catch {}
}

// Se lee al entrar y no se mueve mientras se mira, aunque esta visita ya se esté guardando. La
// primera vez, la referencia es el momento de entrar. Se olvida al salir de la página.
let anterior: Visita | undefined;
const leerAnterior = () => {
  if (anterior) return anterior;
  const t = Date.now();
  return (anterior = cargarVisita() ?? { t, niveles: snapshot(escena(SEMILLA, t)) });
};
const anteriorDelServidor = () => null;
const sinSuscripcion = () => () => {};

/** La hora del reloj, decimal. `t` en segundos, como la animación. */
const horaLocal = (t: number) => {
  const d = new Date(t * 1000);
  return d.getHours() + d.getMinutes() / 60;
};
/** La del sol, para lo que depende de si hay luz: los pájaros, las estrellas, la tele. */
const horaDeLuz = (t: number) => horaSolar(horaLocal(t), calendarioDe(new Date(t * 1000)).dia);

export default function Reposo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ahora = useSyncExternalStore(suscribirReloj, leerReloj, relojDelServidor);
  const [maximizada, setMaximizada] = useState(false);
  const pantalla = useSyncExternalStore(suscribirVentana, leerPantalla, pantallaDelServidor);
  const ancho = maximizada ? Math.max(ANCHO_CSS, pantalla) : ANCHO_CSS;
  const visita = useSyncExternalStore(sinSuscripcion, leerAnterior, anteriorDelServidor);
  const [antes, setAntes] = useState(false);

  const hora = horaLocal(ahora / 1000);

  // Lo que el bucle lee en cada fotograma.
  const capas = useRef<Capas | null>(null);
  const vista = useRef<Vista | null>(null);
  const dibujar = useRef<(t: number) => void>(() => {});

  useEffect(() => {
    dibujar.current = (t: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !capas.current || !vista.current) return;
      componer(ctx, vista.current, capas.current, { t, hora: horaLocal(t), sucesos: agenda(t, horaDeLuz) });
    };
    let id = 0, ultimo = -1;
    const vuelta = (real: number) => {
      id = requestAnimationFrame(vuelta);
      const cuadro = Math.floor(real / (1000 / FPS));
      if (cuadro === ultimo) return;
      ultimo = cuadro;
      dibujar.current(Date.now() / 1000);
    };
    id = requestAnimationFrame(vuelta);
    return () => cancelAnimationFrame(id);
  }, []);

  // Cuenta como visita quedarse un minuto mirando, y se sigue guardando mientras se mira (con la
  // pestaña visible): la próxima compara contra lo último que se vio.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") guardarVisita(Date.now());
    }, 60e3);
    return () => { clearInterval(id); anterior = undefined; };
  }, []);

  // Solo cuenta lo que se pinta a esta hora: lo que tiene franja sigue cambiando fuera de ella.
  const calle = ahora === 0 ? [] : escena(SEMILLA, ahora);
  const cambios = visita ? diferencia(visita.niveles, calle).filter((o) => visible(PIEZAS[o.id], hora)).length : 0;
  const dias = visita ? Math.max(0, Math.floor((ahora - visita.t) / MS_DIA)) : 0;
  const cuando = dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;

  // Lo quieto, una vez por minuto. La calle de antes se pinta con la luz y la estación de ahora:
  // con las suyas cambiaría todo y no se vería qué cambió.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || ahora === 0) return;
    const ahoraMismo = escena(SEMILLA, ahora);
    const niveles: NivelObjeto[] = antes && visita
      ? ahoraMismo.map((o) => ({ ...o, nivel: visita.niveles[o.id] ?? o.nivel }))
      : ahoraMismo;
    vista.current = vistaDe(canvas, ancho, window.devicePixelRatio || 1);
    capas.current = pintarCapas(niveles, hora, new Date(ahora));
    // Redimensionar el canvas lo borra: se repinta ya, sin esperar al siguiente fotograma.
    dibujar.current(Date.now() / 1000);
  }, [ahora, hora, ancho, antes, visita]);

  // Escape también sale de la pantalla completa.
  useEffect(() => {
    if (!maximizada) return;
    const salir = (e: KeyboardEvent) => { if (e.key === "Escape") setMaximizada(false); };
    window.addEventListener("keydown", salir);
    return () => window.removeEventListener("keydown", salir);
  }, [maximizada]);

  const hhmm = new Date(ahora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <TerminalShell
      title="reposo"
      prompt={{ host: "reposo", path: "~/juegos", command: "./reposo --objetos=22" }}
      backUrl="/lab"
      hideChrome={maximizada}
    >
      <div className="rp">
        <BarraEstado acciones={
          <button
            className="be-icono hover-accent"
            onClick={() => setMaximizada(true)}
            title="Pantalla completa"
            aria-label="Pantalla completa"
          >
            <IconoPantallaCompleta size={14} />
          </button>
        }>
          <Dato etiqueta="hora">
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{ahora === 0 ? "--:--" : hhmm}</span>
          </Dato>
          {visita && ahora !== 0 && <>
            <Dato etiqueta="last seen">
              <button
                className={`rp-antes${antes ? " es-antes" : ""}`}
                onClick={() => setAntes((a) => !a)}
                aria-pressed={antes}
                title={antes ? "Volver a la calle de ahora" : "Ver la calle como estaba"}
              >{cuando}</button>
            </Dato>
            <Dato etiqueta="cambios">
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{cambios}</span>
            </Dato>
          </>}
        </BarraEstado>

        <div className={`rp-caja${maximizada ? " es-maximizada" : ""}`}>
          <canvas ref={canvasRef} className="rp-calle" />
        </div>

        {maximizada && (
          <button
            className="rp-salir hover-accent"
            onClick={() => setMaximizada(false)}
            title="Salir de pantalla completa"
            aria-label="Salir de pantalla completa"
          >
            <IconoPantallaCompleta size={16} salir />
          </button>
        )}

        <p className="rp-pista">
          Observa la escena y vuelve en unos días (o meses) · al volver habrán cambiado cosas ·
          puedes pulsar «last seen» para ver cómo estaba la calle
        </p>

        <WhyFooter question="¿por qué un juego que premia no jugar?">
          <p>
            Muchas de las cosas que abro a diario están pensadas para que vuelva mañana: alguna racha
            que mantener, una notificación que mirar, un número que sigue creciendo. Me apetecía
            hacer justo lo contrario: un juego que no me pidiera volver, sino que tuviera más que
            ofrecer cuanto más tiempo pasara sin mirarlo.
          </p>
          <p>
            La idea nace de ahí, de jugar con esa necesidad de estar entrando de vez en cuando en una
            app para no perderme nada. Aquí no hay nada que reclamar ni nada que mantener: si te
            vas, no pasa nada. Y cuando vuelves, el tiempo que has pasado fuera es precisamente lo
            que hace que el juego sea diferente.
          </p>
        </WhyFooter>
      </div>

      <style jsx>{`
        /* Una columna del ancho de la calle, centrada: texto y barra alinean con el dibujo. */
        .rp {
          width: 100%; max-width: calc(${ANCHO_CSS}px + 56px); margin: 0 auto; padding: 28px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .rp-pista { margin: 0; color: var(--t-ink3); font-size: 12px; }
        /* El dato es el conmutador: subrayado a puntos, pulsable sin parecer un botón. */
        .rp-antes {
          cursor: pointer; color: var(--t-ink2); font-variant-numeric: tabular-nums;
          text-decoration: underline dotted; text-underline-offset: 3px;
          transition: color 0.12s ease;
        }
        .rp-antes.es-antes, .rp-antes:active { color: var(--t-accent); }
        .rp-antes.es-antes { text-decoration-style: solid; }
        @media (hover: hover) { .rp-antes:hover { color: var(--t-accent); } }
        /* Si no cabe, se desplaza. El filo en outline: un border ocupa sitio y la haría
           desplazarse siempre. */
        .rp-caja {
          width: 100%; min-width: 0; overflow-x: auto;
          outline: 1px solid var(--t-ink4); border-radius: 3px;
        }
        /* Maximizada tapa la página entera, barra incluida: la salida flota en la esquina. */
        .rp-caja.es-maximizada {
          position: fixed; inset: 0; z-index: 1000; overflow: auto;
          display: flex; align-items: center; justify-content: safe center;
          background: #000; outline: none; border-radius: 0;
        }
        .rp-calle { display: block; flex-shrink: 0; margin: auto 0; }
        .rp-salir {
          position: fixed; top: 14px; right: 16px; z-index: 1001; padding: 6px; display: flex;
          cursor: pointer; color: var(--t-accent); opacity: 0.7;
        }
      `}</style>
    </TerminalShell>
  );
}
