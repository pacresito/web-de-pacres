"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { RECOMENDACIONES, CERTIFICACIONES, PREMIOS, premioOrg } from "@/lib/perfil";

const TIMELINE = [
  {
    year: "2023",
    period: "ene. 2023 — actualidad",
    role: "Partner",
    company: "CARPA Financieros · Autónomo",
    desc: "Invierte en el sector inmobiliario de forma sencilla. Obtén buenas rentabilidades sin preocuparte.",
    current: true,
  },
  {
    year: "2018",
    period: "dic. 2018 — dic. 2022",
    role: "Co-founder",
    company: "Makai - Make an impact · Jornada parcial",
    desc: "Marca de moda femenina con impacto social: alimentar niños por cada prenda vendida.",
  },
  {
    year: "2015",
    period: "jun. 2015 — ago. 2023",
    role: "Launch Manager / Senior Product Manager",
    company: "Letgo · Jornada completa",
    desc: "Implementación y gestión de nuevos proyectos estratégicos en 23 países.",
  },
  {
    year: "2015",
    period: "abr. 2015 — may. 2015",
    role: "Mentor",
    company: "Fastísimo / IE Business School · Jornada parcial",
    desc: "Mentor en el Area 31 del IE Business School.",
  },
  {
    year: "2012",
    period: "feb. 2012 — abr. 2015",
    role: "Director de Operaciones",
    company: "Nonabox · Jornada completa",
    desc: "Gestión de más de 100.000 envíos realizados en 6 países.",
  },
  {
    year: "2011",
    period: "sept. 2011 — ene. 2012",
    role: "Operaciones y Logística",
    company: "GLOSSYBOX · Jornada completa",
    desc: "Gestión de miles de envíos mensuales. Logística on-line y CRM.",
  },
  {
    year: "2004",
    period: "2004 – 2012",
    role: "Ingeniería Industrial",
    company: "Universidad Pontificia Comillas ICAI-ICADE",
    desc: "Madrid",
  },
];

const RECS = RECOMENDACIONES;

const CERTS = CERTIFICACIONES;

const LANGS = [
  { lang: "Español", level: "Competencia bilingüe o nativa" },
  { lang: "Inglés", level: "Competencia bilingüe o nativa" },
  { lang: "Francés", level: "Competencia básica profesional" },
  { lang: "Lengua de signos", level: "Competencia básica" },
];

const AWARDS = PREMIOS.map((p) => ({ title: p.title, org: premioOrg(p), year: p.date }));

