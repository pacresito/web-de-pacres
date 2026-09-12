"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { enRecorrido, pintarFila, posGen, type Design, type Fila, type Paleta, type Tinta } from "./render";
import { RASGOS, mediana, type Mundo, type Rasgo } from "./engine";

/**
 * La población de hoy, gen a gen, **pegada bajo el mundo y sin abrir nada**. Cada bicho vivo se
 * coloca sobre el eje de su gen y se apila donde estorba, así que el bulto es el reparto: una
 * población partida en dos son dos montones con un hueco, y eso no hay estadístico que lo diga
 * igual de rápido.
 *
 * **Los cuerpos son los del mundo**, pintados por el diseño de la partida. Un glifo propio se
 * leería mejor a este tamaño y sería otro animal: el que se mira aquí tiene que ser el que anda
 * por el lienzo, o la tira deja de explicar el mundo y pasa a explicarse a sí misma.
 *
 * **El eje es el recorrido medido del gen —el mismo `posGen` de la leyenda— y no las octavas
 * alrededor del fundador con las que `reparto.ts` cuenta la historia.** Se probó con las dos y no
 * es cuestión de gusto: la población real vive en tres décimas de octava, así que en una escala de
 * ÷4 a ×4 los treinta bichos caen en el 10% central y el enjambre sale una bola de la que no se
 * distingue ni un cuerpo. El recorrido medido está calibrado justo para lo contrario —que el
 * cuerpo de la población ocupe un tercio de la barra—, y con él el montón se abre y se ve. Queda
 * una sola vara para leyenda y tira, que era la condición.
 */

/**
 * Alto del plot de una fila, en px CSS: la que se mira y las que no. **Las cinco quietas son lo
 * que decide el tamaño del mundo**, no un detalle de composición: el lienzo se limita siempre por
 * el alto —el mundo es más ancho que alto y la página no se desplaza—, así que diez píxeles de
 * más por fila le quitan sesenta de alto y ochenta y cinco de ancho al mundo.
 */
const ALTO = 22, ALTO_ACTIVA = 72;
/** Diámetro del fundador, en px CSS. Lo demás cuelga de aquí — es la vara de la fila. */
const CUERPO = 15, CUERPO_QUIETA = 10;
/** Refresco de la tira, en ms. El mundo corre en su propio bucle y la población cambia en días,
 *  no en fotogramas: a 60 Hz esto re-renderizaría la página entera para no mover nada. */
const REFRESCO = 333;

const NOMBRE: Record<string, string> = { vision: "visión" };

/**
 * **La cifra va en el tanto por ciento del eje, no en octavas.** El eje es el recorrido medido del
 * gen, así que decir «−0,11 octavas» obliga a leer la fila con una vara distinta de la que se está
 * mirando; y «empuje 2,53» no dice nada sin saber qué es mucho. En el mismo tanto por ciento que la
 * leyenda —0% lo más bajo que llegó a existir, 100% lo más alto— se entiende sin saber nada, y la
 * distancia al fundador se lee en la misma unidad que la posición. El valor de verdad sigue en el
 * `title`, para quien quiera el número.
 */
const pct = (r: Rasgo, v: number) => Math.round(enRecorrido(r, v) * 100);

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });
const conSigno = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(x);

/** Los colores de la interfaz salen del CSS y no de una tabla: así el tema oscuro no es otra tabla. */
export function tintaDe(el: HTMLElement): Tinta {
  const c = getComputedStyle(el);
  const v = (n: string) => c.getPropertyValue(n).trim();
  return {
    papel: v("--t-paper"), linea: v("--t-rule"), linea2: v("--t-rule2"),
    ink: v("--t-ink"), ink3: v("--t-ink3"), ink4: v("--t-ink4"), acento: v("--t-accent2"),
  };
}

function FilaGen({ rasgo, activa, mundo, eva, paleta, diseno, latido, onClick }: {
  rasgo: Rasgo; activa: boolean; mundo: () => Mundo | null;
  eva: Record<string, number>; paleta: Paleta; diseno: Design; latido: number; onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pie, setPie] = useState<{ med: number; hoy: number; desde: number } | null>(null);
  const alto = activa ? ALTO_ACTIVA : ALTO;

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    const m = mundo();
    if (!cv || !ctx || !m) return;

    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = alto;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);

    const base = eva[rasgo];
    const cuerpos = m.bichos.map((b) => ({
      t: posGen(rasgo, b.g[rasgo]),
      c: { x: 0, y: 0, hx: 1, hy: 0, radio: b.radio, carga: b.carga, edad: (m.dia - b.nacido) / m.cfg.vida, g: b.g },
    }));
    const med = m.bichos.length ? mediana(m.bichos.map((b) => b.g[rasgo])) : null;

    const fila: Fila = {
      cuerpos,
      eva: posGen(rasgo, base),
      med: med === null ? null : posGen(rasgo, med),
      recorrido: null,
      escala: (activa ? CUERPO : CUERPO_QUIETA) / (2 * eva.talla),
      enjambre: activa,
    };
    pintarFila(ctx, W, H, dpr, diseno, paleta, tintaDe(cv), fila);
    setPie(med === null ? null : { med, hoy: pct(rasgo, med), desde: pct(rasgo, med) - pct(rasgo, base) });
  }, [rasgo, activa, alto, mundo, eva, paleta, diseno, latido]);

  return (
    <div className={`tr-fila${activa ? " on" : ""}`} onClick={onClick}>
      {/* Nombre y cifra en la misma línea: en dos, la etiqueta es más alta que el plot y son ella
          y no los bichos quienes deciden lo que mide el mundo. */}
      <div className="tr-et">
        <b>{NOMBRE[rasgo] ?? rasgo}</b>
        <span className="tr-cifra" title={pie ? `${NOMBRE[rasgo] ?? rasgo} ${num(pie.med)}` : undefined}>
          {pie ? <>{pie.hoy}% <i>{conSigno(pie.desde)}</i></> : "—"}
        </span>
      </div>
      <canvas ref={ref} style={{ width: "100%", height: alto, display: "block" }} />
    </div>
  );
}

export default function Tira({ mundo, eva, paleta, diseno }: {
  mundo: () => Mundo | null;
  eva: Record<string, number>;
  paleta: Paleta;
  diseno: Design;
}) {
  /**
   * Qué fila lleva el enjambre entero, o ninguna. **Se arranca sin ninguna y se cierra volviéndola a
   * pulsar**: la fila abierta cuesta cincuenta píxeles de alto, y en esta página el alto es del
   * mundo mientras nadie diga lo contrario.
   */
  const [activa, setActiva] = useState<Rasgo | null>(null);
  // El mundo vive en un ref y no re-renderiza nada, así que la tira se despierta sola. Un contador
  // y no los datos: lo que cambia cada 333 ms es todo el censo, y compararlo saldría más caro que
  // repintar seis filas.
  const [latido, setLatido] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLatido((n) => n + 1), REFRESCO);
    return () => window.clearInterval(id);
  }, []);

  const cambiar = useCallback((r: Rasgo) => () => setActiva((x) => (x === r ? null : r)), []);

  return (
    <div className="tr-panel">
      {RASGOS.map((r) => (
        <FilaGen
          key={r} rasgo={r} activa={r === activa} mundo={mundo} eva={eva}
          paleta={paleta} diseno={diseno} latido={latido} onClick={cambiar(r)}
        />
      ))}
      <div className="tr-eje">
        <span>lo más bajo<i> visto</i></span>
        <span className="tr-eva">el fundador</span>
        <span>lo más alto</span>
      </div>
    </div>
  );
}
