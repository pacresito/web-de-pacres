"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Data ─────────────────────────────────────────────────────────────────────

type DesignItem = {
  id: string;
  num: string;
  title: string;
  description: string;
  date: string;
  status: "primary" | "active" | "available";
  href: string;
};

const ITEMS: DesignItem[] = [
  { id: "original",    num: "01", title: "Original",    description: "El primero, una copia de mi LinkedIn como prueba de concepto.",                  date: "30 abr 2026", status: "available", href: "/home/original"   },
  { id: "dark",        num: "02", title: "Dark",        description: "Un intento de versión oscura.",                                                   date: "17 may 2026", status: "available", href: "/home/dark"        },
  { id: "neon",        num: "03", title: "Neon",        description: "Opción hortera, atrevida con primeras animaciones.",                              date: "17 may 2026", status: "available", href: "/home/neon"        },
  { id: "editorial",   num: "04", title: "Editorial",   description: "Versión más profesional con estilo editorial como protagonista.",                 date: "19 may 2026", status: "available", href: "/home/editorial"  },
  { id: "timeline",    num: "05", title: "Timeline",    description: "Timeline horizontal arrastrable y slider de recomendaciones.",                    date: "19 may 2026", status: "available", href: "/home/timeline"   },
  { id: "terminal",    num: "06", title: "Terminal",    description: "Terminal macOS con varias animaciones y guiños chulos.",                          date: "24 may 2026", status: "active",    href: "/home/terminal"   },
  { id: "manifesto",   num: "07", title: "Manifesto",   description: "La home principal. Texto editorial, física de letras, Instrument Serif.",         date: "24 may 2026", status: "primary",   href: "/home/manifesto"  },
];

const CMD = "ls ~/designs --format=grid";

// ─── Subcomponents ────────────────────────────────────────────────────────────

function WinIcon({ kind }: { kind: "close" | "minimize" | "maximize" | "restore" }) {
  const f = "rgba(0,0,0,0.4)";
  const s = { stroke: f, strokeWidth: 1.3, strokeLinecap: "round" as const, fill: "none" as const };
  if (kind === "close") return (
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" {...s} />
    </svg>
  );
  if (kind === "minimize") return (
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <path d="M1.5 4h5" {...s} />
    </svg>
  );
  return (
    <svg width="7" height="7" viewBox="0 0 8 8" style={{ display: "block" }}>
      <polygon points="1,1 5,1 1,5" fill={f} />
      <polygon points="7,7 3,7 7,3" fill={f} />
    </svg>
  );
}

function WindowBtn({ color, onClick, title, kind, showIcon = false }: {
  color: string; onClick: () => void; title: string;
  kind: "close" | "minimize" | "maximize" | "restore"; showIcon?: boolean;
}) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 12, height: 12, borderRadius: "50%", background: color,
      border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {showIcon && <WinIcon kind={kind} />}
    </button>
  );
}

