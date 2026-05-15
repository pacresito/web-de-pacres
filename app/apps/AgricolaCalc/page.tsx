"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const PLAYERS = ["Lucas", "Pablo"];

type Animal = "sheep" | "pig" | "cow" | "horse";
const ANIMALS: Animal[] = ["sheep", "pig", "cow", "horse"];
const ANIMAL_ICONS: Record<Animal, string> = { sheep: "🐑", pig: "🐷", cow: "🐄", horse: "🐴" };

function calcTablePts(count: number, animal: Animal): number {
  if (count <= 3) return -3;
  const base3: Record<Animal, number> = { sheep: 13, pig: 11, cow: 10, horse: 9 };
  if (count >= base3[animal]) return 3 + (count - base3[animal]);
  const ranges: Record<Animal, [number, number][]> = {
    sheep: [[4, 7], [8, 10], [11, 12]],
    pig:   [[4, 6], [7,  8], [9,  10]],
    cow:   [[4, 5], [6,  7], [8,   9]],
    horse: [[4, 4], [5,  6], [7,   8]],
  };
  for (let pts = 0; pts <= 2; pts++) {
    const [lo, hi] = ranges[animal][pts];
    if (count >= lo && count <= hi) return pts;
  }
  return 0;
}

const STEP_TO_ROW = [0, 1, 2, 3, 10, 11];
const STEP_LABELS = [
  "Ovejas 🐑", "Cerdos 🐷", "Vacas 🐄", "Caballos 🐴",
  "Puntos de terreno", "Puntos de edificios",
];

type RowDef =
  | { kind: "animal"; animal: Animal; idx: number }
  | { kind: "sigma1" }
  | { kind: "bonus"; animal: Animal; idx: number }
  | { kind: "sigma2" }
  | { kind: "terrains" }
  | { kind: "buildings" }
  | { kind: "final" };

const ROWS: RowDef[] = [
  { kind: "animal",   animal: "sheep", idx: 0 },
  { kind: "animal",   animal: "pig",   idx: 1 },
  { kind: "animal",   animal: "cow",   idx: 2 },
  { kind: "animal",   animal: "horse", idx: 3 },
  { kind: "sigma1" },
  { kind: "bonus",    animal: "sheep", idx: 0 },
  { kind: "bonus",    animal: "pig",   idx: 1 },
  { kind: "bonus",    animal: "cow",   idx: 2 },
  { kind: "bonus",    animal: "horse", idx: 3 },
  { kind: "sigma2" },
  { kind: "terrains" },
  { kind: "buildings" },
  { kind: "final" },
];

function emptyScores() {
  return Array.from({ length: 2 }, () => Array(6).fill(null) as (number | null | "heart")[]);
}

function getDerived(s: (number | null | "heart")[]) {
  const counts = s.slice(0, 4) as (number | null | "heart")[];
  const numCounts = counts.map((v) => (v === "heart" ? 0 : v)) as (number | null)[];
  const tablePts = ANIMALS.map((a, i) =>
    numCounts[i] !== null ? calcTablePts(numCounts[i]!, a) : null
  );
  const sigma1 = counts.every((v) => v !== null)
    ? (numCounts as number[]).reduce((a, b) => a + b, 0)
    : null;
  const tableSum = tablePts.every((v) => v !== null)
    ? (tablePts as number[]).reduce((a, b) => a + b, 0)
    : null;
  const sigma2 = tableSum;
  const terrainPts = s[4];
  const buildingPts = s[5];
  const numTerrainPts = terrainPts === "heart" ? 0 : terrainPts;
  const numBuildingPts = buildingPts === "heart" ? 0 : buildingPts;
  const final =
    sigma1 !== null && sigma2 !== null && numTerrainPts !== null && numBuildingPts !== null
      ? sigma1 + sigma2 + numTerrainPts + numBuildingPts
      : null;
  return { counts, tablePts, sigma1, sigma2, terrainPts, buildingPts, final };
}

function TerrainIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
      <rect x="0.5" y="0.5"  width="13" height="5" rx="1" fill="#7B9E6B" stroke="#4A6741" strokeWidth="0.8"/>
      <rect x="0.5" y="7.5"  width="13" height="5" rx="1" fill="#8CAF7B" stroke="#4A6741" strokeWidth="0.8"/>
      <rect x="0.5" y="14.5" width="13" height="5" rx="1" fill="#9BBF8A" stroke="#4A6741" strokeWidth="0.8"/>
    </svg>
  );
}

function getRowIcon(row: RowDef) {
  if (row.kind === "animal") return <span>{ANIMAL_ICONS[row.animal]}</span>;
  if (row.kind === "bonus")  return <span style={{ fontSize: "0.7rem" }}>!{ANIMAL_ICONS[row.animal]}</span>;
  if (row.kind === "sigma1" || row.kind === "sigma2") return <span>Σ</span>;
  if (row.kind === "terrains") return <TerrainIcon />;
  if (row.kind === "buildings") return <span>🏠</span>;
  if (row.kind === "final") return <span>Σ</span>;
  return null;
}

function getCellValue(row: RowDef, d: ReturnType<typeof getDerived>): number | null | "heart" {
  switch (row.kind) {
    case "animal":    return d.counts[row.idx];
    case "sigma1":    return d.sigma1;
    case "bonus":     return d.tablePts[row.idx];
    case "sigma2":    return d.sigma2;
    case "terrains":  return d.terrainPts;
    case "buildings": return d.buildingPts;
    case "final":     return d.final;
  }
}

const C = {
  headerBg:   "#3D2B1F",
  sigmaGreen: "#4A6741",
  sigmaLight: "#5C7A52",
  finalBg:    "#2D1F14",
  parchA:     "#F5E6C8",
  parchB:     "#EDD9A3",
  parchIconA: "#E8D5A3",
  parchIconB: "#DFC88A",
  amber:      "#C4832A",
  text:       "#2C1810",
  cream:      "#FFF8E7",
  gold:       "#8B6914",
};

type RegistroRecord = {
  date: string;
  players: string[];
  inputs: number[][];
  finals: number[];
  winner: string;
};

type RegistroPage = {
  records: RegistroRecord[];
  total: number;
  page: number;
  totalPages: number;
};