const CSS = `

:root {
  --bg: #fafaf8;
  --text: #1a1a1a;
  --text-2: #4b4b4b;
  --text-3: #8a8a8a;
  --text-4: #c8c8c8;
  --accent: #b8870a;
  --border: #e5e5e0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}

/* ── HEADER ── */
.tl-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 3.5rem clamp(1.5rem, 7vw, 5rem) 2.5rem;
  gap: 2rem;
  border-bottom: 1px solid var(--border);
}
.tl-identity { max-width: 580px; }
.tl-meta {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.67rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 1rem;
}
.tl-name {
  font-size: clamp(2rem, 5.5vw, 4rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text);
  margin-bottom: 1.2rem;
}
.tl-bio {
  font-size: 0.95rem;
  line-height: 1.75;
  color: var(--text-2);
  max-width: 50ch;
}
.tl-cta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
  padding-top: 0.25rem;
}
.tl-btn {
  display: inline-block;
  padding: 0.7rem 1.5rem;
  background: var(--accent);
  color: #fff;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-decoration: none;
  text-transform: uppercase;
  transition: opacity 0.2s;
}
.tl-btn:hover { opacity: 0.82; }
.tl-scroll-hint {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.62rem;
  color: var(--text-3);
  letter-spacing: 0.04em;
}

/* ── TIMELINE SECTION ── */
.tl-section {
  padding: 2.5rem 0 0;
  border-bottom: 1px solid var(--border);
}
.tl-section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 clamp(1.5rem, 7vw, 5rem) 1.5rem;
}
.tl-section-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.01em;
}
.tl-hint {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.62rem;
  color: var(--text-3);
  letter-spacing: 0.04em;
}

/* Rail wrap (scroll container) */
.tl-rail-wrap {
  overflow-x: auto;
  overflow-y: visible;
  cursor: grab;
  user-select: none;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 2.5rem;
}
.tl-rail-wrap::-webkit-scrollbar { display: none; }
.tl-rail-wrap.grabbing { cursor: grabbing; }

/* Rail inner */
.tl-rail {
  display: flex;
  flex-direction: row;
  padding: 0 clamp(1.5rem, 7vw, 5rem);
  min-width: max-content;
  position: relative;
}
.tl-rail::before {
  content: "";
  position: absolute;
  left: clamp(1.5rem, 7vw, 5rem);
  right: clamp(1.5rem, 7vw, 5rem);
  top: 48px;
  height: 2px;
  background: var(--text);
}

.tl-entry {
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  padding-right: 24px;
  position: relative;
  cursor: pointer;
}
.tl-year {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--text);
}
.tl-entry.current .tl-year { color: var(--accent); }

.tl-dot-wrap {
  height: 26px;
  display: flex;
  align-items: center;
  margin-top: 9px;
}
.tl-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--text);
  background: var(--bg);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tl-entry.current .tl-dot {
  background: var(--accent);
  border-color: var(--accent);
}

.tl-period {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.6rem;
  color: var(--text-3);
  margin-top: 12px;
  letter-spacing: 0.04em;
}
.tl-entry.current .tl-period { color: var(--accent); opacity: 0.7; }

.tl-role {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  margin-top: 4px;
  line-height: 1.25;
}
.tl-entry.current .tl-role { color: var(--accent); }

.tl-company {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.6rem;
  color: var(--text-3);
  margin-top: 3px;
  letter-spacing: 0.03em;
  line-height: 1.35;
}

/* Collapsed by default, visible on hover or when .expanded */
.tl-desc {
  font-size: 0.78rem;
  color: var(--text-3);
  margin-top: 0;
  line-height: 1.4;
  max-width: 190px;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.28s ease, opacity 0.22s ease, margin-top 0.22s ease;
}
.tl-entry:hover .tl-desc,
.tl-entry.expanded .tl-desc {
  max-height: 120px;
  opacity: 1;
  margin-top: 5px;
}

/* ── RECOMMENDATIONS SLIDER ── */
.tl-quote-section {
  padding: clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 7vw, 5rem);
  border-bottom: 1px solid var(--border);
}
.tl-quote-box {
  max-width: 700px;
  border: 1.5px solid var(--accent);
  padding: 1.6rem 2rem;
}
.tl-quote-text {
  font-size: clamp(1rem, 2vw, 1.2rem);
  line-height: 1.65;
  color: var(--text);
  font-style: italic;
}
.tl-quote-attr {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.62rem;
  color: var(--text-3);
  letter-spacing: 0.08em;
  margin-top: 1rem;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.rec-slider-progress {
  height: 2px;
  background: var(--border);
  margin-top: 1.4rem;
  overflow: hidden;
}
.rec-slider-bar {
  height: 100%;
  background: var(--accent);
  width: 0%;
  animation: recProgress 4s linear forwards;
}
@keyframes recProgress {
  from { width: 0%; }
  to   { width: 100%; }
}
.rec-slider-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.9rem;
}
.rec-slider-dots {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.rec-slider-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}
.rec-slider-dot.active { background: var(--accent); }
.rec-slider-arrows { display: flex; gap: 0.4rem; }
.rec-slider-arrow {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-3);
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.7rem;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.18s, color 0.18s;
}
.rec-slider-arrow:hover { border-color: var(--accent); color: var(--accent); }
.rec-slider-count {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.58rem;
  color: var(--text-4);
  letter-spacing: 0.06em;
}

/* ── SPEC SHEET ── */
.spec-section {
  padding: 0 clamp(1.5rem, 7vw, 5rem);
  border-bottom: 1px solid var(--border);
}
.spec-head {
  padding: 2.5rem 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.spec-label {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
}
.spec-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0 2rem;
  padding: 1.2rem 0;
  border-top: 1px solid var(--border);
  align-items: start;
}
.spec-row-label {
  display: flex;
  gap: 0.7rem;
  align-items: baseline;
  padding-top: 0.1rem;
}
.spec-num {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.58rem;
  color: var(--accent);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.spec-key {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
}
.spec-value {
  font-size: 0.86rem;
  color: var(--text-2);
  line-height: 1.7;
}
.spec-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.spec-pill {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.6rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--border);
  color: var(--text-2);
}
.spec-award {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.4rem 0;
}
.spec-award-title { font-size: 0.83rem; font-weight: 500; color: var(--text); }
.spec-award-year {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.58rem;
  color: var(--text-3);
  white-space: nowrap;
  flex-shrink: 0;
}
.spec-award-org {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.58rem;
  color: var(--text-3);
  line-height: 1.4;
}

/* ── APTITUDES ── */
.skills-section {
  padding: 2.5rem clamp(1.5rem, 7vw, 5rem) 3rem;
  border-bottom: 1px solid var(--border);
}
.skills-flow {
  font-size: 0.9rem;
  color: var(--text-3);
  line-height: 2.4;
  max-width: 860px;
}
.skills-flow .hl { color: var(--text); font-weight: 600; }
.skills-flow .tl-skill-shine {
  text-decoration: none;
  white-space: nowrap;
  background: linear-gradient(100deg, var(--text) 0%, var(--text) 35%, rgba(253,224,71,0.15) 44%, rgba(253,224,71,0.85) 48%, rgba(251,191,36,1.0) 50%, rgba(253,224,71,0.85) 52%, rgba(253,224,71,0.15) 56%, var(--text) 65%, var(--text) 100%);
  background-size: 300% 100%;
  background-position: 100% center;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: goldTextSweep 10s ease-in-out infinite;
}
@keyframes goldTextSweep {
  0%, 87%     { background-position: 100% center; }
  89.5%       { background-position: 50% center; }
  92%         { background-position: 0% center; }
  92.1%, 100% { background-position: 100% center; }
}
.skills-dot { color: var(--text-4); margin: 0 0.3rem; }

/* ── PHOTO ── */
.tl-photo {
  flex-shrink: 0;
  width: clamp(140px, 20vw, 260px);
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 2px;
  border: 1px solid var(--border);
  align-self: flex-start;
  position: relative;
  background: var(--bg);
}
.tl-photo img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  filter: grayscale(1) contrast(0.94) brightness(1.04);
  mix-blend-mode: multiply;
}
.tl-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(184,135,10,0.28) 0%,
    rgba(184,135,10,0.12) 60%,
    rgba(26,26,26,0.18) 100%
  );
  mix-blend-mode: multiply;
  pointer-events: none;
}
@media (max-width: 640px) {
  .tl-photo { width: 100%; }
}

/* ── FOOTER ── */
.tl-footer {
  padding: 2rem clamp(1.5rem, 7vw, 5rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);
}
.tl-footer-brand {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.72rem;
  color: var(--text-3);
  text-decoration: none;
}
.tl-footer-link {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.72rem;
  color: var(--text-3);
  text-decoration: none;
  transition: color 0.2s;
}
.tl-footer-link:hover { color: var(--accent); }

/* ── MOBILE ── */
@media (max-width: 640px) {
  .tl-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 2rem 1.5rem 1.5rem;
    gap: 1.5rem;
  }
  .tl-cta { align-items: flex-start; }
  .tl-section-header { padding: 0 1.5rem 1.2rem; }
  .tl-hint { display: none; }

  .tl-rail-wrap { overflow-x: hidden; cursor: default; padding-bottom: 0; }
  .tl-rail {
    flex-direction: column;
    min-width: unset;
    padding: 0 1.5rem;
    position: relative;
  }
  /* Single continuous line: starts at center of first dot, ends at center of last dot.
     left: 1.5rem (rail padding) + 40px (year col) + 12px (gap) + 6px (center 2px in 14px dot col)
     top: 11px = 4px (dot-wrap margin-top) + 7px (half dot height, align-items:flex-start)
     bottom: calculated to stop at last dot center (rows 2-4 of last entry + padding ≈ 4.5rem) */
  .tl-rail::before {
    left: calc(1.5rem + 40px + 12px + 6px);
    right: auto;
    top: 11px;
    bottom: 1.2rem;
    height: auto;
    width: 2px;
  }
  .tl-entry {
    flex: none;
    display: grid;
    grid-template-columns: 40px 14px 1fr;
    grid-template-rows: auto auto auto auto;
    column-gap: 12px;
    row-gap: 2px;
    align-items: start;
    padding: 0 0 1.6rem;
    width: 100%;
  }
  .tl-year {
    grid-column: 1; grid-row: 1;
    font-size: 0.72rem; font-weight: 600;
    font-family: var(--font-jetbrains-mono), monospace;
    color: var(--text-3); text-align: right;
    letter-spacing: 0; line-height: 1.5;
  }
  .tl-entry.current .tl-year { color: var(--accent); }
  .tl-dot-wrap {
    grid-column: 2; grid-row: 1 / 5;
    height: auto; margin-top: 4px;
    display: flex; justify-content: center; align-items: flex-start;
    position: relative; z-index: 1;
  }
  .tl-period { grid-column: 3; grid-row: 1; margin-top: 0; }
  .tl-role { grid-column: 3; grid-row: 2; margin-top: 2px; font-size: 0.88rem; }
  .tl-company { grid-column: 3; grid-row: 3; }
  .tl-desc { grid-column: 3; grid-row: 4; max-width: 100%; }

  .tl-quote-section { padding: 2rem 1.5rem; }
  .tl-quote-box { padding: 1.2rem 1.4rem; }
  .spec-section { padding: 0 1.5rem; }
  .spec-row { grid-template-columns: 1fr; gap: 0.5rem; }
  .spec-award { flex-direction: column; gap: 0.1rem; }
  .skills-section { padding: 2rem 1.5rem; }
  .tl-footer { padding: 1.5rem; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
}
`;

