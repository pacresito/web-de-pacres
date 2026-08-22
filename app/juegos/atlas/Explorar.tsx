"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Minimapa from "./Minimapa";
import { ORDEN } from "@/data/atlas/orden";
import { FORMAS } from "@/data/atlas/formas";
import { PAIS_POR_ID } from "@/lib/atlas/paises";
import { dominio, type Dato, type Dominio } from "@/lib/atlas/srs";
import { mazoActual, sinMazo, suscribir } from "@/lib/atlas/almacen";

const TINTA: Record<Dominio, string> = {
  "sin ver": "transparent",
  "en marcha": "var(--t-ink4)",
  "asentado": "var(--t-accent)",
};

/**
 * La marca de dominio de un dato: aro vacío, punto gris, punto verde. No es una nota ni una
 * puntuación —es la vida de ese reloj, mirada sin tocarla—, y va pegada a su dato: agregada por
 * continente sería un porcentaje, que es justo el número que hace abandonar.
 */
function Marca({ estado }: { estado: Dominio }) {
  return (
    <span
      title={estado}
      aria-label={estado}
      style={{
        width: 9, height: 9, borderRadius: "50%", flexShrink: 0, display: "block",
        border: `1px solid ${estado === "sin ver" ? "var(--t-rule2)" : TINTA[estado]}`,
        background: TINTA[estado],
      }}
    />
  );
}

// Sin `toLocaleString`: el ICU del server y el del navegador no tienen por qué coincidir, y un
// número distinto en cada lado es un desajuste de hidratación, que sale como un error ilegible.
function km2(n: number) {
  const [entera, decimal] = n.toFixed(n < 10 ? 2 : 0).split(".");
  return entera.replace(/\B(?=(\d{3})+$)/g, ".") + (decimal ? `,${decimal}` : "");
}

const MONO = "var(--t-mono)";

// Lo que ocupan la marca y su hueco. Lo que no es una fila —la superficie, la leyenda— se
// alinea con esto a mano, y así las tres cosas cuelgan de la misma vertical.
const MARGEN = "1.26rem";

/**
 * La pestaña de explorar: los países de un continente, uno a uno y en el orden del barrido en S
 * —nunca alfabético, que el alfabeto no enseña geografía—. Solo mira: no toca ningún reloj.
 */
export default function Explorar() {
  const mazo = useSyncExternalStore(suscribir, mazoActual, sinMazo);
  const [ci, setCi] = useState(0);
  const [pi, setPi] = useState(0);

  const grupo = ORDEN[ci];
  const id = grupo.paises[pi];
  const pais = PAIS_POR_ID.get(id)!;
  const forma = FORMAS[id];
  const mover = (n: number) => setPi((i) => (i + n + grupo.paises.length) % grupo.paises.length);

  // Las flechas del teclado hacen lo que los dos botones: en escritorio recorrer el continente
  // pulsando a un lado y a otro de la pantalla no es recorrerlo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") mover(-1);
      if (e.key === "ArrowRight") mover(1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // La marca abre cada fila, no la cierra: a la izquierda las cuatro forman una columna recta y
  // se leen de un vistazo; al final de cada dato caen donde acabe el texto, cada una en su sitio.
  const fila = (dato: Dato, contenido: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
      <Marca estado={dominio(mazo[id]?.[dato])} />
      <div style={{ flex: 1, minWidth: 0 }}>{contenido}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {ORDEN.map((g, i) => (
          <button
            key={g.continente}
            onClick={() => { setCi(i); setPi(0); }}
            className={`atlas-tab${i === ci ? " atlas-tab-on" : ""}`}
            style={{ background: "none", border: "none", padding: "0.15rem 0", cursor: "pointer", fontFamily: MONO, fontSize: "0.7rem" }}
          >
            {g.continente}
          </button>
        ))}
      </div>

      {/* El contador es de sitio, no de deuda: dice por dónde va el recorrido, no cuánto falta
          por estudiar. Da la vuelta al llegar al final — un continente es un circuito. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.2rem" }}>
        <button onClick={() => mover(-1)} className="t-ibtn" aria-label="Anterior">‹</button>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--t-ink4)" }}>
          {pi + 1} / {grupo.paises.length}
        </span>
        <button onClick={() => mover(1)} className="t-ibtn" aria-label="Siguiente">›</button>
      </div>

      {fila("nombre",
        <>
          <div style={{ fontFamily: MONO, fontSize: "1.35rem", color: "var(--t-ink)" }}>{pais.nombre}</div>
          <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--t-ink4)" }}>{pais.oficial}</div>
        </>)}

      {/* Sin etiqueta, como en la tarjeta: el sitio y el tamaño ya la dicen. */}
      {fila("capital",
        <span style={{ fontFamily: MONO, fontSize: "1rem", color: "var(--t-ink2)" }}>{pais.capital}</span>)}

      {fila("bandera",
        // eslint-disable-next-line @next/next/no-img-element -- SVG suelto de /public, sin optimización que aportar
        <img src={`/atlas/banderas/${id}.svg`} alt={`Bandera de ${pais.nombre}`}
             // Ancho por el alto, no una caja fija: la marca va pegada a la bandera, y con caja
             // se queda flotando a la derecha de las que son estrechas.
             style={{ height: 72, width: "auto", maxWidth: 200, display: "block" }} />)}

      {fila("forma",
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <svg viewBox="0 0 1000 1000" style={{ width: 128, flexShrink: 0, aspectRatio: 1 }} aria-label={`Forma de ${pais.nombre}`}>
            <path d={forma.d} fill="var(--t-accent)" fillRule="evenodd" />
            {forma.linea && <path d={forma.linea} fill="none" stroke="var(--t-paper)" strokeWidth={6} strokeDasharray="18 14" strokeLinecap="round" opacity={0.75} />}
          </svg>
          <Minimapa id={id} marco={grupo.marco} lon={forma.lon} lat={forma.lat} />
        </div>)}

      {/* El tamaño es del país, no del minimapa: va al margen de la ficha, con todo lo demás, y
          no colgando del borde de un mapa que cambia de ancho en cada continente. */}
      <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--t-ink4)", marginLeft: MARGEN }}>
        {km2(pais.km2)} km² · {forma.ladoKm} km de largo
      </div>

      <div style={{ display: "flex", gap: "0.85rem", marginLeft: MARGEN }}>
        {(Object.keys(TINTA) as Dominio[]).map((e) => (
          <span key={e} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontFamily: MONO, fontSize: "0.6rem", color: "var(--t-ink4)" }}>
            <Marca estado={e} />{e}
          </span>
        ))}
      </div>
    </div>
  );
}
