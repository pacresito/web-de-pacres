"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

interface PromptConfig {
  host: string;
  path: string;
  command: string;
}

interface Props {
  title: string;
  version?: string;
  variant?: "terminal" | "chrome";
  prompt?: PromptConfig;
  children: ReactNode;
}

export default function TerminalShell({
  title,
  version = "v1.0.0 · zsh",
  variant = "terminal",
  prompt,
  children,
}: Props) {
  const router = useRouter();
  const [animClass, setAnimClass] = useState("");
  const [winWidth, setWinWidth] = useState(0);

  const [typedLen, setTypedLen] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [contentVisible, setContentVisible] = useState(!prompt || variant !== "terminal");
  const startRef = useRef(0);

  useEffect(() => {
    setWinWidth(window.innerWidth);
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!prompt || variant !== "terminal") return;
    const cmd = prompt.command;
    let i = 0;
    startRef.current = Date.now();
    const init = setTimeout(() => {
      const id = setInterval(() => {
        i++;
        setTypedLen(i);
        if (i >= cmd.length) {
          clearInterval(id);
          const ms = cmd.length * 3 + Math.floor(Math.random() * 31) - 15;
          setTimeout(() => {
            setTypingDone(true);
            setElapsedMs(ms);
            setTimeout(() => setContentVisible(true), 250);
          }, 80);
        }
      }, 20);
      return () => clearInterval(id);
    }, 150);
    return () => clearTimeout(init);
  }, []);

  const handleBack = () => {
    if (variant === "terminal") {
      setAnimClass("ts-win-unmaximizing");
      setTimeout(() => router.push("/lab"), 900);
    } else {
      router.push("/lab");
    }
  };

  const chromeBar = (
    <div style={{
      background: "var(--ts-paper2)",
      borderBottom: "1px solid var(--ts-rule)",
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: 7,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
      </div>
      <div
        className={animClass === "ts-win-unmaximizing" ? "ts-nav-collapsing" : ""}
        style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0, overflow: "hidden" }}
      >
        <div style={{ width: 1, height: 16, background: "var(--ts-rule)", margin: "0 6px", flexShrink: 0 }} />
        <button className="ts-nav-btn" onClick={handleBack} title="Volver a /lab">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="ts-nav-btn" disabled title="Adelante">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="ts-nav-btn" onClick={() => window.location.reload()} title="Recargar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 12, color: "var(--ts-ink2)" }}>
        ⌘&nbsp;&nbsp;pacr.es — {title}
      </div>
      <div style={{ flexShrink: 0, fontFamily: MONO, fontSize: 10, color: "var(--ts-ink4)", whiteSpace: "nowrap" }}>
        {version}
      </div>
    </div>
  );

  if (variant === "chrome") {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
          :root {
            --ts-paper2: #f4f1ea;
            --ts-ink2:   #3a382f;
            --ts-ink4:   #b8b3a6;
            --ts-rule:   #d9d4c7;
            --ts-accent: #00b87a;
          }
          .ts-nav-btn {
            background: none; border: none; cursor: pointer;
            color: var(--ts-ink2); padding: 4px;
            display: inline-flex; align-items: center; justify-content: center;
            transition: color 0.15s; border-radius: 4px;
          }
          .ts-nav-btn:hover { color: #16140f; }
          .ts-nav-btn:disabled { color: var(--ts-ink4); cursor: default; }
          .ts-nav-collapsing { display: none; }
        `}</style>
        <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
          {chromeBar}
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        :root {
          --ts-paper:  #fafaf7;
          --ts-paper2: #f4f1ea;
          --ts-ink:    #16140f;
          --ts-ink2:   #3a382f;
          --ts-ink3:   #7a766b;
          --ts-ink4:   #b8b3a6;
          --ts-rule:   #d9d4c7;
          --ts-accent: #00b87a;
          --ts-accent2:#009764;
          --ts-mono:   ${MONO};
        }
        .ts-nav-btn {
          background: none; border: none; cursor: pointer;
          color: var(--ts-ink2); padding: 4px;
          display: inline-flex; align-items: center; justify-content: center;
          transition: color 0.15s; border-radius: 4px;
        }
        .ts-nav-btn:hover { color: var(--ts-ink); }
        .ts-nav-btn:disabled { color: var(--ts-ink4); cursor: default; }

        @keyframes ts-blink { 50% { opacity: 0; } }

        @keyframes ts-win-unmaximize {
          0%   { width: var(--ts-win-w); border-radius: 0; border: 1px solid transparent; box-shadow: none; }
          45%  { width: var(--ts-win-w); border-radius: 12px; border: 1px solid var(--ts-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04); }
          100% { width: 900px; border-radius: 12px; border: 1px solid var(--ts-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04); }
        }
        @keyframes ts-outer-unmaximize {
          0%        { padding: 0; }
          45%, 100% { padding: 2rem 1rem 3rem; }
        }
        .ts-win-unmaximizing   { animation: ts-win-unmaximize   0.9s ease forwards; }
        .ts-outer-unmaximizing { animation: ts-outer-unmaximize 0.9s ease forwards !important; }

        @keyframes ts-content-fadeout {
          0%, 45% { opacity: 1; }
          100%    { opacity: 0; }
        }
        .ts-content-unmaximizing { animation: ts-content-fadeout 0.9s ease forwards; }

        @keyframes ts-nav-collapse {
          0%   { opacity: 1; max-width: 200px; }
          40%  { opacity: 0; max-width: 200px; }
          100% { opacity: 0; max-width: 0; overflow: hidden; }
        }
        .ts-nav-collapsing { animation: ts-nav-collapse 0.9s ease forwards; }

        .ts-why-btn {
          background: none; border: none; cursor: pointer;
          font-family: var(--ts-mono); font-size: 0.75rem;
          color: var(--ts-ink3); padding: 0;
          display: flex; align-items: center; gap: 4px;
          transition: color 0.15s;
        }
        .ts-why-btn:hover { color: var(--ts-accent); }
        .ts-why-box {
          margin-top: 1rem;
          padding: 16px 20px;
          border: 1px solid var(--ts-rule);
          border-left: 3px solid var(--ts-accent);
          border-radius: 8px;
          background: var(--ts-paper2);
          font-family: var(--ts-mono);
          font-size: 0.78rem;
          color: var(--ts-ink2);
          line-height: 1.65;
          display: flex; flex-direction: column; gap: 0.65rem;
        }
      `}</style>

      <div
        className={animClass === "ts-win-unmaximizing" ? "ts-outer-unmaximizing" : ""}
        style={{ height: "100dvh", overflow: "hidden", background: "#ece9e0", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 0 }}
      >
        <div
          className={animClass}
          style={{
            "--ts-win-w": winWidth ? `${winWidth}px` : "100vw",
            width: winWidth ? winWidth : "100%",
            height: "100%",
            maxWidth: "none",
            background: "var(--ts-paper)",
            borderRadius: 0,
            border: "none",
            boxShadow: "none",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          } as React.CSSProperties}
        >
          {chromeBar}

          {prompt && (
            <div style={{
              padding: "18px 28px 8px",
              display: "grid",
              gridTemplateColumns: "44px 1fr auto",
              gap: "0 12px",
              alignItems: "baseline",
              borderBottom: "1px dashed var(--ts-rule)",
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--ts-ink4)" }}>000</span>
              <span style={{ fontFamily: MONO, fontSize: 13.5 }}>
                <span style={{ color: "var(--ts-accent2)" }}>pacres</span>
                <span style={{ color: "var(--ts-ink3)" }}>@{prompt.host}</span>
                <span style={{ color: "var(--ts-ink2)" }}>:{prompt.path}</span>
                <span style={{ color: "var(--ts-ink3)" }}>$ </span>
                <span style={{ color: "var(--ts-ink)" }}>{prompt.command.slice(0, typedLen)}</span>
                {!typingDone && (
                  <span style={{ color: "var(--ts-accent)", animation: "ts-blink 1s steps(1) infinite", marginLeft: 2 }}>▍</span>
                )}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ts-ink4)", visibility: elapsedMs !== null ? "visible" : "hidden", whiteSpace: "nowrap" }}>
                ↳ {elapsedMs ?? 0}ms
              </span>
            </div>
          )}

          <div
            className={animClass === "ts-win-unmaximizing" ? "ts-content-unmaximizing" : ""}
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              opacity: contentVisible ? 1 : 0,
              transition: contentVisible ? "opacity 0.4s ease" : "none",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
