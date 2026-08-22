"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Minimapa from "./Minimapa";
import Silueta from "./Silueta";
import { ORDEN } from "@/data/atlas/orden";
import { FORMAS } from "@/data/atlas/formas";
import { PAIS_POR_ID } from "@/lib/atlas/paises";
import { dominio, type Dato, type Dominio } from "@/lib/atlas/srs";
import { mazoActual, sinMazo, suscribir } from "@/lib/atlas/almacen";

const MONO = "var(--t-mono)";

const TINTA: Record<Dominio, string> = {
  "sin ver": "transparent",
  "en marcha": "var(--t-ink4)",
  "asentado": "var(--t-accent)",
};

/**
 * La marca de dominio de un dato: aro vacío, punto gris, punto verde. No es una nota ni una
 * puntuación —es la vida de ese reloj, mirada sin tocarla—, y va pegada a su dato: agregada por
 * continente sería un porcentaje, que es justo el número que hace abandonar.
 *
 * Sin leyenda: son tres estados y se aprenden una vez. Lo que se mira cuarenta veces no puede
 * llevar al lado la explicación de lo que es. El nombre queda en el `title`, por si acaso.
 */
function Marca({ estado, arriba = 0 }: { estado: Dominio; arriba?: number }) {
  return (
    <span
      title={estado}
      aria-label={estado}
      style={{
        width: 9, height: 9, borderRadius: "50%", flexShrink: 0, display: "block", marginTop: arriba,
        border: `1px solid ${estado === "sin ver" ? "var(--t-ink4)" : TINTA[estado]}`,
        background: TINTA[estado],
      }}
    />
  );
}

// Los caracteres que caben en una línea del nombre a tamaño entero. La fuente es mono y la
// columna mide lo mismo en móvil y a lo ancho, así que sale una cuenta y no una medición: medir
// el DOM daría un número que el HTML del server no tiene.
const CARACTERES = 15;

/**
 * Cuánto encoge el nombre para caber en dos líneas. La ficha reserva dos siempre —así no se
 * mueve nada al pasar de España a Bosnia y Herzegovina— y de los 195 solo la República
 * Democrática del Congo pide una tercera: encogerla es preferible a bajar todo lo que va debajo.
 */
function escalaDelNombre(nombre: string) {
  const palabras = nombre.split(" ");
  return [1, 0.85, 0.75, 0.68].find((escala) => {
    const ancho = Math.floor(CARACTERES / escala);
    let lineas = 1, largo = 0;
    for (const palabra of palabras) {
      if (!largo) largo = palabra.length;
      else if (largo + 1 + palabra.length <= ancho) largo += 1 + palabra.length;
      else { lineas++; largo = palabra.length; }
    }
    return lineas <= 2;
  }) ?? 0.55;
}

// Sin `toLocaleString`: el ICU del server y el del navegador no tienen por qué coincidir, y un
// número distinto en cada lado es un desajuste de hidratación, que sale como un error ilegible.
function km2(n: number) {
  const [entera, decimal] = n.toFixed(n < 10 ? 2 : 0).split(".");
  return entera.replace(/\B(?=(\d{3})+$)/g, ".") + (decimal ? `,${decimal}` : "");
}

/**
 * La pestaña de explorar: los países de un continente, uno a uno y en el orden del barrido en S
 * —nunca alfabético, que el alfabeto no enseña geografía—. Solo mira: no toca ningún reloj.
 */
