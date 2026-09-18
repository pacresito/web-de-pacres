"use client";

// La calle de muestra: enseña la mecánica en treinta segundos sin esperar una semana.
//
// **Semilla distinta a la de verdad, y eso es lo que la hace inofensiva.** Un deslizador de
// hueco sobre la calle real regalaría el futuro y mataría la partida; sobre otra calle no
// enseña nada que se pueda aprovechar. Aquí no se puntúa ni hay crónica.
//
// **Y no transcurre en el estreno de su calle, sino a tres años de él.** Antes del origen los
// monótonos están clavados en su nivel cero y los sucesos no han pasado todavía: una muestra
// ahí enseñaría una calle sin árbol y sin nada que le haya ocurrido nunca, justo los estratos
// que existe para enseñar. La hora sí es la real: la luz de tu momento es parte del sitio.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import { ORIGEN_MS, diferencia, escena, evidentes, snapshot, antiguedadDe, type Cambio } from "./escena";
import { NOMBRES, enganchar, haceCuanto, nuevaVisita, tocar, FALLOS, type Visita } from "./partida";
import { LIENZO, marcas, vistaDe, zonas } from "./render";
import { pintarEscena } from "./calle/pincel";
// La composición que se publica: la calle vista desde una ventana. El encuadre es parte del
// juego, no decoración — pide volver a mirar un sitio, y da el sitio desde el que se mira.
import { escena as calle } from "./calle/ventana";

const DIA = 24 * 3600e3;
const SEMILLA = "muestra";
const EDAD = 3 * 365 * DIA;   // la muestra vive en la vida adulta de su calle

const HUECOS: { texto: string; ms: number }[] = [
  { texto: "un día", ms: DIA },
  { texto: "una semana", ms: 7 * DIA },
  { texto: "un mes", ms: 30 * DIA },
];

/** El ancho al que se sirve la calle. En una ventana estrecha no encoge: se desplaza, que es
 *  lo que el plan admite en móvil — a menos de mil píxeles los objetos pequeños dejarían de
 *  verse y el juego pediría distinguir lo que no se distingue. */
const ANCHO_MINIMO = 1000;

// El instante en que se abrió la página, fijado en la primera lectura del cliente. Fijo y no
// `Date.now()` cada vez porque tiene que ser el mismo para la luz con la que se pinta y para
// el diff que se juega, y porque un valor que cambia en cada lectura haría renderizar sin
// parar. En el servidor es 0: la hora de allí no es la de nadie, y pintar con ella rompería
// la hidratación con una calle a otra luz de la que traía el HTML.
const reloj = { t: 0 };
const sinCambios = () => () => {};
const leerReloj = () => reloj.t || (reloj.t = Date.now());
const relojDelServidor = () => 0;

