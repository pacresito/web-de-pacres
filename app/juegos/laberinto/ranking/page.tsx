"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TerminalShell from "../../../components/TerminalShell";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

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
    <TerminalShell
      title="ranking laberinto"
      prompt={{ host: "laberinto", path: "~/juegos", command: "cat ranking.json" }}
      backUrl="/juegos/laberinto"
    >
      <main
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          position: "relative",
          fontFamily: MONO,
        }}
      >
        <h1 style={{ color: "#16140f", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "2.5rem" }}>
          ranking laberinto
        </h1>

        {loading ? (
          <p style={{ color: "#b8b3a6", fontSize: "0.85rem" }}>cargando...</p>
        ) : !data ? (
          <p style={{ color: "#b8b3a6", fontSize: "0.85rem" }}>error al cargar</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", width: "100%", maxWidth: "480px" }}>
            <section>
              <p style={sectionLabel}>top 5</p>
              {data.top.length === 0 ? (
                <p style={{ color: "#b8b3a6", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>sin entradas aún</p>
              ) : (
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>nombre</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>puntos</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top.map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,184,122,0.12)" }}>
                        <td style={{ ...tdStyle, color: i === 0 ? "#00b87a" : "#b8b3a6", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, color: "#16140f" }}>{e.name}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#00b87a", fontWeight: 600 }}>
                          {e.score >= 0 ? "+" : ""}{e.score}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#b8b3a6", fontSize: "0.78rem" }}>
                          {e.date ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section>
              <p style={sectionLabel}>bottom 5</p>
              {data.bottom.length === 0 ? (
                <p style={{ color: "#b8b3a6", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>sin entradas aún</p>
              ) : (
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>nombre</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>puntos</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bottom.map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,184,122,0.12)" }}>
                        <td style={{ ...tdStyle, color: i === 0 ? "#ef4444" : "#b8b3a6", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, color: "#16140f" }}>{e.name}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: e.score < 0 ? "#ef4444" : "#7a766b", fontWeight: 600 }}>
                          {e.score >= 0 ? "+" : ""}{e.score}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "#b8b3a6", fontSize: "0.78rem" }}>
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
          style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#b8b3a6", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00b87a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#b8b3a6")}
        >
          ← volver al juego
        </Link>

        <a
          href="/lab"
          style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#b8b3a6", textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00b87a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#b8b3a6")}
        >
          pacr.es
        </a>
      </main>
    </TerminalShell>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#b8b3a6",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.5rem",
};

const thStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  fontSize: "0.72rem",
  color: "#b8b3a6",
  fontWeight: 500,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  fontSize: "0.9rem",
};
