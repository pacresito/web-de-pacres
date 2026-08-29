"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Minimapa from "./Minimapa";
import Silueta from "./Silueta";
import { ORDEN, RECORRIDO } from "@/data/atlas/orden";
import { FORMAS } from "@/data/atlas/formas";
import { PAIS_POR_ID } from "@/lib/atlas/paises";
import { dominio, dominioPais, type Dato, type Dominio } from "@/lib/atlas/srs";
import { mazoActual, sinMazo, suscribir } from "@/lib/atlas/almacen";
import { rutaDeLaBandera, rutaDelRelieve } from "@/lib/atlas/imagenes";
import { escalaDelNombre, km2 } from "@/lib/atlas/ficha";
import { useTema } from "@/app/components/usePersistedTheme";

const TINTA: Record<Dominio, string> = {
  "sin ver": "transparent",
  empezado: "var(--t-ink4)",
  aprendido: "var(--a-medio)",
  dominado: "var(--t-accent)",
};

/**
 * La marca de dominio de un dato: aro vacío, punto gris, punto verde apagado, punto verde. No es
 * una nota ni una puntuación —son sus dos relojes, mirados sin tocarlos—, y va pegada a su dato:
 * agregada por continente sería un porcentaje, que es justo el número que hace abandonar.
 *
 * **Los dos verdes son el mismo verde a dos intensidades** y no dos colores, porque no son dos
 * cosas: aprendido es dominado a medias. El apagado lo firma el trabajo hecho —cinco aciertos— y
 * el pleno lo firma además el calendario, que no se puede acelerar; y como el segundo solo llega
 * pasando por el primero, la marca se llena en vez de cambiar de idea.
 *
 * Sin leyenda: son cuatro estados y se aprenden una vez. Lo que se mira cuarenta veces no puede
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

/**
 * Los dos estados que se recorren además de los continentes. El valor **es** el dominio que
 * devuelve `dominioPais`, así que no hay tabla que traducir; solo la etiqueta va en plural, que
 * es como se leen ("aprendidos"), y el dominio en singular, que es como se dice de un país.
 */
const ESTADOS = ["empezado", "aprendido"] as const;
const ETIQUETA: Record<(typeof ESTADOS)[number], string> = { empezado: "empezados", aprendido: "aprendidos" };

// El marco del minimapa sale del continente **del país**, no de lo que se esté recorriendo: por
// «aprendidos» pasan países de los seis, y cada uno quiere el mapa de su vecindario.
const MARCO = new Map(ORDEN.map((g) => [g.continente, g.marco]));

// Dónde cae «empezados» en `vistas`: los estados van detrás de los seis continentes, y es el
// primero de los dos.
const I_EMPEZADOS = ORDEN.length;

/**
 * Las dos imágenes que la ficha estrena al cambiar de país: la bandera y, si lo tiene, el
 * relieve. Ninguna viene en el HTML —React monta un nodo nuevo por país, y un nodo nuevo nace
 * vacío—, así que sin precargarlas la ficha entra a plazos: primero la silueta plana y las
 * montañas encima un instante después.
 */
function imagenes(id: string, tema: string | null) {
  const relieve = rutaDelRelieve(id, tema);
  return [rutaDeLaBandera(id), ...(relieve ? [relieve] : [])];
}

/**
 * Descarga y **decodifica**: `onload` deja todavía el descifrado del webp por hacer, y ese trabajo
 * cae en el primer fotograma que la pinta. Se resuelve igual si falla — una imagen rota no puede
 * dejar clavada la ficha.
 */
function precargar(url: string) {
  const im = new Image();
  im.src = url;
  return im.decode().catch(() => {});
}

// Lo que se espera como mucho a las imágenes antes de pasar de país de todas formas. Con el
// vecino precargado no se llega nunca; es el tope para que una red mala no deje la flecha muerta.
const ESPERA_MAX = 600;

