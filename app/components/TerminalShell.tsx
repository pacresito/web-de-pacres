"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { readRestoredHeight, SHELL_VERSION } from "@/lib/utils";
import { useTypewriter } from "./useTypewriter";

const MONO = "var(--t-mono)";

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
  backUrl?: string;
  destMaximized?: boolean;
  hideChrome?: boolean;
  children: ReactNode;
}

export default function TerminalShell({
  title,
  version = SHELL_VERSION,
  variant = "terminal",
  prompt,
  backUrl,
  destMaximized = false,
  hideChrome = false,
  children,
}: Props) {
  const router = useRouter();
  const [animClass, setAnimClass] = useState("");
  const [winH, setWinH] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [contentVisible, setContentVisible] = useState(variant === "terminal" ? !prompt : false);
  const cmd = prompt?.command;

  // Hereda el tema elegido en cv/lab/designs (mismo patrón que ChromeWindow). Default
  // claro; solo vira a oscuro si el usuario lo eligió antes. No hay toggle aquí: el tema
  // se cambia en la chrome de cv/lab/designs y los experimentos solo lo heredan.
  useEffect(() => {
    const saved = localStorage.getItem("pacres-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init en mount: localStorage no existe en SSR; lectura única de preferencia
    if (saved === "dark") setTheme("dark");
  }, []);

  // Tecleo del prompt (solo variante terminal). Al fijarse el execMs revela el
  // contenido 250ms después, conservando la coreografía de entrada de las /lab.
  const { typed, execMs } = useTypewriter(cmd ?? "", {
    active: variant === "terminal" && !!cmd,
    startDelay: 150,
    charMs: 20,
    postDelay: 80,
    execBase: 3,
    onDone: () => setTimeout(() => setContentVisible(true), 250),
  });

  useEffect(() => {
    if (variant !== "chrome") return;
    const t = setTimeout(() => setContentVisible(true), 30);
    return () => clearTimeout(t);
  }, [variant]);

  const handleBack = () => {
    const dest = backUrl ?? "/lab";
    if (destMaximized) { router.push(dest); return; }
    // El destino renderiza la ventana a altura de contenido; la guardó al montarse.
    // Leerla para que la animación de restaurar termine a esa misma altura (sin salto).
    const h = readRestoredHeight(dest);
    if (h) setWinH(`${h}px`);
    setAnimClass("ts-win-unmaximizing");
    setTimeout(() => router.push(dest), 900);
  };

  const chromeBar = (
    <div style={{
      background: "var(--t-paper2)",
      borderBottom: "1px solid var(--t-rule)",
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
        className={animClass ? "ts-nav-collapsing" : ""}
        style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0, overflow: "hidden" }}
      >
        <div style={{ width: 1, height: 16, background: "var(--t-rule)", margin: "0 6px", flexShrink: 0 }} />
        <button className="ts-nav-btn" onClick={handleBack} title="Volver a /lab" aria-label="Volver a /lab">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="ts-nav-btn" disabled title="Adelante" aria-label="Adelante">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="ts-nav-btn" onClick={() => window.location.reload()} title="Recargar" aria-label="Recargar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 12, color: "var(--t-ink2)" }}>
        ⌘&nbsp;&nbsp;pacr.es — {title}
      </div>
      <div style={{ flexShrink: 0, fontFamily: MONO, fontSize: 10, color: "var(--t-ink4)", whiteSpace: "nowrap" }}>
        {version}
      </div>
    </div>
  );

  if (variant === "chrome") {
    return (
      <div
        data-theme={theme}
        className={animClass === "ts-win-unmaximizing" ? "ts-outer-unmaximizing ts-chrome-outer" : ""}
        style={{ "--ts-win-w": "100vw" } as React.CSSProperties}
      >
        <div
          className={animClass}
          style={{ width: "100%", background: "transparent" } as React.CSSProperties}
        >
          <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
            {chromeBar}
          </div>
          <div
            className={animClass === "ts-win-unmaximizing" ? "ts-content-unmaximizing" : ""}
            style={{
              opacity: contentVisible ? 1 : 0,
              transition: contentVisible ? "opacity 0.35s ease" : "none",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        data-theme={theme}
        className={animClass === "ts-win-unmaximizing" ? "ts-outer-unmaximizing" : ""}
        style={{ height: "100dvh", overflow: "hidden", background: "var(--t-canvas)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: 0 }}
      >
        <div
          className={animClass}
          style={{
            "--ts-win-w": "100vw",
            ...(winH ? { "--ts-win-h": winH } : {}),
            width: "100vw",
            height: "100%",
            maxWidth: "none",
            background: "var(--t-paper)",
            borderRadius: 0,
            border: "none",
            boxShadow: "none",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          } as React.CSSProperties}
        >
          {!hideChrome && chromeBar}

          {!hideChrome && prompt && (
            <div style={{
              padding: "18px 28px 8px",
              display: "grid",
              gridTemplateColumns: "44px 1fr auto",
              gap: "0 12px",
              alignItems: "baseline",
              borderBottom: "1px dashed var(--t-rule)",
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--t-ink4)" }}>000</span>
              <span style={{ fontFamily: MONO, fontSize: 13.5 }}>
                <span style={{ color: "var(--t-accent2)" }}>pacres</span>
                <span style={{ color: "var(--t-ink3)" }}>@{prompt.host}</span>
                <span style={{ color: "var(--t-ink2)" }}>:{prompt.path}</span>
                <span style={{ color: "var(--t-ink3)" }}>$ </span>
                <span style={{ color: "var(--t-ink)" }}>{typed}</span>
                {execMs === null && (
                  <span style={{ color: "var(--t-accent)", animation: "ts-blink 1s steps(1) infinite", marginLeft: 2 }}>▍</span>
                )}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--t-ink4)", visibility: execMs !== null ? "visible" : "hidden", whiteSpace: "nowrap" }}>
                ↳ {execMs ?? 0}ms
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
