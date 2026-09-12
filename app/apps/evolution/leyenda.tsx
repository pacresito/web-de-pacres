"use client";

import { useEffect, useRef } from "react";
import { ESCALA, pintarMuestra, type Design, type Paleta } from "./render";
import { CONFIG, type Genoma, type Rasgo } from "./engine";

/**
 * La leyenda del mundo: qué gen es cada cosa que se ve, con qué genoma empezó la partida y dónde
 * está hoy la población de cada gen. **Los seis genes se ven**, que es por lo que son seis: uno
 * que solo existiera en la estadística no se podría poner aquí.
 *
 * **No hay máximo ni mínimo genético que enseñar**, y por eso esta leyenda no los enseña: la
 * mutación multiplica y divide sin techo, así que lo único que frena un gen es lo que cuesta. La
 * pregunta de verdad —«¿ya son lo más grandes que pueden?»— se contesta comparando la población
 * de ahora con el fundador del que salió, y eso es lo que pinta la barra de cada fila.
 *
 * **Aquí no se dice dónde está la población: eso lo dice la tira.** Las dos se abren a la vez y en
 * la misma pantalla, así que una barra con la mediana de cada gen repetía la cifra que la tira ya
 * tiene debajo, con la misma vara y a dos centímetros. La leyenda se queda con lo que la tira no
 * puede dar —qué es el gen, cómo se le ve en el cuerpo y qué paga por él— y se lee como lo que es:
 * el diccionario del bicho, no el estado de la partida.
 *
 * Todo lo dibujado sale de `render.ts` y de las constantes del motor. Una silueta pintada aquí
 * aparte empezaría a mentir el día que cambie la del mundo, sin que fallara nada.
 */

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

// La escala de la barra es la de `posGen`: el fundador en el centro y los dos extremos del
// recorrido medido cerca de los bordes. **Una sola geometría para los seis genes**, así que dos barras se
// comparan de un vistazo aunque midan cosas de unidades distintas — y el número que las acompaña
// deja de ser el dato: lo que se lee es dónde cae respecto a donde nació todo el mundo.

// Sin pies bajo las muestras: los tres bichos ya son la escala, y la cifra de la derecha dice en
// qué punto de ella está la población. Un rótulo que repite lo que ya se ve es ruido.

const CELDA = 54;                  // lado de cada muestra de cuerpo, en px CSS

/**
 * Los tres valores de una fila: los dos extremos de la **escala de pintado** y el fundador de esta
 * semilla en medio. Los del dibujo y no los del recorrido, porque pasados esos dos el cuerpo ya no
 * cambia: la muestra de la izquierda es literalmente el bicho más bajo que se va a ver y la de la
 * derecha, el más alto.
 */
const muestrasDe = (rasgo: string, eva: Record<string, number>): number[] =>
  [ESCALA[rasgo as Rasgo][0], eva[rasgo], ESCALA[rasgo as Rasgo][1]];

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

/**
 * Cuántos cuerpos enseña la rampa de la edad. **Cuatro, que es lo que cabe en el móvil**: la tira va
 * a lo ancho del panel y uno por día serían once celdas. No se pierde nada por el camino — la rampa
 * es continua, y lo que hay que ver es a dónde va el color, no cada escalón.
 */
const PASOS_EDAD = 4;
const DIAS_EDAD = Array.from({ length: PASOS_EDAD }, (_, i) => Math.round((i * CONFIG.vida) / (PASOS_EDAD - 1)));

/**
 * **La edad, que no es un gen** y es el canal más visible del bicho: el color del cuerpo son los
 * años y nada más. Va en tira aparte y **no de séptima fila** porque las seis prometen recorrido,
 * fundador y banda de población, y la edad no tiene ninguna de las tres — de fila diría que es un
 * gen, que es justo lo que no es.
 *
 * Los cuerpos son el fundador de la partida a distintas edades y los pinta el diseño como los del
 * mundo, así que la rampa que se ve aquí es la que se ve ahí.
 */
