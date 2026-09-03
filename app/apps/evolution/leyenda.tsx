"use client";

import { useEffect, useRef, useState } from "react";
import { sitio } from "./reparto";
import { extensionCuerpo, pintarAlcance, pintarMuestra, type Paleta } from "./render";

/**
 * La leyenda del mundo: qué gen es cada cosa que se ve, con qué genoma empezó la partida y dónde
 * está hoy la población de cada gen. **Los seis genes se ven**, que es por lo que son seis: uno
 * que solo existiera en la estadística no se podría poner aquí.
 *
 * **No hay máximo ni mínimo genético que enseñar**, y por eso esta leyenda no los enseña: la
 * mutación multiplica y divide sin techo, así que lo único que frena un gen es lo que cuesta. La
 * pregunta de verdad —«¿ya son lo más grandes que pueden?»— se contesta comparando la población
 * de ahora con el fundador del que salió, y eso es lo que pinta la barra de cada fila. Los tres
 * bichos de la izquierda son la mitad, el fundador y el doble: una vara de medir para el ojo, no
 * un límite del modelo.
 *
 * Todo lo dibujado sale de `render.ts` y de las constantes del motor. Una silueta pintada aquí
 * aparte empezaría a mentir el día que cambie la del mundo, sin que fallara nada.
 */

/** Lo que la leyenda necesita saber de un gen para pintar su fila. */
export type Banda = { min: number; lo: number; med: number; hi: number; max: number };
export type Perfil = Record<string, Banda>;

/** Qué genes se ven en el bicho y cómo. Los que no están aquí no tienen silueta. */
const MUESTRA: Record<string, "cuerpo" | "mundo"> = {
  talla: "cuerpo", empuje: "cuerpo", fiereza: "cuerpo", sociabilidad: "cuerpo", vision: "mundo",
};

/**
 * Dónde mirar cuando el cuerpo no lo dibuja. **Ningún gen es invisible** —los que solo existían en
 * la estadística se fueron del modelo—, así que aquí nunca pone "no se ve": pone dónde mirar.
 */
const SIN_CUERPO: Record<string, string> = {
  retorno: "se ve al volver",
};

/** Qué es cada gen, en una frase y sin fórmulas — la fórmula ya está en `TABLA`, debajo. */
const QUE_ES: Record<string, string> = {
  empuje: "La fuerza que le mete: cuanto más, más rápido va y más energía quema. Y con comida encima, menos corre.",
  talla: "Lo grande que es. El grande puede comerse al pequeño, pero gasta más, gira peor, se le ve desde más lejos y sus hijos cuestan más.",
  vision: "Hasta dónde ve. No mira hacia delante: ve en redondo, y lo grande lo detecta antes que lo pequeño.",
  sociabilidad: "Si busca compañía o la esquiva. Positiva, tira hacia el grupo; negativa, se aparta — que es como se huye del que te puede comer.",
  fiereza: "Las ganas de cazar: cuánto persigue a quien es bastante menor que él. De los suyos no se come.",
  retorno: "Las ganas de volver a casa en cuanto lleva comida encima. Solo lo que llega a casa se come y se convierte en hijos — pero volver pronto es dejar de buscar.",
};

// La escala de la barra —de ÷4 a ×4 del fundador, y lineal en el gen con signo— es la de
// `reparto.ts`, que es también la del panel: con una copia aquí el mismo gen se leería con dos
// varas de medir el día que una de las dos se moviera. Cuánta ventana hace falta lo mide
// `reparto.medir.ts`, y no es de gusto: es lo que se aleja el gen que más se va.
const MUESTRAS = [0.5, 1, 2];      // la mitad, el fundador y el doble
const SOC_MUESTRAS = [-0.6, 0, 0.6];

const CELDA = 54;                  // lado de cada muestra de cuerpo, en px CSS
const MUNDO_W = 170, MUNDO_H = 118;

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });

/**
 * Los genes con signo se leen alrededor del cero, así que van con decimales fijos y menos de
 * verdad. El cero no lleva signo: un fundador que sale en `−0,00` parece negativo y no lo es.
 */
function conSigno(x: number): string {
  const t = Math.abs(x).toFixed(2).replace(".", ",");
  return t === "0,00" ? t : (x < 0 ? "−" : "+") + t;
}

/** Los tres valores que se dibujan en una fila: la mitad, el fundador y el doble. */
const muestrasDe = (rasgo: string, eva: Record<string, number>): number[] =>
  rasgo === "sociabilidad" ? SOC_MUESTRAS : MUESTRAS.map((k) => eva[rasgo] * k);

const pct = (t: number) => `${(t * 100).toFixed(2)}%`;

