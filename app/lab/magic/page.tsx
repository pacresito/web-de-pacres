"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Beast {
  suit: string;
  value: string;
  red: boolean;
}

type SpellPhase = "intro" | "dealing" | "spinner" | "reveal";

// ─── Constants ────────────────────────────────────────────────────────────────

const RUNES = [
  "A","B","C","D","E","F","G","H","I","J","K","L","M","N","Ñ",
  "O","P","Q","R","S","T","U","V","W","X","Y","Z",
];
const RUNE_COUNT = RUNES.length;

const SPIRIT_GUIDES = [
  { article: "La", name: "iguana", emoji: "🦎", rune: "I" },
  { article: "El", name: "ñu",     emoji: "🐃", rune: "Ñ" },
  { article: "El", name: "koala",  emoji: "🐨", rune: "K" },
];

const SUIT_ES: Record<string, string> = {
  "♠": "picas", "♥": "corazones", "♦": "diamantes", "♣": "tréboles",
};
const VALUE_ES: Record<string, string> = {
  "A": "As", "2": "Dos", "3": "Tres", "4": "Cuatro", "5": "Cinco",
  "J": "Jota", "Q": "Reina", "K": "Rey",
};

const ROUND_HINTS = ["", "No cambies de idea.", "La primera impresión es la correcta."];

const CHARM_POSITIONS: Record<string, [number, number][]> = {
  "2": [[0.22, 0.5], [0.78, 0.5]],
  "3": [[0.22, 0.5], [0.5, 0.5], [0.78, 0.5]],
  "4": [[0.24, 0.3], [0.24, 0.7], [0.76, 0.3], [0.76, 0.7]],
  "5": [[0.22, 0.3], [0.22, 0.7], [0.5, 0.5], [0.78, 0.3], [0.78, 0.7]],
};

const WHEEL_R = 120;
const LETTER_R = 96;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weave<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBeastDeck(): Beast[] {
  const suits = ["♠", "♥", "♦", "♣"];
  const deck: Beast[] = [];
  for (const v of ["A", "2", "3", "4", "5"]) {
    for (const s of weave(suits).slice(0, 3)) {
      deck.push({ suit: s, value: v, red: s === "♥" || s === "♦" });
    }
  }
  for (const v of ["J", "Q", "K"]) {
    for (const s of weave(suits).slice(0, 2)) {
      deck.push({ suit: s, value: v, red: s === "♥" || s === "♦" });
    }
  }
  return deck; // 15 + 6 = 21
}

function getCharm(deck: Beast[], col: number): Beast[] {
  return Array.from({ length: 7 }, (_, row) => deck[row * 3 + col]);
}

function castSpell(deck: Beast[], col: number): Beast[] {
  const charms = [getCharm(deck, 0), getCharm(deck, 1), getCharm(deck, 2)];
  const others = charms.filter((_, i) => i !== col);
  return [...others[0], ...charms[col], ...others[1]];
}

function spellName(beast: Beast): string {
  return `${VALUE_ES[beast.value]} de ${SUIT_ES[beast.suit]}`;
}

function summonPhrase(guideIdx: number, beast: Beast): string {
  const { article, name } = SPIRIT_GUIDES[guideIdx];
  return `${article} ${name} que había en tu mente se había comido el ${spellName(beast)}.`;
}

function getGuideIdx(castCount: number): number {
  return (castCount - 1) % 3;
}

// ─── CardFace ─────────────────────────────────────────────────────────────────

