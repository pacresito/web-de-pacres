"use client";

// La calle de verdad, a la hora de verdad, y nada más: se mira. La partida —comparar contra la
// visita anterior— no está en la página todavía; el motor y la partida esperan en `escena.ts`
// y `partida.ts`.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import BarraEstado, { Dato } from "../../components/BarraEstado";
import { IconoPantallaCompleta } from "../../components/Iconos";
import { escena } from "./escena";
import { LIENZO, vistaDe } from "./render";
import { pintarEscena } from "./calle/pincel";
// La composición que se publica: la calle vista desde una ventana. El encuadre es parte del
// juego, no decoración — pide volver a mirar un sitio, y da el sitio desde el que se mira.
import { escena as calle } from "./calle/ventana";

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

export default function Reposo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ahora = useSyncExternalStore(suscribirReloj, leerReloj, relojDelServidor);
  const [maximizada, setMaximizada] = useState(false);
  const pantalla = useSyncExternalStore(suscribirVentana, leerPantalla, pantallaDelServidor);
  const ancho = maximizada ? Math.max(ANCHO, pantalla) : ANCHO;

  const fecha = new Date(ahora);
  const hora = fecha.getHours() + fecha.getMinutes() / 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || ahora === 0) return;
    pintarEscena(ctx, vistaDe(canvas, ancho, window.devicePixelRatio || 1), escena(SEMILLA, ahora), hora, calle);
  }, [ahora, hora, ancho]);

  const hhmm = fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <TerminalShell
      title="reposo"
      prompt={{ host: "reposo", path: "~/juegos", command: "./reposo --objetos=24" }}
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

        <p className="rp-pista">Observa la escena y vuelve en unos días —o meses—.</p>
        <p className="rp-texto">
          Cuando vuelvas habrán cambiado cosas, y el juego es descubrir cuáles. Cuanto más tardes en
          volver, más cambia.
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
        .rp-texto { margin: 0; color: var(--t-ink2); font-size: 13px; line-height: 1.6; }
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
