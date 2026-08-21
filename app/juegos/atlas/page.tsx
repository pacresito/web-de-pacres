"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import Globo from "./Globo";
import { FORMAS } from "@/data/atlas/formas";
import { DATOS, type Dato, type Nota } from "@/lib/atlas/srs";
import { calificarTarjeta, sinVista, suscribir, vistaActual, type Vista } from "@/lib/atlas/almacen";

const ETIQUETA: Record<Dato, string> = { nombre: "País", capital: "Capital", bandera: "Bandera", forma: "Forma" };

// Cortas a propósito: se califica hasta cuatro veces por tarjeta, así que cada palabra de más
// se paga por cuatro y empuja el país fuera de la pantalla. Lo que significan lo dice la línea
// de ayuda de la primera vez.
const NOTAS: { nota: Nota; texto: string }[] = [
  { nota: "fallo", texto: "no" },
  { nota: "bien", texto: "sí" },
  { nota: "facil", texto: "fácil" },
];

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
        border: "1px dashed var(--t-rule2)", borderRadius: 4, color: "var(--t-ink4)",
        fontFamily: "var(--t-mono)", fontSize: "0.8rem", letterSpacing: "0.08em",
      }}
    >
      ¿{ETIQUETA[dato]}?
    </div>
  );
}

export default function Atlas() {
  const vista = useSyncExternalStore(suscribir, vistaActual, sinVista);
  const [vistaPintada, setVistaPintada] = useState<Vista | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [notas, setNotas] = useState<Partial<Record<Dato, Nota>>>({});
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [pase, setPase] = useState(0);
  const pendiente = useRef<(() => void) | null>(null);

  // Al avanzar de tarjeta se reinicia lo que es de esta: si no, la siguiente aparecería
  // destapada y con los botones ya pulsados. El contador la remonta, que es lo que vuelve a
  // disparar la animación de entrada — la clave no puede ser el país, que puede repetirse.
  if (vista !== vistaPintada) {
    setVistaPintada(vista);
    setAbierta(false);
    setNotas({});
    setPase((n) => n + 1);
  }

  const tarjeta = vista?.tarjeta;
  if (!tarjeta) return <TerminalShell title="atlas" prompt={{ host: "atlas", path: "~/juegos", command: "./atlas" }} hideChrome={pantallaCompleta}><main /></TerminalShell>;
  const estrenando = vista!.estrenando;

  const { pais, tapados, primeraVez } = tarjeta;
  const forma = FORMAS[pais.id];
  // La primera vez se ve todo y se califica igual: es el triaje de lo que ya se sabe.
  const aCalificar: Dato[] = primeraVez ? [...DATOS] : tapados;
  const visible = (d: Dato) => primeraVez || abierta || !tapados.includes(d);
  const califica = (d: Dato) => (primeraVez || abierta) && aCalificar.includes(d);

  /**
   * Pasar de tarjeta es animar la salida y, al acabarla, calificar. Al revés —calificar y
   * animar— lo que se iría sería ya la tarjeta siguiente, con el país nuevo puesto.
   *
   * Quien manda en el tiempo es el CSS: aquí no hay duración escrita que se le desajuste.
   */
  const pasar = (aplicar: () => void) => { pendiente.current = aplicar; setSaliendo(true); };
  const finSalida = (e: React.AnimationEvent) => {
    // El mismo nodo dispara también el final de la entrada, y las de dentro burbujean.
    if (e.target !== e.currentTarget || !pendiente.current) return;
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

  const bloque = (dato: Dato, contenido: React.ReactNode, alto: number) => (
    <div key={dato} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {visible(dato) ? contenido : <Tapado dato={dato} alto={alto} />}
      {califica(dato) && (
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {NOTAS.map(({ nota, texto }) => (
            <button
              key={nota}
              onClick={(e) => { e.stopPropagation(); anotar(dato, nota); }}
              className="t-ibtn"
              style={{
                flex: 1, padding: "0.55rem 0.2rem", fontFamily: "var(--t-mono)", fontSize: "0.72rem",
                border: "1px solid var(--t-rule2)", borderRadius: 4, background: notas[dato] === nota ? "var(--t-accent-bg)" : "var(--t-paper)",
                color: notas[dato] === nota ? "var(--t-accent)" : "var(--t-ink3)", cursor: "pointer",
              }}
            >
              {texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <TerminalShell title="atlas" prompt={{ host: "atlas", path: "~/juegos", command: "./atlas" }} hideChrome={pantallaCompleta}>
      <main
        onClick={() => !primeraVez && setAbierta(true)}
        style={{ minHeight: "100%", padding: pantallaCompleta ? "0.5rem 1rem" : "1.5rem 1rem 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: pantallaCompleta ? "center" : "flex-start", cursor: !primeraVez && !abierta ? "pointer" : "default" }}
      >
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button
            className="hover-accent"
            onClick={(e) => { e.stopPropagation(); setPantallaCompleta((v) => !v); }}
            title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
          >
            {pantallaCompleta ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
                <line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
          {/* Lo que se anima es la tarjeta entera; el botón de pantalla completa se queda
              fuera porque es chrome, no tarjeta. */}
          <div key={pase} className={saliendo ? "atlas-sale" : "atlas-entra"} onAnimationEnd={finSalida}
               style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {estrenando && (
              <p style={{ fontFamily: "var(--t-mono)", fontSize: "0.75rem", color: "var(--t-ink3)", lineHeight: 1.6, margin: 0 }}>
                Aquí te calificas tú, y solo funciona si eres honesto. Mira lo que te tapan, decide si lo
                sabías, destapa, y di la verdad: <b>no</b> si te falló, <b>sí</b> si lo tenías,
                <b>fácil</b> si ni lo pensaste.
              </p>
            )}

            {/* El orden de la tarjeta lo manda el país, que es el eje: lo demás se pregunta de
                él, así que se resuelve primero y una tarjeta rota se acaba antes de calificar
                nada que luego haya que descartar. Detrás, la capital —las dos palabras juntas,
                que es donde hace falta la etiqueta— y después las dos figuras, de menos a más
                sitio. Cuatro casillas fijas: se aprende dónde mira cada una. */}
            {bloque("nombre",
              <div style={{ fontFamily: "var(--t-mono)", fontSize: "1.35rem", color: "var(--t-ink)", textAlign: "center", height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {pais.nombre}
              </div>, 44)}

            {/* La capital lleva su etiqueta también destapada: en Mónaco, Yibuti o Panamá el
                país y la capital son la misma palabra, y sin ella la tarjeta la repite sin decir
                cuál es cuál. */}
            {bloque("capital",
              <div style={{ height: 36, display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ fontFamily: "var(--t-mono)", fontSize: "0.65rem", color: "var(--t-ink4)", letterSpacing: "0.08em" }}>capital</span>
                <span style={{ fontFamily: "var(--t-mono)", fontSize: "1rem", color: "var(--t-ink2)" }}>{pais.capital}</span>
              </div>, 36)}

            {bloque("bandera",
              // eslint-disable-next-line @next/next/no-img-element -- SVG suelto de /public, sin optimización que aportar
              <img src={`/atlas/banderas/${pais.id}.svg`} alt={`Bandera de ${pais.nombre}`}
                   style={{ width: "100%", height: 96, objectFit: "contain", display: "block" }} />, 96)}

            {/* La forma y su globo van juntos: el globo dice dónde está y cuánto mide, así que
                enseñarlo con la forma tapada sería señalar el país en un mapa. */}
            {bloque("forma",
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <svg viewBox="0 0 1000 1000" style={{ flex: 1, minWidth: 0, aspectRatio: 1 }} aria-label={`Forma de ${pais.nombre}`}>
                  <path d={forma.d} fill="var(--t-accent)" fillRule="evenodd" />
                  {/* Frontera interior, cuando la hay: Marruecos y el Sáhara Occidental salen
                      juntos —el globo viene de otra fuente y recortar uno los descuadraba— y la
                      línea dice dónde acaba uno. */}
                  {forma.linea && <path d={forma.linea} fill="none" stroke="var(--t-paper)" strokeWidth={6} strokeDasharray="18 14" strokeLinecap="round" opacity={0.75} />}
                </svg>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                  <Globo id={pais.id} lon={forma.lon} lat={forma.lat} />
                  <span style={{ fontFamily: "var(--t-mono)", fontSize: "0.65rem", color: "var(--t-ink4)" }}>{forma.ladoKm} km</span>
                </div>
              </div>, 200)}

            {!primeraVez && !abierta && (
              <p style={{ fontFamily: "var(--t-mono)", fontSize: "0.72rem", color: "var(--t-ink4)", textAlign: "center", margin: 0 }}>
                toca para destapar
              </p>
            )}
          </div>
        </div>

        {!pantallaCompleta && <WhyFooter question="¿por qué un repasador de países sin contadores?" date="21 de agosto de 2026">
          Llevo años queriendo aprenderme todos los países del mundo y no lo he conseguido nunca. Lo más
          cerca que estuve fue con Anki, y siempre acabé abandonando por lo mismo: vuelves después de diez
          días, te dice que tienes cuatrocientas tarjetas pendientes, y cierras. Así que esto no lleva
          contadores. Abres, hay un país, y das los que te apetezcan.
        </WhyFooter>}
      </main>
    </TerminalShell>
  );
}
