"use client";

// La calle de verdad, a la hora de verdad, y nada más: se mira. La partida —comparar contra la
// visita anterior— no está en la página todavía; el motor y la partida esperan en `escena.ts`
// y `partida.ts`.
//
// La composición que se publica es la calle vista desde una ventana, y con vida: lo quieto se
// repinta cada minuto y lo que se mueve —`calle/vida.ts`— doce veces por segundo encima.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import BarraEstado, { Dato } from "../../components/BarraEstado";
import { IconoPantallaCompleta } from "../../components/Iconos";
import { escena } from "./escena";
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

  // Lo quieto, una vez por minuto (o al cambiar de ancho): la calle a su hora, en capas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || ahora === 0) return;
    vista.current = vistaDe(canvas, ancho, window.devicePixelRatio || 1);
    capas.current = pintarCapas(escena(SEMILLA, ahora), hora);
    // Redimensionar el canvas lo borra: se repinta ya, sin esperar al siguiente fotograma.
    dibujar.current(Date.now() / 1000);
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

        <p className="rp-pista">
          Observa la escena y vuelve en unos días —o meses— · al volver habrán cambiado cosas:
          descubre cuáles · cuanto más tardes, más cambia
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
