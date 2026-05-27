"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import TerminalShell from "../../components/TerminalShell";

export default function CalculadoraRPN() {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyRef = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState<number[]>([]);
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [justOperated, setJustOperated] = useState(false);
  const [lastFlash, setLastFlash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<Array<{stack: number[], input: string}>>([]);
  const [future, setFuture] = useState<Array<{stack: number[], input: string}>>([]);

  const clearError = () => setError(null);

  const flash = () => {
    setLastFlash(true);
    setTimeout(() => setLastFlash(false), 200);
  };

  const pressDigit = useCallback((d: string) => {
    clearError();
    if (justOperated) {
      setInput(d === "." ? "0." : d);
      setJustOperated(false);
    } else {
      if (d === "." && input.includes(".")) return;
      if (d === "." && input === "") {
        setInput("0.");
      } else {
        setInput((prev) => (prev === "0" && d !== "." ? d : prev + d));
      }
    }
  }, [input, justOperated]);

  const pressEnter = useCallback(() => {
    clearError();
    const val = input === "" ? (stack.length > 0 ? stack[stack.length - 1] : 0) : parseFloat(input);
    if (isNaN(val)) { setError("Número no válido"); return; }
    setHistory(h => [...h, { stack, input }]);
    setFuture([]);
    setStack((prev) => [...prev, val]);
    setInput("");
    setJustOperated(false);
    flash();
  }, [input, stack]);

  const pressOp = useCallback((op: "+" | "-" | "*" | "/") => {
    clearError();
    let currentStack = stack;
    if (input !== "") {
      const val = parseFloat(input);
      if (isNaN(val)) { setError("Número no válido"); return; }
      currentStack = [...stack, val];
    }
    if (currentStack.length < 2) {
      setError("Hacen falta al menos 2 valores en la pila");
      return;
    }
    const b = currentStack[currentStack.length - 1];
    const a = currentStack[currentStack.length - 2];
    let result: number;
    if (op === "+") result = a + b;
    else if (op === "-") result = a - b;
    else if (op === "*") result = a * b;
    else {
      if (b === 0) { setError("División por cero"); return; }
      result = a / b;
    }
    setHistory(h => [...h, { stack, input }]);
    setFuture([]);
    setStack([...currentStack.slice(0, -2), result]);
    setInput("");
    setJustOperated(true);
    flash();
  }, [input, stack]);

  const pressSwap = useCallback(() => {
    clearError();
    let currentStack = stack;
    if (input !== "") {
      const val = parseFloat(input);
      if (isNaN(val)) { setError("Número no válido"); return; }
      currentStack = [...stack, val];
      setInput("");
    }
    if (currentStack.length < 2) {
      setError("Hacen falta 2 valores para intercambiar");
      return;
    }
    const newStack = [...currentStack];
    const last = newStack.length - 1;
    [newStack[last], newStack[last - 1]] = [newStack[last - 1], newStack[last]];
    setHistory(h => [...h, { stack, input }]);
    setFuture([]);
    setStack(newStack);
    setJustOperated(false);
  }, [input, stack]);

  const pressDel = useCallback(() => {
    clearError();
    if (input === "" && stack.length === 0) return;
    setHistory(h => [...h, { stack, input }]);
    setFuture([]);
    if (input !== "") {
      setInput((prev) => prev.slice(0, -1));
    } else {
      setStack((prev) => prev.slice(0, -1));
      setJustOperated(false);
    }
  }, [input, stack]);

  const pressClear = useCallback(() => {
    setHistory(h => [...h, { stack, input }]);
    setFuture([]);
    setStack([]);
    setInput("");
    setError(null);
    setJustOperated(false);
  }, [stack, input]);

  const pressUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [{ stack, input }, ...f]);
    setHistory(h => h.slice(0, -1));
    setStack(prev.stack);
    setInput(prev.input);
    setError(null);
    setJustOperated(false);
  }, [history, stack, input]);

  const pressRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, { stack, input }]);
    setFuture(f => f.slice(1));
    setStack(next.stack);
    setInput(next.input);
    setError(null);
    setJustOperated(false);
  }, [future, stack, input]);

  const pressSum = useCallback(() => {
    clearError();
    let currentStack = stack;
    if (input !== "") {
      const val = parseFloat(input);
      if (isNaN(val)) { setError("Número no válido"); return; }
      currentStack = [...stack, val];
    }
    if (currentStack.length === 0) { setError("La pila está vacía"); return; }
    const sum = currentStack.reduce((a, b) => a + b, 0);
    setHistory(h => [...h, { stack, input }]);
    setFuture([]);
    setStack([sum]);
    setInput("");
    setJustOperated(true);
    flash();
  }, [input, stack]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      document.body.style.overflow = "hidden";
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      document.body.style.overflow = "";
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) {
        document.body.style.overflow = "";
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") pressDigit(e.key);
      else if (e.key === ".") pressDigit(".");
      else if (e.key === "Enter") { e.preventDefault(); pressEnter(); }
      else if (e.key === "+") pressOp("+");
      else if (e.key === "-") pressOp("-");
      else if (e.key === "*") pressOp("*");
      else if (e.key === "/") { e.preventDefault(); pressOp("/"); }
      else if (e.key === "Backspace") pressDel();
      else if (e.key === "Escape") pressClear();
      else if (e.key === "F1") { e.preventDefault(); pressUndo(); }
      else if (e.key === "F2") { e.preventDefault(); pressRedo(); }
      else if (e.key === "F6") { e.preventDefault(); pressSum(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pressDigit, pressEnter, pressOp, pressDel, pressClear, pressUndo, pressRedo, pressSum]);

  const formatNum = (n: number) => {
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
    return parseFloat(n.toPrecision(10)).toString();
  };

  const displayStack = [...stack];

  return (
    <TerminalShell title="calculadora RPN" prompt={{ host: "rpncalc", path: "~/apps", command: "./rpncalc --model=hp49g+" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { overflow-x: hidden; }

        /* ── Page layout ── */
        .calc-page {
          max-width: 900px;
          margin: 0 auto;
          padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2rem);
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
        }

        .page-title {
          font-size: clamp(2rem, 6vw, 3.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          color: var(--ts-ink);
          font-family: var(--ts-mono);
        }
        .page-title span {
          color: var(--ts-accent);
        }

        .page-subtitle {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: var(--ts-ink3);
          line-height: 1.65;
          max-width: 560px;
          font-family: var(--ts-mono);
        }

        .divider {
          border: none;
          border-top: 1px solid var(--ts-rule);
        }

        /* ── Fullscreen wrapper ── */
        .hp-wrap {
          display: flex;
          justify-content: center;
        }

        .hp-wrap.is-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          margin: 0;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .hp-wrap.is-fullscreen .hp-body {
          max-height: calc(100dvh - 2rem);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .hp-wrap.is-fullscreen .hp-body::-webkit-scrollbar { display: none; }

        /* ── HP 49g+ outer frame — dark rubber/plastic ── */
        .hp-body {
          width: 100%;
          max-width: 340px;
          background: #111111;
          border-radius: 10px 10px 20px 20px;
          padding: 10px 10px 14px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.05),
            0 4px 8px rgba(0,0,0,0.4),
            0 20px 60px rgba(0,0,0,0.5);
          position: relative;
        }

        /* IR notch at top center */
        .hp-body::before {
          content: '▲';
          position: absolute;
          top: 3px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.35rem;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0;
        }

        /* ── Inner cream/silver face panel ── */
        .hp-face {
          background: linear-gradient(175deg, #d0ccbe 0%, #c8c4b4 50%, #c4c0b0 100%);
          border-radius: 4px 4px 12px 12px;
          padding: 10px 10px 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1);
        }

        /* ── Brand bar ── */
        .hp-brand {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 0 2px;
        }

        .hp-brand-left {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .hp-logo {
          font-size: 0.95rem;
          font-weight: 900;
          font-family: var(--font-geist-sans), Arial, sans-serif;
          color: #222;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }
        .hp-logo em {
          font-style: italic;
          letter-spacing: -0.05em;
        }
        .hp-logo .model-num {
          font-style: normal;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .hp-model-line {
          font-size: 0.44rem;
          font-family: var(--font-geist-sans), Arial, sans-serif;
          color: #555;
          letter-spacing: 0.01em;
          line-height: 1;
        }

        /* HP badge — blue border, silver interior, italic hp */
        .hp-badge {
          width: 32px;
          height: 22px;
          background: linear-gradient(145deg, #e8e8e8 0%, #c8c8c8 50%, #d8d8d8 100%);
          border-radius: 5px;
          border: 2px solid #1a4a8a;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.7),
            inset 0 0 0 1px rgba(255,255,255,0.2);
          flex-shrink: 0;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: opacity 0.15s;
        }
        .hp-badge:hover { opacity: 0.75; }
        .hp-badge-text {
          font-size: 0.55rem;
          font-weight: 900;
          font-family: var(--font-geist-sans), Arial, sans-serif;
          color: #888;
          font-style: italic;
          letter-spacing: -0.06em;
          text-shadow: 0 1px 0 rgba(255,255,255,0.8);
        }

        /* ── Screen bezel (cream-tinted inset) ── */
        .hp-screen-bezel {
          background: #a8a898;
          border-radius: 3px;
          padding: 5px;
          margin-bottom: 10px;
          box-shadow:
            inset 0 2px 6px rgba(0,0,0,0.4),
            0 1px 0 rgba(255,255,255,0.3);
        }

        /* ── LCD — neutral gray, like HP 49g+ ── */
        .hp-lcd {
          background: #c4c8bc;
          border-radius: 1px;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.25);
          position: relative;
          transition: background 0.12s;
        }

        .hp-lcd.flash { background: #d4d8cc; }

        .hp-lcd::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.02) 2px,
            rgba(0,0,0,0.02) 3px
          );
          pointer-events: none;
        }

        /* ── Stack area ── */
        .hp-stack {
          flex: 1;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 6px 8px 4px;
          border-bottom: 1px solid rgba(0,0,0,0.12);
          position: relative;
        }

        .hp-stack-empty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.12em;
          color: rgba(40,50,30,0.3);
          text-transform: uppercase;
        }

        .hp-stack-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 1px 0;
        }

        .hp-stack-idx {
          font-size: 0.5rem;
          font-family: var(--font-geist-mono), monospace;
          color: rgba(40,50,30,0.4);
          min-width: 1.5rem;
          letter-spacing: 0.08em;
        }

        .hp-stack-val {
          font-size: 0.82rem;
          font-family: var(--font-geist-mono), monospace;
          font-weight: 600;
          color: #1a2a0a;
          text-align: right;
          flex: 1;
        }

        .hp-stack-val.is-top {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0d1e06;
        }

        /* ── Input display ── */
        .hp-input {
          padding: 5px 8px 6px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-height: 34px;
        }

        .hp-input-num {
          font-size: 1.3rem;
          font-family: var(--font-geist-mono), monospace;
          font-weight: 700;
          color: #0d1e06;
          letter-spacing: -0.02em;
        }

        .hp-input-placeholder {
          font-size: 0.65rem;
          font-family: var(--font-geist-mono), monospace;
          color: rgba(40,50,30,0.28);
          letter-spacing: 0.1em;
        }

        .hp-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #1a2a0a;
          margin-left: 1px;
          vertical-align: text-bottom;
          animation: blink 0.9s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* ── Error strip ── */
        .hp-error {
          padding: 3px 8px;
          background: rgba(150,0,0,0.1);
          border-top: 1px solid rgba(150,0,0,0.2);
          font-size: 0.58rem;
          font-family: var(--font-geist-mono), monospace;
          color: #6e1010;
          letter-spacing: 0.04em;
        }

        /* ── Soft-menu strip (F1–F6, gray keys on cream) ── */
        .hp-softmenu {
          display: flex;
          gap: 3px;
          margin-bottom: 8px;
        }

        .hp-softkey {
          flex: 1;
          height: 18px;
          background: linear-gradient(180deg, #4a4a4a 0%, #383838 100%);
          border-radius: 2px;
          box-shadow:
            0 2px 0 #1a1a1a,
            inset 0 1px 0 rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.38rem;
          font-family: var(--font-geist-mono), monospace;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.02em;
          font-weight: 600;
          border: none;
          padding: 0;
        }

        button.hp-softkey {
          cursor: pointer;
          color: rgba(255,255,255,0.8);
          transition: opacity 0.1s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        button.hp-softkey:hover { opacity: 0.75; }
        button.hp-softkey:active { opacity: 0.5; }

        /* ── Button grid ── */
        .hp-btns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
        }

        /* Base key — near-black charcoal, like HP 49g+ number keys */
        .hp-btn {
          background: linear-gradient(180deg, #2c2c2c 0%, #1e1e1e 100%);
          border: none;
          border-radius: 3px;
          padding: 0.85rem 0.3rem 0.65rem;
          font-size: 0.9rem;
          font-family: var(--font-geist-mono), monospace;
          font-weight: 600;
          color: #f0f0f0;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          box-shadow:
            0 3px 0 #080808,
            0 4px 5px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.1);
          transition: transform 0.07s, box-shadow 0.07s;
        }

        .hp-btn:active {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 #080808,
            0 2px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        /* Operator keys — medium gray, like the upper function buttons */
        .hp-btn-op {
          background: linear-gradient(180deg, #555555 0%, #444444 100%);
          color: #f0f0f0;
          box-shadow:
            0 3px 0 #1a1a1a,
            0 4px 5px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .hp-btn-op:active {
          box-shadow:
            0 1px 0 #1a1a1a,
            0 2px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }

        /* ENTER — teal (HP 49g+ left-arrow/backspace accent) */
        .hp-btn-enter {
          background: linear-gradient(180deg, #115555 0%, #0a3d3d 100%);
          color: #60d0c8;
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          grid-column: span 2;
          box-shadow:
            0 3px 0 #030f0f,
            0 4px 5px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(96,208,200,0.12);
        }
        .hp-btn-enter:active {
          box-shadow:
            0 1px 0 #030f0f,
            0 2px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(96,208,200,0.06);
        }

        /* CLEAR — red (HP 49g+ right-shift key is red/orange) */
        .hp-btn-clear {
          background: linear-gradient(180deg, #8a1a1a 0%, #6a1010 100%);
          color: #ffaaaa;
          box-shadow:
            0 3px 0 #1e0404,
            0 4px 5px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,150,150,0.1);
        }
        .hp-btn-clear:active {
          box-shadow:
            0 1px 0 #1e0404,
            0 2px 3px rgba(0,0,0,0.3);
        }

        /* DEL and SWAP — same near-black, muted text */
        .hp-btn-util {
          color: #aaaaaa;
          font-size: 0.6rem;
          letter-spacing: 0.05em;
        }

        /* ── Legend ── */
        .legend {
          padding: 0.75rem 1rem;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 6px;
          background: #ffffff;
        }

        .legend-title {
          font-size: 0.55rem;
          font-family: var(--ts-mono);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ts-ink4);
          margin-bottom: 0.5rem;
        }

        .legend-keys {
          font-size: 0.7rem;
          font-family: var(--ts-mono);
          color: var(--ts-ink3);
          line-height: 1.9;
          display: flex;
          flex-wrap: wrap;
          gap: 0.15rem 0.5rem;
        }

        .key {
          display: inline-block;
          border: 1px solid var(--ts-rule);
          padding: 0 0.35rem;
          border-radius: 3px;
          font-size: 0.6rem;
          color: var(--ts-ink2);
          background: var(--ts-paper2);
          margin-right: 0.15rem;
        }

        .pacres-link {
          font-size: 0.75rem;
          color: var(--ts-ink4);
          font-family: var(--ts-mono);
          text-decoration: none;
          transition: color 0.2s;
        }
        .pacres-link:hover { color: var(--ts-accent); }
      `}</style>

      <main className="calc-page">

        {/* Header */}
        <div style={{ marginBottom: "3.5rem" }}>
          <h1 className="page-title">
            Calculadora <span>RPN</span>
          </h1>
          <p className="page-subtitle">
            Hecha para Antonio y para toda persona que alguna vez pensó:<br/>
            «esto iría más rápido con una pila y menos paréntesis».<br/>
            Porque introducir el operador al final no es una excentricidad.<br/>
            Es superioridad cognitiva.
          </p>
        </div>

        <hr className="divider" style={{ marginBottom: "2.5rem" }} />

        {/* HP 49g+ Calculator */}
        <div className={`hp-wrap${isFullscreen ? " is-fullscreen" : ""}`} style={{ marginBottom: isFullscreen ? 0 : "2.5rem" }}>
          <div className="hp-body">
            <div className="hp-face">

              {/* Brand */}
              <div className="hp-brand">
                <div className="hp-brand-left">
                  <span className="hp-logo">
                    <em>hp</em> <span className="model-num">49g+</span>
                  </span>
                  <span className="hp-model-line">graphing calculator</span>
                </div>
                <div
                  className="hp-badge"
                  onClick={toggleFullscreen}
                  onTouchStart={(e) => { e.preventDefault(); toggleFullscreen(); }}
                  title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                  <span className="hp-badge-text">hp</span>
                </div>
              </div>

              {/* Screen */}
              <div className="hp-screen-bezel">
                <div className={`hp-lcd${lastFlash ? " flash" : ""}`}>

                  {/* Stack */}
                  <div className="hp-stack">
                    {displayStack.length === 0 ? (
                      <p className="hp-stack-empty">stack empty</p>
                    ) : (
                      displayStack.map((val, i) => {
                        const isTop = i === displayStack.length - 1;
                        const label = displayStack.length - i;
                        return (
                          <div key={i} className="hp-stack-row">
                            <span className="hp-stack-idx">{label}:</span>
                            <span className={`hp-stack-val${isTop ? " is-top" : ""}`}>
                              {formatNum(val)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input */}
                  <div className="hp-input">
                    {input === "" ? (
                      <span className="hp-input-placeholder">_ _ _</span>
                    ) : (
                      <span className="hp-input-num">
                        {input}<span className="hp-cursor" />
                      </span>
                    )}
                  </div>

                  {/* Error */}
                  {error && <div className="hp-error">{error}</div>}
                </div>
              </div>

              {/* Soft-menu strip (F1–F6) */}
              <div className="hp-softmenu">
                {(["F1","F2","F3","F4","F5","F6"] as const).map(f => {
                  const handlers: Partial<Record<string, () => void>> = { F1: pressUndo, F2: pressRedo, F6: pressSum };
                  const handler = handlers[f];
                  return handler
                    ? <button key={f} className="hp-softkey" onClick={handler}>{f}</button>
                    : <div key={f} className="hp-softkey">{f}</div>;
                })}
              </div>

              {/* Buttons */}
              <div className="hp-btns">
                <button className="hp-btn hp-btn-clear" onClick={pressClear}>C</button>
                <button className="hp-btn hp-btn-util" onClick={pressDel}>DEL</button>
                <button className="hp-btn hp-btn-util" onClick={pressSwap}>SWAP</button>
                <button className="hp-btn hp-btn-op" onClick={() => pressOp("/")}>÷</button>

                <button className="hp-btn" onClick={() => pressDigit("7")}>7</button>
                <button className="hp-btn" onClick={() => pressDigit("8")}>8</button>
                <button className="hp-btn" onClick={() => pressDigit("9")}>9</button>
                <button className="hp-btn hp-btn-op" onClick={() => pressOp("*")}>×</button>

                <button className="hp-btn" onClick={() => pressDigit("4")}>4</button>
                <button className="hp-btn" onClick={() => pressDigit("5")}>5</button>
                <button className="hp-btn" onClick={() => pressDigit("6")}>6</button>
                <button className="hp-btn hp-btn-op" onClick={() => pressOp("-")}>−</button>

                <button className="hp-btn" onClick={() => pressDigit("1")}>1</button>
                <button className="hp-btn" onClick={() => pressDigit("2")}>2</button>
                <button className="hp-btn" onClick={() => pressDigit("3")}>3</button>
                <button className="hp-btn hp-btn-op" onClick={() => pressOp("+")}>+</button>

                <button className="hp-btn" onClick={() => pressDigit("0")}>0</button>
                <button className="hp-btn" onClick={() => pressDigit(".")}>.</button>
                <button className="hp-btn hp-btn-enter" onClick={pressEnter}>ENTER</button>
              </div>

            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend" style={{ marginBottom: "2rem" }}>
          <p className="legend-title">Teclado</p>
          <p className="legend-keys">
            <span><span className="key">0–9</span> dígitos</span>
            <span><span className="key">Enter</span> apilar</span>
            <span><span className="key">+ − * /</span> operar</span>
            <span><span className="key">Backspace</span> borrar</span>
            <span><span className="key">Esc</span> limpiar</span>
            <span><span className="key">F1</span> deshacer</span>
            <span><span className="key">F2</span> rehacer</span>
            <span><span className="key">F6</span> sumatorio</span>
          </p>
        </div>

        {/* Otras calculadoras */}
        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.75rem", color: "var(--ts-ink4)", fontFamily: "var(--ts-mono)" }}>
          Otras calculadoras:{" "}
          <Link href="/apps/CastleComboCalc" style={{ color: "var(--ts-accent)" }}>Castle Combo</Link>
          {" · "}
          <Link href="/apps/AgricolaCalc" style={{ color: "var(--ts-accent)" }}>Agrícola</Link>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "auto", paddingTop: "2rem", paddingBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="ts-why-btn"
            onClick={() => { const next = !whyOpen; setWhyOpen(next); if (next) setTimeout(() => whyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50); }}
          >
            ¿Por qué esta calculadora?
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
              <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {whyOpen && (
            <div ref={whyRef} className="ts-why-box" style={{ maxWidth: 420, textAlign: "left" }}>
              <p>El modo RPN (Reverse Polish Notation, notación polaca inversa) es un sistema en el que los operadores se colocan después de los operandos, eliminando la necesidad de paréntesis.</p>
              <p>Se basa en una pila: los números se introducen en orden y las operaciones se aplican sobre los últimos valores introducidos.</p>
              <p>Fue propuesto por el lógico Jan Łukasiewicz y lo popularizó Hewlett-Packard en sus calculadoras científicas de los años 70 y 80.</p>
              <p>Hoy sigue siendo valorado en entornos técnicos y de programación por su eficiencia, claridad en la evaluación de expresiones y ausencia de paréntesis.</p>
              <p style={{ color: "var(--ts-ink4)", fontSize: "0.72rem" }}>↳ Creado el 7 de mayo de 2026</p>
            </div>
          )}
        </footer>

      </main>
    </TerminalShell>
  );
}
