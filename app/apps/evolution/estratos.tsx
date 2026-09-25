"use client";

import Asa from "./asa";
import { useCallback, useEffect, useRef, useState } from "react";
import { pintarEstrato, type Estrato } from "./render";
import { posGen } from "./designs";
import { RASGOS, nombreDe, type Genoma, type Rasgo } from "./engine";
import { BINS, columnas, type Columna, type Historia } from "./reparto";
import { tintaDe } from "./tira";
import { usePanel } from "./panel";

/**
 * Toda la partida de una vez: por cada gen, el tiempo a lo ancho, la escala a lo alto y la
 * población como tinta. Contesta «¿cuándo pasó?», que la tira no puede.
 */

/** Alto de la franja de un gen, en px CSS. */
const ALTO = 64, ALTO_MOVIL = 46;

/** Una franja. Las columnas le llegan hechas: `columnas` comprime los seis genes de una vez. */
function Franja({ rasgo, cs, eva }: { rasgo: Rasgo; cs: Columna[]; eva: Genoma }) {
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
    pintarEstrato(ctx, W, H, dpr, tintaDe(cv), e);
  }, [rasgo, cs, eva]);

  return (
    <div className="es-fila">
      <div className="es-et"><b>{nombreDe(rasgo)}</b></div>
      <canvas ref={ref} className="es-lienzo" />
      {cs.length === 0 && <span className="es-nada">aún no hay partida que contar</span>}
    </div>
  );
}

export default function Estratos({ historia, eva, dia, cerrar }: {
  historia: () => Historia;
  eva: Genoma;
  dia: () => number;
  cerrar: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [cs, setCs] = useState<Columna[]>([]);
  const [hoy, setHoy] = useState(0);

  // Una columna por píxel de mapa.
  const leer = useCallback(() => {
    const cv = caja.current?.querySelector("canvas");
    const ancho = Math.max(1, Math.round(cv?.clientWidth ?? 600));
    setCs(columnas(historia(), ancho));
    setHoy(dia());
  }, [historia, dia]);
  usePanel(cerrar, leer);

  return (
    <div ref={caja} className="ev-panel es-panel">
      <style>{`
        .es-panel { padding: 0.65rem 1rem 0.6rem; }
        .es-cabecera { padding-bottom: 0.35rem; }
        .es-fila {
          display: grid; grid-template-columns: 96px 1fr; gap: 0.6rem; align-items: center;
          border-top: 1px solid var(--t-rule2); padding: 3px 0; position: relative;
        }
        .es-et b { font-size: 0.66rem; letter-spacing: 0.05em; color: var(--t-ink2); }
        .es-lienzo { display: block; width: 100%; height: ${ALTO}px; }
        .es-nada {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          font-size: 0.62rem; color: var(--t-ink4);
        }
        .es-pie {
          display: flex; gap: 0.6rem; font-size: 0.6rem; color: var(--t-ink3);
          padding-top: 0.25rem; margin-left: calc(96px + 0.6rem); font-variant-numeric: tabular-nums;
        }
        .es-marcas { flex: 1 1 auto; display: flex; justify-content: space-between; }
        .es-perfil { flex: 0 0 27px; text-align: right; }
        @media (max-width: 500px) {
          .es-fila { grid-template-columns: 76px 1fr; gap: 0.4rem; }
          .es-lienzo { height: ${ALTO_MOVIL}px; }
          .es-pie { margin-left: calc(76px + 0.4rem); }
        }
      `}</style>
      <Asa cerrar={cerrar} />
      <div className="ev-cabecera es-cabecera">
        <b>toda la partida</b>
        <span className="ev-rango">día 1 → {hoy}</span>
        <button className="ev-btn muted ev-cerrar" onClick={cerrar}>cerrar</button>
      </div>
      {RASGOS.map((r) => (
        <Franja key={r} rasgo={r} cs={cs} eva={eva} />
      ))}
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
