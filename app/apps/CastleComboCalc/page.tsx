"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const ALL_PLAYERS = ["Lucas", "Pablo", "Prince", "Princess", "His Majesty", "Her Majesty"];

type Pos = { row: number; col: number } | null;

const POSITIONS: { label: string; pos: Pos; isKey?: boolean }[] = [
  { label: "Superior izquierda", pos: { row: 0, col: 0 } },
  { label: "Superior centro",    pos: { row: 0, col: 1 } },
  { label: "Superior derecha",   pos: { row: 0, col: 2 } },
  { label: "Centro izquierda",   pos: { row: 1, col: 0 } },
  { label: "Centro",             pos: { row: 1, col: 1 } },
  { label: "Centro derecha",     pos: { row: 1, col: 2 } },
  { label: "Inferior izquierda", pos: { row: 2, col: 0 } },
  { label: "Inferior centro",    pos: { row: 2, col: 1 } },
  { label: "Inferior derecha",   pos: { row: 2, col: 2 } },
  { label: "Llaves",             pos: null, isKey: true },
];

function PinIcon() {
  return (
    <svg viewBox="0 0 10 13" width="4" height="6" fill="none" preserveAspectRatio="none">
      <path d="M5 0.5C2.5 0.5 0.5 2.6 0.5 5C0.5 8 5 12.5 5 12.5C5 12.5 9.5 8 9.5 5C9.5 2.6 7.5 0.5 5 0.5Z" fill="#374151" stroke="#1f2937" strokeWidth="0.5"/>
      <circle cx="5" cy="4.8" r="1.6" fill="white"/>
    </svg>
  );
}

function CardGridIcon({ pos }: { pos: Pos }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 7px)", gridTemplateRows: "repeat(3, 10px)", gap: "1px" }}>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const active = pos && pos.row === r && pos.col === c;
          return (
            <div
              key={`${r}-${c}`}
              style={{
                backgroundColor: "#fffde8",
                border: active ? "1px solid #374151" : "0.5px solid #b0b0b0",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {active && <PinIcon />}
            </div>
          );
        })
      )}
    </div>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 36 36" width="26" height="26" fill="none">
      <g transform="rotate(20, 18, 18)">
        <circle cx="18" cy="8" r="6" stroke="#92400e" strokeWidth="2.2" fill="none"/>
        <circle cx="18" cy="8" r="2.4" fill="#92400e"/>
        <rect x="16.5" y="14" width="3" height="18" rx="1.5" fill="#92400e"/>
        <rect x="19.5" y="23" width="5" height="2.5" rx="0.6" fill="#92400e"/>
        <rect x="19.5" y="26.5" width="3.5" height="1.8" rx="0.6" fill="#92400e"/>
        <rect x="19.5" y="29.5" width="5" height="2.5" rx="0.6" fill="#92400e"/>
      </g>
    </svg>
  );
}

function emptyScores(n: number) {
  return Array.from({ length: n }, () => Array(10).fill(null) as (number | null | "heart")[]);
}