function CardFace({ beast, w }: { beast: Beast; w: number }) {
  const h = Math.floor(w * 1.42);
  const mono = "var(--font-geist-mono, monospace)";
  const color = beast.red ? "#ef4444" : "#111827";
  const borderColor = beast.red ? "rgba(239,68,68,0.22)" : "rgba(0,0,0,0.1)";
  const csz = Math.max(8, Math.floor(w * 0.19));
  const isFace = ["J", "Q", "K"].includes(beast.value);
  const isAce = beast.value === "A";

  return (
    <div style={{
      width: w, height: h, border: `1px solid ${borderColor}`,
      borderRadius: 5, background: "#fff", position: "relative",
      flexShrink: 0, overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <span style={{ position: "absolute", top: 2, left: 4, fontSize: csz, color, fontFamily: mono, fontWeight: 700, lineHeight: 1, userSelect: "none" }}>{beast.value}</span>
      <span style={{ position: "absolute", top: 2 + csz, left: 4, fontSize: Math.max(6, csz - 2), color, lineHeight: 1, userSelect: "none" }}>{beast.suit}</span>
      <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: csz, color, fontFamily: mono, fontWeight: 700, lineHeight: 1, transform: "rotate(180deg)", userSelect: "none" }}>{beast.value}</span>
      <span style={{ position: "absolute", bottom: 2 + csz, right: 4, fontSize: Math.max(6, csz - 2), color, lineHeight: 1, transform: "rotate(180deg)", userSelect: "none" }}>{beast.suit}</span>

      {isAce && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <span style={{ fontSize: Math.floor(h * 0.58), color, lineHeight: 1, userSelect: "none" }}>{beast.suit}</span>
        </div>
      )}

      {isFace && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, pointerEvents: "none" }}>
          <span style={{ fontSize: Math.floor(h * 0.26), fontFamily: "Georgia, serif", color, lineHeight: 1, fontWeight: 700, userSelect: "none" }}>{beast.value}</span>
          <span style={{ fontSize: Math.floor(h * 0.40), color, lineHeight: 1, userSelect: "none" }}>{beast.suit}</span>
        </div>
      )}

      {!isAce && !isFace && CHARM_POSITIONS[beast.value] && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {CHARM_POSITIONS[beast.value].map(([ry, rx], i) => (
            <span key={i} style={{
              position: "absolute",
              left: `${rx * 100}%`, top: `${ry * 100}%`,
              transform: `translate(-50%, -50%)${ry > 0.5 ? " rotate(180deg)" : ""}`,
              fontSize: Math.max(9, Math.floor(w * 0.34)),
              color, lineHeight: 1, userSelect: "none",
            }}>
              {beast.suit}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SpellWheel ───────────────────────────────────────────────────────────────

function SpellWheel({
  targetRune,
  onStart,
  onSettle,
}: {
  targetRune: string;
  onStart: () => void;
  onSettle: () => void;
}) {
  const rotRef = useRef(0);
  const dragging = useRef(false);
  const startAngleRef = useRef(0);
  const startRotRef = useRef(0);
  const lastAngleRef = useRef(0);
  const lastAngleTimeRef = useRef(0);
  const angularVelRef = useRef(0);
  const animFrame = useRef(0);
  const settled = useRef(false);
  const hasStarted = useRef(false);
  const [rot, setRot] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // initialise activeIdx for rot=0 on mount
  useEffect(() => { updateRot(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getPtrAngle(cx: number, cy: number): number {
    const el = containerRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.atan2(cy - (r.top + r.height / 2), cx - (r.left + r.width / 2));
  }

  function updateRot(r: number) {
    const step = (2 * Math.PI) / RUNE_COUNT;
    const topAngle = ((-Math.PI / 2 - r) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.round(topAngle / step) % RUNE_COUNT;
    rotRef.current = r;
    setRot(r);
    setActiveIdx((idx + RUNE_COUNT) % RUNE_COUNT);
  }

  function snap() {
    const speed = Math.abs(angularVelRef.current); // rad/ms
    // Mínimo 3 vueltas completas siempre para que no se adivine
    const extraRevs = Math.min(8, Math.max(3, speed * 5000));
    const tIdx = RUNES.indexOf(targetRune);
    const step = (2 * Math.PI) / RUNE_COUNT;
    let target = -Math.PI / 2 - tIdx * step;
    const minFinal = rotRef.current + extraRevs * 2 * Math.PI;
    while (target < minFinal) target += 2 * Math.PI;

    const from = rotRef.current;
    const delta = target - from;
    // Frenado muy suave: mínimo 5s, máximo 10s — ease-out cuadrático (más gradual)
    const duration = Math.max(5000, Math.min(10000, Math.abs(delta) * 300));
    const t0 = performance.now();

    function frame(now: number) {
      const t = Math.min((now - t0) / duration, 1);
      // ease-out cuadrático — deceleración suave y gradual
      const eased = 1 - Math.pow(1 - t, 2);
      updateRot(from + delta * eased);
      if (t < 1) {
        animFrame.current = requestAnimationFrame(frame);
      } else {
        updateRot(target);
        if (!settled.current) { settled.current = true; onSettle(); }
      }
    }
    animFrame.current = requestAnimationFrame(frame);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (settled.current) return;
    cancelAnimationFrame(animFrame.current);
    dragging.current = true;
    const a = getPtrAngle(e.clientX, e.clientY);
    startAngleRef.current = a;
    startRotRef.current = rotRef.current;
    lastAngleRef.current = a;
    lastAngleTimeRef.current = performance.now();
    angularVelRef.current = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    if (!hasStarted.current) { hasStarted.current = true; onStart(); }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const angle = getPtrAngle(e.clientX, e.clientY);
    const now = performance.now();
    const dt = now - lastAngleTimeRef.current;
    if (dt > 0 && dt < 150) {
      let da = angle - lastAngleRef.current;
      // wrap-around
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      angularVelRef.current = da / dt;
    }
    lastAngleRef.current = angle;
    lastAngleTimeRef.current = now;
    updateRot(startRotRef.current + (angle - startAngleRef.current));
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    snap();
  }

  useEffect(() => () => cancelAnimationFrame(animFrame.current), []);

  const size = WHEEL_R * 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "11px solid #3b82f6" }} />
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          width: size, height: size, borderRadius: "50%",
          border: "2px solid rgba(96,165,250,0.18)", background: "#fafeff",
          position: "relative", cursor: settled.current ? "default" : "grab",
          touchAction: "none", userSelect: "none",
          boxShadow: "0 2px 12px rgba(96,165,250,0.07)",
        }}
      >
        {RUNES.map((letter, i) => {
          const angle = i * (2 * Math.PI) / RUNE_COUNT + rot;
          const x = WHEEL_R + LETTER_R * Math.cos(angle);
          const y = WHEEL_R + LETTER_R * Math.sin(angle);
          const isActive = i === activeIdx;
          return (
            <span key={letter} style={{
              position: "absolute", left: x, top: y,
              transform: "translate(-50%, -50%)",
              fontSize: isActive ? "1.05rem" : "0.62rem",
              fontWeight: isActive ? 800 : 400,
              color: isActive ? "#3b82f6" : "#94a3b8",
              fontFamily: "var(--font-geist-mono, monospace)",
              transition: "font-size 0.08s, color 0.08s",
              pointerEvents: "none", lineHeight: 1,
            }}>
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MagicPage() {
  const [phase, setPhase] = useState<SpellPhase>("intro");
  const [deck, setDeck] = useState<Beast[]>(() => weave(buildBeastDeck()));
  const [round, setRound] = useState(0);
  const [castCount, setCastCount] = useState(0);
  const [spinStarted, setSpinStarted] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
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

  const guideIdx = castCount === 0 ? 0 : getGuideIdx(castCount);
  const guide = SPIRIT_GUIDES[guideIdx];
  const revealBeast = deck[10];

  function beginSpell() {
    setDeck(weave(buildBeastDeck()));
    setRound(0);
    setSpinStarted(false);
    setSpinDone(false);
    setCastCount((c) => c + 1);
    setPhase("dealing");
  }

  function onCharmClick(col: number) {
    if (phase !== "dealing") return;
    const newDeck = castSpell(deck, col);
    setDeck(newDeck);
    if (round === 2) {
      setPhase("spinner");
    } else {
      setRound((r) => r + 1);
    }
  }

  const onWheelStart = useCallback(() => setSpinStarted(true), []);
  const onWheelSettle = useCallback(() => setSpinDone(true), []);

  const mono = "var(--font-geist-mono, monospace)";
  const cardGap = Math.max(3, Math.floor(cardW * 0.07));

  return (
    <div style={{
      background: "#fff", minHeight: "100dvh",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1rem 4rem",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes beastGrow { 0% { opacity:0; transform:scale(0.25); } 80% { transform:scale(1.04); } 100% { opacity:1; transform:scale(1); } }
        @keyframes cardEmerge { 0% { opacity:0; transform:translateY(-55px) scale(0.06); } 15% { opacity:1; } 100% { transform:translateY(0) scale(1); } }
        @keyframes spellFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* INTRO */}
      {phase === "intro" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", marginTop: "5rem", animation: "fadeUp 0.5s ease" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ color: "#111827", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Piensa en una carta.
            </h1>
            <p style={{ color: "#9ca3af", fontSize: "0.88rem", marginTop: "0.75rem", fontFamily: mono }}>
              No me la digas.
            </p>
          </div>
          <button
            onClick={beginSpell}
            style={{ padding: "0.6rem 1.6rem", background: "#111827", color: "#fff", border: "none", borderRadius: 8, fontSize: "0.88rem", fontFamily: mono, cursor: "pointer" }}
          >
            Estoy listo
          </button>
        </div>
      )}

      {/* DEALING */}
      {phase === "dealing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%", animation: "fadeUp 0.3s ease" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: "0.7rem", fontFamily: mono }}>Ronda {round + 1} de 3</p>
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 600, marginTop: "0.3rem" }}>
              ¿En qué columna está tu carta?
            </p>
            <p style={{ color: "#9ca3af", fontSize: "0.78rem", fontFamily: mono, marginTop: "0.3rem" }}>
              {round === 0 ? "Elige una carta. Grábatela en la mente." : ROUND_HINTS[round]}
            </p>
          </div>
          <div key={round} style={{ display: "flex", gap: 14, alignItems: "flex-start", animation: "fadeUp 0.25s ease" }}>
            {[0, 1, 2].map((col) => (
              <div
                key={col}
                onClick={() => onCharmClick(col)}
                style={{
                  display: "flex", flexDirection: "column", gap: cardGap,
                  padding: "8px 6px", borderRadius: 8,
                  border: "2px solid rgba(96,165,250,0.12)",
                  cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3b82f6"; (e.currentTarget as HTMLDivElement).style.background = "#f0f6ff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(96,165,250,0.12)"; (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                {getCharm(deck, col).map((beast, i) => (
                  <CardFace key={i} beast={beast} w={cardW} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPINNER */}
      {phase === "spinner" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginTop: "2.5rem", textAlign: "center", animation: "fadeUp 0.5s ease", width: "100%" }}>
          <div style={{
            opacity: spinStarted ? 0 : 1,
            transition: "opacity 0.5s ease",
            pointerEvents: spinStarted ? "none" : "auto",
          }}>
            <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 600 }}>Ya tengo lo que necesito.</p>
            <p style={{ color: "#9ca3af", fontSize: "0.82rem", fontFamily: mono, marginTop: "0.4rem" }}>
              Olvida tu carta. Arrastra la ruleta para continuar.
            </p>
          </div>

          <SpellWheel
            targetRune={guide.rune}
            onStart={onWheelStart}
            onSettle={onWheelSettle}
          />

          {spinDone && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", animation: "fadeUp 0.4s ease" }}>
              <p style={{ color: "#111827", fontSize: "1.05rem", fontWeight: 600 }}>
                ¡La letra {guide.rune}! Piensa en un animal que empiece por {guide.rune}.
              </p>
              <button
                onClick={() => setPhase("reveal")}
                style={{ padding: "0.6rem 1.6rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: "0.88rem", fontFamily: mono, cursor: "pointer" }}
              >
                Ya lo tengo
              </button>
            </div>
          )}
        </div>
      )}

      {/* REVEAL */}
      {phase === "reveal" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", marginTop: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "5.5rem", lineHeight: 1, animation: "beastGrow 2s cubic-bezier(0.22,1,0.36,1) both" }}>
            {guide.emoji}
          </div>
          <div style={{ animation: "cardEmerge 1.4s cubic-bezier(0.22,1,0.36,1) 2s both" }}>
            <CardFace beast={revealBeast} w={90} />
          </div>
          <p style={{
            color: "#111827", fontSize: "1rem", fontWeight: 600,
            maxWidth: 300, lineHeight: 1.5,
            animation: "spellFade 0.5s ease 4s both",
          }}>
            {summonPhrase(guideIdx, revealBeast)}
          </p>
          <button
            onClick={beginSpell}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9ca3af", fontSize: "0.78rem", fontFamily: mono,
              animation: "spellFade 0.5s ease 4.6s both",
            }}
          >
            Volver a intentarlo →
          </button>
        </div>
      )}

      <a
        href="/lab"
        style={{ marginTop: "auto", paddingTop: "2rem", fontSize: "0.75rem", color: "#9ca3af", fontFamily: mono, textDecoration: "none", transition: "color 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#3b82f6")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
      >
        pacr.es
      </a>
    </div>
  );
}
