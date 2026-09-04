"use client";

import { useEffect, useRef, useState } from "react";
import { VENTANA, enVentana, pintarMuestra, posGen, type Design, type Paleta } from "./render";
import type { Genoma, Rasgo } from "./engine";

/**
 * La leyenda del mundo: qué gen es cada cosa que se ve, con qué genoma empezó la partida y dónde
 * está hoy la población de cada gen. **Los seis genes se ven**, que es por lo que son seis: uno
 * que solo existiera en la estadística no se podría poner aquí.
 *
 * **No hay máximo ni mínimo genético que enseñar**, y por eso esta leyenda no los enseña: la
 * mutación multiplica y divide sin techo, así que lo único que frena un gen es lo que cuesta. La
 * pregunta de verdad —«¿ya son lo más grandes que pueden?»— se contesta comparando la población
 * de ahora con el fundador del que salió, y eso es lo que pinta la barra de cada fila. Los tres
 * bichos de la izquierda son **el p01, el fundador y el p99** de una simulación de veinte mundos:
 * los dos extremos que llega a dar la población, no un límite del modelo. Por eso el de la
 * izquierda y el de la derecha son bichos que existen y que se pueden encontrar en el mundo.
 *
 * Todo lo dibujado sale de `render.ts` y de las constantes del motor. Una silueta pintada aquí
 * aparte empezaría a mentir el día que cambie la del mundo, sin que fallara nada.
 */

/** Lo que la leyenda necesita saber de un gen para pintar su fila. */
export type Banda = { min: number; lo: number; med: number; hi: number; max: number };
export type Perfil = Record<string, Banda>;

/** **Los seis genes se ven en el cuerpo**, así que los seis enseñan bichos y ninguno es un caso aparte. */

/** Qué es cada gen, en una frase y sin fórmulas — la fórmula ya está en `TABLA`, debajo. */
const QUE_ES: Record<string, string> = {
  empuje: "La fuerza que le mete: cuanto más, más rápido va y más energía quema. Y con comida encima, menos corre.",
  talla: "Lo grande que es. El grande puede comerse al pequeño, pero gasta más, gira peor, se le ve desde más lejos y sus hijos cuestan más.",
  vision: "Hasta dónde ve. No mira hacia delante: ve en redondo, y lo grande lo detecta antes que lo pequeño.",
  sociabilidad: "Si busca compañía o la esquiva. Positiva, tira hacia el grupo; negativa, se aparta — que es como se huye del que te puede comer.",
  fiereza: "Las ganas de cazar: cuánto persigue a quien es bastante menor que él. De los suyos no se come.",
  retorno: "Las ganas de volver a casa en cuanto lleva comida encima. Solo lo que llega a casa se come y se convierte en hijos — pero volver pronto es dejar de buscar.",
};

// La escala de la barra es la de `posGen`: el fundador en el centro y los dos extremos de la
// ventana cerca de los bordes. **Una sola geometría para los seis genes**, así que dos barras se
// comparan de un vistazo aunque midan cosas de unidades distintas — y el número que las acompaña
// deja de ser el dato: lo que se lee es dónde cae respecto a donde nació todo el mundo.

// Sin pies bajo las muestras: los tres bichos ya son la escala, y la cifra de la derecha dice en
// qué punto de ella está la población. Un rótulo que repite lo que ya se ve es ruido.

const CELDA = 54;                  // lado de cada muestra de cuerpo, en px CSS

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });

/**
 * Los genes con signo se leen alrededor del cero, así que van con decimales fijos y menos de
 * verdad. El cero no lleva signo: un fundador que sale en `−0,00` parece negativo y no lo es.
 */
function conSigno(x: number): string {
  const t = Math.abs(x).toFixed(2).replace(".", ",");
  return t === "0,00" ? t : (x < 0 ? "−" : "+") + t;
}

/**
 * Los tres valores de una fila: los dos extremos de la ventana del gen y el fundador de esta
 * semilla en medio. La ventana es la misma que usa el cuerpo para dibujarse, así que la muestra de
 * la izquierda es literalmente el bicho más bajo que se va a ver y la de la derecha, el más alto.
 */
const muestrasDe = (rasgo: string, eva: Record<string, number>): number[] =>
  [VENTANA[rasgo as Rasgo][0], eva[rasgo], VENTANA[rasgo as Rasgo][1]];

const pct = (t: number) => `${(t * 100).toFixed(2)}%`;

function Muestras({ rasgo, eva, paleta, diseno }: {
  rasgo: string; eva: Record<string, number>; paleta: Paleta; diseno: Design;
}) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const valores = muestrasDe(rasgo, eva);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    // Una sola escala para las tres, la que hace caber a la que más sobresale.
    const cuerpos = valores.map((v) => ({
      x: 0, y: 0, hx: 1, hy: 0, carga: 0,
      g: { ...eva, [rasgo]: v } as unknown as Genoma,
      radio: rasgo === "talla" ? v : eva.talla,
    }));
    // La celda es cuadrada, así que la escala la manda la dimensión que más sobresalga de las dos.
    const alcance = Math.max(...cuerpos.flatMap((c) => diseno.extension(c.g, c.radio)));
    const escala = (CELDA / 2 - 3) / alcance;
    cuerpos.forEach((c, i) => {
      const cv = refs.current[i];
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      cv.width = cv.height = Math.round(CELDA * dpr);
      pintarMuestra(ctx, diseno, CELDA, CELDA, dpr, paleta, c, escala);
    });
  });

  return (
    <div className="lg-muestras">
      <div className="lg-celdas">
        {valores.map((v, i) => (
          <canvas key={i} ref={(el) => { refs.current[i] = el; }} style={{ width: CELDA, height: CELDA }} />
        ))}
      </div>
    </div>
  );
}

