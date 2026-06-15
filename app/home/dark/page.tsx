"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import { RECOMENDACIONES, CERTIFICACIONES, PREMIOS, premioOrg } from "@/lib/perfil";

interface Job {
  title: string;
  company: string;
  period: string;
  description: ReactNode;
}

const JOBS: Job[] = [
  {
    title: "Partner",
    company: "CARPA Financieros · Autónomo",
    period: "ene. 2023 — actualidad",
    description: (
      <p>Invierte en el sector inmobiliario de forma sencilla. Obtén buenas rentabilidades sin preocuparte.</p>
    ),
  },
  {
    title: "Launch Manager / Senior Product Manager",
    company: "Letgo · Jornada completa",
    period: "jun. 2015 — ago. 2023",
    description: (
      <>
        <p>Implementación y gestión de nuevos proyectos estratégicos:</p>
        <p className="dsub">Senior Product Manager</p>
        <ul>
          <li>Comunicación y coordinación de diferentes equipos: &ldquo;Growth&rdquo;, &ldquo;Platform&rdquo;, &ldquo;B2B&rdquo;, &ldquo;Search and Discovery&rdquo;</li>
          <li>Conceptualización y desarrollo de nuevas ideas en todas las plataformas (Android, iOS y Web)</li>
          <li>Priorización según valor de negocio y principales KPI</li>
          <li>Definición de especificaciones técnicas en proyectos de alto impacto</li>
          <li>Responsable de los A/B tests: construir los dashboards y dar visibilidad de los resultados</li>
          <li>Definición de los OKR y asegurarse que todos los KPI tienen los valores esperados</li>
        </ul>
        <p className="dsub">Expansión internacional</p>
        <ul>
          <li>Gestión inicial del contenido (23 países)</li>
          <li>Implementación del sistema de traducción, contratación de los traductores y coordinación del QA inicial (18 idiomas)</li>
        </ul>
        <p className="dsub">Trust and Safety</p>
        <ul>
          <li>Definición e implementación de distintos proyectos y reglas contra el fraude (spam / scam)</li>
        </ul>
        <p className="dsub">Reconocimiento de imágenes con IA</p>
        <ul>
          <li>Coordinación de la implantación del sistema</li>
          <li>Regulación de su aprendizaje y estudio de los resultados para el ajuste de los valores óptimos</li>
        </ul>
        <p className="dsub">Customer Care</p>
        <ul>
          <li>Contratación y training del equipo freelance de Customer Care (20 personas)</li>
          <li>Implementación del sistema de tickets y programación de los reports y automatismos</li>
        </ul>
      </>
    ),
  },
  {
    title: "Co-founder",
    company: "Makai - Make an impact · Jornada parcial",
    period: "dic. 2018 — dic. 2022",
    description: (
      <p>Una marca optimista y positiva que crea prendas femeninas icónicas con un enfoque práctico para poder llevarlas en cualquier ocasión y ayuda a cambiar la vida de los niños más desfavorecidos, proporcionándoles alimento diario en su escuela. En MAKAI, por cada prenda vendida, se dona lo necesario para alimentar a un niño durante un mes en su escuela combatiendo así el hambre y fomentando la educación de la comunidad.</p>
    ),
  },
  {
    title: "Mentor",
    company: "Fastísimo / IE Business School · Jornada parcial",
    period: "abr. 2015 — may. 2015",
    description: (
      <p>Mentor de Fastísimo en el Area 31 del IE Business School. La App nació con el fin de facilitar la vida a las personas llevándoles lo que quieran, donde y cuando quieran mediante una red de repartidores freelance. Bernardo Hernández se unió al proyecto y Fastísimo pasó a llamarse Ermes basando sus operaciones en Nueva York.</p>
    ),
  },
  {
    title: "Director de Operaciones",
    company: "Nonabox · Jornada completa",
    period: "feb. 2012 — abr. 2015",
    description: (
      <ul>
        <li>Gestión de más de 100.000 envíos realizados en 6 países</li>
        <li>Organización de la estrategia de internacionalización</li>
        <li>Posterior centralización de las operaciones en Madrid</li>
        <li>Planificación de nuevos modelos de negocio como la Tienda Online y la Suscripción de Pañales</li>
        <li>Diseño de cohortes y otras herramientas para el análisis de resultados</li>
        <li>Scrum Master de un equipo de 30 personas con 6 Product Owners</li>
        <li>Negociación con proveedores y operadores logísticos</li>
        <li>Gestión del equipo de Atención al Cliente y Desarrollo de la web</li>
      </ul>
    ),
  },
  {
    title: "Operaciones y Logística",
    company: "GLOSSYBOX · Jornada completa",
    period: "sept. 2011 — ene. 2012",
    description: (
      <ul>
        <li>Gestión de miles de envíos mensuales</li>
        <li>Relación con proveedores y operadores logísticos</li>
        <li>Optimización del sistema logístico on-line y el CRM</li>
        <li>Alineación entre el departamento de operaciones y atención al cliente</li>
      </ul>
    ),
  },
];

