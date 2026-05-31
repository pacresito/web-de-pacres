"use client";

import Link from "next/link";

// Estilos compartidos por los rankings (espiral, laberinto). Cada página conserva
// su propia tabla; aquí solo vive lo idéntico (I3).

export const thStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  fontSize: "0.72rem",
  color: "#b8b3a6",
  fontWeight: 500,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  fontSize: "0.9rem",
};

export function RankBackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      style={{
        marginTop: "2.5rem",
        fontSize: "0.8rem",
        color: "#b8b3a6",
        textDecoration: "none",
        transition: "color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#00b87a")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#b8b3a6")}
    >
      ← volver al juego
    </Link>
  );
}
