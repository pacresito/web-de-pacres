"use client";

// La calle de verdad, a la hora de verdad, y nada más: se mira. Sin partida ni puntos: la
// barra dice cuánto hace que miraste y cuántas cosas han cambiado desde entonces, y deja ver
// la calle como estaba. Qué ha cambiado lo busca quien mira.
//
// La composición que se publica es la calle vista desde una ventana, y con vida: lo quieto se
// repinta cada minuto y lo que se mueve —`calle/vida.ts`— doce veces por segundo encima.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import BarraEstado, { Dato } from "../../components/BarraEstado";
import { IconoPantallaCompleta } from "../../components/Iconos";
import { diferencia, escena, snapshot, type NivelObjeto, type Snapshot } from "./escena";
import { LIENZO, vistaDe, type Vista } from "./render";
import { componer, pintarCapas, type Capas } from "./calle/animar";
import { agenda } from "./calle/vida";

/** Una sola calle para todos: la semilla no cambia nunca, o la calle sería otra. */
const SEMILLA = "reposo";

/** El ancho al que se sirve la calle, el de lo más ancho del laboratorio. En una ventana
 *  estrecha no encoge: se desplaza, que es lo que el plan admite en móvil — más pequeña, los
 *  objetos pequeños dejarían de verse. Maximizada crece hasta llenar la pantalla, nunca menos. */
const ANCHO = 960;

// La hora, releída cada minuto: con ella cambian la luz y lo que la calle tiene a esa hora. En
// el servidor es 0 —la hora de allí no es la de nadie, y pintar con ella rompería la
// hidratación con una calle a otra luz de la que traía el HTML—. Fija entre lecturas y no
// `Date.now()` cada vez: un valor que cambia en cada lectura haría renderizar sin parar.
const reloj = { t: 0 };
function suscribirReloj(avisar: () => void) {
  const id = setInterval(() => { reloj.t = Date.now(); avisar(); }, 60e3);
  return () => clearInterval(id);
}
const leerReloj = () => reloj.t || (reloj.t = Date.now());
const relojDelServidor = () => 0;

// Maximizada, la calle entera en la pantalla entera: lo que no cubre su proporción queda en
// bandas, porque recortarla dejaría objetos fuera de la vista.
function suscribirVentana(avisar: () => void) {
  window.addEventListener("resize", avisar);
  return () => window.removeEventListener("resize", avisar);
}
const leerPantalla = () => Math.floor(Math.min(window.innerWidth, (window.innerHeight * LIENZO.ancho) / LIENZO.alto));
const pantallaDelServidor = () => ANCHO;

/** Fotogramas por segundo de la vida: los de un pixel art, no los de la pantalla. A más, el
 *  vapor y la ropa se mueven de píxel en píxel igual, solo que gastando el triple. */
const FPS = 12;

// La visita anterior vive en el navegador y no en un servidor: cada dispositivo tiene su «la
// última vez», sin nombre ni cuenta. Se guarda lo que se vio —los niveles— y no solo el
// instante, para que retocar un reloj del catálogo no reescriba lo que alguien ya miró.
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

// Se lee una vez al entrar y no se mueve mientras se está: la referencia es la visita de
// antes, aunque esta ya se esté guardando. La primera vez no hay visita de antes y la
// referencia es el momento de entrar. Se olvida al salir, para releerla al volver sin recargar.
let anterior: Visita | undefined;
const leerAnterior = () => {
  if (anterior) return anterior;
  const t = Date.now();
  return (anterior = cargarVisita() ?? { t, niveles: snapshot(escena(SEMILLA, t)) });
};
const anteriorDelServidor = () => null;
const sinSuscripcion = () => () => {};

const horaLocal = (t: number) => {
  const d = new Date(t * 1000);
  return d.getHours() + d.getMinutes() / 60;
};

export default function Reposo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ahora = useSyncExternalStore(suscribirReloj, leerReloj, relojDelServidor);
  const [maximizada, setMaximizada] = useState(false);
  const pantalla = useSyncExternalStore(suscribirVentana, leerPantalla, pantallaDelServidor);
  const ancho = maximizada ? Math.max(ANCHO, pantalla) : ANCHO;
  const visita = useSyncExternalStore(sinSuscripcion, leerAnterior, anteriorDelServidor);
  const [antes, setAntes] = useState(false);

  const fecha = new Date(ahora);
  const hora = fecha.getHours() + fecha.getMinutes() / 60;

  // Lo que el bucle lee en cada fotograma. Va en refs porque el bucle vive lo que la página y
  // lo quieto se repinta aparte, cada minuto.
  const capas = useRef<Capas | null>(null);
  const vista = useRef<Vista | null>(null);
  const dibujar = useRef<(t: number) => void>(() => {});

  useEffect(() => {
    dibujar.current = (t: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx || !capas.current || !vista.current) return;
      componer(ctx, vista.current, capas.current, { t, hora: horaLocal(t), sucesos: agenda(t, horaLocal) });
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

  // Solo cuenta como visita quedarse un minuto mirando: cargar y cerrar no gasta la
  // referencia. Y mientras se mira se sigue guardando, así la próxima compara contra lo último
  // que se vio; con la pestaña oculta no, que nadie está mirando.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") guardarVisita(Date.now());
    }, 60e3);
    return () => { clearInterval(id); anterior = undefined; };
  }, []);

  const calle = ahora === 0 ? [] : escena(SEMILLA, ahora);
  const cambios = visita ? diferencia(visita.niveles, calle).length : 0;
  const dias = visita ? Math.max(0, Math.floor((ahora - visita.t) / MS_DIA)) : 0;
  const cuando = dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;

  // Lo quieto, una vez por minuto (o al cambiar de ancho o de «antes»): la calle a su hora, en
  // capas. La de antes se pinta con la luz de ahora: con la suya, cambiaría todo y no se vería
  // qué cambió.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || ahora === 0) return;
    const ahoraMismo = escena(SEMILLA, ahora);
    const niveles: NivelObjeto[] = antes && visita
      ? ahoraMismo.map((o) => ({ ...o, nivel: visita.niveles[o.id] ?? o.nivel }))
      : ahoraMismo;
    vista.current = vistaDe(canvas, ancho, window.devicePixelRatio || 1);
    capas.current = pintarCapas(niveles, hora);
    // Redimensionar el canvas lo borra: se repinta ya, sin esperar al siguiente fotograma.
    dibujar.current(Date.now() / 1000);
  }, [ahora, hora, ancho, antes, visita]);

  const hhmm = fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

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
          width: 100%; max-width: calc(${ANCHO}px + 56px); margin: 0 auto; padding: 28px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .rp-pista { margin: 0; color: var(--t-ink3); font-size: 12px; }
        /* El conmutador es el propio dato, subrayado a puntos para que se sepa pulsable sin
           parecer un botón: la barra informa, y mirar el pasado es un gesto discreto. */
        .rp-antes {
          cursor: pointer; color: var(--t-ink2); font-variant-numeric: tabular-nums;
          text-decoration: underline dotted; text-underline-offset: 3px;
          transition: color 0.12s ease;
        }
        .rp-antes.es-antes, .rp-antes:active { color: var(--t-accent); }
        .rp-antes.es-antes { text-decoration-style: solid; }
        @media (hover: hover) { .rp-antes:hover { color: var(--t-accent); } }
        /* El lienzo manda: si no cabe, la caja se desplaza en vez de encoger la calle. El filo
           va en outline y no en border, que ocupa sitio: la caja mediría dos píxeles menos que
           la calle y se desplazaría siempre. */
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
