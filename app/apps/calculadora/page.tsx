"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

export default function CalculadoraRPN() {
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
        :root {
          --blue: #3b82f6;
          --blue-dim: rgba(59,130,246,0.12);
          --blue-dark: #1d4ed8;
          --purple: #7c3aed;
          --red: #ef4444;
          --green: #10b981;
          --bg: #0f0f0f;
          --surface: #1a1a1a;
          --surface2: #222222;
          --border: rgba(255,255,255,0.07);
          --border-strong: rgba(255,255,255,0.13);
          --text: #f3f4f6;
          --text-muted: #6b7280;
          --text-dim: #9ca3af;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .calc-page {
          min-height: 100dvh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: clamp(2rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem);
        }

        .calc-inner {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Header */
        .header {
          margin-bottom: 2rem;
        }

        .badge {
          display: inline-block;
          font-size: 0.6rem;
          font-family: var(--font-geist-mono, monospace);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--blue);
          border: 1px solid rgba(59,130,246,0.3);
          padding: 0.2rem 0.55rem;
          border-radius: 2px;
          margin-bottom: 0.8rem;
          background: rgba(59,130,246,0.06);
        }

        .page-title {
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          color: var(--text);
          margin-bottom: 0.6rem;
        }

        .page-title em {
          font-style: normal;
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 40%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .antonio-text {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: var(--font-geist-mono, monospace);
          line-height: 1.6;
          max-width: 360px;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
          margin-top: 0.75rem;
        }

        .antonio-text strong {
          color: var(--text-dim);
          font-weight: 600;
        }

        /* Calculator card */
        .calc-card {
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          overflow: hidden;
        }

        /* Stack */
        .stack-area {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1rem 1.25rem 0.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
          position: relative;
        }

        .stack-empty-msg {
          color: var(--text-muted);
          font-family: var(--font-geist-mono, monospace);
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          text-align: center;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.4;
        }

        .stack-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding: 0.2rem 0;
        }

        .stack-idx {
          font-size: 0.55rem;
          font-family: var(--font-geist-mono, monospace);
          color: var(--text-muted);
          opacity: 0.45;
          letter-spacing: 0.12em;
          min-width: 1.8rem;
        }

        .stack-val {
          font-size: 0.95rem;
          font-family: var(--font-geist-mono, monospace);
          font-weight: 500;
          color: var(--text-dim);
          text-align: right;
          flex: 1;
        }

        .stack-val.is-top {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text);
        }

        /* Input display */
        .display-area {
          padding: 0.6rem 1.25rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-height: 52px;
          background: var(--surface);
          transition: background 0.15s;
        }

        .display-area.flash {
          background: rgba(59,130,246,0.08);
        }

        .display-num {
          font-size: 1.8rem;
          font-family: var(--font-geist-mono, monospace);
          font-weight: 700;
          color: var(--blue);
          letter-spacing: -0.02em;
        }

        .display-placeholder {
          font-size: 0.78rem;
          font-family: var(--font-geist-mono, monospace);
          color: var(--text-muted);
          opacity: 0.45;
          letter-spacing: 0.05em;
        }

        .cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: var(--blue);
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: blink 0.9s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Error */
        .error-strip {
          padding: 0.4rem 1.25rem;
          background: rgba(239,68,68,0.06);
          border-bottom: 1px solid rgba(239,68,68,0.15);
          font-size: 0.68rem;
          font-family: var(--font-geist-mono, monospace);
          color: #f87171;
          letter-spacing: 0.04em;
        }

        /* Button grid */
        .btn-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--border);
        }

        .btn {
          background: var(--surface2);
          border: none;
          padding: 1.15rem 0.5rem;
          font-size: 1.05rem;
          font-family: var(--font-geist-mono, monospace);
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          transition: background 0.1s, color 0.1s, transform 0.08s;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .btn:hover { background: #2a2a2a; }
        .btn:active { background: #333; transform: scale(0.97); }

        .btn-op {
          color: #60a5fa;
          font-weight: 700;
          font-size: 1.15rem;
          background: rgba(59,130,246,0.05);
        }
        .btn-op:hover { background: rgba(59,130,246,0.1); }
        .btn-op:active { background: rgba(59,130,246,0.18); }

        .btn-enter {
          background: var(--blue);
          color: #fff;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          grid-column: span 2;
        }
        .btn-enter:hover { background: #2563eb; }
        .btn-enter:active { background: var(--blue-dark); }

        .btn-clear {
          color: #f87171;
          font-weight: 700;
          background: rgba(239,68,68,0.05);
        }
        .btn-clear:hover { background: rgba(239,68,68,0.1); }
        .btn-clear:active { background: rgba(239,68,68,0.18); }

        .btn-del {
          color: var(--text-dim);
          font-size: 0.75rem;
          letter-spacing: 0.04em;
        }

        .btn-swap {
          color: #a78bfa;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          background: rgba(124,58,237,0.04);
        }
        .btn-swap:hover { background: rgba(124,58,237,0.1); }
        .btn-swap:active { background: rgba(124,58,237,0.18); }

        /* Legend */
        .legend {
          margin-top: 1.5rem;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--surface);
        }

        .legend-title {
          font-size: 0.55rem;
          font-family: var(--font-geist-mono, monospace);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-muted);
          opacity: 0.6;
          margin-bottom: 0.5rem;
        }

        .legend-keys {
          font-size: 0.7rem;
          font-family: var(--font-geist-mono, monospace);
          color: var(--text-muted);
          line-height: 1.9;
          display: flex;
          flex-wrap: wrap;
          gap: 0.15rem 0.5rem;
        }

        .key {
          display: inline-block;
          border: 1px solid var(--border-strong);
          padding: 0 0.35rem;
          border-radius: 3px;
          font-size: 0.6rem;
          color: var(--text-dim);
          background: var(--surface2);
          margin-right: 0.15rem;
        }

        .back-link {
          display: inline-block;
          margin-top: 1.75rem;
          font-size: 0.7rem;
          font-family: var(--font-geist-mono, monospace);
          color: var(--text-muted);
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--blue); }
      `}</style>

      <div className="calc-page">
        <div className="calc-inner">

          {/* Header */}
          <header className="header">
            <div className="badge">app · calculadora</div>
            <h1 className="page-title">
              <em>RPN</em> Calc
            </h1>
            <p className="antonio-text">
              Cumpliendo el sueño de <strong>Antonio</strong> (ingeniero industrial):<br />
              una calculadora con modo RPN. Porque introducir el operador<br />
              al final no es una excentricidad — es superioridad cognitiva.
            </p>
          </header>

          {/* Calc */}
          <div className="calc-card">

            {/* Stack */}
            <div className="stack-area">
              {stack.length === 0 ? (
                <p className="stack-empty-msg">pila vacía · ingresa números</p>
              ) : (
                stack.map((val, i) => {
                  const isTop = i === stack.length - 1;
                  const label = stack.length - i;
                  return (
                    <div key={i} className="stack-row">
                      <span className="stack-idx">{label}</span>
                      <span className={`stack-val ${isTop ? "is-top" : ""}`}>
                        {formatNum(val)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input display */}
            <div className={`display-area${lastFlash ? " flash" : ""}`}>
              {input === "" ? (
                <span className="display-placeholder">_ _ _</span>
              ) : (
                <span className="display-num">
                  {input}<span className="cursor" />
                </span>
              )}
            </div>

            {/* Error */}
            {error && <div className="error-strip">{error}</div>}

            {/* Buttons */}
            <div className="btn-grid">
              <button className="btn btn-clear" onClick={pressClear}>C</button>
              <button className="btn btn-del" onClick={pressDel}>DEL</button>
              <button className="btn btn-swap" onClick={pressSwap}>SWAP</button>
              <button className="btn btn-op" onClick={() => pressOp("/")}>÷</button>

              <button className="btn" onClick={() => pressDigit("7")}>7</button>
              <button className="btn" onClick={() => pressDigit("8")}>8</button>
              <button className="btn" onClick={() => pressDigit("9")}>9</button>
              <button className="btn btn-op" onClick={() => pressOp("*")}>×</button>

              <button className="btn" onClick={() => pressDigit("4")}>4</button>
              <button className="btn" onClick={() => pressDigit("5")}>5</button>
              <button className="btn" onClick={() => pressDigit("6")}>6</button>
              <button className="btn btn-op" onClick={() => pressOp("-")}>−</button>

              <button className="btn" onClick={() => pressDigit("1")}>1</button>
              <button className="btn" onClick={() => pressDigit("2")}>2</button>
              <button className="btn" onClick={() => pressDigit("3")}>3</button>
              <button className="btn btn-op" onClick={() => pressOp("+")}>+</button>

              <button className="btn" onClick={() => pressDigit("0")}>0</button>
              <button className="btn" onClick={() => pressDigit(".")}>.</button>
              <button className="btn btn-enter" onClick={pressEnter}>ENTER</button>
            </div>
          </div>

          {/* Legend */}
          <div className="legend">
            <p className="legend-title">Teclado</p>
            <p className="legend-keys">
              <span><span className="key">0–9</span> dígitos</span>
              <span><span className="key">Enter</span> apilar</span>
              <span><span className="key">+ − * /</span> operar</span>
              <span><span className="key">Backspace</span> borrar</span>
              <span><span className="key">Esc</span> limpiar</span>
            </p>
          </div>

          <Link href="/extras" className="back-link">← extras</Link>
        </div>
      </div>
    </>
  );
}