function Muestras({ rasgo, eva, hoy, mundo, paleta }: {
  rasgo: string; eva: Record<string, number>; hoy: Banda | null;
  mundo: { ancho: number; alto: number }; paleta: Paleta;
}) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const modo = MUESTRA[rasgo];
  const signo = rasgo === "sociabilidad";
  const valores = muestrasDe(rasgo, eva);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    if (modo === "mundo") {
      const cv = refs.current[0];
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      cv.width = Math.round(MUNDO_W * dpr); cv.height = Math.round(MUNDO_H * dpr);
      pintarAlcance(ctx, MUNDO_W, MUNDO_H, dpr, paleta, mundo.ancho, mundo.alto, eva.talla,
        eva.vision, hoy ? hoy.med : null);
      return;
    }
    // Una sola escala para las tres, la que hace caber a la que más sobresale.
    const cuerpos = valores.map((v) => ({
      g: {
        fiereza: rasgo === "fiereza" ? v : eva.fiereza,
        sociabilidad: signo ? v : eva.sociabilidad,
        empuje: rasgo === "empuje" ? v : eva.empuje,
      },
      radio: rasgo === "talla" ? v : eva.talla,
    }));
    const alcance = Math.max(...cuerpos.map((c) => extensionCuerpo(c.g, c.radio)));
    const escala = (CELDA / 2 - 3) / alcance;
    cuerpos.forEach((c, i) => {
      const cv = refs.current[i];
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx) return;
      cv.width = cv.height = Math.round(CELDA * dpr);
      pintarMuestra(ctx, CELDA, CELDA, dpr, paleta, c.g, c.radio, escala);
    });
  });

  if (modo === "mundo") {
    return (
      <div className="lg-muestras">
        <canvas ref={(el) => { refs.current[0] = el; }} style={{ width: MUNDO_W, height: MUNDO_H }} />
        <div className="lg-pies" style={{ width: MUNDO_W }}>
          <span>- - - fundador</span><span>hoy ──</span>
        </div>
      </div>
    );
  }
  if (!modo) return <div className="lg-muestras lg-vacio">{SIN_CUERPO[rasgo] ?? ""}</div>;

  return (
    <div className="lg-muestras">
      <div className="lg-celdas">
        {valores.map((v, i) => (
          <canvas key={i} ref={(el) => { refs.current[i] = el; }} style={{ width: CELDA, height: CELDA }} />
        ))}
      </div>
      <div className="lg-pies">
        {(signo ? ["−0,6", "0", "+0,6"] : ["÷2", "fundador", "×2"]).map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}

function Fila({ rasgo, eva, hoy, tabla, mundo, paleta }: {
  rasgo: string; eva: Record<string, number>; hoy: Banda | null;
  tabla: { paga: string; cobra: string }; mundo: { ancho: number; alto: number }; paleta: Paleta;
}) {
  const signo = rasgo === "sociabilidad";
  const base = eva[rasgo];
  const donde = (x: number) => sitio(x, base, signo);
  const cifra = signo ? conSigno : num;
  // Cuánto se ha movido la población de donde salió: ×N si el gen multiplica, la diferencia si
  // lleva signo. La razón no vale para un gen que cruza el cero — ahí se dispara sin querer decir nada.
  const viaje = !hoy ? "—"
    : signo ? conSigno(hoy.med - base)
    : hoy.med >= base ? `×${num(hoy.med / base)}` : `÷${num(base / hoy.med)}`;

  return (
    <div className="lg-fila">
      <Muestras rasgo={rasgo} eva={eva} hoy={hoy} mundo={mundo} paleta={paleta} />
      <div className="lg-datos">
        <div className="lg-cab">
          <b>{rasgo === "vision" ? "visión" : rasgo}</b>
          <span className="lg-cifra">
            {cifra(base)} <span className="lg-flecha">→</span> {hoy ? cifra(hoy.med) : "—"}
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

export default function Leyenda({ rasgos, tabla, eva, ancho, alto, perfil, paleta, cerrar }: {
  rasgos: readonly string[];
  tabla: Record<string, { paga: string; cobra: string }>;
  /** El fundador **de esta partida**, ya despeinado por la semilla: de ahí salió todo el mundo. */
  eva: Record<string, number>;
  ancho: number; alto: number;
  /** Se consulta con reloj propio: el mundo corre en su `requestAnimationFrame` y no re-renderiza React. */
  perfil: () => Perfil | null;
  paleta: Paleta;
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

  const mundo = { ancho, alto };

  return (
    <div className="lg-panel">
      <div className="lg-cabecera">
        <b>leyenda</b>
        <button className="ev-btn muted" onClick={cerrar}>cerrar</button>
      </div>
      <p className="lg-intro">
        Cada bicho lleva el genoma puesto. A la izquierda, cómo se ve el gen a la mitad, en el
        fundador de esta semilla y al doble; a la derecha, la barra de ÷4 a ×4 del fundador con
        dónde está hoy la población.
      </p>
      <p className="lg-intro lg-aviso">
        <b>No hay tope:</b> la mutación multiplica sin techo, así que ningún gen tiene máximo —
        solo lo que cuesta.
      </p>
      <div className="lg-filas">
        {rasgos.map((r) => (
          <Fila key={r} rasgo={r} eva={eva} hoy={hoy?.[r] ?? null} tabla={tabla[r]} mundo={mundo} paleta={paleta} />
        ))}
      </div>
    </div>
  );
}