export default function CastleComboCalc() {
  const [numPlayers, setNumPlayers] = useState(2);
  const [scores, setScores] = useState<(number | null | "heart")[][]>(emptyScores(2));
  const [stepPlayer, setStepPlayer] = useState(0);
  const [stepPos, setStepPos] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const gameStarted = stepPlayer > 0 || stepPos > 0 || scores[0][0] !== null;

  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [stepPlayer, stepPos, done]);

  const addPlayer = () => {
    const n = numPlayers + 1;
    setNumPlayers(n);
    setScores(emptyScores(n));
  };

  const confirm = () => {
    const trimmed = inputVal.trim();
    if (trimmed === "") return;
    const val = parseInt(trimmed, 10);
    if (isNaN(val)) return;
    const stored: number | "heart" = val < 0 ? 0 : val > 99 ? "heart" : val;

    const newScores = scores.map((r) => [...r]);
    newScores[stepPlayer][stepPos] = stored;
    setScores(newScores);
    setInputVal("");

    if (stepPos < 9) {
      setStepPos(stepPos + 1);
    } else if (stepPlayer < numPlayers - 1) {
      setStepPlayer(stepPlayer + 1);
      setStepPos(0);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setScores(emptyScores(numPlayers));
    setStepPlayer(0);
    setStepPos(0);
    setInputVal("");
    setDone(false);
  };

  const players = ALL_PLAYERS.slice(0, numPlayers);
  const totals = scores.map((ps) => ps.reduce((s: number, v) => s + (v === "heart" ? 0 : (v ?? 0)), 0));
  const maxTotal = done ? Math.max(...totals) : null;
  const anyHeart = scores.some((ps) => ps.includes("heart"));
  const showAddButton = !gameStarted && numPlayers < 6;
  const cols = `3.5rem ${Array(numPlayers).fill("1fr").join(" ")}${showAddButton ? " 2rem" : ""}`;

  const maxWidths: Record<number, string> = { 2: "20rem", 3: "26rem", 4: "32rem", 5: "38rem", 6: "44rem" };

  return (
    <main className="min-h-screen flex flex-col items-center py-6 px-4" style={{ background: "#EBF5FB" }}>
      <div className="w-full" style={{ maxWidth: maxWidths[numPlayers] ?? "44rem" }}>

        {/* Title */}
        <h1 className="text-center text-xl font-bold text-blue-900 mb-5 tracking-wide">
          Castle Combo
        </h1>

        {/* Winner banner */}
        {done && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-center font-bold text-base"
            style={
              anyHeart
                ? { background: "linear-gradient(135deg, #fbbf24, #34d399, #60a5fa, #f472b6)", color: "#fff" }
                : maxTotal !== null && totals.filter((t) => t === maxTotal).length > 1
                ? { background: "#f3f4f6", color: "#4b5563", border: "1px solid #e5e7eb" }
                : { background: "#fbbf24", color: "#78350f" }
            }
          >
            {anyHeart
              ? "Todo el mundo gana 🌈"
              : maxTotal !== null && totals.filter((t) => t === maxTotal).length > 1
              ? "Empate"
              : `Gana ${players[totals.indexOf(maxTotal!)]}`}
          </div>
        )}

        {/* Scoring table */}
        <div className="rounded-2xl overflow-hidden shadow-lg">
          {/* Header */}
          <div className="grid text-white font-bold text-sm" style={{ gridTemplateColumns: cols, background: "#4d91c0", borderBottom: "5px solid rgba(255,255,255,0.9)" }}>
            <div className="h-12 flex items-center justify-center">
              <span style={{ fontSize: "1.875rem" }}>🏰</span>
            </div>
            {players.map((p, i) => (
              <div
                key={i}
                className="h-12 flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  borderRight: "1px solid rgba(0,0,0,0.3)",
                  background: "#78b5d0",
                  ...(done
                    ? { background: "#fbbf24", color: "#78350f" }
                    : {}),
                }}
              >
                {p}
              </div>
            ))}
            {showAddButton && (
              <div className="h-12 flex items-center justify-center" style={{ background: "#78b5d0" }}>
                <button
                  onClick={addPlayer}
                  className="flex items-center justify-center rounded-full text-white font-bold transition-colors"
                  style={{ background: "#4d91c0", width: "1.25rem", height: "1.25rem", fontSize: "0.85rem", lineHeight: 1 }}
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Card rows */}
          {POSITIONS.map((posItem, rowIdx) => {
            const isActiveRow = !done && stepPos === rowIdx;
            const even = rowIdx % 2 === 0;
            return (
              <div
                key={rowIdx}
                className="grid transition-all"
                style={{
                  gridTemplateColumns: cols,
                  background: even ? "#b5d9ee" : "#ffffff",
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    height: "38px",
                    background: even ? "#9dc8dc" : "#cce6f4",
                  }}
                >
                  {posItem.isKey ? <KeyIcon /> : <CardGridIcon pos={posItem.pos} />}
                </div>
                {players.map((_, pi) => {
                  const val = scores[pi][rowIdx];
                  const isActiveCell = isActiveRow && !done && stepPlayer === pi;
                  return (
                    <div
                      key={pi}
                      className="flex items-center justify-center font-mono text-sm"
                      style={{
                        height: "38px",
                        borderRight: "1px solid rgba(0,0,0,0.3)",
                        color: val !== null ? "#1e293b" : "#cbd5e1",
                        ...(isActiveCell ? { boxShadow: "inset 0 0 0 2px #4d91c0" } : {}),
                      }}
                    >
                      {val !== null ? (val === "heart" ? "💙" : val) : ""}
                    </div>
                  );
                })}
                {showAddButton && <div style={{ height: "38px" }} />}
              </div>
            );
          })}

          {/* Total row */}
          <div className="grid text-white font-bold" style={{ gridTemplateColumns: cols, background: "#4d91c0", borderTop: "2px solid rgba(0,0,0,0.5)" }}>
            <div className="h-12 flex items-center justify-center text-2xl" style={{ background: "#4d91c0" }}>Σ</div>
            {totals.map((total, i) => (
              <div
                key={i}
                className="h-12 flex items-center justify-center text-xl font-bold"
                style={{
                  borderRight: "1px solid rgba(0,0,0,0.3)",
                  background: "#78b5d0",
                  ...(done && totals[i] === maxTotal ? { color: "#fef08a" } : {}),
                }}
              >
                {scores[i].some((v) => v !== null) ? total : ""}
              </div>
            ))}
            {showAddButton && <div className="h-12" style={{ background: "#78b5d0" }} />}
          </div>
        </div>

        {/* Input area */}
        {!done ? (
          <div className="mt-5 bg-white rounded-2xl px-4 pt-4 pb-5 shadow border border-blue-100">
            <p className="text-center font-bold text-blue-800 text-base mb-0.5">
              {players[stepPlayer]}
            </p>
            <p className="text-center text-gray-400 text-xs mb-3">
              {POSITIONS[stepPos].label}
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirm()}
                placeholder="0"
                className="flex-1 border-2 border-blue-200 rounded-xl px-3 py-3 text-2xl text-center font-bold focus:outline-none focus:border-blue-500 text-blue-900"
                style={{ minWidth: 0 }}
              />
              <button
                onClick={confirm}
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl px-5 text-xl font-bold transition-colors"
              >
                →
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 text-center">
            <button
              onClick={reset}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl px-8 py-3 font-bold transition-colors"
            >
              Nueva partida
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/lab" className="text-gray-400 text-xs hover:text-blue-500 transition-colors">
            pacr.es
          </Link>
        </div>
      </div>
    </main>
  );
}
