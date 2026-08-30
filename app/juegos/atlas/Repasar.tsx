"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Globo from "./Globo";
import Silueta from "./Silueta";
import { FORMAS } from "@/data/atlas/formas";
import { DATOS, NOTAS, type Dato, type Nota } from "@/lib/atlas/srs";
import { calificarTarjeta, sinVista, suscribir, vistaActual, type Vista } from "@/lib/atlas/almacen";
import { desviar } from "@/lib/atlas/globo";
import { rutaDeLaBandera } from "@/lib/atlas/imagenes";

// Lo que se lee en la tarjeta. `lugar` se rotula «ubicación»: el identificador no lleva tilde.
const ETIQUETA: Record<Dato, string> = { nombre: "país", capital: "capital", bandera: "bandera", lugar: "ubicación" };

// Cortas a propósito: se califica hasta cuatro veces por tarjeta, y una palabra más en el botón
// es una palabra más leída por cuatro.
const TEXTO: Record<Nota, string> = { fallo: "no", bien: "sí", facil: "fácil" };

const CLASE: Record<Nota, string> = { fallo: "atlas-btn-no", bien: "atlas-btn-si", facil: "atlas-btn-facil" };

/**
 * Cuánto se desvía del país el centro del globo, en grados de arco —el porqué, en `desviar`—.
 * Veinte: bastante para que el país no esté donde uno mira primero, y poco para que siga
 * cómodamente dentro de la cara visible.
 */
const DESVIO = 20;

/**
 * Cuatro casillas de alto fijo, siempre las mismas: se aprende dónde mira cada una y la tarjeta
 * no se reordena bajo el pulgar.
 */
const ALTO: Record<Dato, number> = { nombre: 60, capital: 52, bandera: 104, lugar: 150 };
// Taparse solo le cambia el alto a la ubicación: su hueco pesa algo más que las dos figuras que
// tapa, que ahí es donde está la pregunta. Los otros tres miden lo mismo puestos que quitados.
const ALTO_TAPADO: Record<Dato, number> = { ...ALTO, lugar: 168 };
// La primera vez se ve todo y se califica todo: cuatro filas con botones no caben tan holgadas.
const ALTO_PRIMERA: Record<Dato, number> = { nombre: 58, capital: 48, bandera: 100, lugar: 140 };

/** Los cuatro estados del carril, que es lo único que dice en qué punto va la tarjeta. */
const CARRIL = { reposo: "var(--t-rule2)", espera: "var(--t-rule)", activo: "var(--t-accent)", hecho: "var(--a-hecho)" };

/**
 * Un dato tapado no desaparece: queda su marco y su etiqueta, para saber qué se pregunta.
 * En forma de pregunta, no de hueco de letras: una forma o una bandera no se rellenan
 * escribiendo, así que unos cuadraditos no dicen qué se espera de ellos.
 */
function Tapado({ dato, alto, alTocar }: { dato: Dato; alto: number; alTocar?: () => void }) {
  const marco = (
    <div
      style={{
        height: alto, display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px dashed var(--t-rule)", borderRadius: 2, color: "var(--t-ink3)",
        fontSize: 13, letterSpacing: "0.02em",
      }}
    >
      ¿{ETIQUETA[dato][0].toUpperCase() + ETIQUETA[dato].slice(1)}?
    </div>
  );
  // El de la ubicación se pincha para marcar el sitio en el globo, y por eso se traga el toque:
  // los otros tres no tienen nada que responder sin destapar, así que destapan como el resto de
  // la tarjeta.
  if (!alTocar) return marco;
  return (
    <button type="button" className="atlas-tapado" aria-label="Marcar en el globo dónde está el país"
            onClick={(e) => { e.stopPropagation(); alTocar(); }}>
      {marco}
    </button>
  );
}

/**
 * La pestaña de repasar: una tarjeta cada vez, y la siguiente al calificarla.
 *
 * Sin mazo no hay tarjeta —en el server no lo hay—, y todo lo que tiene estado vive en
 * `<Tarjeta>` para que ningún hook quede detrás de ese return.
 */
