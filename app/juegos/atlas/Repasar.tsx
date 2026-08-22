"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Globo from "./Globo";
import { FORMAS } from "@/data/atlas/formas";
import { DATOS, type Dato, type Nota } from "@/lib/atlas/srs";
import { calificarTarjeta, sinVista, suscribir, vistaActual, type Vista } from "@/lib/atlas/almacen";

const MONO = "var(--t-mono)";

const ETIQUETA: Record<Dato, string> = { nombre: "país", capital: "capital", bandera: "bandera", forma: "forma" };

// Cortas a propósito: se califica hasta cuatro veces por tarjeta, y una palabra más en el botón
// es una palabra más leída por cuatro.
const NOTAS: { nota: Nota; texto: string }[] = [
  { nota: "fallo", texto: "no" },
  { nota: "bien", texto: "sí" },
  { nota: "facil", texto: "fácil" },
];

const CLASE: Record<Nota, string> = { fallo: "atlas-btn-no", bien: "atlas-btn-si", facil: "atlas-btn-facil" };

/**
 * Cuatro casillas de alto fijo, siempre las mismas: se aprende dónde mira cada una y la tarjeta
 * no se reordena bajo el pulgar. Un hueco pesa algo más que el dato que tapa, que ahí es donde
 * está la pregunta.
 */
const ALTO: Record<Dato, [visible: number, tapado: number]> = {
  nombre: [60, 60], capital: [52, 52], bandera: [104, 104], forma: [150, 168],
};
// La primera vez se ve todo y se califica todo: cuatro filas con botones no caben tan holgadas.
const ALTO_PRIMERA: Record<Dato, number> = { nombre: 58, capital: 48, bandera: 100, forma: 140 };

/** Los cuatro estados del carril, que es lo único que dice en qué punto va la tarjeta. */
const CARRIL = { reposo: "var(--t-rule2)", espera: "var(--t-rule)", activo: "var(--t-accent)", hecho: "var(--a-hecho)" };

/**
 * Un dato tapado no desaparece: queda su marco y su etiqueta, para saber qué se pregunta.
 * En forma de pregunta, no de hueco de letras: una forma o una bandera no se rellenan
 * escribiendo, así que unos cuadraditos no dicen qué se espera de ellos.
 */