function Vejez({ eva, paleta, diseno }: { eva: Record<string, number>; paleta: Paleta; diseno: Design }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const g = eva as unknown as Genoma;
    // Un solo cuerpo a cuatro edades: la escala la manda él, y es la misma en las cuatro celdas.
    const escala = (CELDA / 2 - 3) / Math.max(...diseno.extension(g, eva.talla));
    DIAS_EDAD.forEach((dia, i) => {
      const cv = refs.current[i];
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      cv.width = cv.height = Math.round(CELDA * dpr);
      pintarMuestra(ctx, diseno, CELDA, CELDA, dpr, paleta,
        { x: 0, y: 0, hx: 1, hy: 0, carga: 0, g, radio: eva.talla, edad: dia / CONFIG.vida }, escala);
    });
  });

  return (
    <div className="lg-edad">
      <div className="lg-cab">
        <b>los años</b>
        <span className="lg-cifra">0 → {CONFIG.vida} días</span>
      </div>
      <p className="lg-que">
        <b>No es un gen:</b> los años no se heredan ni mutan, y son el único color del cuerpo. Se
        nace del tono del diseño y se va encaneciendo hasta morirse de viejo a los {CONFIG.vida}{" "}
        días, así que lo pálido de un bicho es lo que le queda. Un cuerpo apagado hacia el suelo es
        otra cosa: eso es hambre, y se arregla comiendo.
      </p>
      <div className="lg-tira">
        {DIAS_EDAD.map((dia, i) => (
          <div key={dia} className="lg-paso">
            <canvas ref={(el) => { refs.current[i] = el; }} style={{ width: CELDA, height: CELDA }} />
            <span>{dia}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Fila({ rasgo, eva, tabla, paleta, diseno }: {
  rasgo: string; eva: Record<string, number>;
  tabla: { paga: string; cobra: string }; paleta: Paleta; diseno: Design;
}) {
  return (
    <div className="lg-fila">
      <Muestras rasgo={rasgo} eva={eva} paleta={paleta} diseno={diseno} />
      <div className="lg-datos">
        <div className="lg-cab">
          <b>{rasgo === "vision" ? "visión" : rasgo}</b>
        </div>
        <p className="lg-que">{QUE_ES[rasgo]}</p>
        <div className="lg-nota">
          <span className="lg-paga">paga</span> {tabla.paga} · <span className="lg-cobra">cobra</span> {tabla.cobra}
        </div>
      </div>
    </div>
  );
}

export default function Leyenda({ rasgos, tabla, eva, paleta, diseno, cerrar }: {
  rasgos: readonly string[];
  tabla: Record<string, { paga: string; cobra: string }>;
  /** El fundador **de esta partida**, ya despeinado por la semilla: de ahí salió todo el mundo. */
  eva: Record<string, number>;
  paleta: Paleta;
  diseno: Design;
  cerrar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [cerrar]);


  return (
    <div className="lg-panel">
      <div className="lg-cabecera">
        <b>leyenda</b>
        <button className="ev-btn muted" onClick={cerrar}>cerrar</button>
      </div>
      <p className="lg-intro">
        Cada bicho lleva el genoma puesto. A la izquierda, cómo se ve el gen en los dos extremos del
        dibujo y en el fundador de esta semilla, que nace en medio. Pasados esos dos extremos el gen
        sigue subiendo y el bicho ya se pinta igual. <b>Dónde está hoy la población</b> lo cuenta la
        tira de abajo, gen a gen.
      </p>
      <p className="lg-intro lg-aviso">
        <b>No hay tope:</b> la mutación multiplica sin techo, así que ningún gen tiene máximo —
        solo lo que cuesta.
      </p>
      <div className="lg-filas">
        {rasgos.map((r) => (
          <Fila key={r} rasgo={r} eva={eva} tabla={tabla[r]} paleta={paleta} diseno={diseno} />
        ))}
      </div>
      <Vejez eva={eva} paleta={paleta} diseno={diseno} />
    </div>
  );
}
