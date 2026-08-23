"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import Repasar from "./Repasar";
import Explorar from "./Explorar";
import ColaDelPrompt from "./Puerta";
import { mazoActual, sesionActual, sincronizar, sinMazo, sinSesion, suscribir } from "@/lib/atlas/almacen";

type Modo = "repasar" | "explorar";

const MONO = "var(--t-mono)";

/**
 * Atlas: el marco y las dos maneras de estar aquí. **Repasar** pregunta y mueve los relojes;
 * **explorar** solo mira, y no toca ninguno.
 *
 * No son dos pestañas: repasar es la app y explorar una salida, así que cada pantalla enseña
 * solo la puerta contraria. Dos pestañas iguales arriba competían con la tira de continentes de
 * dentro de explorar —dos niveles de lo mismo— y le daban al paseo el peso del trabajo.
 */
export default function Atlas() {
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const identificado = useSyncExternalStore(suscribir, sesionActual, sinSesion);
  const mazo = useSyncExternalStore(suscribir, mazoActual, sinMazo);

  // Dónde se aterriza depende de quién entra: con sesión, explorar —quien vuelve un día sí y
  // otro también entra a ver por dónde va, no a la tarjeta que toque—; sin ella, repasar, que
  // es la app y lo único que enseña qué es esto. Se deriva en vez de arrancar el estado con
  // ello porque en la primera pintura no se sabe todavía; elegido a mano, manda la elección.
  const [elegido, setElegido] = useState<Modo | null>(null);
  const modo = elegido ?? (identificado ? "explorar" : "repasar");

  // Al cargar, y solo al cargar: se vuelca lo calificado sin cobertura y manda lo que diga
  // Redis. A media sesión no, que cambiar de tarjeta porque el otro dispositivo dijo otra cosa
  // sería un salto sin explicación.
  useEffect(() => { void sincronizar(); }, []);

  return (
    <TerminalShell
      title="atlas"
      // Quién teclea lo dice el prompt, como en cualquier terminal: sin sesión, nadie.
      prompt={{ host: "atlas", path: "~/juegos", command: "./atlas", user: identificado ? "pacres" : "anon" }}
      hideChrome={pantallaCompleta}
      colaDelPrompt={<ColaDelPrompt mazo={mazo} identificado={identificado} />}
    >
      {/* La pantalla mide lo que la ventana: la tarjeta se centra en ella y la barra de
          calificar cae en el borde de abajo, que es donde está el pulgar. El porqué queda
          debajo, a un scroll — sigue estando y no le roba alto a lo que se usa. */}
      <main className="atlas" style={{ minHeight: "100%", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div
          className="atlas-lado"
          style={{
            display: "flex", alignItems: "center", height: 44, gap: 18, flexShrink: 0,
            justifyContent: modo === "repasar" ? "flex-end" : "space-between",
          }}
        >
          {modo === "repasar" ? (
            <button className="atlas-modo" onClick={() => setElegido("explorar")} style={{ ...enlace, fontSize: 12, letterSpacing: "0.04em" }}>
              explorar ›
            </button>
          ) : (
            <button className="atlas-modo-v" onClick={() => setElegido("repasar")} style={{ ...enlace, fontSize: 13, fontWeight: 500, letterSpacing: "0.02em" }}>
              ‹ repasar
            </button>
          )}
          <button
            className="atlas-modo"
            onClick={() => setPantallaCompleta((v) => !v)}
            title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1">
              {pantallaCompleta
                ? <path d="M4.5 1V4.5H1M12 4.5H8.5V1M8.5 12V8.5H12M1 8.5h3.5V12" />
                : <path d="M1 4.5V1h3.5M8.5 1H12v3.5M12 8.5V12H8.5M4.5 12H1V8.5" />}
            </svg>
          </button>
        </div>

        {/* Aterrizando se abre por «empezados», que es lo que está a medias y a lo que se viene;
            entrando a mano desde repasar, por el primer continente, que es el paseo. */}
        {modo === "repasar" ? <Repasar /> : <Explorar abrirEnEmpezados={!elegido} />}
      </main>

      {/* Fuera del <main>, que mide lo que la ventana: dentro le robaría a la tarjeta el alto que
          ocupa, y lo que se usa cuarenta veces al día no paga el sitio de lo que se lee una. */}
      {!pantallaCompleta && <div className="atlas atlas-lado"><WhyFooter question="¿por qué un test de países?" date="21 de agosto de 2026">
          Llevo años queriendo aprenderme todos los países del mundo y no lo he conseguido nunca. Lo más
          cerca que estuve fue con Anki, que va enseñándote cada tarjeta justo antes de que se te olvide y
          espaciándolas cuando aciertas. Funciona, pero no terminó de engancharme: vuelves después de diez
          días, te recibe con cuatrocientas pendientes, y cierras. Esta es mi versión, a ver si por fin lo
          consigo.
        </WhyFooter></div>}
    </TerminalShell>
  );
}

const enlace: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: MONO,
};
