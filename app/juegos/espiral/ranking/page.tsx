"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TerminalShell from "../../../components/TerminalShell";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

interface Entry {
  name: string;
  date: string | null;
  score: number;
}

export default function Ranking() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ranking/espiral")
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <TerminalShell
      title="ranking espiral"
      prompt={{ host: "espiral", path: "~/juegos", command: "cat ranking.json" }}
      backUrl="/juegos/espiral"
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
        <h1
          style={{
            color: "#16140f",
            fontSize: "1.5rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            marginBottom: "2rem",
          }}
        >
          ranking espiral
        </h1>

        {loading ? (
          <p style={{ color: "#b8b3a6", fontSize: "0.85rem" }}>cargando...</p>
        ) : error ? (
          <p style={{ color: "#b8b3a6", fontSize: "0.85rem" }}>error al cargar</p>
        ) : entries.length === 0 ? (
          <p style={{ color: "#b8b3a6", fontSize: "0.85rem" }}>sin entradas aún</p>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "480px" }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>nombre</th>
                <th style={{ ...thStyle, textAlign: "right" }}>tiempo</th>
                <th style={{ ...thStyle, textAlign: "right" }}>fecha</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(0,184,122,0.12)" }}>
                  <td style={{ ...tdStyle, color: i === 0 ? "#00b87a" : "#b8b3a6", fontWeight: i === 0 ? 700 : 400 }}>
                    {i + 1}
                  </td>
                  <td style={{ ...tdStyle, color: "#16140f" }}>{e.name}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#7a766b" }}>
                    {e.score.toFixed(1)}s
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#b8b3a6", fontSize: "0.78rem" }}>
                    {e.date ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Link
          href="/juegos/espiral"
          style={{
            marginTop: "2.5rem",
            fontSize: "0.8rem",
            color: "#b8b3a6",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00b87a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#b8b3a6")}
        >
          ← volver al juego
        </Link>

      </main>
    </TerminalShell>
  );
}

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
