"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";
import Repasar from "./Repasar";
import Explorar from "./Explorar";
import ColaDelPrompt from "./Puerta";
import { mazoActual, sesionActual, sincronizar, sinMazo, sinSesion, suscribir } from "@/lib/atlas/almacen";

const MODOS = ["repasar", "explorar"] as const;
type Modo = (typeof MODOS)[number];

/**
 * Atlas: el marco y las dos maneras de estar aquí. **Repasar** pregunta y mueve los relojes;
 * **explorar** solo mira, y no toca ninguno.
 */
export default function Atlas() {
  const [modo, setModo] = useState<Modo>("repasar");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const identificado = useSyncExternalStore(suscribir, sesionActual, sinSesion);
  const mazo = useSyncExternalStore(suscribir, mazoActual, sinMazo);

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
      <main style={{ minHeight: "100%", padding: pantallaCompleta ? "0.5rem 1rem" : "1.5rem 1rem 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 420, flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {MODOS.map((m) => (
              <button
                key={m}
                onClick={() => setModo(m)}
                className={`atlas-tab${m === modo ? " atlas-tab-on" : ""}`}
                style={{ background: "none", border: "none", padding: "0.15rem 0", cursor: "pointer", fontFamily: "var(--t-mono)", fontSize: "0.8rem" }}
              >
                {m}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <button
              className="hover-accent"
              onClick={() => setPantallaCompleta((v) => !v)}
              title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
              aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
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
          </div>

          {modo === "repasar" ? <Repasar pantallaCompleta={pantallaCompleta} /> : <Explorar />}
        </div>

        {!pantallaCompleta && <WhyFooter question="¿por qué un test de países?" date="21 de agosto de 2026">
          Llevo años queriendo aprenderme todos los países del mundo y no lo he conseguido nunca. Lo más
          cerca que estuve fue con Anki, que va enseñándote cada tarjeta justo antes de que se te olvide y
          espaciándolas cuando aciertas. Funciona, pero no terminó de engancharme: vuelves después de diez
          días, te recibe con cuatrocientas pendientes, y cierras. Esta es mi versión, a ver si por fin lo
          consigo.
        </WhyFooter>}
      </main>
    </TerminalShell>
  );
}
