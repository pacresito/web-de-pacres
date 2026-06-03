"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChromeWindow from "../components/ChromeWindow";
import { useTypewriter } from "../components/useTypewriter";
import { calcularEdad } from "@/lib/utils";

// ─── Data ─────────────────────────────────────────────────────────────────────

type LabItem = {
  id: string;
  num: string;
  type: string;
  title: string;
  description: string;
  status: "available" | "hidden" | "soon";
  href: string | null;
  cta: string;
};

const ITEMS: LabItem[] = [
  { id: "lucas",       num: "01", type: "web",        title: "Dr. Lucas Crespo",     description: `Perfil profesional de un aeronáutico de ${calcularEdad(new Date(2020, 2, 30))} años.`, status: "available", href: "/webs/lucas",       cta: "Ver perfil →" },
  { id: "placeholder", num: "02", type: "web",        title: "Aquí va lo importante", description: "Aquí podría ir tu web. Dime tu idea y lo implementamos.",                            status: "soon",      href: null,               cta: "En construcción" },
  { id: "rpncalc",     num: "03", type: "app",        title: "Calculadora RPN",       description: "Para los que piensan en pila.",                                                       status: "available", href: "/apps/RPNcalc",     cta: "Abrir →" },
  { id: "fluidos",     num: "04", type: "app",        title: "Fluidos",               description: "Agua, fuego, tierra. Controla los elementos.",                                        status: "available", href: "/apps/fluidos",     cta: "Abrir →" },
  { id: "espiral",     num: "05", type: "juego",      title: "Espiral",               description: "Dos caminos distintos, una sola decisión.",                                        status: "available", href: "/juegos/espiral",   cta: "Jugar →" },
  { id: "laberinto",   num: "06", type: "juego",      title: "Laberinto",             description: "Inclina el móvil o usa el ratón.",                                                    status: "available", href: "/juegos/laberinto", cta: "Jugar →" },
  { id: "circulo",     num: "07", type: "truco",      title: "Círculo perfecto",      description: "Dibuja el círculo más perfecto que puedas.",                                          status: "available", href: "/trucos/circulo",   cta: "Probar →" },
  { id: "magia",       num: "08", type: "truco",      title: "Magia de la buena",     description: "Piensa en una carta. No me la digas.",                                                status: "available", href: "/trucos/magia",     cta: "Probar →" },
  { id: "letras",      num: "09", type: "easter-egg", title: "Las letras caen",       description: "Algo pasa si sabes dónde pinchar.",                                                   status: "hidden",    href: "/",                cta: "Ir a probarlo →" },
  { id: "color",       num: "10", type: "easter-egg", title: "Cambio de tema",        description: `Cambio de tema dinámico en el diseño "Original".`,                                                               status: "hidden", href: "/home/original", cta: "Ir a probarlo →" },
];

const CMD = "ls ~/lab --long --all";

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
        <span style={{ color: "var(--t-ink2)" }}>:~/lab</span>
        <span style={{ color: "var(--t-ink3)" }}>$ </span>
        <span style={{ color: "var(--t-ink)" }}>{displayed}</span>
      </span>
      <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)", visibility: execMs !== null ? "visible" : "hidden" }}>
        ↳ {execMs ?? 0}ms
      </span>
    </div>
  );
}

function StatusTag({ status }: { status: "available" | "hidden" | "soon" }) {
  const cfg = {
    available: { label: "● live",   color: "var(--t-accent2)" },
    hidden:    { label: "◌ hidden", color: "var(--t-ink4)"    },
    soon:      { label: "○ soon",   color: "var(--t-ink3)"    },
  }[status];
  return <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: cfg.color }}>{cfg.label}</span>;
}

function TypePill({ type, status }: { type: string; status: "available" | "hidden" | "soon" }) {
  const live = status === "available";
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontFamily: "var(--t-mono)",
      textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px",
      borderRadius: 999,
      border: `1px solid ${live ? "color-mix(in srgb, var(--t-accent) 35%, transparent)" : "var(--t-rule)"}`,
      background: live ? "color-mix(in srgb, var(--t-accent) 12%, var(--t-paper))" : "var(--t-paper)",
      color: live ? "var(--t-accent2)" : status === "hidden" ? "var(--t-ink4)" : "var(--t-ink3)",
    }}>
      {type}
    </span>
  );
}

