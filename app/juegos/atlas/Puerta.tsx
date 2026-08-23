"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { elegirNivel, entrar, nivelActual, salir, suscribir } from "@/lib/atlas/almacen";
import { type Perfil } from "@/lib/atlas/sembrar";
import { cuenta, type Mazo } from "@/lib/atlas/srs";

const MONO = "var(--t-mono)";

/** Los mazos de salida, con el nombre que tienen para quien juega. `mezcla` no está: reparte los
 *  tres estados entre países y sirve para mirar la interfaz, no para jugar. */
const NIVELES: { perfil: Perfil; etiqueta: string }[] = [
  { perfil: "vacio", etiqueta: "nuevo" },
  { perfil: "facil", etiqueta: "fácil" },
  { perfil: "medio", etiqueta: "medio" },
  { perfil: "dominado", etiqueta: "difícil" },
];

const etiqueta = (p: Perfil) => NIVELES.find((n) => n.perfil === p)?.etiqueta ?? "nuevo";

/** La bandera es parte del comando y va del color del comando, como el `--holes=4` del laberinto
 *  o el `--cartas=21` de magia. Dentro, **el número de aprendidos en acento**: es lo único de la
 *  línea que cuenta algo conseguido, y lo que se busca al mirar; el resto es sintaxis. */
const Bandera = ({ aprendidos, vistos }: { aprendidos: number; vistos: number }) => (
  <>
    {" "}--aprendidos=<span style={{ color: "var(--t-accent)" }}>{aprendidos}</span>/{vistos}
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
  const nivel = useSyncExternalStore(suscribir, nivelActual, () => "vacio" as Perfil);
  const { vistos, aprendidos } = cuenta(mazo);

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

  // El nivel es de quien juega sin cuenta: con sesión, el mazo bueno vive en Redis.
  const sinCuenta = !identificado;

  if (!abierta) {
    return (
      <span onClick={() => setAbierta(true)} style={{ color: "var(--t-ink)", cursor: "default" }}>
        {/* Una bandera cada vez: medido en un móvil, dos separadas pasan el prompt de dos líneas
            a tres. Sin nada visto no hay trabajo que contar y lo que dice algo es de dónde se
            arranca; en cuanto hay mazo manda el recuento, y el nivel sigue a un toque. */}
        {sinCuenta && vistos === 0
          ? <> --nivel=<span style={{ color: "var(--t-accent)" }}>{etiqueta(nivel)}</span></>
          : <Bandera aprendidos={aprendidos} vistos={vistos} />}
      </span>
    );
  }

  return (
    <span ref={caja} style={{ color: "var(--t-ink)" }}>
      {identificado ? (
        <>
          <Bandera aprendidos={aprendidos} vistos={vistos} />{" "}
          <button onClick={() => { void salir(); cerrar(); }} className="hover-accent" style={boton}>--salir</button>
        </>
      ) : (
        <>
          {/* Abierta, la línea enseña lo que un terminal enseñaría: los valores que admite la
              bandera, separados por barras. Elegir uno **rehace el mazo de este navegador** y lo
              anterior no vuelve; se ofrece solo sin sesión, porque con cuenta el mazo bueno está
              en Redis y desde aquí no se toca. */}
          {" "}--nivel=
          {NIVELES.map(({ perfil, etiqueta: e }, i) => (
            <span key={perfil}>
              {i > 0 && <span style={{ color: "var(--t-ink4)" }}>|</span>}
              <button
                onClick={() => { elegirNivel(perfil); cerrar(); }}
                className={perfil === nivel ? undefined : "hover-accent"}
                style={{ ...boton, color: perfil === nivel ? "var(--t-accent)" : undefined }}
              >
                {e}
              </button>
            </span>
          ))}
          <form onSubmit={enviar} style={{ display: "inline" }}>
            {" "}--clave=
            <input
              type="password"
              value={clave}
              autoFocus
              autoComplete="current-password"
              onChange={(ev) => { setClave(ev.target.value); setError(null); }}
              onKeyDown={(ev) => { if (ev.key === "Escape") cerrar(); }}
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
        </>
      )}
    </span>
  );
}

const boton: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontFamily: MONO, fontSize: "inherit",
};
