"use client";

import Asa from "./asa";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Diario as DiarioT, Evento } from "./narrador";
import { usePanel } from "./panel";

/** La crónica de la partida, como un log: la última abajo. Lo que dice lo decide `narrador.ts`. */
export default function Diario({ diario, dia, clima, cerrar }: {
  diario: () => DiarioT;
  dia: () => number;
  clima: () => number;
  cerrar: () => void;
}) {
  const fondo = useRef<HTMLDivElement>(null);
  const [lineas, setLineas] = useState<Evento[]>([]);
  const [hoy, setHoy] = useState(0);

  // Copia y no la lista del diario, que el bucle muta al volver atrás.
  const leer = useCallback(() => { setLineas(diario().eventos.slice()); setHoy(dia()); }, [diario, dia]);
  usePanel(cerrar, leer);

  // Al fondo con cada línea nueva, solo si ya se estaba abajo.
  const pegado = useRef(true);
  const mirar = useCallback(() => {
    const el = fondo.current;
    if (el) pegado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }, []);
  useEffect(() => {
    const el = fondo.current;
    if (el && pegado.current) el.scrollTop = el.scrollHeight;
  }, [lineas]);

  return (
    <div className="ev-panel dr-panel" ref={fondo} onScroll={mirar}>
      <style>{`
        .dr-panel { padding: 0 1rem 0.8rem; }
        /* El relleno de arriba lo pone la cabecera pegada: en el panel, las líneas pasarían por encima. */
        .dr-cabecera { position: sticky; top: 0; z-index: 1; background: var(--t-paper); padding: 0.65rem 0 0.45rem; }
        .dr-linea { font-size: 0.68rem; line-height: 1.75; color: var(--t-ink2); border-top: 1px solid var(--t-rule2); }
        .dr-linea b { color: var(--t-accent); font-weight: 600; font-variant-numeric: tabular-nums; }
        .dr-nada { font-size: 0.66rem; color: var(--t-ink3); padding-top: 0.6rem; }
        @media (max-width: 640px) { .dr-cabecera { top: 28px; } }   /* debajo del asa */
      `}</style>
      <Asa cerrar={cerrar} />
      <div className="ev-cabecera dr-cabecera">
        <b>el diario</b>
        <span className="ev-rango">día 1 → {hoy}</span>
        <button className="ev-btn muted ev-cerrar" onClick={cerrar}>cerrar</button>
      </div>
      <p className="dr-linea"><b>clima</b> · {clima()} bocados al día</p>
      {lineas.length === 0 && <p className="dr-nada">Todavía no ha pasado nada que no pasara ya.</p>}
      {lineas.map((e) => (
        <p key={e.clave} className="dr-linea">
          <b>día {e.dia}</b> · {e.texto}
        </p>
      ))}
    </div>
  );
}