function ChromeBar({ onClose, onMinimize, onMaximize, isMaximized }: {
  onClose: () => void; onMinimize: () => void; onMaximize: () => void; isMaximized: boolean;
}) {
  const [hot, setHot] = useState(false);
  return (
    <div style={{
      background: "var(--t-paper2)", borderBottom: "1px solid var(--t-rule)",
      padding: "14px 18px", display: "grid",
      gridTemplateColumns: "140px 1fr 140px", alignItems: "center",
    }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}
        onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
        <WindowBtn color="#ff5f57" onClick={onClose} title="Cerrar" kind="close" showIcon={hot} />
        <WindowBtn color="#febc2e" onClick={onMinimize} title="Minimizar" kind="minimize" showIcon={hot} />
        <WindowBtn color="#28c840" onClick={onMaximize} title={isMaximized ? "Restaurar" : "Maximizar"} kind={isMaximized ? "restore" : "maximize"} showIcon={hot} />
      </div>
      <div style={{ textAlign: "center", fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink2)" }}>
        ⌘&nbsp;&nbsp;pacr.es — designs
      </div>
      <div style={{ textAlign: "right", fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)" }}>
        v4.0.0 · zsh
      </div>
    </div>
  );
}

function MinimizedBar({ onRestore, onMaximize, onClose, animatingOut = false }: {
  onRestore: () => void; onMaximize: () => void; onClose: () => void; animatingOut?: boolean;
}) {
  const [hot, setHot] = useState(false);
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: "var(--t-paper2)", border: "1px solid var(--t-rule)", borderRadius: 10,
      padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)", fontFamily: "var(--t-mono)",
      fontSize: 12, color: "var(--t-ink2)", zIndex: 100,
      animation: animatingOut ? "t-dock-out 0.22s ease-out forwards" : "t-dock-in 0.25s ease-out",
      whiteSpace: "nowrap",
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}
        onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
        <WindowBtn color="#ff5f57" onClick={onClose} title="Cerrar" kind="close" showIcon={hot} />
        <WindowBtn color="#febc2e" onClick={onRestore} title="Restaurar" kind="minimize" showIcon={hot} />
        <WindowBtn color="#28c840" onClick={onMaximize} title="Maximizar" kind="maximize" showIcon={hot} />
      </div>
      <span>pacr.es — designs</span>
      <span style={{ color: "var(--t-ink4)", fontSize: 10 }}>· minimizado</span>
    </div>
  );
}

function TabsBar({ onCvClick, onLabClick }: { onCvClick: () => void; onLabClick: () => void }) {
  const tabs = [
    { label: "~/cv",      active: false, onClick: onCvClick  },
    { label: "~/lab",     active: false, onClick: onLabClick },
    { label: "~/designs", active: true,  onClick: undefined  },
  ];
  return (
    <div style={{
      background: "var(--t-paper2)", borderBottom: "1px solid var(--t-rule)",
      padding: "0 14px", display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex" }}>
        {tabs.map((tab) => (
          <div key={tab.label} onClick={tab.onClick} style={{
            padding: "8px 14px",
            fontFamily: "var(--t-mono)", fontSize: 11,
            color: tab.active ? "var(--t-ink)" : "var(--t-ink3)",
            borderTop: tab.active ? "2px solid var(--t-accent)" : "2px solid transparent",
            borderLeft: tab.active ? "1px solid var(--t-rule)" : "none",
            borderRight: tab.active ? "1px solid var(--t-rule)" : "none",
            background: tab.active ? "var(--t-paper)" : "transparent",
            marginBottom: tab.active ? -1 : 0,
            cursor: tab.onClick ? "pointer" : "default",
            userSelect: "none" as const,
          }}>
            {tab.label}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)", paddingBottom: 8 }} className="t-session-meta">
        session #06 — terminal
      </div>
    </div>
  );
}

function PromptRow({ cmd, active }: { cmd: string; active: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [execMs, setExecMs] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let i = 0;
    const t = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(cmd.slice(0, i));
        if (i >= cmd.length) {
          clearInterval(iv);
          const ms = cmd.length * 3 + Math.floor(Math.random() * 31) - 15;
          setTimeout(() => setExecMs(ms), 90);
        }
      }, 26);
      return () => clearInterval(iv);
    }, 120);
    return () => clearTimeout(t);
  }, [active, cmd]);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "44px 1fr auto",
      gap: "0 12px", padding: "18px 28px 8px", alignItems: "baseline",
    }} className="t-prompt">
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }} className="t-prompt-num">000</span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 13.5 }} className="t-prompt-cmd">
        <span style={{ color: "var(--t-accent2)" }}>pacres</span>
        <span style={{ color: "var(--t-ink3)" }}>@resume</span>
        <span style={{ color: "var(--t-ink2)" }}>:~/designs</span>
        <span style={{ color: "var(--t-ink3)" }}>$ </span>
        <span style={{ color: "var(--t-ink)" }}>{displayed}</span>
      </span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)", visibility: execMs !== null ? "visible" : "hidden" }}>
        ↳ {execMs ?? 0}ms
      </span>
    </div>
  );
}

function StatusTag({ status }: { status: "primary" | "active" | "available" }) {
  if (status === "primary") return (
    <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-accent2)" }}>★ primary</span>
  );
  if (status === "active") return (
    <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-accent2)" }}>● active</span>
  );
  return (
    <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)" }}>○ design</span>
  );
}