function Fila({ rasgo, eva, hoy, tabla, paleta, diseno }: {
  rasgo: string; eva: Record<string, number>; hoy: Banda | null;
  tabla: { paga: string; cobra: string }; paleta: Paleta; diseno: Design;
}) {
  const signo = rasgo === "sociabilidad";
  const base = eva[rasgo];
  const donde = (x: number) => posGen(rasgo as Rasgo, x);
  const cifra = signo ? conSigno : num;
  // **El gen se lee en su ventana, no en sus unidades.** «Empuje 2,14» no dice nada sin saber qué
  // es mucho; «empezó en el 50% y va por el 63%» se entiende sin saber nada. El 0% es el p01 y el
  // 100% el p99, así que el fundador sale siempre cerca de la mitad y lo que se lee es el viaje.
  // El valor de verdad sigue estando, en el `title`: para el que quiera el número.
  const donde100 = (x: number) => `${Math.round(enVentana(rasgo as Rasgo, x) * 100)}%`;
  // Cuánto se ha movido la población de donde salió: ×N si el gen multiplica, la diferencia si
  // lleva signo. La razón no vale para un gen que cruza el cero — ahí se dispara sin querer decir nada.
  const viaje = !hoy ? "—"
    : signo ? conSigno(hoy.med - base)
    : hoy.med >= base ? `×${num(hoy.med / base)}` : `÷${num(base / hoy.med)}`;

  return (
    <div className="lg-fila">
      <Muestras rasgo={rasgo} eva={eva} paleta={paleta} diseno={diseno} />
      <div className="lg-datos">
        <div className="lg-cab">
          <b>{rasgo === "vision" ? "visión" : rasgo}</b>
          <span className="lg-cifra" title={`${cifra(base)} → ${hoy ? cifra(hoy.med) : "—"}`}>
            {donde100(base)} <span className="lg-flecha">→</span> {hoy ? donde100(hoy.med) : "—"}
            <b className="lg-viaje">{viaje}</b>
          </span>
        </div>
        <p className="lg-que">{QUE_ES[rasgo]}</p>
        <div className="lg-eje">
          {/* Las dos muescas caen justo donde están los dos bichos de los extremos: así la barra y
              las siluetas hablan de lo mismo y no de dos escalas distintas. */}
          {muestrasDe(rasgo, eva).map((v, i) => i !== 1 && (
            <i key={i} className="lg-tick" style={{ left: pct(donde(v)) }} />
          ))}
          <i className="lg-eva" style={{ left: pct(donde(base)) }} />
          {hoy && <>
            <i className="lg-bigote" style={{ left: pct(donde(hoy.min)), width: pct(donde(hoy.max) - donde(hoy.min)) }} />
            <i className="lg-tramo" style={{ left: pct(donde(hoy.lo)), width: pct(donde(hoy.hi) - donde(hoy.lo)) }} />
            <i className="lg-med" style={{ left: pct(donde(hoy.med)) }} />
          </>}
        </div>
        <div className="lg-nota">
          <span className="lg-paga">paga</span> {tabla.paga} · <span className="lg-cobra">cobra</span> {tabla.cobra}
        </div>
      </div>
    </div>
  );
}

export default function Leyenda({ rasgos, tabla, eva, perfil, paleta, diseno, cerrar }: {
  rasgos: readonly string[];
  tabla: Record<string, { paga: string; cobra: string }>;
  /** El fundador **de esta partida**, ya despeinado por la semilla: de ahí salió todo el mundo. */
  eva: Record<string, number>;
  /** Se consulta con reloj propio: el mundo corre en su `requestAnimationFrame` y no re-renderiza React. */
  perfil: () => Perfil | null;
  paleta: Paleta;
  diseno: Design;
  cerrar: () => void;
}) {
  const [hoy, setHoy] = useState<Perfil | null>(null);

  useEffect(() => {
    const leer = () => setHoy(perfil());
    leer();
    const id = window.setInterval(leer, 400);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => { window.clearInterval(id); window.removeEventListener("keydown", esc); };
  }, [perfil, cerrar]);


  return (
    <div className="lg-panel">
      <div className="lg-cabecera">
        <b>leyenda</b>
        <button className="ev-btn muted" onClick={cerrar}>cerrar</button>
      </div>
      <p className="lg-intro">
        Cada bicho lleva el genoma puesto. A la izquierda, cómo se ve el gen en el 1% más bajo que
        llegó a existir, en el fundador de esta semilla y en el 1% más alto. La cifra es en qué punto
        de ese recorrido está: el fundador nace cerca del 50% y la barra enseña a dónde ha ido su
        descendencia.
      </p>
      <p className="lg-intro lg-aviso">
        <b>No hay tope:</b> la mutación multiplica sin techo, así que ningún gen tiene máximo —
        solo lo que cuesta.
      </p>
      <div className="lg-filas">
        {rasgos.map((r) => (
          <Fila key={r} rasgo={r} eva={eva} hoy={hoy?.[r] ?? null} tabla={tabla[r]} paleta={paleta} diseno={diseno} />
        ))}
      </div>
    </div>
  );
}
