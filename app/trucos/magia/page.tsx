"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TerminalShell from "../../components/TerminalShell";
import WhyFooter from "../../components/WhyFooter";

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

// `mouth` es la posición de la boca dentro del cuadro 1:1 de cada PNG (0–1):
// el origen de la animación de la carta saliendo del animal.
const SPIRIT_GUIDES = [
  { article: "La", name: "iguana", img: "/trucos/magia/iguana.png", mouth: [0.62, 0.58], rune: "I", color: "#16a34a" },
  { article: "El", name: "ñu",     img: "/trucos/magia/nu.png",     mouth: [0.67, 0.54], rune: "Ñ", color: "#b45309" },
  { article: "El", name: "koala",  img: "/trucos/magia/koala.png",  mouth: [0.57, 0.66], rune: "K", color: "#7a6a5a" },
];

const SUIT_ES: Record<string, string> = {
  "♠": "picas", "♥": "corazones", "♦": "diamantes", "♣": "tréboles",
};
const VALUE_ES: Record<string, string> = {
  "A": "As", "2": "Dos", "3": "Tres", "4": "Cuatro", "5": "Cinco",
  "J": "Jota", "Q": "Reina", "K": "Rey",
};

const ROUND_HINTS = ["", "No cambies de idea.", "La primera impresión es la correcta."];

// Palo → símbolo SVG (definidos en <SuitDefs>).
const SUIT_SYMBOL: Record<string, string> = {
  "♠": "sym-s", "♥": "sym-h", "♦": "sym-d", "♣": "sym-c",
};

// Pipas editoriales: centro [cx, cy] de cada palo (viewBox 100×142, escala 13).
// La fila inferior (cy > 71) se gira 180° para imitar un naipe real.
const PIP_LAYOUT: Record<string, [number, number][]> = {
  "2": [[50, 54], [50, 88]],
  "3": [[50, 54], [50, 71], [50, 88]],
  "4": [[36, 54], [64, 54], [36, 88], [64, 88]],
  "5": [[36, 54], [64, 54], [50, 71], [36, 88], [64, 88]],
};

const WHEEL_R = 120;
const LETTER_R = 96;
const ANIMAL_SIZE = 184;

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

// ─── CardFace ─────────────────────────────────────────────────────────────────

// Símbolos SVG de los palos (handoff editorial). Se renderiza una vez por página;
// `<use href="#sym-X">` los referencia desde cada carta.
function SuitDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="sym-s" viewBox="0 0 24 24">
          <path d="M12 2.2 C9.6 6.8 4.6 9.6 4.6 14 C4.6 16.8 6.7 18.8 9.1 18.8 C10.3 18.8 11.2 18.4 11.9 17.7 C11.6 19.4 10.9 20.7 9.8 21.6 L14.2 21.6 C13.1 20.7 12.4 19.4 12.1 17.7 C12.8 18.4 13.7 18.8 14.9 18.8 C17.3 18.8 19.4 16.8 19.4 14 C19.4 9.6 14.4 6.8 12 2.2 Z" />
        </symbol>
        <symbol id="sym-h" viewBox="0 0 24 24">
          <path d="M12 21 C6.8 16.6 3.2 13.4 3.2 9.2 C3.2 6.2 5.4 4 8.1 4 C9.8 4 11.3 4.9 12 6.3 C12.7 4.9 14.2 4 15.9 4 C18.6 4 20.8 6.2 20.8 9.2 C20.8 13.4 17.2 16.6 12 21 Z" />
        </symbol>
        <symbol id="sym-d" viewBox="0 0 24 24">
          <path d="M12 2 C13.4 5.8 16.2 9.4 19 12 C16.2 14.6 13.4 18.2 12 22 C10.6 18.2 7.8 14.6 5 12 C7.8 9.4 10.6 5.8 12 2 Z" />
        </symbol>
        <symbol id="sym-c" viewBox="0 0 24 24">
          <circle cx="12" cy="6.9" r="4.5" />
          <circle cx="6.7" cy="13.7" r="4.5" />
          <circle cx="17.3" cy="13.7" r="4.5" />
          <path d="M12 11 C12 15.2 11.1 19.1 9.4 21.6 L14.6 21.6 C12.9 19.1 12 15.2 12 11 Z" />
        </symbol>
      </defs>
    </svg>
  );
}