function DesignsTable({ items, visible }: { items: DesignItem[]; visible: number }) {
  return (
    <div style={{ border: "1px solid var(--t-rule)", borderRadius: 10, overflow: "hidden" }} className="t-lab-desktop">
      <div style={{
        display: "grid", gridTemplateColumns: "38px 120px 1fr 90px 80px 24px",
        gap: "0 16px", padding: "10px 18px",
        background: "var(--t-paper2)", borderBottom: "1px dashed var(--t-rule)",
        fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        <span>#</span><span>design</span><span>description</span>
        <span>created</span><span style={{ textAlign: "right" }}>status</span><span />
      </div>

      {items.map((item, idx) => {
        const revealed = idx < visible;
        return (
          <div key={item.id} className={revealed ? "t-row-in" : undefined}
            style={{ visibility: revealed ? undefined : "hidden" }}>
            <div
              onClick={() => window.location.href = item.href}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-paper2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{
                display: "grid", gridTemplateColumns: "38px 120px 1fr 90px 80px 24px",
                gap: "0 16px", padding: "10px 18px",
                borderTop: idx === 0 ? "none" : "1px dashed var(--t-rule)",
                background: item.status === "active" ? "color-mix(in srgb, var(--t-accent) 6%, var(--t-paper))" : "transparent",
                alignItems: "center", cursor: "pointer", transition: "background 0.15s",
              }}>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink4)" }}>{item.num}</span>
              <span style={{ fontFamily: "var(--t-sans)", fontSize: 14, fontWeight: 500, color: "var(--t-ink)" }}>{item.title}</span>
              <span style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink2)", lineHeight: 1.45 }}>{item.description}</span>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }}>{item.date}</span>
              <span style={{ textAlign: "right" }}><StatusTag status={item.status} /></span>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, textAlign: "center", color: "var(--t-accent2)" }}>→</span>
            </div>
          </div>
        );
      })}

      {visible >= items.length && (
        <div style={{ padding: "10px 18px", borderTop: "1px dashed var(--t-rule)", fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)" }}>
          ↳ {items.length} diseños · {items.filter(i => i.status === "active" || i.status === "primary").length} activos
        </div>
      )}
    </div>
  );
}