const RECS = RECOMENDACIONES;

const SKILLS = [
  "Gestión de productos", "Gestión de proyectos", "Gestión de personas", "Gestión de crisis",
  "Liderazgo de equipos", "Liderazgo de equipos multidisciplinarios", "Habilidades sociales",
  "Comunicación", "Toma de decisiones", "Mejora continua", "Mejora de procesos",
  "Metodologías ágiles", "Estrategia empresarial", "Estrategia del producto", "Estrategia digital",
  "Analítica de datos", "Análisis de negocio", "Toma de decisiones basadas en datos",
  "Experiencia de usuario", "Diseño de la interfaz de usuario", "Investigación de mercado",
  "Comportamiento del usuario", "Requisitos de productos", "Lanzamiento de productos",
  "Para empresas (B2B)", "Negociación", "Trabajo en equipo",
];

const CERTS = CERTIFICACIONES;

const LANGS = [
  { lang: "Español", level: "Competencia bilingüe o nativa" },
  { lang: "Inglés", level: "Competencia bilingüe o nativa" },
  { lang: "Francés", level: "Competencia básica profesional" },
  { lang: "Lengua de signos", level: "Competencia básica" },
];

const AWARDS = PREMIOS.map((p) => ({ title: p.title, org: premioOrg(p), year: p.date }));

function JobItem({ job, index }: { job: Job; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="job-item reveal"
      style={{ transitionDelay: `${index * 0.06}s` }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="job-header">
        <div className="job-left">
          <span className="job-title">{job.title}</span>
          <span className="job-company">{job.company}</span>
        </div>
        <div className="job-right">
          <span className="job-period">{job.period}</span>
          <span
            className="job-toggle"
            style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
          >+</span>
        </div>
      </div>
      <div
        className="job-body"
        style={{
          maxHeight: open ? "900px" : "0",
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
        }}
      >
        <div className="job-content">{job.description}</div>
      </div>
    </div>
  );
}

function RecsSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = useCallback(() => setCurrent((c) => (c + 1) % RECS.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + RECS.length) % RECS.length), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, next]);

  const rec = RECS[current];

  return (
    <div
      className="slider-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={current} className="slider-quote" onClick={next}>
        <span className="quote-mark">&ldquo;</span>
        <p className="quote-text">{rec.quote}</p>
        <div className="quote-author">
          <a
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="author-link"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={rec.photo}
              alt={rec.author}
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(59,130,246,0.3)", flexShrink: 0 }}
            />
            <div>
              <span className="author-name">{rec.author}</span>
              <span className="author-role">{rec.role}</span>
            </div>
          </a>
        </div>
      </div>

      <div className="slider-controls">
        <div className="slider-dots">
          {RECS.map((_, i) => (
            <button
              key={i}
              className={`dot${i === current ? " dot-active" : ""}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
        <div className="slider-arrows">
          <button onClick={prev} className="arrow-btn">←</button>
          <button onClick={next} className="arrow-btn">→</button>
        </div>
      </div>

      {!paused && (
        <div className="progress-track">
          <div key={`p-${current}`} className="progress-bar" />
        </div>
      )}
    </div>
  );
}

const CSS = `
:root {
  --bg: #080810;
  --bg-card: #0d0d1c;
  --text: #e2e2ee;
  --text-muted: #4e4e68;
  --text-dim: #8888aa;
  --accent: #3b82f6;
  --accent-bright: #60a5fa;
  --accent-dim: rgba(59,130,246,0.08);
  --border: rgba(255,255,255,0.05);
  --border-accent: rgba(59,130,246,0.28);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Crimson Pro', Georgia, serif;
  overflow-x: hidden;
}

.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94);
}
.reveal.revealed { opacity: 1; transform: translateY(0); }

/* ── HERO ── */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: flex-end;
  padding: 0 clamp(1.5rem, 6vw, 7rem) clamp(4rem, 8vh, 6rem);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: "";
  position: absolute;
  top: -20%;
  right: -8%;
  width: 65vw;
  height: 85vh;
  background: radial-gradient(ellipse at center, rgba(59,130,246,0.055) 0%, transparent 65%);
  pointer-events: none;
}
.hero::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.2) 30%, rgba(59,130,246,0.2) 70%, transparent 100%);
}

