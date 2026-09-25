"use client";

import Asa from "./asa";
import { useEffect, useRef } from "react";
import { pintarMuestra } from "./render";
import { ESCALA, type Design, type Paleta } from "./designs";
import { CONFIG, RASGOS, TABLA, nombreDe, type Genoma, type Rasgo } from "./engine";
import { usePanel } from "./panel";

/**
 * El diccionario del bicho: qué es cada gen, cómo se ve y qué paga. Dónde está la población lo
 * dice la tira. Todo lo dibujado lo pinta el diseño de la partida, como en el mundo.
 */

const QUE_ES: Record<Rasgo, string> = {
  empuje: "La fuerza que le mete: cuanto más, más rápido va y más energía quema. Y con comida encima, menos corre.",
  talla: "Lo grande que es. El grande puede comerse al pequeño, pero gasta más, gira peor, se le ve desde más lejos y sus hijos cuestan más.",
  vision: "Hasta dónde ve. No mira hacia delante: ve en redondo, y lo grande lo detecta antes que lo pequeño.",
  sociabilidad: "Si busca compañía o la esquiva. Positiva, tira hacia el grupo; negativa, se aparta — que es como se huye del que te puede comer.",
  fiereza: "Las ganas de cazar: cuánto persigue a quien es bastante menor que él. De los suyos no se come.",
  retorno: "Las ganas de volver a casa en cuanto lleva comida encima. Solo lo que llega a casa se come y se convierte en hijos — pero volver pronto es dejar de buscar.",
};

const CELDA = 54;   // lado de cada muestra, en px CSS

/** Tres bichos por gen: los extremos de la escala de pintado y el fundador en medio. */
function Muestras({ rasgo, eva, paleta, diseno }: { rasgo: Rasgo; eva: Genoma; paleta: Paleta; diseno: Design }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const valores = [ESCALA[rasgo][0], eva[rasgo], ESCALA[rasgo][1]];

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const cuerpos = valores.map((v) => ({
      x: 0, y: 0, hx: 1, hy: 0, carga: 0,
      g: { ...eva, [rasgo]: v },
      radio: rasgo === "talla" ? v : eva.talla,
    }));
    // Una sola escala para las tres, o la fila de la talla no enseñaría tallas.
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
    <div className="lg-celdas">
      {valores.map((v, i) => (
        <canvas key={i} ref={(el) => { refs.current[i] = el; }} style={{ width: CELDA, height: CELDA }} />
      ))}
    </div>
  );
}

/** Cuerpos de la rampa de la edad: los que caben en el móvil. */
const PASOS_EDAD = 4;
const DIAS_EDAD = Array.from({ length: PASOS_EDAD }, (_, i) => Math.round((i * CONFIG.vida) / (PASOS_EDAD - 1)));

/** La edad, que no es un gen: el fundador a varias edades, en tira aparte. */
function Vejez({ eva, paleta, diseno }: { eva: Genoma; paleta: Paleta; diseno: Design }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const escala = (CELDA / 2 - 3) / Math.max(...diseno.extension(eva, eva.talla));
    DIAS_EDAD.forEach((dia, i) => {
      const cv = refs.current[i];
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      cv.width = cv.height = Math.round(CELDA * dpr);
      pintarMuestra(ctx, diseno, CELDA, CELDA, dpr, paleta,
        { x: 0, y: 0, hx: 1, hy: 0, carga: 0, g: eva, radio: eva.talla, edad: dia / CONFIG.vida }, escala);
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

export default function Leyenda({ eva, paleta, diseno, cerrar }: {
  eva: Genoma;
  paleta: Paleta;
  diseno: Design;
  cerrar: () => void;
}) {
  usePanel(cerrar);

  return (
    <div className="ev-panel lg-panel">
      <style>{`
        .lg-panel { border: 1px solid var(--border); border-radius: 6px; padding: 0.9rem 1rem 1.2rem; }
        .lg-filas { margin-top: 0.5rem; }
        .lg-fila { display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.7rem 0; border-top: 1px solid var(--border); }
        .lg-celdas { flex: 0 0 auto; display: flex; gap: 4px; }
        .lg-celdas canvas, .lg-paso canvas { border-radius: 3px; display: block; }
        .lg-edad { padding: 0.8rem 0 0.2rem; border-top: 1px solid var(--border); }
        .lg-tira { display: flex; gap: 4px; margin-top: 0.5rem; }
        .lg-paso { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .lg-paso span { font-size: 0.58rem; color: var(--t-ink3); font-variant-numeric: tabular-nums; }
        .lg-datos { flex: 1 1 auto; min-width: 0; }
        .lg-cab { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; font-size: 0.72rem; }
        .lg-cab b { color: var(--t-ink); letter-spacing: 0.04em; }
        .lg-cifra { color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .lg-que { font-size: 0.68rem; line-height: 1.5; color: var(--t-ink); margin: 0.2rem 0 0; }
        .lg-nota { font-size: 0.62rem; line-height: 1.5; color: var(--t-ink3); margin-top: 0.2rem; }
        .lg-nota span { color: var(--t-ink2); }
        @media (max-width: 620px) {
          .lg-fila { flex-direction: column; gap: 0.4rem; }
          .lg-datos { width: 100%; }
        }
      `}</style>
      <Asa cerrar={cerrar} />
      <div className="ev-cabecera">
        <b>leyenda</b>
        <button className="ev-btn muted ev-cerrar" onClick={cerrar}>cerrar</button>
      </div>
      <div className="lg-filas">
        {RASGOS.map((r) => (
          <div key={r} className="lg-fila">
            <Muestras rasgo={r} eva={eva} paleta={paleta} diseno={diseno} />
            <div className="lg-datos">
              <div className="lg-cab"><b>{nombreDe(r)}</b></div>
              <p className="lg-que">{QUE_ES[r]}</p>
              <div className="lg-nota">
                <span>paga</span> {TABLA[r].paga} · <span>cobra</span> {TABLA[r].cobra}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Vejez eva={eva} paleta={paleta} diseno={diseno} />
    </div>
  );
}