function DesignsCards({ items, visible }: { items: DesignItem[]; visible: number }) {
  return (
    <div className="t-lab-mobile" style={{ flexDirection: "column", gap: 8 }}>
      {items.map((item, idx) => {
        const revealed = idx < visible;
        return (
          <a key={item.id} href={item.href} className={revealed ? "t-row-in" : undefined}
            style={{
              border: `1px solid ${item.status === "active" ? "color-mix(in srgb, var(--t-accent) 35%, transparent)" : "var(--t-rule)"}`,
              borderRadius: 8,
              background: item.status === "active" ? "color-mix(in srgb, var(--t-accent) 6%, var(--t-paper))" : "var(--t-paper)",
              overflow: "hidden", textDecoration: "none", display: "block",
              visibility: revealed ? undefined : "hidden",
            }}>
            <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 10.5, color: "var(--t-ink4)" }}>{item.num}</span>
              <StatusTag status={item.status} />
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ fontFamily: "var(--t-sans)", fontSize: 14.5, fontWeight: 500, color: "var(--t-ink)", marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink2)", lineHeight: 1.55, marginBottom: 6 }}>{item.description}</div>
              <div style={{ fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink4)" }}>{item.date}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Designs() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const [windowState, setWindowState] = useState<"normal" | "minimized" | "maximized">("normal");
  const [animClass, setAnimClass] = useState("");
  const [dockAnimOut, setDockAnimOut] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const delay = 120 + CMD.length * 26 + 200 + 90 + 200;
    const t = setTimeout(() => {
      setContentReady(true);
      let count = 0;
      const iv = setInterval(() => {
        count++;
        setVisible(count);
        if (count >= ITEMS.length) clearInterval(iv);
      }, 70);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [mounted]);

  const handleClose = () => {
    const nav = () => {
      if ("startViewTransition" in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => router.push("/"));
      } else { router.push("/"); }
    };
    if (windowState === "minimized") {
      setDockAnimOut(true);
      setTimeout(() => {
        document.body.style.transition = "background 0.3s ease";
        document.body.style.background = "#f7f4ed";
        setTimeout(nav, 300);
      }, 220);
      return;
    }
    document.body.style.background = "#f7f4ed";
    setAnimClass("t-win-closing");
    setTimeout(nav, 500);
  };
  const handleMinimize = () => {
    setAnimClass("t-win-minimizing");
    setTimeout(() => { setWindowState("minimized"); setAnimClass(""); }, 390);
  };
  const handleMaximize = () => {
    if (animClass.includes("maximiz")) return;
    if (windowState !== "maximized") {
      setAnimClass("t-win-maximizing");
      setTimeout(() => { setWindowState("maximized"); setAnimClass(""); }, 1020);
    } else {
      setAnimClass("t-win-unmaximizing");
      setTimeout(() => { setWindowState("normal"); setAnimClass(""); }, 1020);
    }
  };
  const handleRestore = () => {
    setDockAnimOut(true);
    setTimeout(() => {
      setWindowState("normal");
      setAnimClass("t-win-restoring");
      setDockAnimOut(false);
      setTimeout(() => setAnimClass(""), 640);
    }, 220);
  };
  const handleRestoreMaximized = () => {
    setDockAnimOut(true);
    setTimeout(() => {
      setWindowState("maximized");
      setAnimClass("t-win-restoring");
      setDockAnimOut(false);
      setTimeout(() => setAnimClass(""), 640);
    }, 220);
  };

  const isMax = windowState === "maximized";
  const isMin = windowState === "minimized";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        :root {
          --t-paper:   #fafaf7;
          --t-paper2:  #f4f1ea;
          --t-ink:     #16140f;
          --t-ink2:    #3a382f;
          --t-ink3:    #7a766b;
          --t-ink4:    #b8b3a6;
          --t-rule:    #d9d4c7;
          --t-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
          --t-mono:    "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
          --t-accent:  #00b87a;
          --t-accent2: #009764;
        }

        @keyframes t-row-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: none; }
        }
        .t-row-in { animation: t-row-in 0.18s ease-out both; }

        .t-content-wrap {
          opacity: 0; transform: translateY(12px);
          transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        }
        .t-content-wrap.t-in { opacity: 1; transform: none; }

        @keyframes t-win-close {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.94); }
        }
        @keyframes t-win-minimize {
          0%   { opacity: 1;   transform: scale(1) translateY(0); }
          65%  { opacity: 0.4; transform: scaleX(0.35) scaleY(0.2) translateY(18vh); }
          100% { opacity: 0;   transform: scaleX(0.07) scaleY(0.02) translateY(26vh); }
        }
        @keyframes t-win-restore {
          0%   { opacity: 0;   transform: scaleX(0.07) scaleY(0.02) translateY(26vh); }
          35%  { opacity: 0.4; transform: scaleX(0.35) scaleY(0.2) translateY(18vh); }
          100% { opacity: 1;   transform: scale(1) translateY(0); }
        }
        @keyframes t-dock-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes t-dock-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(14px) scale(0.86); }
        }
        @keyframes t-win-maximize {
          0%  { width: 920px; border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25); margin-bottom: 3rem; }
          55% { width: var(--win-w); border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25); margin-bottom: 3rem; }
          100%{ width: var(--win-w); border-radius: 0; border: 1px solid transparent; box-shadow: none; margin-bottom: 0; }
        }
        @keyframes t-win-unmaximize {
          0%  { width: var(--win-w); border-radius: 0; border: 1px solid transparent; box-shadow: none; margin-bottom: 0; }
          45% { width: var(--win-w); border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25); margin-bottom: 3rem; }
          100%{ width: 920px; border-radius: 12px; border: 1px solid var(--t-rule); box-shadow: 0 30px 80px -40px rgba(0,0,0,0.25); margin-bottom: 3rem; }
        }
        @keyframes t-outer-maximize {
          0%, 55% { padding: 2rem 1rem 3rem; }
          100%    { padding: 0; }
        }
        @keyframes t-outer-unmaximize {
          0%        { padding: 0; }
          45%, 100% { padding: 2rem 1rem 3rem; }
        }
        @keyframes t-bg-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes t-bg-fade-in  { from { opacity: 0; } to { opacity: 1; } }

        .t-win-closing      { animation: t-win-close      0.2s ease-out  forwards; }
        .t-win-minimizing   { animation: t-win-minimize   0.38s ease-in  forwards; transform-origin: bottom center !important; }
        .t-win-restoring    { animation: t-win-restore    0.6s ease-out  forwards; transform-origin: bottom center !important; }
        .t-win-maximizing   { animation: t-win-maximize   1s ease forwards; }
        .t-win-unmaximizing { animation: t-win-unmaximize 1s ease forwards; }
        .t-outer-maximizing   { animation: t-outer-maximize   1s ease forwards !important; }
        .t-outer-unmaximizing { animation: t-outer-unmaximize 1s ease forwards !important; }

        .t-lab-desktop { display: block; }
        .t-lab-mobile  { display: none; }
        .t-session-meta { display: block; }

        @media (max-width: 700px) {
          .t-lab-desktop { display: none !important; }
          .t-lab-mobile  { display: flex; }
          .t-session-meta { display: none; }
          .t-content { padding: 0 16px 24px 16px !important; }
          .t-prompt  { padding: 16px 16px 6px !important; }
          .t-prompt-num { font-size: 10px !important; }
          .t-prompt-cmd { font-size: 12px !important; }
        }
      `}</style>

      {isMin && <MinimizedBar onRestore={handleRestore} onMaximize={handleRestoreMaximized} onClose={handleClose} animatingOut={dockAnimOut} />}

      <div className={`t-bg${animClass === "t-win-maximizing" ? " t-outer-maximizing" : animClass === "t-win-unmaximizing" ? " t-outer-unmaximizing" : ""}`} style={{
        minHeight: "100vh",
        background: "#ece9e0",
        padding: isMax ? 0 : "2rem 1rem 3rem",
        display: (isMin && !animClass) ? "none" : "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "var(--t-sans)",
        transition: "padding 1.1s ease",
        animation:
          animClass === "t-win-closing"    ? "t-bg-fade-out 0.2s ease-out  forwards" :
          animClass === "t-win-minimizing" ? "t-bg-fade-out 0.38s ease-in   forwards" :
          animClass === "t-win-restoring"  ? "t-bg-fade-in  0.6s  ease-out"           :
          undefined,
      }}>
        <div className={animClass} style={{
          "--win-w": "100vw",
          width: isMax ? "100vw" : "min(920px, 100%)",
          maxWidth: "none",
          background: "var(--t-paper)",
          borderRadius: isMax ? 0 : 12,
          border: isMax ? "none" : "1px solid var(--t-rule)",
          boxShadow: isMax ? "none" : "0 30px 80px -40px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
          marginBottom: isMax ? 0 : "3rem",
          transformOrigin: (animClass === "t-win-minimizing" || animClass === "t-win-restoring") ? "bottom center" : "center center",
        } as React.CSSProperties}>
          <ChromeBar
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            isMaximized={windowState === "maximized" || animClass === "t-win-maximizing"}
          />
          <TabsBar
            onCvClick={() => router.push("/home/terminal")}
            onLabClick={() => router.push("/lab")}
          />

          <PromptRow cmd={CMD} active={mounted} />

          <div className={`t-content-wrap${contentReady ? " t-in" : ""}`}>
            <div className="t-content" style={{ padding: "0 28px 32px 86px" }}>
              <DesignsTable items={ITEMS} visible={visible} />
              <DesignsCards items={ITEMS} visible={visible} />
            </div>
          </div>

          <div style={{ padding: "0.4rem 28px 1.5rem", textAlign: "center" }}>
            <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink4)" }}>
              ↳ pacr.es/designs
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
