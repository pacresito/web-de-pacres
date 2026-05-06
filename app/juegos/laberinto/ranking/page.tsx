"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Entry {
  name: string;
  score: number;
  date: string | null;
}

interface RankingData {
  top: Entry[];
  bottom: Entry[];
}

export default function RankingLaberinto() {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ranking/laberinto")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", position: "relative" }}>
      <h1 style={{ color: "#111827", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "2.5rem" }}>
        Ranking Laberinto
      </h1>

      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Cargando...</p>
      ) : !data ? (
        <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Error al cargar</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", width: "100%", maxWidth: "480px" }}>
          <section>
            <p style={sectionLabel}>Top 5</p>
            {data.top.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>Sin entradas aún</p>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Nombre</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Puntos</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top.map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(96,165,250,0.12)" }}>
                      <td style={{ ...tdStyle, color: i === 0 ? "#3b82f6" : "#9ca3af", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, color: "#111827" }}>{e.name}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#3b82f6", fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 600 }}>
                        {e.score >= 0 ? "+" : ""}{e.score}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.78rem" }}>
                        {e.date ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <p style={sectionLabel}>Bottom 5</p>
            {data.bottom.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>Sin entradas aún</p>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Nombre</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Puntos</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bottom.map((e, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(96,165,250,0.12)" }}>
                      <td style={{ ...tdStyle, color: i === 0 ? "#ef4444" : "#9ca3af", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, color: "#111827" }}>{e.name}</td>
                      <td style={{ ...tdStyle, textAlign: "right", color: e.score < 0 ? "#ef4444" : "#6b7280", fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 600 }}>
                        {e.score >= 0 ? "+" : ""}{e.score}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.78rem" }}>
                        {e.date ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      <Link
        href="/juegos/laberinto"
        style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#9ca3af", textDecoration: "none", fontFamily: "var(--font-geist-mono, monospace)", transition: "color 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
      >
        ← volver al juego
      </Link>

      <a
        href="/extras"
        style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none", transition: "color 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
      >
        pacr.es
      </a>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#9ca3af",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.5rem",
};

const thStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  fontSize: "0.72rem",
  color: "#9ca3af",
  fontWeight: 500,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  fontSize: "0.9rem",
};
