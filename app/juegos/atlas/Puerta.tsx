"use client";

import { useState } from "react";
import { entrar, salir } from "@/lib/atlas/almacen";
import { cuenta, type Mazo } from "@/lib/atlas/srs";

const MONO = "var(--t-mono)";

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
  const { empezados, aprendidos } = cuenta(mazo);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const fallo = await entrar(clave);
    if (fallo) return setError(fallo);
    setClave("");
    setAbierta(false);
  };

  const cerrar = () => { setAbierta(false); setClave(""); setError(null); };

  if (!empezados && !abierta) {
    // Sin nada empezado no hay cifra que enseñar, pero la puerta tiene que seguir existiendo:
    // el espacio en blanco de después del comando es lo que se pincha.
    return <span onClick={() => setAbierta(true)} style={{ cursor: "default", paddingLeft: "1.2rem" }}>&nbsp;</span>;
  }

  if (!abierta) {
    return (
      <span
        onClick={() => setAbierta(true)}
        style={{ color: "var(--t-ink3)", cursor: "default" }}
      >
        {" "}--aprendidos={aprendidos}/{empezados}
      </span>
    );
  }

  if (identificado) {
    return (
      <span style={{ color: "var(--t-ink3)" }}>
        {" "}--aprendidos={aprendidos}/{empezados}{" "}
        <button onClick={() => { void salir(); cerrar(); }} className="hover-accent" style={boton}>--salir</button>
      </span>
    );
  }

  return (
    <form onSubmit={enviar} onBlur={cerrar} style={{ display: "inline" }}>
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
        style={{
          width: "7ch", background: "none", border: "none", outline: "none", padding: 0,
          fontFamily: MONO, fontSize: "inherit", color: "var(--t-ink)",
        }}
      />
      {error && <span style={{ color: "var(--t-ink4)" }}> {error.toLowerCase()}</span>}
    </form>
  );
}

const boton: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontFamily: MONO, fontSize: "inherit",
};
