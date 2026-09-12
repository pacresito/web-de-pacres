"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Diario as DiarioT, Evento } from "./narrador";

/**
 * La crónica de la partida, en un log de terminal. Lo que escribe lo decide `narrador.ts`; aquí
 * solo se pinta, y se pinta **en orden, la última abajo**, que es como se lee un log y lo que
 * permite que el ojo vuelva siempre al mismo sitio.
 *
 * Se abre encima del lienzo, como la leyenda y los estratos, y por lo mismo: el alto ya se lo
 * reparten el mundo y la tira. **La última línea no necesita el panel** —sale sola en la barra de
 * estado, que es donde se está mirando cuando pasa—: esto es para leer lo que uno se perdió.
 */

/** Refresco, en ms. El diario escribe una línea cada muchos días: no hay prisa ninguna. */
const REFRESCO = 700;

export default function Diario({ diario, dia, clima, cerrar }: {
  diario: () => DiarioT;
  dia: () => number;
  clima: () => number;
  cerrar: () => void;
}) {
  const fondo = useRef<HTMLDivElement>(null);
  const [lineas, setLineas] = useState<Evento[]>([]);
  const [hoy, setHoy] = useState(0);

  useEffect(() => {
    // Se copia la lista y no se guarda la del diario: es la misma que el bucle va reescribiendo
    // cuando el mundo vuelve atrás, y React no repinta un array que muta bajo sus pies.
    const leer = () => { setLineas(diario().eventos.slice()); setHoy(dia()); };
    leer();
    const id = window.setInterval(leer, REFRESCO);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", esc);
    return () => { window.clearInterval(id); window.removeEventListener("keydown", esc); };
  }, [diario, dia, cerrar]);

  // Al final del todo, que es donde está lo nuevo. Solo si ya estaba abajo: leyendo el principio
  // de una partida larga, un salto al fondo cada vez que nace una línea es perder el sitio.
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
    <div className="dr-panel" ref={fondo} onScroll={mirar}>
      <div className="dr-cabecera">
        <b>el diario</b>
        <span className="dr-rango">día 1 → {hoy}</span>
        <button className="ev-btn muted" onClick={cerrar}>cerrar</button>
      </div>
      {/* El clima primero y sin día: la comida que amanece es el techo de la población y la sortea
          la semilla, así que sin ese número un censo de 17 no se distingue de un desastre. Es la
          vara de todo lo que viene debajo, no algo que haya pasado. */}
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