.hero-inner { width: 100%; }

.hero-name {
  display: flex;
  flex-direction: column;
  line-height: 0.87;
  letter-spacing: -0.02em;
  margin-bottom: clamp(2rem, 4vh, 3.5rem);
}
.name-outline {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(4.5rem, 17vw, 17rem);
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(59,130,246,0.55);
  display: block;
}
.name-solid {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(4.5rem, 17vw, 17rem);
  color: var(--text);
  display: block;
  margin-left: clamp(1.5rem, 4vw, 5rem);
}
.name-accent {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(4.5rem, 17vw, 17rem);
  color: var(--accent);
  display: block;
  margin-left: clamp(3rem, 8vw, 10rem);
}

.hero-meta {
  max-width: 580px;
  margin-left: clamp(1.5rem, 4vw, 5rem);
  padding-left: clamp(1rem, 2vw, 1.8rem);
  border-left: 1px solid var(--border-accent);
}
.hero-role {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: clamp(0.6rem, 1.1vw, 0.75rem);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-bright);
  opacity: 0.85;
  margin-bottom: 1.2rem;
}
.hero-bio {
  font-size: clamp(0.95rem, 1.6vw, 1.15rem);
  line-height: 1.8;
  color: var(--text-dim);
  font-weight: 300;
  font-style: italic;
  margin-bottom: 2rem;
}
.cta-btn {
  display: inline-block;
  padding: 0.7rem 1.8rem;
  border: 1px solid var(--border-accent);
  color: var(--accent-bright);
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
@media (hover: hover) {
  .cta-btn:hover {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--text);
  }
}

/* ── CONTENT ── */
.content {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 5vw, 4rem);
}

/* ── SECTION ── */
.section {
  position: relative;
  padding: clamp(4rem, 8vh, 7rem) 0;
  border-top: 1px solid var(--border);
}
.section-num {
  position: absolute;
  top: clamp(1.5rem, 3vh, 3rem);
  right: -0.5rem;
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(5rem, 14vw, 11rem);
  color: rgba(255,255,255,0.022);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}
.section-header { margin-bottom: 2.5rem; }
.section-label {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.9;
}