function CardFace({ beast, w }: { beast: Beast; w: number }) {
  const symbol = `#${SUIT_SYMBOL[beast.suit]}`;
  const suitColor = beast.red ? "#ef4444" : "#1c1c1a";
  const isFace = ["J", "Q", "K"].includes(beast.value);
  const isAce = beast.value === "A";
  const pips = PIP_LAYOUT[beast.value];

  return (
    <div style={{
      width: w, aspectRatio: "100 / 142", position: "relative",
      flexShrink: 0, overflow: "hidden",
      background: "#fffdf6", border: "1px solid #ddd8c9", borderRadius: 6,
      boxShadow: "0 1px 2px rgba(28,28,26,0.05), 0 6px 14px rgba(28,28,26,0.05)",
    }}>
      <svg viewBox="0 0 100 142" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <g fontFamily="var(--t-mono)">
          {/* doble marco editorial */}
          <rect x="5.5" y="5.5" width="89" height="131" rx="3" fill="none" stroke="#1c1c1a" strokeWidth="0.9" />
          <rect x="8.5" y="8.5" width="83" height="125" rx="2" fill="none" stroke="#1c1c1a" strokeWidth="0.45" />

          {/* valor centrado + separador con rombo, arriba y (rotado) abajo */}
          {[false, true].map((flip) => (
            <g key={String(flip)} transform={flip ? "rotate(180 50 71)" : undefined}>
              <text x="51.5" y="33" textAnchor="middle" fontSize="20" fontWeight="500" letterSpacing="3" fill={suitColor}>{beast.value}</text>
              <path d="M30 40 H45 M55 40 H70" stroke="#1c1c1a" strokeWidth="0.7" />
              <rect x="48" y="38" width="4" height="4" transform="rotate(45 50 40)" fill="#00b87a" />
            </g>
          ))}

          {/* contenido central */}
          {isAce && <use href={symbol} x="33" y="54" width="34" height="34" fill={suitColor} />}

          {isFace && (
            <>
              <circle cx="50" cy="71" r="20" fill="none" stroke="#1c1c1a" strokeWidth="0.8" />
              <circle cx="50" cy="71" r="17" fill="none" stroke="#1c1c1a" strokeWidth="0.4" />
              <use href={symbol} x="42" y="63" width="16" height="16" fill={suitColor} />
            </>
          )}

          {pips?.map(([cx, cy], i) => (
            <use
              key={i}
              href={symbol}
              x={cx - 6.5}
              y={cy - 6.5}
              width="13"
              height="13"
              fill={suitColor}
              transform={cy > 71 ? `rotate(180 ${cx} ${cy})` : undefined}
            />
          ))}
        </g>
      </svg>
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
  const forceBarRef = useRef<HTMLDivElement>(null);
  const forceContainerRef = useRef<HTMLDivElement>(null);
  const smoothVelRef = useRef(0);
  const forceRafRef = useRef(0);

  useEffect(() => { updateRot(0); }, []);

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

  function runForceBar() {
    smoothVelRef.current *= 0.98;
    if (forceBarRef.current) {
      const pct = Math.min(100, smoothVelRef.current * 10000);
      forceBarRef.current.style.width = `${pct}%`;
    }
    if (smoothVelRef.current > 0.00005 || dragging.current) {
      forceRafRef.current = requestAnimationFrame(runForceBar);
    } else {
      if (forceContainerRef.current) forceContainerRef.current.style.opacity = "0";
    }
  }

  function snap() {
    if (forceContainerRef.current) forceContainerRef.current.style.opacity = "0";

    const vel = angularVelRef.current;
    const speed = Math.abs(vel);
    const direction = vel >= 0 ? 1 : -1;
    const extraRevs = Math.min(2, speed * 200);
    const tIdx = RUNES.indexOf(targetRune);
    const step = (2 * Math.PI) / RUNE_COUNT;
    let target = -Math.PI / 2 - tIdx * step;
    if (direction > 0) {
      const minFinal = rotRef.current + extraRevs * 2 * Math.PI;
      while (target < minFinal) target += 2 * Math.PI;
    } else {
      const maxFinal = rotRef.current - extraRevs * 2 * Math.PI;
      while (target > maxFinal) target -= 2 * Math.PI;
    }

    const from = rotRef.current;
    const delta = target - from;
    const duration = 2000 + extraRevs * 3000;
    const t0 = performance.now();

    function frame(now: number) {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
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
    smoothVelRef.current = 0;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    if (forceContainerRef.current) forceContainerRef.current.style.opacity = "1";
    if (forceBarRef.current) forceBarRef.current.style.width = "0%";
    cancelAnimationFrame(forceRafRef.current);
    forceRafRef.current = requestAnimationFrame(runForceBar);
    if (!hasStarted.current) { hasStarted.current = true; onStart(); }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const angle = getPtrAngle(e.clientX, e.clientY);
    const now = performance.now();
    const dt = now - lastAngleTimeRef.current;
    if (dt > 0 && dt < 150) {
      let da = angle - lastAngleRef.current;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      angularVelRef.current = da / dt;
    }
    lastAngleRef.current = angle;
    lastAngleTimeRef.current = now;
    updateRot(startRotRef.current + (angle - startAngleRef.current));
    const speed = Math.abs(angularVelRef.current);
    if (speed > smoothVelRef.current) smoothVelRef.current = speed;
  }

  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    snap();
  }

  useEffect(() => () => {
    cancelAnimationFrame(animFrame.current);
    cancelAnimationFrame(forceRafRef.current);
  }, []);

  const size = WHEEL_R * 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 0, height: 0, borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "11px solid var(--t-accent)" }} />
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          width: size, height: size, borderRadius: "50%",
          border: "1px solid var(--t-rule)", background: "var(--t-paper)",
          position: "relative", cursor: settled.current ? "default" : "grab",
          touchAction: "none", userSelect: "none",
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
              color: isActive ? "var(--t-accent)" : "var(--t-ink4)",
              fontFamily: "var(--t-mono)",
              transition: "font-size 0.08s, color 0.08s",
              pointerEvents: "none", lineHeight: 1,
            }}>
              {letter}
            </span>
          );
        })}
      </div>
      <div
        ref={forceContainerRef}
        style={{
          width: size, height: 4, borderRadius: 2,
          background: "var(--t-paper2)",
          opacity: 0, transition: "opacity 0.2s",
          overflow: "hidden",
        }}
      >
        <div
          ref={forceBarRef}
          style={{
            height: "100%", width: "0%",
            background: "var(--t-accent)", borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MagiaPage() {
  const [phase, setPhase] = useState<SpellPhase>("intro");
  const [deck, setDeck] = useState<Beast[]>(() => weave(buildBeastDeck()));
  const [round, setRound] = useState(0);
  const [guideIdx, setGuideIdx] = useState(0);
  const lastGuideIdxRef = useRef(-1);
  const [spinStarted, setSpinStarted] = useState(false);
  const [spinDone, setSpinDone] = useState(false);
  const [cardW, setCardW] = useState(54);
  // El animal se precarga en beginSpell; la animación del reveal espera a que
  // esté listo para no salir cortada en la primera carga.
  const [animalReady, setAnimalReady] = useState(false);

  useEffect(() => {
    function calc() {
      const vw = Math.min(window.innerWidth, 480);
      setCardW(Math.min(68, Math.max(44, Math.floor((vw - 72) / 3))));
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const guide = SPIRIT_GUIDES[guideIdx];
  const revealBeast = deck[10];

  function beginSpell() {
    const options = [0, 1, 2].filter(i => i !== lastGuideIdxRef.current);
    const newIdx = options[Math.floor(Math.random() * options.length)];
    lastGuideIdxRef.current = newIdx;
    setGuideIdx(newIdx);
    setDeck(weave(buildBeastDeck()));
    setRound(0);
    setSpinStarted(false);
    setSpinDone(false);
    setPhase("dealing");

    // Precarga del animal elegido: hay reparto + ruleta por delante, así que
    // para cuando se llega al reveal la imagen ya está en caché.
    setAnimalReady(false);
    const pre = new window.Image();
    pre.onload = () => setAnimalReady(true);
    pre.src = SPIRIT_GUIDES[newIdx].img;
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

  const mono = "var(--t-mono)";
  const cardGap = Math.max(3, Math.floor(cardW * 0.07));

  return (
    <TerminalShell title="magia" prompt={{ host: "magia", path: "~/trucos", command: "./magia --cartas=21" }}>
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1rem 4rem", flex: 1,
    }}>
      <SuitDefs />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        /* hover solo con puntero real: en táctil un tap dejaría el resalte pegado */
        @media (hover: hover) {
          .magia-btn:hover { border-color: var(--t-accent); color: var(--t-accent); background: rgba(0,184,122,0.04); }
          .magia-col:hover { border-color: var(--t-accent); background: rgba(0,184,122,0.04); }
          .magia-reveal-btn:hover { background: rgba(0,184,122,0.08); }
        }
        @keyframes beastEnter {
          0%   { opacity:0; transform:translate(-140px, 0) scale(0.4); }
          18%  { opacity:1; }
          100% { opacity:1; transform:translate(0, 0) scale(1); }
        }
        /* la carta nace dentro de la boca (escala 0, oculta) y es escupida:
           emerge despacio, se mantiene grande encima del animal y luego
           baja girando ligeramente hasta despejarlo */
        @keyframes cardSpit {
          0%   { opacity:0; transform:translate(-50%,-50%) scale(0.04) rotate(-10deg); }
          16%  { opacity:1; }
          42%  { transform:translate(-50%, calc(-50% + 36px)) scale(1.1) rotate(8deg); }
          64%  { transform:translate(-50%, calc(-50% + 36px)) scale(1.1) rotate(8deg); }
          100% { opacity:1; transform:translate(-50%, calc(-50% + 110px)) scale(1) rotate(-20deg); }
        }
        @keyframes spellFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* INTRO */}
      {phase === "intro" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", marginTop: "5rem", animation: "fadeUp 0.5s ease" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ color: "var(--t-ink)", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em", fontFamily: mono }}>
              Piensa en una carta
            </h1>
            <p style={{ color: "var(--t-ink4)", fontSize: "0.88rem", marginTop: "0.75rem", fontFamily: mono }}>
              No me la digas
            </p>
          </div>
          <button
            className="magia-btn"
            onClick={beginSpell}
            style={{ padding: "0.6rem 1.6rem", background: "transparent", color: "var(--t-ink)", border: "1px solid var(--t-rule)", borderRadius: 8, fontSize: "0.88rem", fontFamily: mono, cursor: "pointer", transition: "border-color 0.15s, color 0.15s, background 0.15s" }}
          >
            Estoy listo
          </button>
        </div>
      )}

      {/* DEALING */}
      {phase === "dealing" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", width: "100%", animation: "fadeUp 0.3s ease" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--t-ink4)", fontSize: "0.7rem", fontFamily: mono }}>Ronda {round + 1} de 3</p>
            <p style={{ color: "var(--t-ink)", fontSize: "1rem", fontWeight: 600, marginTop: "0.3rem", fontFamily: mono }}>
              ¿En qué columna está tu carta?
            </p>
            <p style={{ color: "var(--t-ink3)", fontSize: "0.78rem", fontFamily: mono, marginTop: "0.3rem" }}>
              {round === 0 ? "Elige una carta. Grábatela en la mente." : ROUND_HINTS[round]}
            </p>
          </div>
          <div key={round} style={{ display: "flex", gap: 14, alignItems: "flex-start", animation: "fadeUp 0.25s ease" }}>
            {[0, 1, 2].map((col) => (
              <div
                key={col}
                className="magia-col"
                onClick={() => onCharmClick(col)}
                style={{
                  display: "flex", flexDirection: "column", gap: cardGap,
                  padding: "8px 6px", borderRadius: 8,
                  border: "1px solid var(--t-rule)",
                  cursor: "pointer", transition: "border-color 0.15s, background 0.15s",
                }}
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
            <p style={{ color: "var(--t-ink)", fontSize: "1rem", fontWeight: 600, fontFamily: mono }}>Ya tengo lo que necesito.</p>
            <p style={{ color: "var(--t-ink3)", fontSize: "0.82rem", fontFamily: mono, marginTop: "0.4rem" }}>
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
              <p style={{ color: "var(--t-ink)", fontSize: "1.05rem", fontWeight: 600, textAlign: "center", lineHeight: 1.5, fontFamily: mono }}>
                ¡La letra {guide.rune}!<br />
                Piensa en un animal que empiece por {guide.rune}.
              </p>
              <button
                className="magia-reveal-btn"
                onClick={() => setPhase("reveal")}
                style={{ padding: "0.6rem 1.6rem", background: "transparent", color: "var(--t-accent)", border: "1px solid var(--t-accent)", borderRadius: 8, fontSize: "0.88rem", fontFamily: mono, cursor: "pointer", transition: "background 0.15s" }}
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
          <div style={{ position: "relative", width: ANIMAL_SIZE, height: ANIMAL_SIZE + 128 }}>
            {animalReady && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen decorativa post-interacción, precargada a mano para sincronizar la animación; no es LCP */}
                <img
                  src={guide.img}
                  alt={guide.name}
                  width={ANIMAL_SIZE}
                  height={ANIMAL_SIZE}
                  style={{
                    position: "absolute", top: 0, left: 0,
                    animation: "beastEnter 2.4s cubic-bezier(0.34,1.1,0.4,1) both",
                  }}
                />
                <div style={{
                  position: "absolute",
                  left: guide.mouth[0] * ANIMAL_SIZE,
                  top: guide.mouth[1] * ANIMAL_SIZE,
                  zIndex: 2,
                  animation: "cardSpit 2.2s cubic-bezier(0.34,1.15,0.5,1) 1.9s both",
                }}>
                  <CardFace beast={revealBeast} w={72} />
                </div>
              </>
            )}
          </div>
          <p style={{
            color: "var(--t-ink2)", fontSize: "1rem", fontWeight: 600,
            maxWidth: 300, lineHeight: 1.5, textAlign: "center",
            fontFamily: mono,
            animation: "spellFade 0.5s ease 4.4s both",
          }}>
            Desde algún lugar de la magia,
            <br />
            {guide.article.toLowerCase()}{" "}
            <span style={{ color: guide.color }}>{guide.name}</span>
            {" "}te trae tu{" "}
            <span style={{ color: revealBeast.red ? "#dc2626" : "var(--t-ink)" }}>
              {spellName(revealBeast)}
            </span>
          </p>
          <button
            onClick={beginSpell}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--t-ink3)", fontSize: "0.78rem", fontFamily: mono,
              animation: "spellFade 0.5s ease 4.9s both",
            }}
          >
            Volver a intentarlo →
          </button>
        </div>
      )}

      {/* footer */}
      <WhyFooter question="¿Por qué un truco de magia?" date="6 de mayo de 2026" style={{ marginTop: "auto" }}>
        <p>Me interesaba mezclar dos tipos de ilusión en el mismo truco. Uno funciona con matemáticas: la estructura del reparto tiene una propiedad que garantiza el resultado. El otro funciona con el idioma: el castellano, sin quererlo, nos deja pocas salidas en ciertos rincones del abecedario.</p>
        <p>Ninguno de los dos requiere habilidad. Solo diseño.</p>
      </WhyFooter>
    </div>
    </TerminalShell>
  );
}