function RecsSlider() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [barKey, setBarKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const goTo = useCallback((n: number) => {
    setIdx(n);
    setBarKey((k) => k + 1);
    clearInterval(timerRef.current);
  }, []);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % RECS.length);
    setBarKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(next, 4000);
    return () => clearInterval(timerRef.current);
  }, [paused, next]);

  const rec = RECS[idx];

  return (
    <div
      className="tl-quote-box"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="tl-quote-text">&ldquo;{rec.quote}&rdquo;</p>
      <p className="tl-quote-attr">
        <a href={rec.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
          <Image
            src={rec.photo}
            alt={rec.author}
            width={28}
            height={28}
            style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", display: "block" }}
          />
        </a>
        <a href={rec.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
          {rec.author}
        </a>
        {" · "}{rec.role}
      </p>

      <div className="rec-slider-progress">
        <div
          key={`${barKey}-${paused ? "p" : "r"}`}
          className="rec-slider-bar"
          style={{ animationPlayState: paused ? "paused" : "running" }}
        />
      </div>

      <div className="rec-slider-controls">
        <div className="rec-slider-dots">
          {RECS.map((_, i) => (
            <button
              key={i}
              className={`rec-slider-dot${i === idx ? " active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Recomendación ${i + 1}`}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <span className="rec-slider-count">{idx + 1} / {RECS.length}</span>
          <div className="rec-slider-arrows">
            <button
              className="rec-slider-arrow"
              onClick={() => goTo((idx - 1 + RECS.length) % RECS.length)}
              aria-label="Anterior"
            >←</button>
            <button
              className="rec-slider-arrow"
              onClick={() => goTo((idx + 1) % RECS.length)}
              aria-label="Siguiente"
            >→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TempHome() {
  const railRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX;
    scrollStart.current = railRef.current?.scrollLeft ?? 0;
    railRef.current?.classList.add("grabbing");
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !railRef.current) return;
    e.preventDefault();
    railRef.current.scrollLeft = scrollStart.current - (e.pageX - startX.current);
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    railRef.current?.classList.remove("grabbing");
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="tl-header">
        <div className="tl-identity">
          <p className="tl-meta">Director de Operaciones · Senior Product Manager · Troubleshooter</p>
          <h1 className="tl-name">Pablo Crespo Velasco</h1>
          <p className="tl-bio">
            Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para
            comprender y resolver cualquier problema que se presente. Siempre con una sonrisa, los
            grandes retos me hacen feliz: organizar el caos, solucionar lo imposible, gestionar lo
            inmanejable.
          </p>
        </div>
        <div className="tl-photo">
          <Image src="/pablo.png" alt="Pablo Crespo" width={320} height={320} priority style={{ objectFit: "cover", display: "block", width: "100%", height: "100%" }} />
        </div>
        <div className="tl-cta">
          <a href="mailto:crespovelasco@gmail.com" className="tl-btn">Contactar →</a>
          <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer" className="tl-btn" style={{ background: "transparent", border: "1.5px solid var(--accent)", color: "var(--accent)" }}>
            LinkedIn ↗
          </a>
        </div>
      </header>

      {/* TIMELINE */}
      <section className="tl-section">
        <div className="tl-section-header">
          <span className="tl-section-title">Trayectoria</span>
          <span className="tl-hint">← → arrastra · clic para descripción</span>
        </div>
        <div
          ref={railRef}
          className="tl-rail-wrap"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          <div className="tl-rail">
            {TIMELINE.map((entry, i) => (
              <div
                key={i}
                className={`tl-entry${entry.current ? " current" : ""}${expandedEntry === i ? " expanded" : ""}`}
                onClick={() => setExpandedEntry(expandedEntry === i ? null : i)}
              >
                <span className="tl-year">{entry.year}</span>
                <div className="tl-dot-wrap">
                  <div className="tl-dot" />
                </div>
                <span className="tl-period">{entry.period}</span>
                <div className="tl-role">{entry.role}</div>
                <div className="tl-company">{entry.company}</div>
                <div className="tl-desc">{entry.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECOMENDACIONES — slider */}
      <section className="tl-quote-section">
        <RecsSlider />
      </section>

      {/* FICHA TÉCNICA — idiomas, formación, certs, reconocimientos */}
      <section className="spec-section">
        <div className="spec-head">
          <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)" }}>
            Datos
          </span>
        </div>

        <div className="spec-row">
          <div className="spec-row-label">
            <span className="spec-num">01</span>
            <span className="spec-key">Idiomas</span>
          </div>
          <div className="spec-value">
            <div className="spec-pills">
              {LANGS.map((l) => (
                <span key={l.lang} className="spec-pill" title={l.level}>{l.lang}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="spec-row">
          <div className="spec-row-label">
            <span className="spec-num">02</span>
            <span className="spec-key">Certificaciones</span>
          </div>
          <div className="spec-pills">
            {CERTS.map((cert) => (
              <span key={cert.label} className="spec-pill" title={`${cert.issuer} · ${cert.year}`}>
                {cert.label}
              </span>
            ))}
          </div>
        </div>

        <div className="spec-row" style={{ paddingBottom: "2.5rem" }}>
          <div className="spec-row-label">
            <span className="spec-num">03</span>
            <span className="spec-key">Reconocimientos</span>
          </div>
          <div>
            {AWARDS.map((a) => (
              <div key={a.title} className="spec-award">
                <div>
                  <div className="spec-award-title">{a.title}</div>
                  {a.org && <div className="spec-award-org">{a.org}</div>}
                </div>
                <span className="spec-award-year">{a.year}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APTITUDES — texto fluido */}
      <section className="skills-section">
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", display: "block", marginBottom: "1.5rem" }}>
          Aptitudes
        </span>
        <p className="skills-flow">
          <span className="hl">Gestión de productos</span><span className="skills-dot">·</span>
          Gestión de proyectos<span className="skills-dot">·</span>
          Gestión de personas<span className="skills-dot">·</span>
          Gestión de crisis<span className="skills-dot">·</span>
          <span className="hl">Liderazgo de equipos</span><span className="skills-dot">·</span>
          Liderazgo de equipos multidisciplinarios<span className="skills-dot">·</span>
          Habilidades sociales<span className="skills-dot">·</span>
          <span className="hl">Comunicación</span><span className="skills-dot">·</span>
          Toma de decisiones<span className="skills-dot">·</span>
          Mejora continua<span className="skills-dot">·</span>
          Mejora de procesos<span className="skills-dot">·</span>
          Metodologías ágiles<span className="skills-dot">·</span>
          Estrategia empresarial<span className="skills-dot">·</span>
          Estrategia del producto<span className="skills-dot">·</span>
          Estrategia digital<span className="skills-dot">·</span>
          Analítica de datos<span className="skills-dot">·</span>
          <span className="hl">Análisis de negocio</span><span className="skills-dot">·</span>
          Toma de decisiones basadas en datos<span className="skills-dot">·</span>
          Experiencia de usuario<span className="skills-dot">·</span>
          Diseño de la interfaz de usuario<span className="skills-dot">·</span>
          Investigación de mercado<span className="skills-dot">·</span>
          Comportamiento del usuario<span className="skills-dot">·</span>
          Requisitos de productos<span className="skills-dot">·</span>
          <span className="hl">Lanzamiento de productos</span><span className="skills-dot">·</span>
          Para empresas (B2B)<span className="skills-dot">·</span>
          Negociación<span className="skills-dot">·</span>
          Trabajo en equipo<span className="skills-dot">·</span>
          <a href="https://pacr.es/designs" className="hl tl-skill-shine">Resolución de problemas</a>
        </p>
      </section>

      {/* FOOTER */}
      <footer className="tl-footer" style={{ paddingBottom: "4rem" }}>
        <a href="/designs" className="tl-footer-brand">pacr.es</a>
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "0.62rem", color: "var(--text-4)" }}>
          Creado el 19 de mayo de 2026
        </span>
        <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer" className="tl-footer-link">
          LinkedIn →
        </a>
      </footer>

    </>
  );
}