function LabTable({ items, visible }: { items: LabItem[]; visible: number }) {
  const router = useRouter();
  const available = items.filter(i => i.status === "available").length;
  const hidden    = items.filter(i => i.status === "hidden").length;
  return (
    <div style={{ border: "1px solid var(--t-rule)", borderRadius: 10, overflow: "hidden" }} className="t-lab-desktop">
      <div style={{
        display: "grid", gridTemplateColumns: "38px 100px 160px 1fr 80px 24px",
        gap: "0 16px", padding: "10px 18px",
        background: "var(--t-paper2)", borderBottom: "1px dashed var(--t-rule)",
        fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink3)",
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        <span>#</span><span>type</span><span>title</span><span>description</span>
        <span style={{ textAlign: "right" }}>status</span><span />
      </div>

      {items.map((item, idx) => {
        const revealed = idx < visible;
        const clickable = item.status === "available" && item.href;
        return (
          <div key={item.id} className={revealed ? "t-row-in" : undefined}
            style={{ visibility: revealed ? undefined : "hidden" }}>
            <div
              onClick={() => { if (clickable) router.push(item.href!); }}
              onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = "var(--t-paper2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{
                display: "grid", gridTemplateColumns: "38px 100px 160px 1fr 80px 24px",
                gap: "0 16px", padding: "10px 18px",
                borderTop: idx === 0 ? "none" : "1px dashed var(--t-rule)",
                background: "transparent", alignItems: "center",
                cursor: clickable ? "pointer" : "default",
                transition: "background 0.15s",
              }}>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-ink4)" }}>{item.num}</span>
              <TypePill type={item.type} status={item.status} />
              <span style={{ fontFamily: "var(--t-sans)", fontSize: 14, fontWeight: 500, color: "var(--t-ink)" }}>{item.title}</span>
              <span style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink2)", lineHeight: 1.45 }}>{item.description}</span>
              <span style={{ textAlign: "right" }}><StatusTag status={item.status} /></span>
              <span style={{ fontFamily: "var(--t-mono)", fontSize: 11, textAlign: "center", color: clickable ? "var(--t-accent2)" : "transparent" }}>→</span>
            </div>
          </div>
        );
      })}

      {/* visibility (no render condicional) para que la ventana tenga altura estable
          desde el montaje: así la altura que /lab guarda en sessionStorage es la final. */}
      <div style={{ padding: "10px 18px", borderTop: "1px dashed var(--t-rule)", fontFamily: "var(--t-mono)", fontSize: 11, color: "var(--t-ink3)", visibility: visible >= items.length ? undefined : "hidden" }}>
        ↳ {available} disponibles · {hidden} ocultos
      </div>
    </div>
  );
}

function LabCards({ items, visible }: { items: LabItem[]; visible: number }) {
  return (
    <div className="t-lab-mobile" style={{ flexDirection: "column", gap: 8 }}>
      {items.map((item, idx) => {
        const revealed = idx < visible;
        const clickable = item.status === "available" && item.href;
        return (
          <div key={item.id} className={revealed ? "t-row-in" : undefined}
            style={{
              border: "1px solid var(--t-rule)", borderRadius: 8,
              background: "var(--t-paper)", overflow: "hidden",
              visibility: revealed ? undefined : "hidden",
            }}>
            <div style={{ padding: "10px 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--t-mono)", fontSize: 10.5, color: "var(--t-ink4)" }}>{item.num}</span>
                <TypePill type={item.type} status={item.status} />
              </div>
              <StatusTag status={item.status} />
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ fontFamily: "var(--t-sans)", fontSize: 14.5, fontWeight: 500, color: "var(--t-ink)", marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontFamily: "var(--t-sans)", fontSize: 13, color: "var(--t-ink2)", lineHeight: 1.55 }}>{item.description}</div>
              {clickable && (
                <a href={item.href!} style={{ display: "inline-block", marginTop: 10, fontFamily: "var(--t-mono)", fontSize: 12, color: "var(--t-accent2)", textDecoration: "none" }}>
                  {item.cta}
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Laboratorio() {
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
        title="lab"
        closeTo="/"
        restoreHeightKey="/lab"
        tabs={[
          { label: "~/cv",      active: false, onClick: () => router.push("/cv") },
          { label: "~/lab",     active: true },
          { label: "~/designs", active: false, onClick: () => router.push("/designs") },
        ]}
      >
        <PromptRow cmd={CMD} />

        <div className={`t-content-wrap${contentReady ? " t-in" : ""}`}>
          <div className="t-content" style={{ padding: "0 28px 32px 86px" }}>
            <LabTable items={ITEMS} visible={visible} />
            <LabCards items={ITEMS} visible={visible} />
          </div>
        </div>

        <div style={{ padding: "0.4rem 28px 1.5rem", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--t-mono)", fontSize: 10, color: "var(--t-ink4)" }}>
            ↳ pacr.es/lab
          </span>
        </div>
      </ChromeWindow>
    </>
  );
}
