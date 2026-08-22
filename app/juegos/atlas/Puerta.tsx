"use client";

import { useEffect, useRef, useState } from "react";
import { entrar, salir } from "@/lib/atlas/almacen";
import { cuenta, type Mazo } from "@/lib/atlas/srs";

const MONO = "var(--t-mono)";

/** La bandera es parte del comando y va del color del comando, como el `--holes=4` del laberinto
 *  o el `--cartas=21` de magia. Dentro, **el número de aprendidos en acento**: es lo único de la
 *  línea que cuenta algo conseguido, y lo que se busca al mirar; el resto es sintaxis. */
const Bandera = ({ aprendidos, empezados }: { aprendidos: number; empezados: number }) => (
  <>
    {" "}--aprendidos=<span style={{ color: "var(--t-accent)" }}>{aprendidos}</span>/{empezados}
  </>
);

/**
 * La cola del prompt: lo que hay detrás de `./atlas`, y la puerta.
 *
 * **Las cifras van aquí y no en la pantalla** porque un prompt es el sitio donde un número no
 * exige nada: forma parte del comando que se tecleó, no de la tarjeta que se está mirando. Y no
 * son las de Anki —aquellas cuentan deuda y suben mientras no vuelves; estas cuentan trabajo
 * hecho y solo suben cuando trabajas—.
 *
 * **La puerta es pinchar la bandera.** No se anuncia y no hace falta que se anuncie: quien no
 * sepa que está ahí no tiene nada que hacer detrás. Quién eres lo dice el propio prompt —`anon@`
 * o `pacres@`—, que es donde un terminal lo dice, y por eso no hay ningún indicador más.
 */
export default function ColaDelPrompt({ mazo, identificado }: { mazo: Mazo; identificado: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLSpanElement>(null);
  const { empezados, aprendidos } = cuenta(mazo);

  /**
   * Abierta, se cierra al tocar fuera — pero **no al perder el foco**: el desplegable del gestor
   * de contraseñas se lo quita al input, y cerrando en el `blur` la caja desaparecía justo antes
   * de que el gestor escribiera la clave. Lo que hay fuera de la caja son toques del documento,
   * y lo que pinta el gestor no es uno.
   */
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierta(false);
        setClave("");
        setError(null);
      }
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierta]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = await entrar(clave);
    if (fallo) return setError(fallo);
    setClave("");
    setAbierta(false);
  };

  const cerrar = () => { setAbierta(false); setClave(""); setError(null); };

  if (!abierta) {
    return (
      <span onClick={() => setAbierta(true)} style={{ color: "var(--t-ink)", cursor: "default" }}>
        <Bandera aprendidos={aprendidos} empezados={empezados} />
      </span>
    );
  }

  return (
    <span ref={caja} style={{ color: "var(--t-ink)" }}>
      {identificado ? (
        <>
          <Bandera aprendidos={aprendidos} empezados={empezados} />{" "}
          <button onClick={() => { void salir(); cerrar(); }} className="hover-accent" style={boton}>--salir</button>
        </>
      ) : (
        <form onSubmit={enviar} style={{ display: "inline" }}>
          {" "}--clave=
          <input
            type="password"
            value={clave}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => { setClave(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Escape") cerrar(); }}
            // Se escribe donde se lee: mismo tipo, mismo tamaño y sin caja, para que teclear la
            // clave sea seguir escribiendo el comando y no rellenar un formulario.
            // El ancho sigue a lo tecleado, que es lo que deja ver cuántos caracteres llevas: fijo,
            // los puntos se cortan y una clave larga parece corta. Con tope, que a partir de ahí se
            // saldría de la caja del prompt y rompería la línea.
            style={{
              width: `${Math.min(Math.max(clave.length + 1, 4), 24)}ch`,
              background: "none", border: "none", outline: "none", padding: 0,
              fontFamily: MONO, fontSize: "inherit", color: "var(--t-ink)",
            }}
          />
          {error && <span style={{ color: "var(--t-ink4)" }}> {error.toLowerCase()}</span>}
        </form>
      )}
    </span>
  );
}

const boton: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontFamily: MONO, fontSize: "inherit",
};