// El recorrido es un circuito: pasado el último se vuelve al primero, y al revés.
const alLado = (lista: string[], desde: number, n: number) => (desde + n + lista.length) % lista.length;

/**
 * La pestaña de explorar: los países de un continente, uno a uno y en el orden del barrido en S
 * —nunca alfabético, que el alfabeto no enseña geografía—. Solo mira: no toca ningún reloj.
 */
export default function Explorar({ abrirEnEmpezados = false }: { abrirEnEmpezados?: boolean }) {
  const mazo = useSyncExternalStore(suscribir, mazoActual, sinMazo);
  const tema = useTema();
  const [ci, setCi] = useState(abrirEnEmpezados ? I_EMPEZADOS : 0);
  const [pi, setPi] = useState(0);
  const [abierto, setAbierto] = useState(false);

  /**
   * Lo que se puede recorrer: los seis continentes y, detrás, los dos estados. Un estado no es un
   * continente, pero se elige en el mismo sitio porque se elige por lo mismo —qué recorrido toca
   * hoy— y así no hay un segundo control a la vista compitiendo con este.
   *
   * Y va **del mundo entero**, no del continente puesto: los aprendidos de Asia son tres, y tres
   * países no son un repaso. Todos siguen el orden del barrido en S — quitar países no los
   * reordena.
   */
  const vistas = useMemo(() => [
    ...ORDEN.map((g) => ({ nombre: g.continente.toLowerCase(), paises: g.paises })),
    ...ESTADOS.map((e) => ({ nombre: ETIQUETA[e], paises: RECORRIDO.filter((id) => dominioPais(mazo, id) === e) })),
  ], [mazo]);

  const vista = vistas[ci];
  const lista = vista.paises;
  // Un estado puede no tener ningún país —ninguno aprendido todavía— y puede encoger por debajo
  // del índice actual. Se acota al leer en vez de corregirlo con un efecto: un `setPi` en cascada
  // pintaría antes un país que ya no está en la lista.
  const donde = Math.min(pi, lista.length - 1);
  const id = lista[donde] ?? "";
  const pais = PAIS_POR_ID.get(id);
  const forma = FORMAS[id];

  /**
   * Pasar de país no es cambiar el índice: es esperar a que sus imágenes estén decodificadas y
   * cambiarlo entonces, para que la ficha entre de una pieza. El paso se numera porque quien
   * pulsa dos veces seguidas no espera a la primera: la descarga que llega tarde se encuentra
   * con un número que ya no es el suyo y no pinta un país que ya se pasó.
   */
  const paso = useRef(0);
  // Y el índice al que se va se apunta al pedirlo, no al pintarlo: quien pulsa tres veces
  // seguidas avanza tres, aunque la primera todavía no haya llegado.
  const objetivo = useRef(0);
  const irAlPais = (i: number, ids: string[] = lista) => {
    const mio = ++paso.current;
    objetivo.current = i;
    const urls = ids[i] ? imagenes(ids[i], tema) : [];
    Promise.race([Promise.all(urls.map(precargar)), new Promise((listo) => setTimeout(listo, ESPERA_MAX))])
      .then(() => { if (paso.current === mio) setPi(i); });
  };
  const mover = (n: number) => { if (lista.length) irAlPais(alLado(lista, Math.min(objetivo.current, lista.length - 1), n)); };
  // El continente se cambia al momento —lo que se estrena entero no es una ficha que se sustituye
  // a medias— y su primer país ya espera a lo suyo, con la lista nueva, que `lista` todavía es la
  // de antes en este render.
  const irA = (i: number) => { setCi(i); setPi(0); setAbierto(false); irAlPais(0, vistas[i].paises); };

  // Los vecinos, precargados en cuanto la ficha se asienta: son diez kilobytes y se piden una
  // vez, así que el paso siguiente ya no espera a nada. Los dos, que el recorrido se anda en
  // ambos sentidos.
  useEffect(() => {
    for (const n of [1, -1]) {
      const vecino = lista[alLado(lista, donde, n)];
      if (vecino) imagenes(vecino, tema).forEach(precargar);
    }
  }, [donde, lista, tema]);

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
    <div className={`atlas-fila${mapas ? " atlas-fila-mapa" : ""}`} style={{ alignItems: arriba ? "start" : "center" }}>
      <Marca estado={dominio(mazo[id]?.[dato])} arriba={arriba} />
      <div style={{ minWidth: 0 }}>{contenido}</div>
    </div>
  );

  const cifras = pais && forma ? (
    <span style={{ fontSize: 11, color: "var(--t-ink3)", letterSpacing: "0.04em" }}>
      {km2(pais.km2)} km² · {forma.ladoKm} km de largo
    </span>
  ) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* Un recorrido por vez, y el nombre del que se mira. En móvil los ocho no caben en una
          tira sin partirse en dos líneas —«américa del norte» sola ya la parte—, así que son una
          palabra que despliega la rejilla; con sitio, los ocho en la misma línea. El orden es el
          del recorrido, de lo lejano a lo cercano, y no se toca para que quepan. */}
      <div className="atlas-cont-fila atlas-lado" style={{ flexShrink: 0 }}>
        <button className="atlas-modo atlas-solo-movil" onClick={() => setAbierto((v) => !v)}
                style={{ fontSize: 14, color: "var(--t-ink)" }}>
          {vista.nombre} <span style={{ color: "var(--t-ink4)" }}>{abierto ? "▴" : "▾"}</span>
        </button>
        <div className="atlas-solo-ancho">
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {vistas.map((v, i) => (
              <button key={v.nombre} onClick={() => irA(i)}
                      className={i === ci ? "atlas-modo-v" : "atlas-modo"}
                      style={{ fontSize: 13, fontWeight: i === ci ? 500 : 400, display: "flex", alignItems: "center", gap: 8,
                               // Los dos estados cierran la tira separados de los continentes: van
                               // en la misma lista porque se eligen igual, pero no son un sitio.
                               marginLeft: i === ORDEN.length ? 12 : undefined }}>
                {i === ci && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t-accent)" }} />}
                {v.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* El contador es de sitio, no de deuda: dice por dónde va el recorrido, no cuánto falta
            por estudiar. Da la vuelta al llegar al final — un continente es un circuito. */}
        <span style={{ fontSize: 13, color: "var(--t-ink3)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          <button onClick={() => mover(-1)} className="atlas-modo" style={{ fontSize: 13 }} aria-label="Anterior">‹</button>
          {"  "}{lista.length ? donde + 1 : 0} / {lista.length}{"  "}
          <button onClick={() => mover(1)} className="atlas-modo" style={{ fontSize: 13 }} aria-label="Siguiente">›</button>
        </span>
      </div>

      {abierto && (
        <div className="atlas-solo-movil atlas-lado" style={{ paddingTop: 14, flexShrink: 0 }}>
          <div className="atlas-cont-rejilla">
            {vistas.map((v, i) => (
              <button key={v.nombre} onClick={() => irA(i)}
                      className={`atlas-cont-celda${i === ci ? " atlas-cont-celda-on" : ""}`}
                      style={{
                        // Las líneas de la rejilla se dibujan por celda, no con nth-child: las
                        // vistas son ocho cuando estén los 195 y menos mientras se prueba, y la
                        // que se queda sola en su fila la ocupa entera —media celda vacía dentro
                        // de la caja se lee como una opción que falta—.
                        gridColumn: i === vistas.length - 1 && vistas.length % 2 === 1 ? "1 / -1" : undefined,
                        borderRight: i % 2 === 0 && i + 1 < vistas.length ? "1px solid var(--t-rule2)" : undefined,
                        borderBottom: i < vistas.length - (vistas.length % 2 === 0 ? 2 : 1) ? "1px solid var(--t-rule2)" : undefined,
                      }}>
                {i === ci && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t-accent)", flexShrink: 0 }} />}
                {v.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {pais && forma ? (
      <div className="atlas-ficha atlas-lado" style={{ flex: 1, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--a-ficha-gap)" }}>
          {/* El nombre vive en una caja de dos líneas para que nada de lo que va debajo se mueva
              al pasar de España a Bosnia y Herzegovina, y se apoya en su techo: así su marca
              abre la columna a la misma altura que la de la forma, en la de al lado. El aire
              sobrante cae debajo del oficial, que es donde no separa nada de lo suyo. */}
          <div style={{ display: "grid", alignContent: "start", height: "calc(var(--a-pais) * 2.3 + 22px)" }}>
            {fila("nombre",
              <>
                <div style={{ fontSize: `calc(var(--a-pais) * ${escalaDelNombre(pais.nombre)})`, fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.03em", color: "var(--t-ink)" }}>{pais.nombre}</div>
                <div style={{ fontSize: 11, lineHeight: 1.6, color: "var(--t-ink3)", paddingTop: 4 }}>{pais.oficial}</div>
              </>, 11)}
          </div>

          {/* Sin etiqueta, como en la tarjeta: el sitio y el tamaño ya la dicen. */}
          {fila("capital",
            <span style={{ fontSize: "var(--a-capital)", lineHeight: 1.2, color: "var(--t-ink)" }}>{pais.capital}
              {pais.capitalCastellana && <span style={{ fontSize: "0.62em", color: "var(--t-ink4)" }}> ({pais.capitalCastellana})</span>}
            </span>)}

          {fila("bandera",
            // eslint-disable-next-line @next/next/no-img-element -- SVG suelto de /public, sin optimización que aportar
            <img key={id} src={rutaDeLaBandera(id)} alt={`Bandera de ${pais.nombre}`}
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
        {fila("lugar",
          <div style={{ display: "grid", gap: 10 }}>
          <div className="atlas-mapas">
            {/* Las dos figuras se pegan a la izquierda de su casilla en vez de centrarse en ella,
                y la silueta además se ciñe a su tinta: Chile en un lienzo cuadrado es un hilo con
                dos palmos de nada a los lados, y ese vacío no se distingue del hueco entre
                columnas. */}
            <Silueta id={pais.id} forma={forma} nombre={pais.nombre} ajustada style={{ width: "100%", aspectRatio: 1 }} />
            <Minimapa id={id} marco={MARCO.get(pais.continente)!} lon={forma.lon} lat={forma.lat} />
          </div>
            <div className="atlas-solo-ancho">{cifras}</div>
          </div>, 11, true)}

        {/* Pasar de país tocando un lado u otro de la ficha: en el móvil el pulgar ya está ahí y
            las flechas viven arriba del todo. Solo cubren la ficha —la cabecera y el porqué de
            abajo siguen siendo suyos— y van `aria-hidden` porque no son un control nuevo: hacen
            lo mismo que las flechas, que sí se anuncian. */}
        <div className="atlas-solo-movil atlas-toque" style={{ left: 0 }} onClick={() => mover(-1)} aria-hidden />
        <div className="atlas-solo-movil atlas-toque" style={{ right: 0 }} onClick={() => mover(1)} aria-hidden />
      </div>
      ) : (
        /* Un estado puede no tener todavía ni un país. Se nombra cuál: el contador a 0 dice
           que no hay nada, no de qué no lo hay. */
        <div className="atlas-lado" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                             fontSize: 13, color: "var(--t-ink3)", textAlign: "center" }}>
          sin países {vista.nombre} todavía
        </div>
      )}

      {cifras && (
        <div className="atlas-solo-movil atlas-lado" style={{ borderTop: "1px solid var(--t-rule2)", padding: "16px var(--a-lado) 30px", textAlign: "center", flexShrink: 0 }}>
          {cifras}
        </div>
      )}
    </div>
  );
}
