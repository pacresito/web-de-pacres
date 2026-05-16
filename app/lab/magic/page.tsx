"use client";

import { useEffect, useRef, useState } from "react";

interface Card {
  suit: string;
  value: string;
  red: boolean;
}

function buildDeck(): Card[] {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = ["A", "2", "3", "4", "5", "6"];
  const cards: Card[] = [];
  for (const suit of suits) {
    const count = suit === "♣" ? 3 : 6;
    for (let i = 0; i < count; i++) {
      cards.push({ suit, value: values[i], red: suit === "♥" || suit === "♦" });
    }
  }
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCol(deck: Card[], col: number): Card[] {
  return Array.from({ length: 7 }, (_, row) => deck[row * 3 + col]);
}

function reorderDeck(deck: Card[], col: number): Card[] {
  const cols = [getCol(deck, 0), getCol(deck, 1), getCol(deck, 2)];
  const others = cols.filter((_, i) => i !== col);
  return [...others[0], ...cols[col], ...others[1]];
}

const ALPHABET = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","Ñ",
  "O","P","Q","R","S","T","U","V","W","X","Y","Z",
];

const ANIMALS = [
  { letter: "I", emoji: "🦎", text: "La iguana que imaginaste te trae tu carta" },
  { letter: "Ñ", emoji: "🐃", text: "El ñu que imaginaste te trae tu carta" },
  { letter: "K", emoji: "🐨", text: "El koala que imaginaste te trae tu carta" },
];

type Phase = "intro" | "dealing" | "transition" | "spinner" | "reveal";

