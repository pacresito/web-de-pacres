"use client";

import { useRef, useState, type ReactNode } from "react";
import { entrar, salir } from "@/lib/atlas/almacen";

const LARGA = 550; // ms de pulsación para que se abra

const MONO = "var(--t-mono)";

/**
 * La puerta oculta: una pulsación larga sobre el título del chrome. No se anuncia, y sin sesión
 * no hay ni un indicio de que exista — detrás solo hay una clave, y un botón permanente que
 * ponga "identifícate" es ruido en cada tarjeta a cambio de un uso al año.
 *
 * El punto verde, cuando la hay, es el único indicador: dice que lo que se califica está yendo
 * a algún sitio además de a este navegador.
 */
export function PuertaOculta({ identificado, onLarga, children }: {
  identificado: boolean; onLarga: () => void; children: ReactNode;
}) {
  const reloj = useRef<number | null>(null);
  const parar = () => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
  };

  return (
    <span
      onPointerDown={() => { parar(); reloj.current = window.setTimeout(onLarga, LARGA); }}
      onPointerUp={parar}
      onPointerLeave={parar}
      onPointerCancel={parar}
      // En el móvil, una pulsación larga sobre texto selecciona la palabra y saca el menú del
      // sistema. Sin matar las dos cosas, la puerta no llega a abrirse nunca.
      onContextMenu={(e) => e.preventDefault()}
      style={{
        userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {children}
      {identificado && (
        <span title="el mazo se guarda en la nube" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--t-accent)" }} />
      )}
    </span>
  );
}

/** Lo que hay detrás de la puerta: entrar si no hay sesión, cerrarla si la hay. Nada más — no
 *  existe un reinicio de progreso, que es la clase de botón que un día se pulsa sin querer. */
export function PanelPuerta({ identificado, onCerrar }: { identificado: boolean; onCerrar: () => void }) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setYendo(true);
    const fallo = await entrar(clave);
    setYendo(false);
    if (fallo) return setError(fallo);
    setClave("");
    onCerrar();
  };

  const marco: React.CSSProperties = {
    display: "flex", gap: "0.5rem", alignItems: "center",
    border: "1px solid var(--t-rule2)", borderRadius: 4, padding: "0.6rem 0.7rem",
    fontFamily: MONO, fontSize: "0.75rem",
  };

  if (identificado) {
    return (
      <div style={marco}>
        <span style={{ flex: 1, color: "var(--t-ink3)" }}>sesión abierta</span>
        <button onClick={() => { void salir(); onCerrar(); }} className="t-ibtn" style={{ width: "auto", padding: "0 0.6rem", fontFamily: MONO, fontSize: "0.72rem" }}>
          cerrar
        </button>
        <button onClick={onCerrar} className="hover-accent" aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} style={marco}>
      <input
        type="password"
        value={clave}
        autoFocus
        autoComplete="current-password"
        onChange={(e) => { setClave(e.target.value); setError(null); }}
        placeholder="clave"
        style={{
          flex: 1, minWidth: 0, background: "var(--t-paper)", color: "var(--t-ink)",
          border: "1px solid var(--t-rule2)", borderRadius: 4, padding: "0.35rem 0.5rem",
          fontFamily: MONO, fontSize: "0.75rem",
        }}
      />
      <button type="submit" disabled={yendo || !clave} className="t-ibtn" style={{ width: "auto", padding: "0 0.6rem", fontFamily: MONO, fontSize: "0.72rem" }}>
        entrar
      </button>
      {error && <span style={{ color: "var(--t-ink3)" }}>{error}</span>}
      <button type="button" onClick={onCerrar} className="hover-accent" aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
    </form>
  );
}
