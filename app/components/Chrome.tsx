"use client";

import { SHELL_VERSION } from "@/lib/utils";

// Cromo de ventana macOS compartido por las páginas con pestañas (cv, lab, designs).
// Antes estaba triplicado en cada una (I5). Los keyframes de dock (t-dock-in/out, etc.)
// siguen definidos en el <style> de cada página.

type WinKind = "close" | "minimize" | "maximize" | "restore";

function WinIcon({ kind }: { kind: WinKind }) {
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

function WindowBtn({ color, onClick, title, kind }: {
  color: string; onClick: () => void; title: string; kind: WinKind;
}) {
  return (
    <button title={title} aria-label={title} onClick={onClick} style={{
      width: 12, height: 12, borderRadius: "50%", background: color,
      border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* El símbolo se revela al pasar el cursor sobre el grupo (.win-dots),
          solo en dispositivos con puntero real — en táctil se quedaría pegado. */}
      <span className="win-icon"><WinIcon kind={kind} /></span>
    </button>
  );
}

export function ChromeBar({ title, onClose, onMinimize, onMaximize, isMaximized, theme, onThemeChange }: {
  title: string; onClose: () => void; onMinimize: () => void; onMaximize: () => void; isMaximized: boolean;
  theme: "light" | "dark"; onThemeChange: (t: "light" | "dark") => void;
}) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <div style={{
      background: "var(--t-paper2)", borderBottom: "1px solid var(--t-rule)",
      padding: "14px 18px", display: "grid",
      gridTemplateColumns: "140px 1fr 140px", alignItems: "center",
    }}>
      <div className="win-dots" style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <WindowBtn color="#ff5f57" onClick={onClose} title="Cerrar" kind="close" />
        <WindowBtn color="#febc2e" onClick={onMinimize} title="Minimizar" kind="minimize" />
        <WindowBtn color="#28c840" onClick={onMaximize} title={isMaximized ? "Restaurar" : "Maximizar"} kind={isMaximized ? "restore" : "maximize"} />
      </div>
      <div style={{ textAlign: "center", fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink2)" }}>
        ⌘&nbsp;&nbsp;pacr.es — {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink4)" }}>
        <button
          className="t-theme-btn"
          onClick={() => onThemeChange(nextTheme)}
          title={nextTheme === "dark" ? "Tema oscuro" : "Tema claro"}
          aria-label={nextTheme === "dark" ? "Activar tema oscuro" : "Activar tema claro"}
        >
          {/* La forma (luna en claro, sol en oscuro) la decide el CSS según data-theme de
              <html> — así es correcta desde el primer pintado, sin depender del estado React. */}
          <i className="t-theme-ico" aria-hidden="true" />
        </button>
        <span>{SHELL_VERSION}</span>
      </div>
    </div>
  );
}

export function MinimizedBar({ title, onRestore, onMaximize, onClose, animatingOut = false }: {
  title: string; onRestore: () => void; onMaximize: () => void; onClose: () => void; animatingOut?: boolean;
}) {
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
      <div className="win-dots" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <WindowBtn color="#ff5f57" onClick={onClose} title="Cerrar" kind="close" />
        <WindowBtn color="#febc2e" onClick={onRestore} title="Restaurar" kind="minimize" />
        <WindowBtn color="#28c840" onClick={onMaximize} title="Maximizar" kind="maximize" />
      </div>
      <span>pacr.es — {title}</span>
      <span style={{ color: "var(--t-ink4)", fontSize: 10 }}>· minimizado</span>
    </div>
  );
}

export type ChromeTab = { label: string; active: boolean; dot?: boolean; onClick?: () => void };

export function TabsBar({ tabs }: { tabs: ChromeTab[] }) {
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
            display: "flex", alignItems: "center", gap: 5,
            cursor: tab.onClick ? "pointer" : "default",
            userSelect: "none" as const,
          }}>
            {tab.dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--t-accent)", display: "inline-block", flexShrink: 0 }} />}
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
