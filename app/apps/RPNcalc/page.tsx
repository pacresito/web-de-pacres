"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

export default function CalculadoraRPN() {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyRef = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState<number[]>([]);
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [justOperated, setJustOperated] = useState(false);
  const [lastFlash, setLastFlash] = useState(false);

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
    setStack(newStack);
    setJustOperated(false);
  }, [input, stack]);

  const pressDel = useCallback(() => {
    clearError();
    if (input !== "") {
      setInput((prev) => prev.slice(0, -1));
    } else if (stack.length > 0) {
      setStack((prev) => prev.slice(0, -1));
      setJustOperated(false);
    }
  }, [input, stack]);

  const pressClear = useCallback(() => {
    setStack([]);
    setInput("");
    setError(null);
    setJustOperated(false);
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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pressDigit, pressEnter, pressOp, pressDel, pressClear]);

  const formatNum = (n: number) => {
    if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
    return parseFloat(n.toPrecision(10)).toString();
  };

  const displayStack = [...stack];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #ffffff; }

        /* ── Page layout (igual que extras) ── */
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
          color: #111827;
        }
        .page-title span {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-subtitle {
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #9ca3af;
          line-height: 1.65;
          max-width: 560px;
        }

        .divider {
          border: none;
          border-top: 1px solid rgba(0,0,0,0.07);
        }

        /* ── HP 49G body ── */
        .hp-wrap {
          display: flex;
          justify-content: center;
        }

        .hp-body {
          width: 100%;
          max-width: 340px;
          background: linear-gradient(170deg, #26223a 0%, #1a1628 60%, #14111f 100%);
          border-radius: 12px 12px 20px 20px;
          padding: 18px 16px 22px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.07),
            0 4px 6px rgba(0,0,0,0.25),
            0 20px 60px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(255,255,255,0.09);
          position: relative;
        }

        /* Top stripe — same purple-gray */
        .hp-body::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 6px;
          background: linear-gradient(90deg, #3b2f6e, #5a3fa0, #3b2f6e);
          border-radius: 12px 12px 0 0;
          opacity: 0.7;
        }

        /* ── Brand bar ── */
        .hp-brand {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 0 2px;
        }

        .hp-logo {
          font-size: 1.1rem;
          font-weight: 900;
          font-family: var(--font-geist-sans), Arial, sans-serif;
          color: #c8bfea;
          letter-spacing: -0.05em;
          font-style: italic;
        }

        .hp-model {
          font-size: 0.55rem;
          font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(200,191,234,0.45);
        }

        /* ── Screen bezel ── */
        .hp-screen-bezel {
          background: #0d0b16;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 14px;
          box-shadow:
            inset 0 2px 6px rgba(0,0,0,0.6),
            0 1px 0 rgba(255,255,255,0.05);
        }

        /* ── LCD ── */
        .hp-lcd {
          background: #b8ccaa;
          border-radius: 2px;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
          position: relative;
          transition: background 0.15s;
        }

        .hp-lcd.flash {
          background: #cce0b0;
        }

        /* Subtle LCD scanline texture */
        .hp-lcd::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 3px
          );
          pointer-events: none;
        }

        /* ── Stack area ── */
        .hp-stack {
          flex: 1;
          min-height: 108px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 6px 8px 4px;
          border-bottom: 1px solid rgba(0,0,0,0.15);
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
          color: rgba(30,50,10,0.35);
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
          color: rgba(30,50,10,0.4);
          min-width: 1.5rem;
          letter-spacing: 0.08em;
        }

        .hp-stack-val {
          font-size: 0.82rem;
          font-family: var(--font-geist-mono), monospace;
          font-weight: 600;
          color: #1a320a;
          text-align: right;
          flex: 1;
        }

        .hp-stack-val.is-top {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0d2205;
        }

        /* ── Input display ── */
        .hp-input {
          padding: 5px 8px 6px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-height: 36px;
        }

        .hp-input-num {
          font-size: 1.35rem;
          font-family: var(--font-geist-mono), monospace;
          font-weight: 700;
          color: #0d2205;
          letter-spacing: -0.02em;
        }

        .hp-input-placeholder {
          font-size: 0.65rem;
          font-family: var(--font-geist-mono), monospace;
          color: rgba(30,50,10,0.3);
          letter-spacing: 0.1em;
        }

        .hp-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #1a320a;
          margin-left: 1px;
          vertical-align: text-bottom;
          animation: blink 0.9s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* ── Error strip ── */
        .hp-error {
          padding: 3px 8px;
          background: rgba(180,0,0,0.15);
          border-top: 1px solid rgba(180,0,0,0.25);
          font-size: 0.58rem;
          font-family: var(--font-geist-mono), monospace;
          color: #7a1010;
          letter-spacing: 0.04em;
        }

        /* ── Soft-menu strip (decorative, like HP) ── */
        .hp-softmenu {
          display: flex;
          gap: 2px;
          margin-bottom: 10px;
        }

        .hp-softkey {
          flex: 1;
          height: 14px;
          background: #1e1a30;
          border-radius: 2px;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.06),
            inset 0 1px 2px rgba(0,0,0,0.4);
        }

        /* ── Button grid ── */
        .hp-btns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
        }

        .hp-btn {
          background: linear-gradient(180deg, #2e2848 0%, #231f38 100%);
          border: none;
          border-radius: 4px;
          padding: 0.9rem 0.3rem 0.7rem;
          font-size: 0.9rem;
          font-family: var(--font-geist-mono), monospace;
          font-weight: 600;
          color: #ddd8f0;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          box-shadow:
            0 3px 0 #0f0d1a,
            0 4px 6px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.1);
          transition: transform 0.07s, box-shadow 0.07s;
          position: relative;
        }

        .hp-btn:active {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 #0f0d1a,
            0 2px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }

        /* Operator buttons — amber/orange (HP right-shift color) */
        .hp-btn-op {
          background: linear-gradient(180deg, #8b3a00 0%, #6e2d00 100%);
          color: #ffd090;
          box-shadow:
            0 3px 0 #2a0d00,
            0 4px 6px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,200,100,0.15);
        }
        .hp-btn-op:active {
          box-shadow:
            0 1px 0 #2a0d00,
            0 2px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,200,100,0.08);
        }

        /* ENTER — blue (HP left-shift color) */
        .hp-btn-enter {
          background: linear-gradient(180deg, #1a4080 0%, #122e5e 100%);
          color: #90c8ff;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          grid-column: span 2;
          box-shadow:
            0 3px 0 #060f20,
            0 4px 6px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(144,200,255,0.12);
        }
        .hp-btn-enter:active {
          box-shadow:
            0 1px 0 #060f20,
            0 2px 3px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(144,200,255,0.06);
        }

        /* Clear — dark red */
        .hp-btn-clear {
          background: linear-gradient(180deg, #5a1010 0%, #440c0c 100%);
          color: #ff9090;
          box-shadow:
            0 3px 0 #1a0404,
            0 4px 6px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,150,150,0.1);
        }
        .hp-btn-clear:active {
          box-shadow:
            0 1px 0 #1a0404,
            0 2px 3px rgba(0,0,0,0.3);
        }

        /* DEL and SWAP — slightly muted */
        .hp-btn-util {
          background: linear-gradient(180deg, #1e1c2c 0%, #171522 100%);
          color: #a090d0;
          font-size: 0.62rem;
          letter-spacing: 0.06em;
          box-shadow:
            0 3px 0 #09080f,
            0 4px 6px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .hp-btn-util:active {
          box-shadow:
            0 1px 0 #09080f,
            0 2px 3px rgba(0,0,0,0.3);
        }

        /* ── Legend (page level, white bg) ── */
        .legend {
          padding: 0.75rem 1rem;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 6px;
          background: #ffffff;
        }

        .legend-title {
          font-size: 0.55rem;
          font-family: var(--font-geist-mono), monospace;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #9ca3af;
          margin-bottom: 0.5rem;
        }

        .legend-keys {
          font-size: 0.7rem;
          font-family: var(--font-geist-mono), monospace;
          color: #9ca3af;
          line-height: 1.9;
          display: flex;
          flex-wrap: wrap;
          gap: 0.15rem 0.5rem;
        }

        .key {
          display: inline-block;
          border: 1px solid rgba(0,0,0,0.12);
          padding: 0 0.35rem;
          border-radius: 3px;
          font-size: 0.6rem;
          color: #374151;
          background: #f9fafb;
          margin-right: 0.15rem;
        }

        .pacres-link {
          font-size: 0.75rem;
          color: #9ca3af;
          font-family: var(--font-geist-mono), monospace;
          text-decoration: none;
          transition: color 0.2s;
        }
        .pacres-link:hover { color: #3b82f6; }
      `}</style>

      <main className="calc-page">

        {/* Header — igual que extras */}
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

        {/* HP 49G Calculator */}
        <div className="hp-wrap" style={{ marginBottom: "2.5rem" }}>
          <div className="hp-body">

            {/* Brand */}
            <div className="hp-brand">
              <span className="hp-logo">hp</span>
              <span className="hp-model">49g+  ·  RPN</span>
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

            {/* Soft-menu strip (decorativo) */}
            <div className="hp-softmenu">
              {[0,1,2,3,4,5].map(i => <div key={i} className="hp-softkey" />)}
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

        {/* Legend */}
        <div className="legend" style={{ marginBottom: "2rem" }}>
          <p className="legend-title">Teclado</p>
          <p className="legend-keys">
            <span><span className="key">0–9</span> dígitos</span>
            <span><span className="key">Enter</span> apilar</span>
            <span><span className="key">+ − * /</span> operar</span>
            <span><span className="key">Backspace</span> borrar</span>
            <span><span className="key">Esc</span> limpiar</span>
          </p>
        </div>

        {/* Footer */}
        <footer style={{ marginTop: "auto", paddingTop: "2rem", paddingBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", width: 480, maxWidth: "100%", position: "relative" }}>
            <Link href="/lab" className="pacres-link">pacr.es</Link>
            <button
              onClick={() => { const next = !whyOpen; setWhyOpen(next); if (next) setTimeout(() => whyRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50); }}
              style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.7rem", color: "#9ca3af", fontFamily: "var(--font-geist-mono), monospace", transition: "color 0.2s", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
            >
              ¿Por qué esta calculadora?
              <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: whyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                <path d="M1 3L5 7L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {whyOpen && (
            <div ref={whyRef} style={{ maxWidth: 420, fontSize: "0.78rem", color: "#6b7280", lineHeight: 1.65, textAlign: "center", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <p>El modo RPN (Reverse Polish Notation, notación polaca inversa) es un sistema en el que los operadores se colocan después de los operandos, eliminando la necesidad de paréntesis.</p>
              <p>Se basa en una pila: los números se introducen en orden y las operaciones se aplican sobre los últimos valores introducidos.</p>
              <p>Fue propuesto por el lógico Jan Łukasiewicz y lo popularizó Hewlett-Packard en sus calculadoras científicas de los años 70 y 80.</p>
              <p>Hoy sigue siendo valorado en entornos técnicos y de programación por su eficiencia, claridad en la evaluación de expresiones y ausencia de paréntesis.</p>
              <p style={{ color: "#9ca3af", fontSize: "0.72rem" }}>Creado el 7 de mayo de 2026.</p>
            </div>
          )}
        </footer>

      </main>
    </>
  );
}
