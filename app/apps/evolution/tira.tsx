"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { enEje, pintarFila, posGen, type Design, type Fila, type Paleta, type Puesto, type Tinta } from "./render";
import { RASGOS, banda, type Mundo, type Rasgo } from "./engine";

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
 * **El eje son octavas alrededor del fundador, pero el medio ancho lo pone el recorrido medido —el
 * mismo `posGen` de la leyenda— y no un número redondo.** Se probó con ÷4 a ×4 y no es cuestión de
 * gusto: la población real vive en tres décimas de octava, así que ahí los treinta bichos caen en el
 * 10% central y el enjambre sale una bola de la que no se distingue ni un cuerpo. El recorrido está
 * medido justo para lo contrario —que el cuerpo de la población ocupe un tercio de la barra—, y con
 * él el montón se abre y se ve. Queda una sola vara para leyenda y tira, que era la condición.
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
/** Margen de acierto al pulsar un cuerpo de la tira, en px CSS. El mismo dedo que en el mundo, y
 *  por eso el mismo número — aquí los cuerpos son más pequeños, pero la mano no. */
const TACTO = 9;

const NOMBRE: Record<string, string> = { vision: "visión" };

/**
 * **La cifra va en el tanto por ciento del eje, no en octavas.** Decir «−0,11 octavas» obliga a leer
 * la fila con una vara distinta de la que se está mirando, y «empuje 2,53» no dice nada sin saber qué
 * es mucho. En el mismo tanto por ciento que la leyenda —50% el fundador, 0% y 100% lo más lejos que
 * se ha llegado a ir de él— se entiende sin saber nada. El valor de verdad sigue en el `title`, para
 * quien quiera el número.
 *
 * **Al lado va el reparto y no la distancia al fundador**, que con el fundador clavado en el 50 era
 * la misma cifra dos veces. El p10→p90 contesta lo otro —cuánto se parecen entre sí— y es lo único
 * que la fila cerrada no puede enseñar: en veintidós píxeles de curva, una población apretada y una
 * que ocupa medio eje salen casi iguales, y medir dice que el reparto va de seis puntos en la fiereza
 * a veinticuatro en el empuje, con la misma partida moviéndose entre dos y cincuenta y tres.
 *
 * Y va de intervalo, no de `±`: los genes mutan multiplicando y el reparto sale sesgado, así que un
 * «45% ±4» sobre una banda que va de 39 a 47 se inventa una simetría que no hay.
 *
 * **Del décimo al noveno decil, y no los extremos, porque los extremos ya están dibujados:** la fila
 * cerrada pinta justo esos dos bichos. En cifra serían el dibujo escrito otra vez, y lo que la cifra
 * tiene que aportar es lo que el dibujo no da — dónde está el bulto. Deja fuera al 19% de la
 * población, y ése es el precio.
 *
 * No es por estabilidad, que fue la corazonada y es falsa: de un día al siguiente los dos extremos
 * se mueven lo mismo que los dos deciles —2,0 puntos de mediana sobre 414.000 lecturas—. Lo que los
 * hunde son las colas: uno de cada cien días min–max sale del triple de ancho y llega a 73 puntos
 * de eje, y un rótulo que abarca tres cuartos de la barra no dice dónde vive nadie.
 *
 * Y el p01 con el p99 no son una tercera opción: con un censo de veintiuno, `banda` interpola
 * `round(0,01 × 20) = 0` y el p01 **es** el mínimo. Serían los extremos con un nombre que finge.
 */
const pct = (r: Rasgo, v: number) => Math.round(enEje(r, v) * 100);

const num = (x: number) => x.toLocaleString("es-ES", { maximumSignificantDigits: 3 });

/**
 * Censo por debajo del cual la fila enseña la mediana y nada más. **Siete, que es donde el primer y
 * el noveno decil dejan a alguien fuera por los dos lados**: con seis, el «p90» es el mayor de todos
 * y el reparto que se enseñaría son los extremos con otro nombre.
 */
const CENSO_REPARTO = 7;

/** Los colores de la interfaz salen del CSS y no de una tabla: así el tema oscuro no es otra tabla. */
export function tintaDe(el: HTMLElement): Tinta {
  const c = getComputedStyle(el);
  const v = (n: string) => c.getPropertyValue(n).trim();
  return {
    papel: v("--t-paper"), linea: v("--t-rule"), linea2: v("--t-rule2"),
    ink: v("--t-ink"), ink3: v("--t-ink3"), ink4: v("--t-ink4"), acento: v("--t-accent2"),
  };
}