export default function Reposo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cajaRef = useRef<HTMLDivElement>(null);
  const ahora = useSyncExternalStore(sinCambios, leerReloj, relojDelServidor);
  const [hueco, setHueco] = useState(1);
  const [visita, setVisita] = useState<Visita | null>(null);
  const [linea, setLinea] = useState<string | null>(null);

  const t = ahora === 0 ? 0 : ORIGEN_MS + EDAD + (ahora % DIA);
  const hora = ahora === 0 ? 13 : (t % DIA) / 3600e3;
  const niveles = useMemo(() => (ahora === 0 ? [] : escena(SEMILLA, t)), [ahora, t]);
  const cambios: Cambio[] = useMemo(
    () => (ahora === 0 ? [] : diferencia(snapshot(escena(SEMILLA, t - HUECOS[hueco].ms)), niveles)),
    [ahora, t, hueco, niveles],
  );
  const prometidos = evidentes(cambios).length;

  const repintar = useCallback(() => {
    const canvas = canvasRef.current, caja = cajaRef.current;
    if (!canvas || !caja || ahora === 0) return;
    const ancho = Math.max(caja.clientWidth, ANCHO_MINIMO);
    const vista = vistaDe(canvas, ancho, window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    pintarEscena(ctx, vista, niveles, hora, calle);
    if (visita) marcas(ctx, vista, visita.encontrados, visita.descartados, calle.cajas);
  }, [ahora, niveles, hora, visita]);

  useEffect(() => {
    repintar();
    window.addEventListener("resize", repintar);
    return () => window.removeEventListener("resize", repintar);
  }, [repintar]);

  function alTocar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!visita || visita.cerrada) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const escala = r.width / LIENZO.ancho;
    const id = enganchar(zonas({ ancho: r.width, alto: r.height, escala, dpr: 1 }, calle.cajas),
      e.clientX - r.left, e.clientY - r.top);
    const { visita: siguiente, respuesta } = tocar(visita, id, cambios);
    setVisita(siguiente);
    if (respuesta.tipo === "acierto") {
      setLinea(`${NOMBRES[respuesta.id]}, cambió ${haceCuanto(antiguedadDe(SEMILLA, respuesta.id, t))}`);
    } else if (respuesta.tipo === "fallo") {
      setLinea(`${NOMBRES[respuesta.id]} sigue igual`);
    } else if (respuesta.tipo === "repetido") {
      setLinea("ahí ya has mirado");
    }
  }

  const jugando = visita !== null && !visita.cerrada;

  return (
    <TerminalShell
      title="reposo"
      prompt={{ host: "pacr.es", path: "~/juegos/reposo", command: "./reposo --muestra" }}
      backUrl="/lab"
    >
      <div className="rp">
        <p className="rp-intro">
          Una calle que cambia sola, vista desde la ventana de enfrente. Lo que puedes ver
          depende de cuánto llevabas sin mirar — esta es una calle de muestra, con otra
          semilla, para enseñar la mecánica sin esperar.
        </p>

        <div className="rp-caja" ref={cajaRef}>
          <canvas
            ref={canvasRef}
            className="rp-calle"
            style={{ cursor: jugando ? "crosshair" : "default" }}
            onPointerDown={alTocar}
          />
        </div>

        <div className="rp-mandos">
          <span className="rp-etiqueta">llevas fuera</span>
          {HUECOS.map((h, i) => (
            <button
              key={h.texto}
              className={`rp-opcion${i === hueco ? " es-activa" : ""}`}
              disabled={visita !== null}
              onClick={() => setHueco(i)}
            >
              {h.texto}
            </button>
          ))}
          {visita === null ? (
            <button className="rp-jugar" onClick={() => { setVisita(nuevaVisita()); setLinea(null); }}>
              juego
            </button>
          ) : (
            <button className="rp-jugar" onClick={() => { setVisita(null); setLinea(null); }}>
              otra vez
            </button>
          )}
        </div>

        <div className="rp-estado">
          {visita === null ? (
            // Pasear no dice cuántos cambios hay: se decide gastar el hueco a ciegas, porque un
            // contador visible al entrar convierte esto en un fichaje diario.
            <p className="rp-sec">Mira la calle. Cuando quieras, di «juego».</p>
          ) : (
            <>
              <p className="rp-cuenta">
                al menos <b>{prometidos}</b> {prometidos === 1 ? "cambio" : "cambios"} ·{" "}
                {visita.encontrados.length} {visita.encontrados.length === 1 ? "encontrado" : "encontrados"} ·{" "}
                {FALLOS - visita.fallos} {FALLOS - visita.fallos === 1 ? "fallo" : "fallos"} de margen
              </p>
              {linea && <p className="rp-linea">{linea}</p>}
              {visita.cerrada && (
                <p className="rp-sec">
                  Se acabó la visita. Lo encontrado se queda: {visita.encontrados.length} de al menos {prometidos}.
                </p>
              )}
            </>
          )}
        </div>

        <WhyFooter question="¿por qué un juego que premia no jugar?">
          <p>
            Casi todo lo que abro a diario está diseñado para que vuelva mañana: rachas, avisos,
            un número que sube. Quería lo contrario — algo cuyo valor creciera solo mientras no
            lo miro, y que no tuviera manera de pedirme que volviera antes.
          </p>
          <p>
            La calle es una función del tiempo, no un servidor simulando: nadie la mueve, se
            calcula el instante que haga falta. Por eso puede estar meses sin que nadie la mire y
            seguir habiendo pasado cosas. Aquí no hay nada que ganar; la de verdad guarda una
            crónica de lo que encontraste y cuánto llevabas fuera cada vez.
          </p>
        </WhyFooter>
      </div>

      <style jsx>{`
        .rp { display: flex; flex-direction: column; gap: 18px; }
        .rp-intro { margin: 0; color: var(--t-ink2); font-size: 14px; line-height: 1.6; max-width: 62ch; }
        /* El lienzo manda: si no cabe, la caja se desplaza en vez de encoger la calle. El
           width: 100% no es decorativo — en una columna flex el ancho automático lo decide lo
           más ancho que lleve dentro, así que un canvas de 1278 px ensancharía la caja, y la
           caja a la página entera: el desplazamiento se lo queda el documento y los mandos se
           salen por la izquierda en vez de quedarse quietos. */
        .rp-caja {
          width: 100%; min-width: 0; overflow-x: auto;
          border: 1px solid var(--t-ink4); border-radius: 3px;
        }
        .rp-calle { display: block; touch-action: manipulation; }
        .rp-mandos { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rp-etiqueta { color: var(--t-ink3); font-size: 13px; margin-right: 2px; }
        .rp-opcion, .rp-jugar {
          border: 1px solid var(--t-ink4); border-radius: 3px; padding: 5px 12px;
          color: var(--t-ink2); font-size: 13px; cursor: pointer; background: transparent;
        }
        .rp-opcion:hover:not(:disabled), .rp-jugar:hover { border-color: var(--t-accent); color: var(--t-accent); }
        .rp-opcion:disabled { opacity: 0.45; cursor: default; }
        .rp-opcion.es-activa { border-color: var(--t-accent); color: var(--t-accent); }
        .rp-jugar { margin-left: auto; color: var(--t-ink); }
        .rp-estado { min-height: 46px; }
        .rp-cuenta { margin: 0; font-size: 14px; color: var(--t-ink2); }
        .rp-cuenta b { color: var(--t-accent); }
        .rp-linea { margin: 4px 0 0; font-size: 14px; color: var(--t-ink); }
        .rp-sec { margin: 0; font-size: 14px; color: var(--t-ink3); }
      `}</style>
    </TerminalShell>
  );
}