export default function Repasar() {
  const vista = useSyncExternalStore(suscribir, vistaActual, sinVista);
  if (!vista?.tarjeta) return null;
  // `key`: cada tarjeta es un montaje nuevo, y por eso aquí no hay nada que reiniciar al pasar de
  // una a la siguiente. Es también lo que vuelve a disparar la animación de entrada.
  return <Tarjeta key={vista.n} tarjeta={vista.tarjeta} estrenando={vista.estrenando} />;
}

function Tarjeta({ tarjeta, estrenando }: { tarjeta: NonNullable<Vista["tarjeta"]>; estrenando: boolean }) {
  // El desvío se sortea al montar la tarjeta y no al pintarla: el globo pequeño y el grande son
  // el mismo, y volver a entrar a marcar no puede mover el mundo bajo la marca ya puesta.
  const [centro] = useState<[number, number]>(
    () => desviar(FORMAS[tarjeta.pais.id].lon, FORMAS[tarjeta.pais.id].lat, DESVIO));
  const [abierta, setAbierta] = useState(false);
  const [lupa, setLupa] = useState<"mirar" | "marcar" | null>(null);
  const [marca, setMarca] = useState<string | null>(null);
  const [notas, setNotas] = useState<Partial<Record<Dato, Nota>>>({});
  const [saliendo, setSaliendo] = useState(false);
  const pendiente = useRef<(() => void) | null>(null);
  const [ultimoActivo, setUltimoActivo] = useState<Dato | undefined>(undefined);

  const { pais, tapados, primeraVez } = tarjeta;
  const forma = FORMAS[pais.id];
  // La primera vez se ve todo y se califica igual: es el triaje de lo que ya se sabe.
  const aCalificar: Dato[] = primeraVez ? [...DATOS] : tapados;
  const calificando = primeraVez || abierta;
  // Marcado el sitio, la fila de ubicación se pinta entera aunque siga tapada: sin la marca
  // delante, al destapar no habría con qué compararla y daría igual haber marcado.
  const visible = (d: Dato) => primeraVez || abierta || !tapados.includes(d) || (d === "lugar" && marca !== null);
  // Lo que sigue sin verse es el país resaltado, que es justo lo que se acaba de responder.
  const paisOculto = !primeraVez && !abierta && tapados.includes("lugar");
  // Y la silueta que se ve es la respuesta que hay puesta: tapada la ubicación, la del país que se
  // marcó —con sus kilómetros, que son los de la figura que se está mirando—; destapada, la de
  // verdad con la marcada en trazo encima.
  const formaMarcada = marca ? FORMAS[marca] : null;
  const formaVista = paisOculto ? formaMarcada : forma;
  // Se califica un dato cada vez y de arriba abajo: con una sola fila de botones, cuál se está
  // calificando lo tiene que decir la tarjeta, y lo dice el carril verde.
  const activo = calificando ? DATOS.find((d) => aCalificar.includes(d) && !notas[d]) : undefined;
  // Mientras la tarjeta sale, la barra se queda con el último dato que apuntó: al calificar el
  // que la acaba, `activo` se vuelve otro —o ninguno— y la barra parpadearía justo cuando lo
  // que tiene que hacer es no moverse.
  if (activo && activo !== ultimoActivo) setUltimoActivo(activo);
  const enBarra = saliendo ? ultimoActivo : activo;

  /**
   * Pasar de tarjeta es animar la salida y, al acabarla, calificar. Al revés —calificar y
   * animar— lo que se iría sería ya la tarjeta siguiente, con el país nuevo puesto.
   *
   * Quien manda en el tiempo es el CSS: aquí no hay duración escrita que se le desajuste.
   */
  const pasar = (aplicar: () => void) => { pendiente.current = aplicar; setSaliendo(true); };
  const finSalida = () => {
    // Burbujean las cuatro filas y también las entradas: manda la primera que llegue con algo
    // pendiente, y las demás se encuentran el hueco vacío.
    if (!pendiente.current) return;
    const aplicar = pendiente.current;
    pendiente.current = null;
    setSaliendo(false);
    aplicar();
  };

  const anotar = (dato: Dato, nota: Nota) => {
    const nuevas = { ...notas, [dato]: nota };
    setNotas(nuevas);
    if (dato === "nombre" && nota === "fallo" && tapados.includes("nombre")) return pasar(sinPais);
    // Calificados todos, salta sola: sin botón de "siguiente".
    if (aCalificar.every((d) => nuevas[d])) pasar(() => calificarTarjeta(pais.id, nuevas));
  };

  /**
   * Fallar el país tapado acaba la tarjeta ahí, sin preguntar el resto. El país es el eje: lo
   * demás se pregunta *de este país*, así que sin país nunca llegó a preguntarse —la bandera de
   * Mónaco parecía la de Indonesia, o no se le ocurrió ninguno, y da igual cuál de las dos—.
   * Puede que la capital se supiera de sobra, así que **lo tapado se queda sin calificar** y
   * vuelve sin un fallo inventado encima; lo ya pulsado en la tarjeta se descarta, que se
   * respondió sobre otro país.
   *
   * Y lo que estaba a la vista se suspende: si con la bandera delante no sale el país, esa
   * bandera no está sabida.
   */
  const sinPais = () => calificarTarjeta(pais.id, {
    ...Object.fromEntries(DATOS.filter((d) => !tapados.includes(d)).map((d) => [d, "fallo" as Nota])),
    nombre: "fallo",
  });

  /**
   * El teclado de escritorio: espacio destapa y 1/2/3 califican. Van al dato activo, que es el
   * mismo al que apunta la barra: una tarjeta de tres huecos se despacha con tres pulsaciones y
   * sin elegir a cuál van.
   *
   * Sin lista de dependencias a propósito: se resuscribe en cada render y por eso lee siempre
   * las notas de ahora. Con lista, la primera tecla calificaría sobre un mazo viejo.
   */
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      // Con la puerta abierta se está tecleando la clave: un «2» no puede calificar.
      if (saliendo || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.tagName === "INPUT") return;
      // Mirando el globo grande no se califica: la tarjeta está tapada por él, y calificar lo
      // que no se ve es calificar a ciegas. La tecla que sea lo cierra —incluidas las tres de
      // calificar—, que es lo que se quiere hacer justo después de mirar.
      if (lupa) {
        e.preventDefault();
        setLupa(null);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (!primeraVez) setAbierta(true);
        return;
      }
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i < 0 || !activo) return;
      anotar(activo, NOTAS[i]);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  /**
   * Una fila de la tarjeta: carril de 2 px, el dato, y la nota que se le puso. El carril es el
   * mismo elemento en los cuatro estados, y por eso la barra de abajo no necesita estar pegada
   * al dato que califica: basta con que uno de los cuatro esté verde.
   */
  const fila = (dato: Dato, contenido: React.ReactNode, alTocarHueco?: () => void) => {
    const puesta = notas[dato];
    const alto = primeraVez ? ALTO_PRIMERA[dato] : (visible(dato) ? ALTO : ALTO_TAPADO)[dato];
    const carril = puesta ? CARRIL.hecho
      : dato === activo ? CARRIL.activo
      : calificando && aCalificar.includes(dato) ? CARRIL.espera
      : CARRIL.reposo;
    return (
      <div
        key={dato}
        style={{
          display: "grid", gridTemplateColumns: "30px 1fr 30px", alignItems: "center",
          minHeight: alto, background: dato === activo ? "var(--a-wash)" : "transparent",
          transition: "background 0.12s",
        }}
      >
        <div style={{ alignSelf: "stretch", width: 2, background: carril, transition: "background 0.12s" }} />
        <div
          className={saliendo ? "atlas-sale" : "atlas-entra"}
          // Escalonado solo al entrar: las cuatro filas salen a la vez —quien manda en el cambio
          // de tarjeta es la primera que acaba— y entran una detrás de otra.
          style={{ minWidth: 0, animationDelay: saliendo ? undefined : `${DATOS.indexOf(dato) * 30}ms` }}
        >
          {visible(dato) ? contenido : <Tapado dato={dato} alto={alto} alTocar={alTocarHueco} />}
        </div>
        <div style={{ fontSize: 10, color: "var(--a-acc-tx)" }}>
          {puesta && TEXTO[puesta]}
        </div>
      </div>
    );
  };

  // Un dato ya calificado se atenúa: sigue ahí para poder mirarlo, pero ya no es lo que se
  // está haciendo.
  const tinta = (dato: Dato, viva: string) => (notas[dato] ? "var(--t-ink3)" : viva);

  return (
    /* Destapar es tocar donde sea, no solo la tarjeta: el compromiso mental antes de mirar es
       lo único que hace honesto el autoinforme, y no se le va a pedir puntería. La cabecera
       queda fuera, que ahí tocar es cambiar de modo. */
    <div onClick={() => !primeraVez && setAbierta(true)}
         className="atlas-cuerpo"
         style={{ cursor: !primeraVez && !abierta ? "pointer" : "default" }}>
      <div className="atlas-datos" onAnimationEnd={finSalida}
           style={{ gap: primeraVez ? 20 : calificando ? 22 : 24, paddingLeft: "var(--a-lado)", paddingRight: "var(--a-lado)" }}>
        {estrenando && (
          /* La ayuda usa el mismo carril verde que después marca el dato activo: enseña el
             vocabulario de la tarjeta antes de que haga falta. */
          <div style={{ display: "flex", gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 2, background: "var(--t-accent)", flexShrink: 0 }} />
            <p className={saliendo ? "atlas-sale" : "atlas-entra"} style={{ fontSize: 11.5, lineHeight: 1.75, color: "var(--t-ink2)", margin: 0, textWrap: "pretty" }}>
              Aquí te calificas tú: mira el dato, decide si lo sabías y sé honesto. Nadie lo comprueba, y
              por eso solo funciona si no te haces trampas.
            </p>
          </div>
        )}

        {/* El orden de la tarjeta lo manda el país, que es el eje: lo demás se pregunta de
            él, así que se resuelve primero y una tarjeta rota se acaba antes de calificar
            nada que luego haya que descartar. Detrás, la capital —las dos palabras juntas,
            que es donde hace falta la etiqueta— y después las dos figuras, de menos a más
            sitio. */}
        {fila("nombre",
          <div style={{ fontSize: "var(--a-pais)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: tinta("nombre", "var(--t-ink)"), textAlign: "center" }}>
            {pais.nombre}
          </div>)}

        {/* Sin etiqueta: el sitio y el tamaño ya la dicen —la capital va siempre bajo el país y
            más pequeña—, y en Mónaco, Djibouti o Singapur, donde las dos palabras son la misma, es
            justo eso lo que las distingue. Tapada se llama sola. La glosa entre paréntesis solo
            sale donde la forma local se leería mal en español —Jakarta, Kharṭūm—, y por eso va
            en pequeño: es la pista de pronunciación, no la respuesta. */}
        {fila("capital",
          <div style={{ fontSize: "var(--a-capital)", lineHeight: 1.2, color: tinta("capital", "var(--t-ink)"), textAlign: "center" }}>
            {pais.capital}
            {pais.capitalCastellana && <span style={{ fontSize: "0.62em", color: "var(--t-ink4)" }}> ({pais.capitalCastellana})</span>}
          </div>)}

        {fila("bandera",
          <div style={{ display: "flex", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG suelto de /public, sin optimización que aportar */}
            <img key={pais.id} src={rutaDeLaBandera(pais.id)} alt={`Bandera de ${pais.nombre}`}
                 style={{ width: 144, height: 96, objectFit: "contain", display: "block", opacity: notas.bandera ? 0.55 : 1 }} />
          </div>)}

        {/* La silueta y su globo van juntos: el globo dice dónde está, así que enseñarlo con la
            silueta tapada sería señalar el país en un mapa.

            Van alineados por arriba y no por el centro: los dos dibujos miden lo mismo y tienen
            que leerse a la misma altura, y centrar los bloques hundiría el globo justo lo que
            ocupa el pie de los km. Quien empareja las dos alturas es `.atlas-globo`, que mide el
            lienzo de la silueta y centra el globo dentro. */}
        {fila("lugar",
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 22, opacity: notas.lugar ? 0.55 : 1 }}>
            {/* La escala va al pie de la silueta, que es a quien le falta: va normalizada al
                lienzo, así que Rusia y Mónaco se dibujan del mismo tamaño y sin los km no hay
                manera de saber cuál se está mirando. El globo no la necesita —ahí el país sale a
                escala del mundo—, y el pie le roba al lienzo el alto que ocupa. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0 }}>
              <Silueta id={pais.id} forma={paisOculto ? null : forma} nombre={pais.nombre} trazo={formaMarcada}
                       style={{ width: "var(--a-silueta)", height: "var(--a-silueta)" }} />
              <span style={{ fontSize: 10, color: "var(--t-ink3)" }}>{formaVista?.ladoKm} km</span>
            </div>
            {/* Tocar el globo lo abre grande, que es la comprobación que se quiere hacer justo
                antes de calificar: el de la tarjeta dice en qué parte del mundo cae el país, pero
                no si estaba en el sitio que uno creía. Se traga el toque —destapar es tocar donde
                sea— porque aquí tocar es esto.

                Con el país todavía sin destapar, lo que abre es el globo de marcar, y así se
                rectifica una marca: se entra otra vez y la nueva sustituye a la vieja. */}
            <button type="button" className="atlas-globo"
                    aria-label={paisOculto ? "Marcar en el globo dónde está el país" : `Ver el globo de ${pais.nombre} en grande`}
                    onClick={(e) => { e.stopPropagation(); setLupa(paisOculto ? "marcar" : "mirar"); }}>
              <Globo id={pais.id} lon={centro[0]} lat={centro[1]} lado="var(--a-globo)" oculto={paisOculto} marca={marca} />
            </button>
          </div>, () => setLupa("marcar"))}
      </div>

      {/* La barra no se mueve nunca: misma posición, mismo orden y mismo tamaño en las tres
          calificaciones de una tarjeta y en todas las siguientes. Lo que cambia es a qué dato
          apunta —y eso lo dicen la cabecera y el carril verde—, así que el pulgar aprende tres
          sitios y deja de mirar. */}
      {enBarra && (
        <div className="atlas-barra" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 11 }}>
            <span style={{ width: 0, height: 0, borderLeft: "5px solid var(--t-accent)", borderTop: "4px solid transparent", borderBottom: "4px solid transparent" }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--t-ink)", letterSpacing: "0.1em" }}>
              {ETIQUETA[enBarra]}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr", gap: 8 }}>
            {NOTAS.map((nota, i) => (
              <button key={nota} onClick={() => activo && anotar(activo, nota)} className={`atlas-btn ${CLASE[nota]}`} style={{ height: "var(--a-btn)" }}>
                {TEXTO[nota]}
                <span className="atlas-solo-ancho" style={{ position: "absolute", left: 8, top: 7, fontSize: 9, opacity: 0.7 }}>{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* La lupa: el mismo globo a pantalla completa, recalculado a radio grande —escalar el de
          76 px sube también el redondeo de sus coordenadas— y sin un solo dato más. **El nombre
          del país no entra aunque se sepa**: si está tapado, esto sería la respuesta.

          Son dos globos con dos trabajos. El de *mirar* enseña el país y se cierra tocando donde
          sea, como se abrió. El de *marcar* lo esconde y espera un toque dentro del disco; fuera
          del disco, y con cualquier tecla, se cierra sin marcar.

          Marcado, se cierra solo tras un instante: lo justo para ver encenderse el enganche, que
          es la única razón para seguir mirando. */}
      {lupa && (
        <div className="atlas-lupa" onClick={(e) => { e.stopPropagation(); setLupa(null); }}>
          <Globo id={pais.id} lon={centro[0]} lat={centro[1]} r={200} lado="min(86vw, 56vh)" puntos
                 oculto={lupa === "marcar"} marca={marca}
                 alMarcar={lupa === "marcar" ? (id) => { setMarca(id); setTimeout(() => setLupa(null), 320); } : undefined} />
          <span style={{ fontSize: 11, color: "var(--t-ink4)", letterSpacing: "0.14em" }}>
            {lupa === "marcar" ? "toca donde creas que está" : (
              <>
                <span className="atlas-solo-movil">toca para volver</span>
                <span className="atlas-solo-ancho">una tecla para volver</span>
              </>
            )}
          </span>
        </div>
      )}

      {!calificando && (
        <div style={{ textAlign: "center", padding: "0 var(--a-lado) 40px", color: "var(--t-ink4)", letterSpacing: "0.14em" }}>
          <span className="atlas-solo-movil" style={{ fontSize: 11 }}>toca para destapar</span>
          <span className="atlas-solo-ancho" style={{ fontSize: 10 }}>espacio para destapar</span>
        </div>
      )}
    </div>
  );
}