function DetailTable({ record }: { record: RegistroRecord }) {
  const { players, inputs, finals } = record;
  const maxFinal = Math.max(...finals);
  const scores = inputs.map((inp) =>
    inp.map((v, i) => (i < 4 ? v : v) as number | null | "heart")
  );
  const derived = scores.map((s) => getDerived(s));

  return (
    <div className="rounded-xl overflow-hidden mt-2" style={{ border: `2px solid ${C.headerBg}` }}>
      <div className="grid font-bold text-xs" style={{ gridTemplateColumns: "3rem 1fr 1fr", background: C.headerBg, borderBottom: `2px solid ${C.amber}` }}>
        <div className="h-9 flex items-center justify-center text-lg" style={{ color: C.amber }}>🌾</div>
        {players.map((p, pi) => (
          <div key={pi} className="h-9 flex items-center justify-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.12)", background: C.amber, color: C.cream }}>{p}</div>
        ))}
      </div>
      {ROWS.map((row, rowIdx) => {
        const isFinal = row.kind === "final";
        const isSigma = row.kind === "sigma1" || row.kind === "sigma2" || isFinal;
        const even = rowIdx % 2 === 0;
        const rowBg = isFinal ? C.finalBg : isSigma ? C.sigmaGreen : even ? C.parchA : C.parchB;
        const iconBg = isFinal ? "rgba(255,255,255,0.08)" : isSigma ? C.sigmaLight : even ? C.parchIconA : C.parchIconB;
        const rowText = isSigma ? C.cream : C.text;
        return (
          <div key={rowIdx} className="grid" style={{ gridTemplateColumns: "3rem 1fr 1fr", background: rowBg, borderTop: isSigma ? `2px solid ${isFinal ? C.amber : "rgba(255,255,255,0.25)"}` : undefined }}>
            <div className="flex items-center justify-center text-xs font-bold" style={{ height: 32, background: iconBg, color: rowText }}>
              {getRowIcon(row)}
            </div>
            {[0, 1].map((pi) => {
              const val = getCellValue(row, derived[pi]);
              return (
                <div key={pi} className="flex items-center justify-center font-mono text-xs font-bold" style={{ height: 32, borderLeft: "1px solid rgba(0,0,0,0.12)", color: val !== null ? isSigma ? C.cream : typeof val === "number" && val < 0 ? "#B91C1C" : C.text : "rgba(0,0,0,0.12)" }}>
                  {val !== null ? (val === "heart" ? "💚" : val) : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function RegistroSection() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RegistroPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registro/agricola?page=${page}`);
      const json = await res.json();
      setData(json);
      setExpanded(null);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open && !data) load(1);
    setOpen((v) => !v);
  };

  return (
    <div className="mt-4 text-center">
      <button onClick={toggle} className="text-xs transition-colors" style={{ color: C.amber }}>
        Registro {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 text-left">
          {loading && <p className="text-xs text-center" style={{ color: C.gold }}>Cargando…</p>}

          {data && data.records.length === 0 && (
            <p className="text-xs text-center" style={{ color: C.gold }}>No hay partidas guardadas.</p>
          )}

          {data && data.records.map((rec, i) => (
            <div key={i} className="mb-3 rounded-xl px-3 py-2" style={{ background: C.cream, border: `1px solid ${C.amber}` }}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs" style={{ color: C.text }}>
                  <span className="font-mono">{rec.date}</span>
                  {" · "}
                  {rec.players.map((p, pi) => (
                    <span key={pi}>
                      {p} <span className="font-bold">{rec.finals[pi]}</span>
                      {pi < rec.players.length - 1 ? " · " : ""}
                    </span>
                  ))}
                  {" · "}
                  <span className="font-bold" style={{ color: C.amber }}>🏆 {rec.winner}</span>
                </div>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="text-xs shrink-0"
                  style={{ color: C.amber }}
                >
                  {expanded === i ? "Cerrar" : "Ver"}
                </button>
              </div>
              {expanded === i && <DetailTable record={rec} />}
            </div>
          ))}

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-2">
              <button onClick={() => load(data.page - 1)} disabled={data.page <= 1} className="text-xs disabled:opacity-30" style={{ color: C.amber }}>← Anterior</button>
              <span className="text-xs" style={{ color: C.gold }}>{data.page} / {data.totalPages}</span>
              <button onClick={() => load(data.page + 1)} disabled={data.page >= data.totalPages} className="text-xs disabled:opacity-30" style={{ color: C.amber }}>Siguiente →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgricolaCalc() {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const [scores, setScores] = useState(emptyScores());
  const [step, setStep] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const currentPlayer = Math.floor(step / 6);
  const localStep = step % 6;
  const currentRow = STEP_TO_ROW[localStep];

  useEffect(() => {
    if (!done && unlocked) inputRef.current?.focus();
  }, [step, done, unlocked]);

  useEffect(() => {
    if (!unlocked) passwordRef.current?.focus();
  }, [unlocked]);

  const unlock = () => {
    if (passwordInput === "***REMOVED***") {
      setUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const confirm = () => {
    const trimmed = inputVal.trim();
    if (trimmed === "") return;
    const val = parseInt(trimmed, 10);
    if (isNaN(val)) return;
    const stored: number | "heart" = val < 0 ? 0 : val > 99 ? "heart" : val;
    const newScores = scores.map((r) => [...r]);
    newScores[currentPlayer][localStep] = stored;
    setScores(newScores);
    setInputVal("");
    if (step < 11) setStep(step + 1);
    else setDone(true);
  };

  const reset = () => {
    setScores(emptyScores());
    setStep(0);
    setInputVal("");
    setDone(false);
    setSaved(false);
  };

  const saveResult = async () => {
    setSaving(true);
    try {
      const derived = [0, 1].map((pi) => getDerived(scores[pi]));
      const finals = derived.map((d) => d.final ?? 0);
      const maxFinal = Math.max(...finals);
      const winners = PLAYERS.filter((_, i) => finals[i] === maxFinal);
      const winner = winners.length > 1 ? "Empate" : winners[0];
      const date = new Date().toISOString().slice(0, 10);
      const inputs = scores.map((ps) =>
        ps.map((v) => (v === "heart" ? 0 : (v ?? 0)))
      );

      const res = await fetch("/api/registro/agricola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput, date, players: PLAYERS, inputs, finals, winner }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const derived = [0, 1].map((pi) => getDerived(scores[pi]));
  const finals = derived.map((d) => d.final);
  const maxFinal = done ? Math.max(...(finals.filter((f) => f !== null) as number[])) : null;
  const anyHeart = scores.some((ps) => ps.includes("heart"));

  return (
    <main className="min-h-screen flex flex-col items-center py-6 px-4" style={{ background: "#FAF3E0" }}>
      <div className="w-full" style={{ maxWidth: "22rem" }}>

        <h1 className="text-center text-xl font-bold mb-0.5" style={{ color: C.headerBg, fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}>
          Agrícola
        </h1>
        <p className="text-center text-xs mb-5" style={{ color: C.gold }}>All Creatures Big and Small</p>

        {/* Password gate */}
        {!unlocked && (
          <div className="mb-5 rounded-2xl px-4 pt-4 pb-5 shadow" style={{ background: C.cream, border: `1px solid ${C.amber}` }}>
            <p className="text-center font-bold text-sm mb-3" style={{ color: C.headerBg }}>Introduce la clave para jugar</p>
            <div className="flex gap-2">
              <input
                ref={passwordRef}
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                onKeyDown={(e) => e.key === "Enter" && unlock()}
                placeholder="Clave"
                className="flex-1 rounded-xl px-3 py-3 text-base text-center focus:outline-none"
                style={{ border: `2px solid ${passwordError ? "#ef4444" : "#D4B87A"}`, background: "#FFFDF5", minWidth: 0 }}
              />
              <button onClick={unlock} className="rounded-xl px-5 text-xl font-bold" style={{ background: C.amber, color: C.cream }}>→</button>
            </div>
            {passwordError && <p className="text-xs text-center mt-2" style={{ color: "#ef4444" }}>Clave incorrecta</p>}
          </div>
        )}

        {unlocked && (
          <>
            {done && maxFinal !== null && (
              <div
                className="rounded-xl px-4 py-3 mb-4 text-center font-bold text-base"
                style={
                  anyHeart
                    ? { background: "linear-gradient(135deg, #fbbf24, #4ade80, #60a5fa, #f472b6)", color: "#fff" }
                    : finals.filter((f) => f === maxFinal).length > 1
                    ? { background: C.parchB, color: C.text, border: `1px solid ${C.amber}` }
                    : { background: C.amber, color: C.cream }
                }
              >
                {anyHeart
                  ? "Todo el mundo gana 🌈"
                  : finals.filter((f) => f === maxFinal).length > 1
                  ? "Empate"
                  : `Gana ${PLAYERS[finals.indexOf(maxFinal)]}`}
              </div>
            )}

            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: `2px solid ${C.headerBg}` }}>
              <div className="grid font-bold text-sm" style={{ gridTemplateColumns: "3rem 1fr 1fr", background: C.headerBg, borderBottom: `3px solid ${C.amber}` }}>
                <div className="h-12 flex items-center justify-center text-2xl" style={{ color: C.amber }}>🌾</div>
                {PLAYERS.map((p, pi) => (
                  <div
                    key={pi}
                    className="h-12 flex items-center justify-center text-sm font-bold"
                    style={{
                      borderLeft: "1px solid rgba(255,255,255,0.12)",
                      background: done && maxFinal !== null ? C.amber : "rgba(255,255,255,0.07)",
                      color: done && maxFinal !== null ? C.cream : "#e8d5b0",
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>

              {ROWS.map((row, rowIdx) => {
                const isFinal = row.kind === "final";
                const isSigma = row.kind === "sigma1" || row.kind === "sigma2" || isFinal;
                const even = rowIdx % 2 === 0;
                const rowBg = isFinal ? C.finalBg : isSigma ? C.sigmaGreen : even ? C.parchA : C.parchB;
                const iconBg = isFinal ? "rgba(255,255,255,0.08)" : isSigma ? C.sigmaLight : even ? C.parchIconA : C.parchIconB;
                const rowText = isSigma ? C.cream : C.text;
                return (
                  <div
                    key={rowIdx}
                    className="grid"
                    style={{ gridTemplateColumns: "3rem 1fr 1fr", background: rowBg, borderTop: isSigma ? `2px solid ${isFinal ? C.amber : "rgba(255,255,255,0.25)"}` : undefined }}
                  >
                    <div className="flex items-center justify-center text-sm font-bold" style={{ height: 38, background: iconBg, color: rowText }}>
                      {getRowIcon(row)}
                    </div>
                    {[0, 1].map((pi) => {
                      const val = getCellValue(row, derived[pi]);
                      const active = !done && currentRow === rowIdx && currentPlayer === pi;
                      return (
                        <div
                          key={pi}
                          className="flex items-center justify-center font-mono text-sm font-bold"
                          style={{
                            height: 38,
                            borderLeft: "1px solid rgba(0,0,0,0.12)",
                            color: val !== null ? isSigma ? C.cream : typeof val === "number" && val < 0 ? "#B91C1C" : C.text : "rgba(0,0,0,0.12)",
                            ...(active ? { boxShadow: `inset 0 0 0 2px ${C.amber}` } : {}),
                          }}
                        >
                          {val !== null ? (val === "heart" ? "💚" : val) : ""}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {!done ? (
              <div className="mt-5 rounded-2xl px-4 pt-4 pb-5 shadow" style={{ background: C.cream, border: "1px solid #D4B87A" }}>
                <p className="text-center font-bold text-base mb-0.5" style={{ color: C.headerBg }}>{PLAYERS[currentPlayer]}</p>
                <p className="text-center text-xs mb-3" style={{ color: C.gold }}>{STEP_LABELS[localStep]}</p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirm()}
                    placeholder="0"
                    className="flex-1 rounded-xl px-3 py-3 text-2xl text-center font-bold focus:outline-none"
                    style={{ border: "2px solid #D4B87A", color: C.text, background: "#FFFDF5", minWidth: 0 }}
                    onFocus={(e) => (e.target.style.borderColor = C.amber)}
                    onBlur={(e) => (e.target.style.borderColor = "#D4B87A")}
                  />
                  <button onClick={confirm} className="rounded-xl px-5 text-xl font-bold" style={{ background: C.amber, color: C.cream }}>→</button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-col items-center gap-3">
                {!anyHeart && !saved && (
                  <button
                    onClick={saveResult}
                    disabled={saving}
                    className="rounded-xl px-8 py-3 font-bold"
                    style={{ background: C.amber, color: C.cream, opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? "Guardando…" : "Guardar resultado"}
                  </button>
                )}
                {saved && <p className="text-sm font-bold" style={{ color: C.amber }}>Guardado ✓</p>}
                <button onClick={reset} className="rounded-xl px-8 py-3 font-bold" style={{ background: C.amber, color: C.cream }}>
                  Nueva partida
                </button>
              </div>
            )}
          </>
        )}

        <RegistroSection />
        <div className="mt-3 text-center">
          <Link href="/lab" className="text-xs transition-colors" style={{ color: "#B0956A" }}>
            pacr.es
          </Link>
        </div>
      </div>
    </main>
  );
}
