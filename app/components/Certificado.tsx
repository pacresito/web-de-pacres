import type { ReactNode } from "react";

// Tarjeta "Certificado oficial" (doble borde + firma "Pablo Crespo · Autoridad
// certificadora"). Estaba duplicada casi idéntica en los trucos del círculo y de
// objetivo (I 1.3). El botón "volver a intentarlo" y el overlay que la envuelve se
// quedan en cada página: no son parte de la tarjeta. Cada página genera su propio num.
export default function Certificado({ titulo, cuerpo, num }: {
  titulo: string;
  cuerpo: ReactNode;
  num: string | number;
}) {
  return (
    <div style={{ border: "2px solid var(--t-accent)", borderRadius: "4px", padding: "1.75rem 2rem", width: "82%", maxWidth: "300px", textAlign: "center", position: "relative" }}>
      <div style={{ position: "absolute", inset: 5, border: "1px solid var(--t-rule)", borderRadius: "3px", pointerEvents: "none" }} />
      <p style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "var(--t-mono)", color: "var(--t-accent)", marginBottom: "0.75rem" }}>
        Certificado oficial
      </p>
      <p style={{ fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--t-ink)", fontFamily: "var(--t-mono)" }}>
        {titulo}
      </p>
      <p style={{ fontSize: "0.68rem", color: "var(--t-ink3)", margin: "0.75rem 0 1.25rem", lineHeight: 2.0, fontFamily: "var(--t-mono)" }}>
        {cuerpo}
      </p>
      <div style={{ borderTop: "1px solid var(--t-rule)", paddingTop: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <p style={{ fontSize: "0.58rem", color: "var(--t-ink4)", fontFamily: "var(--t-mono)" }}>
          Nº {num}
        </p>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "0.88rem", color: "var(--t-ink2)" }}>
            Pablo Crespo
          </p>
          <div style={{ width: 76, height: 1, background: "var(--t-rule)", margin: "0.15rem 0 0 auto" }} />
          <p style={{ fontSize: "0.52rem", color: "var(--t-ink4)", fontFamily: "var(--t-mono)", marginTop: "0.15rem" }}>
            Autoridad certificadora
          </p>
        </div>
      </div>
    </div>
  );
}