/* ── JOBS ── */
.job-item {
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.3s;
}
.job-item:first-of-type { border-top: 1px solid var(--border); }
@media (hover: hover) { .job-item:hover { border-color: rgba(59,130,246,0.18); } }

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem 0;
}
.job-left {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.job-title {
  font-family: 'Crimson Pro', serif;
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  font-weight: 600;
  color: var(--text);
  transition: color 0.2s;
}
@media (hover: hover) { .job-item:hover .job-title { color: var(--accent-bright); } }
.job-company {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.67rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}
.job-right {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-shrink: 0;
}
.job-period {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.job-toggle {
  font-size: 1.15rem;
  color: var(--accent);
  opacity: 0.65;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s;
  display: block;
  line-height: 1;
  font-weight: 300;
}
@media (hover: hover) { .job-item:hover .job-toggle { opacity: 1; } }
.job-content {
  padding-bottom: 1.4rem;
  font-size: 0.875rem;
  color: var(--text-dim);
  line-height: 1.8;
}
.job-content p { margin-bottom: 0.35rem; }
.job-content ul { list-style: none; padding: 0; }
.job-content ul li {
  padding-left: 1.3em;
  position: relative;
  margin-bottom: 0.3rem;
}
.job-content ul li::before {
  content: "—";
  position: absolute;
  left: 0;
  color: var(--accent);
  opacity: 0.45;
  font-size: 0.8em;
}
.dsub {
  margin-top: 1rem;
  margin-bottom: 0.35rem;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  opacity: 0.8;
}

/* ── EDU ── */
.edu-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 2rem;
  padding: 1.2rem 0;
}
.edu-degree { font-size: 1.05rem; font-weight: 600; color: var(--text); }
.edu-school {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
.edu-period {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── RECS ── */
.slider-wrap { position: relative; }
.slider-quote {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 2px solid var(--accent);
  padding: clamp(1.5rem, 3vw, 2.5rem);
  cursor: pointer;
  animation: slideIn 0.38s cubic-bezier(0.25,0.46,0.45,0.94);
  min-height: 270px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: border-color 0.3s;
}
@media (hover: hover) { .slider-quote:hover { border-color: rgba(59,130,246,0.35); border-left-color: var(--accent-bright); } }

@keyframes slideIn {
  from { opacity: 0; transform: translateX(18px); }
  to   { opacity: 1; transform: translateX(0); }
}

.quote-mark {
  font-family: 'Crimson Pro', serif;
  font-size: 4.5rem;
  color: var(--accent);
  opacity: 0.12;
  line-height: 0.6;
  display: block;
  margin-bottom: 0.4rem;
  user-select: none;
}
.quote-text {
  font-family: 'Crimson Pro', serif;
  font-size: clamp(0.95rem, 1.7vw, 1.12rem);
  line-height: 1.85;
  color: var(--text-dim);
  font-style: italic;
  font-weight: 300;
  flex: 1;
  margin-bottom: 1.5rem;
}
.quote-author { margin-top: auto; }
.author-link {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
}
.author-name {
  display: block;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text);
  transition: color 0.2s;
}
@media (hover: hover) { .author-link:hover .author-name { color: var(--accent-bright); } }
.author-role {
  display: block;
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.62rem;
  color: var(--text-muted);
  margin-top: 0.12rem;
}

.slider-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.1rem;
}
.slider-dots {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  max-width: 70%;
}
.dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 2px;
  border: none;
  background: rgba(59,130,246,0.18);
  cursor: pointer;
  padding: 0;
  transition: width 0.3s, background 0.3s;
}
.dot-active { width: 1.2rem; background: var(--accent); }
.slider-arrows { display: flex; gap: 0.4rem; }
.arrow-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 0.72rem;
  transition: border-color 0.2s, color 0.2s;
  font-family: var(--font-jetbrains-mono), monospace;
}
@media (hover: hover) { .arrow-btn:hover { border-color: var(--border-accent); color: var(--accent-bright); } }

.progress-track {
  position: absolute;
  bottom: calc(2.6rem);
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(59,130,246,0.07);
}
.progress-bar {
  height: 100%;
  background: rgba(59,130,246,0.3);
  animation: progress 4s linear;
  transform-origin: left;
}
@keyframes progress {
  from { width: 0; }
  to   { width: 100%; }
}

