"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChromeWindow from "../components/ChromeWindow";
import { useTypewriter } from "../components/useTypewriter";

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


function PromptRow({ cmd }: { cmd: string }) {
  const { typed: displayed, execMs } = useTypewriter(cmd);

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
  const router = useRouter();
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
              onClick={() => router.push(item.href)}
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
  const [visible, setVisible] = useState(0);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <>
      <style>{`


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

      <ChromeWindow
        title="designs"
        closeTo="/"
        tabs={[
          { label: "~/cv",      active: false, onClick: () => router.push("/cv") },
          { label: "~/lab",     active: false, onClick: () => router.push("/lab") },
          { label: "~/designs", active: true },
        ]}
      >
        <PromptRow cmd={CMD} />

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
      </ChromeWindow>
    </>
  );
}