export default function Explorar() {
  const mazo = useSyncExternalStore(suscribir, mazoActual, sinMazo);
  const [ci, setCi] = useState(0);
  const [pi, setPi] = useState(0);
  const [abierto, setAbierto] = useState(false);

  const grupo = ORDEN[ci];
  const id = grupo.paises[pi];
  const pais = PAIS_POR_ID.get(id)!;
  const forma = FORMAS[id];
  const mover = (n: number) => setPi((i) => (i + n + grupo.paises.length) % grupo.paises.length);
  const irA = (i: number) => { setCi(i); setPi(0); setAbierto(false); };

  // Las flechas del teclado hacen lo que los dos botones: en escritorio recorrer el continente
  // pulsando a un lado y a otro de la pantalla no es recorrerlo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      // Con la puerta abierta se está tecleando la clave: una flecha mueve el cursor, no el país.
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") mover(-1);
      if (e.key === "ArrowRight") mover(1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // La marca abre cada fila, no la cierra: a la izquierda las cuatro forman una columna recta y
  // se leen de un vistazo; al final de cada dato caen donde acabe el texto, cada una en su sitio.
  const fila = (dato: Dato, contenido: React.ReactNode, arriba = 0, mapas = false) => (
    <div style={{
      display: "grid",
      gridTemplateColumns: mapas ? "var(--a-marca-mapa) 1fr" : "var(--a-marca) 1fr",
      columnGap: mapas ? "var(--a-marca-mapa-gap)" : "var(--a-marca-gap)",
      alignItems: arriba ? "start" : "center",
    }}>
      <Marca estado={dominio(mazo[id]?.[dato])} arriba={arriba} />
      <div style={{ minWidth: 0 }}>{contenido}</div>
    </div>
  );

  const cifras = (
    <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--t-ink3)", letterSpacing: "0.04em" }}>
      {km2(pais.km2)} km² · {forma.ladoKm} km de largo
    </span>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Un continente por vez, y el nombre del que se mira. En móvil los seis no caben en una
          tira sin partirse en dos líneas —«américa del norte» sola ya la parte—, así que son una
          palabra que despliega la rejilla; con sitio, los seis en la misma línea. El orden es el
          del recorrido, de lo lejano a lo cercano, y no se toca para que quepan. */}
      <div className="atlas-cont-fila atlas-lado" style={{ flexShrink: 0 }}>
        <button className="atlas-modo atlas-solo-movil" onClick={() => setAbierto((v) => !v)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: MONO, fontSize: 14, color: "var(--t-ink)" }}>
          {grupo.continente.toLowerCase()} <span style={{ color: "var(--t-ink4)" }}>{abierto ? "▴" : "▾"}</span>
        </button>
        <div className="atlas-solo-ancho">
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {ORDEN.map((g, i) => (
              <button key={g.continente} onClick={() => irA(i)}
                      className={i === ci ? "atlas-modo-v" : "atlas-modo"}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: MONO, fontSize: 13, fontWeight: i === ci ? 500 : 400, display: "flex", alignItems: "center", gap: 8 }}>
                {i === ci && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t-accent)" }} />}
                {g.continente.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* El contador es de sitio, no de deuda: dice por dónde va el recorrido, no cuánto falta
            por estudiar. Da la vuelta al llegar al final — un continente es un circuito. */}
        <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--t-ink3)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          <button onClick={() => mover(-1)} className="atlas-modo" style={flecha} aria-label="Anterior">‹</button>
          {"  "}{pi + 1} / {grupo.paises.length}{"  "}
          <button onClick={() => mover(1)} className="atlas-modo" style={flecha} aria-label="Siguiente">›</button>
        </span>
      </div>

      {abierto && (
        <div className="atlas-solo-movil atlas-lado" style={{ paddingTop: 14, flexShrink: 0 }}>
          <div className="atlas-cont-rejilla">
            {ORDEN.map((g, i) => (
              <button key={g.continente} onClick={() => irA(i)}
                      className={`atlas-cont-celda${i === ci ? " atlas-cont-celda-on" : ""}`}
                      style={{
                        // Las líneas de la rejilla se dibujan por celda, no con nth-child: los
                        // continentes son seis cuando estén los 195 y tres mientras se prueba, y
                        // el que se queda solo en su fila la ocupa entera —media celda vacía
                        // dentro de la caja se lee como una opción que falta—.
                        gridColumn: i === ORDEN.length - 1 && ORDEN.length % 2 === 1 ? "1 / -1" : undefined,
                        borderRight: i % 2 === 0 && i + 1 < ORDEN.length ? "1px solid var(--t-rule2)" : undefined,
                        borderBottom: i < ORDEN.length - (ORDEN.length % 2 === 0 ? 2 : 1) ? "1px solid var(--t-rule2)" : undefined,
                      }}>
                {i === ci && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t-accent)", flexShrink: 0 }} />}
                {g.continente.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="atlas-ficha atlas-lado" style={{ flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--a-ficha-gap)" }}>
          {/* El nombre vive en una caja de dos líneas para que nada de lo que va debajo se mueva
              al pasar de España a Bosnia y Herzegovina, y se apoya en su techo: así su marca
              abre la columna a la misma altura que la de la forma, en la de al lado. El aire
              sobrante cae debajo del oficial, que es donde no separa nada de lo suyo. */}
          <div style={{ display: "grid", alignContent: "start", height: "calc(var(--a-pais) * 2.3 + 22px)" }}>
            {fila("nombre",
              <>
                <div style={{ fontFamily: MONO, fontSize: `calc(var(--a-pais) * ${escalaDelNombre(pais.nombre)})`, fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.03em", color: "var(--t-ink)" }}>{pais.nombre}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: "var(--t-ink3)", paddingTop: 4 }}>{pais.oficial}</div>
              </>, 11)}
          </div>

          {/* Sin etiqueta, como en la tarjeta: el sitio y el tamaño ya la dicen. */}
          {fila("capital",
            <span style={{ fontFamily: MONO, fontSize: "var(--a-capital)", lineHeight: 1.2, color: "var(--t-ink)" }}>{pais.capital}</span>)}

          {fila("bandera",
            // eslint-disable-next-line @next/next/no-img-element -- SVG suelto de /public, sin optimización que aportar
            <img src={`/atlas/banderas/${id}.svg`} alt={`Bandera de ${pais.nombre}`}
                 // Ancho por el alto, no una caja fija: la marca va pegada a la bandera, y con
                 // caja se queda flotando a la derecha de las que son estrechas.
                 style={{ height: "var(--a-bandera)", width: "auto", maxWidth: 200, display: "block" }} />)}

        </div>

        {/* Las dos figuras, del mismo alto y una al lado de la otra: la silueta es la forma sola
            y el minimapa dice quiénes son sus vecinos. Las dos casillas van cuadradas y las dos
            figuras dentro, cada una a lo que le dé su forma: con la casilla más alta que el
            dibujo, lo que sobra es un hueco que no se ve pero empequeñece los dos mapas. Sin
            etiquetas debajo: una silueta verde y un continente con un país encendido no se
            confunden con otra cosa. */}
        {/* El tamaño va al pie de la silueta, que es de quien habla —los km² y el largo son del
            país, no del continente de al lado—, y en móvil cierra la ficha con una regla, que es
            donde no le quita aire a nada. */}
        {fila("forma",
          <div style={{ display: "grid", gap: 10 }}>
          <div className="atlas-mapas">
            {/* Las dos figuras se pegan a la izquierda de su casilla en vez de centrarse en ella,
                y la silueta además se ciñe a su tinta: Chile en un lienzo cuadrado es un hilo con
                dos palmos de nada a los lados, y ese vacío no se distingue del hueco entre
                columnas. */}
            <Silueta forma={forma} nombre={pais.nombre} ajustada style={{ width: "100%", aspectRatio: 1 }} />
            <Minimapa id={id} marco={grupo.marco} lon={forma.lon} lat={forma.lat} />
          </div>
            <div className="atlas-solo-ancho">{cifras}</div>
          </div>, 11, true)}
      </div>

      <div className="atlas-solo-movil atlas-lado" style={{ borderTop: "1px solid var(--t-rule2)", padding: "16px var(--a-lado) 30px", textAlign: "center", flexShrink: 0 }}>
        {cifras}
      </div>
    </div>
  );
}

const flecha: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: MONO, fontSize: 13,
};
