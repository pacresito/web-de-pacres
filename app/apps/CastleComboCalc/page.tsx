"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const ALL_PLAYERS = ["Lucas", "Pablo", "Prince", "Princess"];

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

function CardGridIcon({ pos }: { pos: Pos }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 7px)", gridTemplateRows: "repeat(3, 8px)", gap: "1.5px" }}>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const active = pos && pos.row === r && pos.col === c;
          return (
            <div key={`${r}-${c}`} style={{ backgroundColor: active ? "#1e40af" : "#fef9c3", border: active ? "none" : "0.5px solid #d1d5db", borderRadius: 1 }} />
          );
        })
      )}
    </div>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 26 16" width="26" height="16" fill="none">
      <circle cx="6" cy="8" r="5" stroke="#92400e" strokeWidth="1.8" />
      <circle cx="6" cy="8" r="2" fill="#92400e" />
      <line x1="11" y1="8" x2="25" y2="8" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="20" y1="8" x2="20" y2="11.5" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="23.5" y1="8" x2="23.5" y2="11.5" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function emptyScores(n: number) {
  return Array.from({ length: n }, () => Array(10).fill(null) as (number | null)[]);
}

export default function CastleComboCalc() {
  const [numPlayers, setNumPlayers] = useState(2);
  const [scores, setScores] = useState<(number | null)[][]>(emptyScores(2));
  const [stepPlayer, setStepPlayer] = useState(0);
  const [stepPos, setStepPos] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const gameStarted = stepPlayer > 0 || stepPos > 0 || scores[0][0] !== null;

  useEffect(() => {
    if (!done) inputRef.current?.focus();
  }, [stepPlayer, stepPos, done]);

  const changeNumPlayers = (n: number) => {
    setNumPlayers(n);
    setScores(emptyScores(n));
    setStepPlayer(0);
    setStepPos(0);
    setInputVal("");
    setDone(false);
  };

  const confirm = () => {
    const trimmed = inputVal.trim();
    if (trimmed === "") return;
    const val = parseInt(trimmed, 10);
    if (isNaN(val)) return;

    const newScores = scores.map((r) => [...r]);
    newScores[stepPlayer][stepPos] = val;
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
  const totals = scores.map((ps) => ps.reduce((s, v) => s + (v ?? 0), 0));
  const maxTotal = done ? Math.max(...totals) : null;
  const cols = `2.5rem ${Array(numPlayers).fill("1fr").join(" ")}`;

  return (
    <main className="min-h-screen flex flex-col items-center py-6 px-4" style={{ background: "#ffffff" }}>
      <div className="w-full" style={{ maxWidth: numPlayers <= 2 ? "20rem" : numPlayers === 3 ? "26rem" : "32rem" }}>

        {/* Title */}
        <h1 className="text-center text-xl font-bold text-blue-900 mb-5 tracking-wide">
          Castle Combo
        </h1>

        {/* Player count selector */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => changeNumPlayers(n)}
              disabled={gameStarted && numPlayers === n}
              className="rounded-lg px-3 py-1 text-sm font-semibold transition-colors"
              style={
                numPlayers === n
                  ? { background: "#3b82f6", color: "#fff" }
                  : { background: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe" }
              }
            >
              {n} jugadores
            </button>
          ))}
        </div>

        {/* Winner banner */}
        {done && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-center font-bold text-base"
            style={
              maxTotal !== null && totals.filter((t) => t === maxTotal).length > 1
                ? { background: "#f3f4f6", color: "#4b5563", border: "1px solid #e5e7eb" }
                : { background: "#fbbf24", color: "#78350f" }
            }
          >
            {maxTotal !== null && totals.filter((t) => t === maxTotal).length > 1
              ? "Empate"
              : `Gana ${players[totals.indexOf(maxTotal!)]}`}
          </div>
        )}

        {/* Scoring table */}
        <div className="rounded-2xl overflow-hidden shadow-lg border border-blue-300">
          {/* Header */}
          <div className="grid text-white font-bold text-sm" style={{ gridTemplateColumns: cols, background: "#3b82f6" }}>
            <div className="h-12 flex items-center justify-center">
              <span className="text-base">🏰</span>
            </div>
            {players.map((p, i) => (
              <div
                key={i}
                className="h-12 flex items-center justify-center text-sm font-bold transition-colors"
                style={
                  done && totals[i] === maxTotal
                    ? { background: "#fbbf24", color: "#78350f" }
                    : !done && stepPlayer === i
                    ? { background: "#2563eb" }
                    : {}
                }
              >
                {p}
              </div>
            ))}
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
                  background: isActiveRow ? "#bfdbfe" : even ? "#ffffff" : "#eff6ff",
                  outline: isActiveRow ? "2px solid #3b82f6" : "none",
                  outlineOffset: "-2px",
                }}
              >
                <div className="h-10 flex items-center justify-center">
                  {posItem.isKey ? <KeyIcon /> : <CardGridIcon pos={posItem.pos} />}
                </div>
                {players.map((_, pi) => {
                  const val = scores[pi][rowIdx];
                  const isActiveCell = isActiveRow && !done && stepPlayer === pi;
                  return (
                    <div
                      key={pi}
                      className="h-10 flex items-center justify-center font-mono text-sm"
                      style={
                        isActiveCell
                          ? { color: "#1d4ed8", fontWeight: 700 }
                          : val !== null
                          ? { color: "#1e293b" }
                          : { color: "#cbd5e1" }
                      }
                    >
                      {val !== null ? val : isActiveCell ? "·" : "—"}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Total row */}
          <div className="grid text-white font-bold" style={{ gridTemplateColumns: cols, background: "#3b82f6" }}>
            <div className="h-12 flex items-center justify-center text-lg">Σ</div>
            {totals.map((total, i) => (
              <div
                key={i}
                className="h-12 flex items-center justify-center text-lg font-bold"
                style={done && totals[i] === maxTotal ? { color: "#fef08a" } : {}}
              >
                {scores[i].some((v) => v !== null) ? total : "—"}
              </div>
            ))}
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