function Tapado({ dato, alto }: { dato: Dato; alto: number }) {
  return (
    <div
      style={{
        height: alto, display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px dashed var(--t-rule)", borderRadius: 2, color: "var(--t-ink3)",
        fontFamily: MONO, fontSize: 13, letterSpacing: "0.02em",
      }}
    >
      ¿{dato === "nombre" ? "País" : ETIQUETA[dato][0].toUpperCase() + ETIQUETA[dato].slice(1)}?
    </div>
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
  return <Tarjeta vista={vista} />;
}

function Tarjeta({ vista }: { vista: Vista }) {
  const [vistaPintada, setVistaPintada] = useState<Vista | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [notas, setNotas] = useState<Partial<Record<Dato, Nota>>>({});
  const [saliendo, setSaliendo] = useState(false);
  const [pase, setPase] = useState(0);
  const pendiente = useRef<(() => void) | null>(null);
  const [ultimoActivo, setUltimoActivo] = useState<Dato | undefined>(undefined);

  // Al avanzar de tarjeta se reinicia lo que es de esta: si no, la siguiente aparecería
  // destapada y con los botones ya pulsados. El contador la remonta, que es lo que vuelve a
  // disparar la animación de entrada — la clave no puede ser el país, que puede repetirse.
  if (vista !== vistaPintada) {
    setVistaPintada(vista);
    setAbierta(false);
    setNotas({});
    setPase((n) => n + 1);
  }

  const tarjeta = vista.tarjeta!;
  const estrenando = vista.estrenando;

  const { pais, tapados, primeraVez } = tarjeta;
  const forma = FORMAS[pais.id];
  // La primera vez se ve todo y se califica igual: es el triaje de lo que ya se sabe.
  const aCalificar: Dato[] = primeraVez ? [...DATOS] : tapados;
  const calificando = primeraVez || abierta;
  const visible = (d: Dato) => primeraVez || abierta || !tapados.includes(d);
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
      if (e.key === " ") {
        e.preventDefault();
        if (!primeraVez) setAbierta(true);
        return;
      }
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i < 0 || !activo) return;
      anotar(activo, NOTAS[i].nota);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  /**
   * Una fila de la tarjeta: carril de 2 px, el dato, y la nota que se le puso. El carril es el
   * mismo elemento en los cuatro estados, y por eso la barra de abajo no necesita estar pegada
   * al dato que califica: basta con que uno de los cuatro esté verde.
   */
  const fila = (dato: Dato, contenido: React.ReactNode) => {
    const puesta = notas[dato];
    const alto = primeraVez ? ALTO_PRIMERA[dato] : ALTO[dato][visible(dato) ? 0 : 1];
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
          {visible(dato) ? contenido : <Tapado dato={dato} alto={alto} />}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--a-acc-tx)" }}>
          {puesta && NOTAS.find((n) => n.nota === puesta)!.texto}
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
      <div key={pase} className="atlas-datos" onAnimationEnd={finSalida}
           style={{ gap: primeraVez ? 20 : calificando ? 22 : 24, paddingLeft: "var(--a-lado)", paddingRight: "var(--a-lado)" }}>
        {estrenando && (
          /* La ayuda usa el mismo carril verde que después marca el dato activo: enseña el
             vocabulario de la tarjeta antes de que haga falta. */
          <div style={{ display: "flex", gap: 12, paddingBottom: 4 }}>
            <div style={{ width: 2, background: "var(--t-accent)", flexShrink: 0 }} />
            <p className={saliendo ? "atlas-sale" : "atlas-entra"} style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.75, color: "var(--t-ink2)", margin: 0, textWrap: "pretty" }}>
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
          <div style={{ fontFamily: MONO, fontSize: "var(--a-pais)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.1, color: tinta("nombre", "var(--t-ink)"), textAlign: "center" }}>
            {pais.nombre}
          </div>)}

        {/* Sin etiqueta: el sitio y el tamaño ya la dicen —la capital va siempre bajo el país y
            más pequeña—, y en Mónaco, Yibuti o Panamá, donde las dos palabras son la misma, es
            justo eso lo que las distingue. Tapada se llama sola. */}
        {fila("capital",
          <div style={{ fontFamily: MONO, fontSize: "var(--a-capital)", lineHeight: 1.2, color: tinta("capital", "var(--t-ink)"), textAlign: "center" }}>
            {pais.capital}
          </div>)}

        {fila("bandera",
          <div style={{ display: "flex", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG suelto de /public, sin optimización que aportar */}
            <img src={`/atlas/banderas/${pais.id}.svg`} alt={`Bandera de ${pais.nombre}`}
                 style={{ width: 144, height: 96, objectFit: "contain", display: "block", opacity: notas.bandera ? 0.55 : 1 }} />
          </div>)}

        {/* La forma y su globo van juntos: el globo dice dónde está y cuánto mide, así que
            enseñarlo con la forma tapada sería señalar el país en un mapa. */}
        {fila("forma",
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22, opacity: notas.forma ? 0.55 : 1 }}>
            <svg viewBox="0 0 1000 1000" style={{ width: 132, height: 132, flexShrink: 0 }} aria-label={`Forma de ${pais.nombre}`}>
              <path d={forma.d} fill="var(--t-accent)" fillRule="evenodd" />
              {/* Frontera interior, cuando la hay: Marruecos y el Sáhara Occidental salen
                  juntos —el globo viene de otra fuente y recortar uno los descuadraba— y la
                  línea dice dónde acaba uno. */}
              {forma.linea && <path d={forma.linea} fill="none" stroke="var(--t-paper)" strokeWidth={6} strokeDasharray="18 14" strokeLinecap="round" opacity={0.75} />}
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <Globo id={pais.id} lon={forma.lon} lat={forma.lat} lado="var(--a-globo)" />
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--t-ink3)" }}>{forma.ladoKm} km</span>
            </div>
          </div>)}
      </div>

      {/* La barra no se mueve nunca: misma posición, mismo orden y mismo tamaño en las tres
          calificaciones de una tarjeta y en todas las siguientes. Lo que cambia es a qué dato
          apunta —y eso lo dicen la cabecera y el carril verde—, así que el pulgar aprende tres
          sitios y deja de mirar. */}
      {enBarra && (
        <div className="atlas-barra" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 11 }}>
            <span style={{ width: 0, height: 0, borderLeft: "5px solid var(--t-accent)", borderTop: "4px solid transparent", borderBottom: "4px solid transparent" }} />
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: "var(--t-ink)", letterSpacing: "0.1em" }}>
              {ETIQUETA[enBarra]}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr", gap: 8 }}>
            {NOTAS.map(({ nota, texto }, i) => (
              <button key={nota} onClick={() => activo && anotar(activo, nota)} className={`atlas-btn ${CLASE[nota]}`} style={{ height: "var(--a-btn)" }}>
                {texto}
                <span className="atlas-solo-ancho" style={{ position: "absolute", left: 8, top: 7, fontSize: 9, opacity: 0.7 }}>{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!calificando && (
        <div style={{ textAlign: "center", padding: "0 var(--a-lado) 40px", fontFamily: MONO, color: "var(--t-ink4)", letterSpacing: "0.14em" }}>
          <span className="atlas-solo-movil" style={{ fontSize: 11 }}>toca para destapar</span>
          <span className="atlas-solo-ancho" style={{ fontSize: 10 }}>espacio para destapar</span>
        </div>
      )}
    </div>
  );
}