export default function Magic() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [deck, setDeck] = useState<Card[]>(() => shuffle(buildDeck()));
  const [round, setRound] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [spinLetter, setSpinLetter] = useState("A");
  const [spinDone, setSpinDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardW, setCardW] = useState(54);

  useEffect(() => {
    function calc() {
      const vw = Math.min(window.innerWidth, 480);
      setCardW(Math.min(68, Math.max(44, Math.floor((vw - 72) / 3))));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // animalIdx: primera partida → 0 (I), segunda → 1 (Ñ), tercera → 2 (K), luego cicla
  const animalIdx = playCount === 0 ? 0 : (playCount - 1) % 3;
  const animal = ANIMALS[animalIdx];
  const revealCard = deck[10];

  function startGame() {
    setDeck(shuffle(buildDeck()));
    setRound(0);
    setSpinDone(false);
    setPlayCount((c) => c + 1);
    setPhase("dealing");
  }

  function onColClick(col: number) {
    if (phase !== "dealing") return;
    const newDeck = reorderDeck(deck, col);
    setDeck(newDeck);
    if (round === 2) {
      setPhase("transition");
      setTimeout(() => setPhase("spinner"), 2800);
    } else {
      setRound((r) => r + 1);
    }
  }

  useEffect(() => {
    if (phase !== "spinner") return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const targetIdx = ALPHABET.indexOf(animal.letter);
    const startIdx = Math.floor(Math.random() * ALPHABET.length);
    const diff = ((targetIdx - startIdx) + ALPHABET.length) % ALPHABET.length;
    const totalSteps = 3 * ALPHABET.length + diff;

    let step = 0;
    function tick() {
      step++;
      setSpinLetter(ALPHABET[(startIdx + step) % ALPHABET.length]);
      if (step >= totalSteps) {
        setSpinDone(true);
        return;
      }
      const remaining = totalSteps - step;
      const delay =
        remaining > 14 ? 55
        : remaining > 5 ? 55 + (14 - remaining) * 28
        : 390 + (5 - remaining) * 90;
      timerRef.current = setTimeout(tick, delay);
    }
    timerRef.current = setTimeout(tick, 55);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, animalIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const mono = "var(--font-geist-mono, monospace)";
  const cardH = Math.floor(cardW * 1.42);
  const gap = Math.max(3, Math.floor(cardW * 0.07));

  function CardView({ card, w }: { card: Card; w: number }) {
    const h = Math.floor(w * 1.42);
    const fs = Math.max(8, Math.floor(w * 0.19));
    const suitFs = Math.max(14, Math.floor(w * 0.38));
    return (
      <div style={{
        width: w, height: h,
        border: `1px solid ${card.red ? "rgba(239,68,68,0.22)" : "rgba(0,0,0,0.1)"}`,
        borderRadius: 5, background: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: card.red ? "#ef4444" : "#111827",
        fontFamily: mono, fontWeight: 700, userSelect: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative", flexShrink: 0,
      }}>
        <span style={{ position: "absolute", top: 2, left: 4, fontSize: fs }}>{card.value}</span>
        <span style={{ fontSize: suitFs, lineHeight: 1 }}>{card.suit}</span>
        <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: fs, transform: "rotate(180deg)" }}>{card.value}</span>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", minHeight: "100dvh",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1rem 5rem", position: "relative",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 55% { transform: scale(1.14); } 75% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes cardDrop { 0% { opacity: 0; transform: translateY(-16px) scale(0.88); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* INTRO */}
      {phase === "intro" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", marginTop: "5rem", animation: "fadeUp 0.5s ease" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ color: "#111827", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              ¿Puedes guardar un secreto?
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.88rem", marginTop: "0.75rem", fontFamily: mono }}>
              Piensa en una de las cartas que vas a ver. Solo una.
            </p>
          </div>
          <button
            onClick={startGame}
            style={{
              padding: "0.6rem 1.6rem", background: "#111827", color: "#fff",
              border: "none", borderRadius: 8, fontSize: "0.88rem", fontFamily: mono, cursor: "pointer",
            }}
          >
            Estoy listo
          </button>
        </div>
      )}

      {/* DEALING */}
      {phase === "dealing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%", animation: "fadeUp 0.3s ease" }}>
          <div style={{ textAlign: "center", marginBottom: "0.25rem" }}>
            <p style={{ color: "#9ca3af", fontSize: "0.7rem", fontFamily: mono }}>Ronda {round + 1} de 3</p>
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 600, marginTop: "0.3rem" }}>
              ¿En qué columna está tu carta?
            </p>
          </div>
          <div key={round} style={{ display: "flex", gap: 14, alignItems: "flex-start", animation: "fadeUp 0.25s ease" }}>
            {[0, 1, 2].map((col) => (
              <div
                key={col}
                onClick={() => onColClick(col)}
                style={{
                  display: "flex", flexDirection: "column", gap,
                  padding: "8px 6px", borderRadius: 8,
                  border: "2px solid rgba(96,165,250,0.12)",
                  cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#3b82f6";
                  (e.currentTarget as HTMLDivElement).style.background = "#f0f6ff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(96,165,250,0.12)";
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                {getCol(deck, col).map((card, i) => (
                  <CardView key={i} card={card} w={cardW} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRANSITION */}
      {phase === "transition" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem",
          marginTop: "8rem", textAlign: "center", animation: "fadeUp 0.5s ease",
        }}>
          <p style={{ color: "#111827", fontSize: "1.2rem", fontWeight: 600 }}>Ya tengo lo que necesito.</p>
          <p style={{ color: "#9ca3af", fontSize: "0.88rem", fontFamily: mono }}>Olvida tu carta un momento.</p>
          <p style={{ color: "#9ca3af", fontSize: "0.82rem", fontFamily: mono, marginTop: "0.5rem" }}>
            Vamos a necesitar un poco de magia extra...
          </p>
        </div>
      )}

      {/* SPINNER */}
      {phase === "spinner" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem",
          marginTop: "4rem", textAlign: "center", animation: "fadeUp 0.5s ease",
        }}>
          <p style={{ color: "#9ca3af", fontSize: "0.82rem", fontFamily: mono }}>
            {spinDone ? "Piensa en un animal que empiece por..." : "La magia está eligiendo una letra..."}
          </p>
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            border: `3px solid ${spinDone ? "#3b82f6" : "rgba(96,165,250,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "3.5rem", fontWeight: 800, color: spinDone ? "#3b82f6" : "#374151",
            fontFamily: mono, transition: "border-color 0.4s, color 0.4s",
            boxShadow: spinDone ? "0 0 22px rgba(59,130,246,0.22)" : "none",
          }}>
            {spinLetter}
          </div>
          {spinDone && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", animation: "fadeUp 0.4s ease" }}>
              <p style={{ color: "#111827", fontSize: "0.9rem", fontFamily: mono }}>¿Ya lo tienes?</p>
              <button
                onClick={() => setPhase("reveal")}
                style={{
                  padding: "0.6rem 1.6rem", background: "#3b82f6", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: "0.88rem", fontFamily: mono, cursor: "pointer",
                }}
              >
                Sí
              </button>
            </div>
          )}
        </div>
      )}

      {/* REVEAL */}
      {phase === "reveal" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginTop: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "6rem", lineHeight: 1, animation: "bounceIn 0.65s ease" }}>
            {animal.emoji}
          </div>
          <div style={{ animation: "cardDrop 0.45s ease 0.5s both" }}>
            <CardView card={revealCard} w={88} />
          </div>
          <p style={{ color: "#111827", fontSize: "1.05rem", fontWeight: 600, maxWidth: 280, animation: "fadeUp 0.5s ease 0.85s both" }}>
            {animal.text}.
          </p>
          <button
            onClick={startGame}
            style={{
              marginTop: "0.25rem", background: "none", border: "none", cursor: "pointer",
              color: "#9ca3af", fontSize: "0.78rem", fontFamily: mono,
              animation: "fadeUp 0.5s ease 1.2s both",
            }}
          >
            Volver a intentarlo →
          </button>
        </div>
      )}

      <a
        href="/lab"
        style={{
          marginTop: "auto", paddingTop: "2rem",
          fontSize: "0.75rem", color: "#9ca3af", fontFamily: mono,
          textDecoration: "none", transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
      >
        pacr.es
      </a>
    </div>
  );
}