function FilaGen({ rasgo, activa, mundo, eva, paleta, diseno, latido, sel, marcar, alternar }: {
  rasgo: Rasgo; activa: boolean; mundo: () => Mundo | null;
  eva: Record<string, number>; paleta: Paleta; diseno: Design; latido: number;
  sel: number; marcar: (id: number) => void; alternar: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  /** Dónde ha quedado cada cuerpo en el último pintado: es lo único que sabe a quién se pulsa. Va
   *  en un ref porque no se pinta con él — se lee al pulsar, y eso no es un render. */
  const puestosRef = useRef<Puesto[]>([]);
  /** La mediana de hoy y el reparto, en valores de gen: el tanto por ciento se saca al pintarlo. */
  const [pie, setPie] = useState<{ med: number; reparto: [number, number] | null } | null>(null);
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
      id: b.id,
      t: posGen(rasgo, b.g[rasgo]),
      c: { x: 0, y: 0, hx: 1, hy: 0, radio: b.radio, carga: b.carga, edad: (m.dia - b.nacido) / m.cfg.vida, g: b.g },
    }));
    const rep = banda(m.bichos.map((b) => b.g[rasgo]));

    const fila: Fila = {
      cuerpos,
      eva: posGen(rasgo, base),
      med: rep === null ? null : posGen(rasgo, rep.med),
      recorrido: null,
      escala: (activa ? CUERPO : CUERPO_QUIETA) / (2 * eva.talla),
      enjambre: activa,
      sel,
    };
    puestosRef.current = pintarFila(ctx, W, H, dpr, diseno, paleta, tintaDe(cv), fila);
    setPie(rep === null ? null : {
      med: rep.med,
      reparto: m.bichos.length >= CENSO_REPARTO ? [rep.lo, rep.hi] : null,
    });
  }, [rasgo, activa, alto, mundo, eva, paleta, diseno, latido, sel]);

  /**
   * Pulsar la fila abre o cierra el enjambre, **salvo que se haya pulsado un bicho**: ahí lo que se
   * pide es ese, y se marca en el mundo. Un solo manejador para las dos cosas porque son el mismo
   * gesto sobre el mismo sitio: dos —uno en el lienzo y otro en la fila— se disparan los dos, y la
   * fila se cerraría justo al elegir a alguien de ella.
   *
   * Solo en la fila abierta: la cerrada enseña dos muestras de treinta bichos, así que pulsar un
   * cuerpo ahí es pulsar al azar. Lo que se pide en una fila cerrada es abrirla.
   */
  const pulsar = (e: React.MouseEvent) => {
    const cv = ref.current;
    if (activa && cv) {
      const caja = cv.getBoundingClientRect();
      const x = e.clientX - caja.left, y = e.clientY - caja.top;
      // Gana el más cercano y no el primero: en el montón los cuerpos se solapan, y el primero del
      // orden es el de menos gen, no el que está debajo del dedo.
      let mejor: Puesto | null = null, cerca = 0;
      for (const q of puestosRef.current) {
        const dx = q.cx - x, dy = q.cy - y, d2 = dx * dx + dy * dy;
        const alcance = q.ancho / 2 + TACTO;
        if (d2 > alcance * alcance) continue;
        if (!mejor || d2 < cerca) { mejor = q; cerca = d2; }
      }
      if (mejor) { marcar(mejor.id); return; }
    }
    alternar();
  };

  return (
    <div className={`tr-fila${activa ? " on" : ""}`} onClick={pulsar}>
      {/* Nombre y cifra en la misma línea: en dos, la etiqueta es más alta que el plot y son ella
          y no los bichos quienes deciden lo que mide el mundo. */}
      <div className="tr-et">
        <b>{NOMBRE[rasgo] ?? rasgo}</b>
        <span
          className="tr-cifra"
          title={pie ? `${NOMBRE[rasgo] ?? rasgo} ${num(pie.med)}${pie.reparto ? ` · ${num(pie.reparto[0])}–${num(pie.reparto[1])}` : ""}` : undefined}
        >
          {pie ? <>{pct(rasgo, pie.med)}%{pie.reparto && <i> · {pct(rasgo, pie.reparto[0])}–{pct(rasgo, pie.reparto[1])}</i>}</> : "—"}
        </span>
      </div>
      <canvas ref={ref} style={{ width: "100%", height: alto, display: "block" }} />
    </div>
  );
}

export default function Tira({ mundo, eva, paleta, diseno, sel, marcar }: {
  mundo: () => Mundo | null;
  eva: Record<string, number>;
  paleta: Paleta;
  diseno: Design;
  /** El bicho marcado y cómo cambiarlo: los de aquí son los del mundo, así que se marca el mismo. */
  sel: number;
  marcar: (id: number) => void;
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
          paleta={paleta} diseno={diseno} latido={latido}
          sel={sel} marcar={marcar} alternar={cambiar(r)}
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