/* ── TAGS ── */
.tag-cloud { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.cert-tag {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  padding: 0.35rem 0.8rem;
  border: 1px solid rgba(59,130,246,0.2);
  color: var(--text-dim);
  background: transparent;
  cursor: default;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
@media (hover: hover) {
  .cert-tag:hover {
    border-color: var(--border-accent);
    color: var(--accent-bright);
    background: var(--accent-dim);
  }
}
.skill-tag {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.66rem;
  letter-spacing: 0.02em;
  padding: 0.3rem 0.7rem;
  border: 1px solid rgba(255,255,255,0.04);
  color: var(--text-muted);
  background: transparent;
  cursor: default;
  transition: border-color 0.2s, color 0.2s;
  text-decoration: none;
  display: inline-block;
}
@media (hover: hover) { .skill-tag:hover { border-color: rgba(59,130,246,0.18); color: var(--text-dim); } }
.skill-tag.skill-shine {
  text-decoration: none;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.skill-tag.skill-shine::after {
  content: "";
  position: absolute;
  top: -50%; left: -75%;
  width: 50%; height: 200%;
  background: linear-gradient(120deg, transparent 0%, rgba(59,130,246,0.1) 40%, rgba(96,165,250,0.45) 50%, rgba(59,130,246,0.1) 60%, transparent 100%);
  transform: skewX(-20deg);
  animation: blueSweep 10s ease-in-out infinite;
}
@keyframes blueSweep {
  0%, 88%   { left: -75%; opacity: 1; }
  97%       { left: 150%; opacity: 1; }
  98%, 100% { left: 150%; opacity: 0; }
}


/* ── LANG ── */
.lang-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.95rem 0;
  border-bottom: 1px solid var(--border);
}
.lang-row:last-child { border-bottom: none; }
.lang-name { font-size: 1rem; font-weight: 600; color: var(--text); }
.lang-level {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.63rem;
  color: var(--text-muted);
}

/* ── AWARDS ── */
.award-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  padding: 1.2rem 0;
  border-bottom: 1px solid var(--border);
}
.award-row:last-child { border-bottom: none; }
.award-title { font-size: 0.95rem; font-weight: 600; color: var(--text); }
.award-org {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.63rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}
.award-year {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.63rem;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  padding-top: 0.15rem;
}

/* ── FOOTER ── */
.footer {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: clamp(2rem, 4vh, 3rem) clamp(1.5rem, 5vw, 4rem);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}
.footer-brand {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
  text-decoration: none;
}
@media (hover: hover) { .footer-brand:hover { color: var(--accent-bright); } }
.footer-link {
  font-family: var(--font-jetbrains-mono), monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
  flex-shrink: 0;
}
@media (hover: hover) { .footer-link:hover { color: var(--accent-bright); } }

/* ── RESPONSIVE ── */
@media (max-width: 640px) {
  .hero { padding-left: 1.5rem; padding-right: 1.5rem; }
  .name-outline, .name-solid, .name-accent { margin-left: 0 !important; }
  .hero-meta { margin-left: 0; }
  .job-header { flex-direction: column; gap: 0.3rem; }
  .job-right { flex-direction: row-reverse; justify-content: flex-end; }
  .edu-item { flex-direction: column; gap: 0.2rem; }
  .award-row { flex-direction: column; gap: 0.25rem; }
  .section-num { font-size: 4.5rem; opacity: 0.018; }
}
`;

export default function DarkHome() {

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style>{CSS}</style>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-name">
            <span className="name-outline">PABLO</span>
            <span className="name-solid">CRESPO</span>
            <span className="name-accent">VELASCO</span>
          </h1>
          <div className="hero-meta">
            <p className="hero-role">Director de Operaciones · Senior Product Manager · Troubleshooter</p>
            <p className="hero-bio">
              Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para
              comprender y resolver cualquier problema que se presente. Siempre con una sonrisa, los
              grandes retos me hacen feliz: organizar el caos, solucionar lo imposible, gestionar lo
              inmanejable.
            </p>
            <a href="mailto:crespovelasco@gmail.com" className="cta-btn">Contactar →</a>
          </div>
        </div>
      </section>

      <main className="content">

        {/* 01 EXPERIENCIA */}
        <section className="section">
          <div className="section-num" aria-hidden="true">01</div>
          <header className="section-header reveal">
            <span className="section-label">Experiencia</span>
          </header>
          {JOBS.map((job, i) => (
            <JobItem key={job.title} job={job} index={i} />
          ))}
        </section>

        {/* 02 EDUCACIÓN */}
        <section className="section">
          <div className="section-num" aria-hidden="true">02</div>
          <header className="section-header reveal">
            <span className="section-label">Educación</span>
          </header>
          <div className="edu-item reveal" style={{ transitionDelay: "0.1s" }}>
            <div>
              <p className="edu-degree">Ingeniería Industrial</p>
              <p className="edu-school">Universidad Pontificia Comillas ICAI-ICADE</p>
            </div>
            <p className="edu-period">2004 – 2012</p>
          </div>
        </section>

        {/* 03 RECOMENDACIONES */}
        <section className="section">
          <div className="section-num" aria-hidden="true">03</div>
          <header className="section-header reveal">
            <span className="section-label">Recomendaciones</span>
          </header>
          <div className="reveal" style={{ transitionDelay: "0.1s" }} data-no-physics>
            <RecsSlider />
          </div>
        </section>

        {/* 04 CERTIFICACIONES */}
        <section className="section">
          <div className="section-num" aria-hidden="true">04</div>
          <header className="section-header reveal">
            <span className="section-label">Certificaciones</span>
          </header>
          <div className="tag-cloud reveal" style={{ transitionDelay: "0.1s" }}>
            {CERTS.map((cert) => (
              <span key={cert.label} className="cert-tag" title={`${cert.issuer} · ${cert.year}`}>
                {cert.label}
              </span>
            ))}
          </div>
        </section>

        {/* 05 IDIOMAS */}
        <section className="section">
          <div className="section-num" aria-hidden="true">05</div>
          <header className="section-header reveal">
            <span className="section-label">Idiomas</span>
          </header>
          <div className="reveal" style={{ transitionDelay: "0.1s" }}>
            {LANGS.map((l) => (
              <div key={l.lang} className="lang-row">
                <span className="lang-name">{l.lang}</span>
                <span className="lang-level">{l.level}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 06 RECONOCIMIENTOS */}
        <section className="section">
          <div className="section-num" aria-hidden="true">06</div>
          <header className="section-header reveal">
            <span className="section-label">Reconocimientos</span>
          </header>
          <div className="reveal" style={{ transitionDelay: "0.1s" }}>
            {AWARDS.map((a) => (
              <div key={a.title} className="award-row">
                <div>
                  <p className="award-title">{a.title}</p>
                  {a.org && <p className="award-org">{a.org}</p>}
                </div>
                <p className="award-year">{a.year}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 07 APTITUDES */}
        <section className="section">
          <div className="section-num" aria-hidden="true">07</div>
          <header className="section-header reveal">
            <span className="section-label">Aptitudes</span>
          </header>
          <div className="tag-cloud reveal" style={{ transitionDelay: "0.1s" }}>
            {SKILLS.map((s) => (
              <span key={s} className="skill-tag">{s}</span>
            ))}
            <a href="https://pacr.es/designs" className="skill-tag skill-shine">Resolución de problemas</a>
          </div>
        </section>

      </main>

      <footer className="footer" style={{ flexDirection: "column", gap: "0.6rem", paddingBottom: "4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <a href="/designs" className="footer-brand">pacr.es</a>
          <a
            href="https://www.linkedin.com/in/pacres/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >LinkedIn →</a>
        </div>
        <span className="footer-brand" style={{ cursor: "default", textAlign: "center", width: "100%" }}>
          Creado el 17 de mayo de 2026
        </span>
      </footer>
    </>
  );
}
