"use client";

import { useEffect, useRef, useState } from "react";
import { pintarEstrato, posGen, type Estrato, type Tinta } from "./render";
import { RASGOS, type Rasgo } from "./engine";
import { BINS, columnas, type Columna, type Historia } from "./reparto";
import { tintaDe } from "./tira";

/**
 * **Toda la partida de una vez**: por cada gen, el tiempo a lo ancho, la escala del gen a lo alto y
 * la población como tinta. Es lo que la tira no puede contestar —«¿cuándo pasó?»—, y por eso son
 * dos piezas y no una: la tira está siempre y esto se abre cuando se pregunta por el pasado.
 *
 * **La historia entera, nunca una ventana móvil.** Una partida de trescientos días se ve entera y
 * más apretada, no recortada por el final: el pasado es justo lo que se ha venido a mirar. Quien
 * comprime es `columnas`, que junta días sumando histogramas —exacto— y no promediando formas.
 *
 * Se abre encima del lienzo, como la leyenda, y por la misma razón: el alto de la página ya se lo
 * reparten el mundo y la tira, y seis franjas legibles no caben en lo que sobra.
 */

/** Alto de la franja de un gen, en px CSS. Menos y la mediana no se distingue de la banda. */
const ALTO = 64, ALTO_MOVIL = 46;
/** Refresco, en ms. La historia crece un día cada diecisiete segundos a ×1 — no hay prisa. */
const REFRESCO = 700;

const NOMBRE: Record<string, string> = { vision: "visión" };

/**
 * Una franja. **Las columnas le llegan hechas y no las pide**: `columnas` comprime los seis genes
 * de una vez, así que calcularlas aquí sería repetir seis veces el mismo recorrido de la partida
 * entera —y con el panel abierto eso se nota en el mundo, que comparte el presupuesto del
 * fotograma con esto.
 */
function Franja({ rasgo, cs, eva }: {
  rasgo: Rasgo; cs: Columna[]; eva: Record<string, number>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    if (cs.length === 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      return;
    }

    const i = RASGOS.indexOf(rasgo);
    const e: Estrato = {
      columnas: cs.map((c) => c.densidad.slice(i * BINS, (i + 1) * BINS)),
      medianas: cs.map((c) => posGen(rasgo, c.med[i])),
      hoy: cs[cs.length - 1].densidad.slice(i * BINS, (i + 1) * BINS),
      eva: posGen(rasgo, eva[rasgo]),
    };
    pintarEstrato(ctx, W, H, dpr, tintaDe(cv) as Tinta, e);
  }, [rasgo, cs, eva]);

  return (
    <div className="es-fila">
      <div className="es-et"><b>{NOMBRE[rasgo] ?? rasgo}</b></div>
      <canvas ref={ref} className="es-lienzo" />
      {cs.length === 0 && <span className="es-nada">aún no hay partida que contar</span>}
    </div>
  );
}

export default function Estratos({ historia, eva, dia, cerrar }: {
  historia: () => Historia;
  eva: Record<string, number>;
  dia: () => number;
  cerrar: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [cs, setCs] = useState<Columna[]>([]);
  const [hoy, setHoy] = useState(0);

  useEffect(() => {
    // Una columna por píxel de mapa y no más: comprimir a menos tira forma que sí cabría, y a más
    // se pintaría un detalle que ningún píxel puede enseñar. El ancho es el mismo en las seis.
    const leer = () => {
      const cv = caja.current?.querySelector("canvas");
      const ancho = Math.max(1, Math.round(cv?.clientWidth ?? 600));
      setCs(columnas(historia(), ancho));
      setHoy(dia());
    };
    leer();
    const id = window.setInterval(leer, REFRESCO);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => { window.clearInterval(id); window.removeEventListener("keydown", esc); };
  }, [historia, dia, cerrar]);

  return (
    <div ref={caja} className="es-panel" style={{ "--es-alto": `${ALTO}px`, "--es-alto-movil": `${ALTO_MOVIL}px` } as React.CSSProperties}>
      <div className="es-cabecera">
        <b>toda la partida</b>
        <span className="es-rango">día 1 → {hoy}</span>
        <button className="ev-btn muted" onClick={cerrar}>cerrar</button>
      </div>
      {RASGOS.map((r) => (
        <Franja key={r} rasgo={r} cs={cs} eva={eva} />
      ))}
      {/* Cuatro marcas y no dos: «día 1 → hoy» dice cuánto abarca, pero para contestar «¿cuándo
          pasó?» hace falta poder señalar el sitio. Se reparten sobre el ancho del mapa, que acaba
          donde empieza el perfil. */}
      <div className="es-pie">
        <div className="es-marcas">
          {[0, 1, 2, 3].map((k) => (
            <span key={k}>{k === 0 ? "día 1" : `día ${Math.round((hoy * k) / 3)}`}</span>
          ))}
        </div>
        <span className="es-perfil">perfil</span>
      </div>
    </div>
  );
}
