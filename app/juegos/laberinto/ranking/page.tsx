"use client";

import { useEffect, useState } from "react";
import TerminalShell from "../../../components/TerminalShell";
import { thStyle, tdStyle, RankBackLink } from "../../../components/ranking";
import type { RankEntry } from "@/lib/ranking";

const MONO = "var(--t-mono)";

interface RankingData {
  top: RankEntry[];
  bottom: RankEntry[];
}

export default function RankingLaberinto() {
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ranking/laberinto")
      .then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <TerminalShell
      title="ranking laberinto"
      prompt={{ host: "laberinto", path: "~/juegos", command: "cat ranking.json" }}
      backUrl="/juegos/laberinto"
      destMaximized
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
        <h1 style={{ color: "var(--t-ink)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "2.5rem" }}>
          ranking laberinto
        </h1>

        {loading ? (
          <p style={{ color: "var(--t-ink4)", fontSize: "0.85rem" }}>cargando...</p>
        ) : !data ? (
          <p style={{ color: "var(--t-ink4)", fontSize: "0.85rem" }}>error al cargar</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", width: "100%", maxWidth: "480px" }}>
            <section>
              <p style={sectionLabel}>top 5</p>
              {data.top.length === 0 ? (
                <p style={{ color: "var(--t-ink4)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>sin entradas aún</p>
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
                        <td style={{ ...tdStyle, color: i === 0 ? "var(--t-accent)" : "var(--t-ink4)", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, color: "var(--t-ink)" }}>{e.name}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "var(--t-accent)", fontWeight: 600 }}>
                          {e.score >= 0 ? "+" : ""}{e.score}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "var(--t-ink4)", fontSize: "0.78rem" }}>
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
                <p style={{ color: "var(--t-ink4)", fontSize: "0.85rem", textAlign: "center", padding: "1rem 0" }}>sin entradas aún</p>
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
                        <td style={{ ...tdStyle, color: i === 0 ? "#ef4444" : "var(--t-ink4)", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, color: "var(--t-ink)" }}>{e.name}</td>
                        <td style={{ ...tdStyle, textAlign: "right", color: e.score < 0 ? "#ef4444" : "var(--t-ink3)", fontWeight: 600 }}>
                          {e.score >= 0 ? "+" : ""}{e.score}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: "var(--t-ink4)", fontSize: "0.78rem" }}>
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

        <RankBackLink href="/juegos/laberinto" />

      </main>
    </TerminalShell>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--t-ink4)",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.5rem",
};
