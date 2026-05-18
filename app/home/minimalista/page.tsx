"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

const JOBS = [
  {
    title: "Partner",
    company: "CARPA Financieros",
    type: "Autónomo",
    period: "ene. 2023 — actualidad",
    detail: "Inversión en el sector inmobiliario.",
  },
  {
    title: "Launch Manager · Senior Product Manager",
    company: "Letgo",
    type: "Jornada completa",
    period: "jun. 2015 — ago. 2023",
    detail:
      "Gestión de iniciativas estratégicas en equipos de Growth, Platform, B2B y Search. Expansión a 23 países en 18 idiomas. Trust & Safety, reconocimiento de imágenes con IA y Customer Care (equipo de 20 personas).",
  },
  {
    title: "Co-founder",
    company: "Makai — Make an Impact",
    type: "Jornada parcial",
    period: "dic. 2018 — dic. 2022",
    detail:
      "Marca de moda femenina con modelo de impacto social: por cada prenda vendida, alimentación escolar para un niño durante un mes.",
  },
  {
    title: "Director de Operaciones",
    company: "Nonabox",
    type: "Jornada completa",
    period: "feb. 2012 — abr. 2015",
    detail:
      "Más de 100.000 envíos en 6 países. Internacionalización y centralización de operaciones en Madrid. Scrum Master de un equipo de 30 personas.",
  },
  {
    title: "Operaciones y Logística",
    company: "GLOSSYBOX",
    type: "Jornada completa",
    period: "sept. 2011 — ene. 2012",
    detail:
      "Gestión de envíos mensuales, relaciones con proveedores y optimización del sistema logístico.",
  },
];

const RECS = [
  {
    quote:
      "Pablo is a high-skilled one-man band. You can throw him any kind of ball and he will be ready for it. I'd be delighted to work with him again.",
    author: "Jesús Rodríguez",
    role: "Agile Facilitator / People Developer",
    photo: "/recomendadores/jesus.jpg",
    url: "https://www.linkedin.com/in/jesusrh/",
  },
  {
    quote: "He gets things done. He gets features shipped. And all while keeping a smile on.",
    author: "Arnau Tibau Puig",
    role: "Data & AI for climate · PhD",
    photo: "/recomendadores/arnau.jpg",
    url: "https://www.linkedin.com/in/atibaup/",
  },
  {
    quote:
      "One of the best product managers I have worked with. His communication and prioritization skills help the team go forward a lot faster.",
    author: "Yeliz Ustabas Lopez",
    role: "Sr. Product Manager · Eventbrite",
    photo: "/recomendadores/yeliz.jpg",
    url: "https://www.linkedin.com/in/yeliz-ustabas/",
  },
  {
    quote:
      "Unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions.",
    author: "Julien Meynet",
    role: "AI/ML Leader · PhD",
    photo: "/recomendadores/julien.jpg",
    url: "https://www.linkedin.com/in/julienmeynet/",
  },
  {
    quote:
      "A hands-on problem solver, consistently driving solutions across departments. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges.",
    author: "Kerem Kocak",
    role: "Head of Product · ex-OLX, CAFU, Turkcell",
    photo: "/recomendadores/kerem.jpg",
    url: "https://www.linkedin.com/in/kerem-product/",
  },
  {
    quote:
      "Not only incredibly smart but also exceptionally hardworking. Throw him a challenge and he will solve it.",
    author: "Adrià Vallès",
    role: "Engineering Manager · Lingokids",
    photo: "/recomendadores/adria.jpg",
    url: "https://www.linkedin.com/in/adriavalles/",
  },
  {
    quote:
      "Mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas.",
    author: "Janna Ubach",
    role: "Trust & Safety PM · N26",
    photo: "/recomendadores/janna.jpg",
    url: "https://www.linkedin.com/in/jannaubach/",
  },
  {
    quote:
      "Su capacidad de comunicación es excepcional. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor.",
    author: "Cristian Martin Mouat",
    role: "Estrategia tecnológica y desarrollo",
    photo: "/recomendadores/cristian.jpg",
    url: "https://www.linkedin.com/in/cristian-martin-mouat/",
  },
  {
    quote:
      "Versatile problem solver — managed business operations, written SQL queries, and led mid-sized multidisciplinary teams.",
    author: "Jordi Escrich",
    role: "Data Specialist",
    photo: "/recomendadores/jordi.jpg",
    url: "https://www.linkedin.com/in/jordiescrich/",
  },
  {
    quote:
      "Gets straight to the point, simplifies what is difficult and focuses on what is important. Nothing escapes him.",
    author: "Iván Bayo",
    role: "UX Designer",
    photo: "/recomendadores/ivan.jpg",
    url: "https://www.linkedin.com/in/ivanbayo/",
  },
  {
    quote:
      "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He'll challenge your assumptions.",
    author: "Mark Leung",
    role: "Principal Solution Strategist · Datavisor",
    photo: "/recomendadores/mark.jpg",
    url: "https://www.linkedin.com/in/mark-leung-8524105/",
  },
];

const CERTS = [
  { label: "Product Executive Certificate", issuer: "Product School", year: "2021" },
  { label: "Certified Scrum Product Owner", issuer: "Agilar Spain", year: "2017" },
  { label: "Certified Scrum Master", issuer: "Agilar Spain", year: "2017" },
  { label: "Retention + Engagement Deep Dive", issuer: "Reforge", year: "2018" },
  { label: "Certified Mentor", issuer: "Mentorloop", year: "2022" },
];

const LANGS = [
  { lang: "Español", level: "Nativo" },
  { lang: "Inglés", level: "Nativo" },
  { lang: "Francés", level: "Profesional básico" },
];

function RecsSlider() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = useCallback(() => setCurrent((c) => (c + 1) % RECS.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + RECS.length) % RECS.length), []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setTimeout(next, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, paused, next]);

  const rec = RECS[current];

  return (
    <div
      className="slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={current} className="slide">
        <p className="slide-quote">&ldquo;{rec.quote}&rdquo;</p>
        <div className="slide-author">
          <a
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="author-link"
          >
            <Image
              src={rec.photo}
              alt={rec.author}
              width={36}
              height={36}
              className="author-photo"
            />
            <div>
              <span className="author-name">{rec.author}</span>
              <span className="author-role">{rec.role}</span>
            </div>
          </a>
        </div>
      </div>

      <div className="slider-nav">
        <div className="slider-dots">
          {RECS.map((_, i) => (
            <button
              key={i}
              className={`dot${i === current ? " dot-active" : ""}`}
              onClick={() => setCurrent(i)}
              aria-label={`Recomendación ${i + 1}`}
            />
          ))}
        </div>
        <div className="slider-arrows">
          <button onClick={prev} className="arrow">←</button>
          <button onClick={next} className="arrow">→</button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:     #E8E9EB;
  --text:   #111213;
  --muted:  #636669;
  --faint:  #C4C6C9;
  --accent: #111213;
}

html { background: var(--bg); }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Lora', Georgia, serif;
  -webkit-font-smoothing: antialiased;
}

/* ── LAYOUT ── */
.cv {
  max-width: 680px;
  margin: 0 auto;
  padding: clamp(3rem, 9vw, 6rem) clamp(1.5rem, 6vw, 2.5rem);
}

/* ── HEADER ── */
.cv-header {
  padding-bottom: clamp(2.5rem, 7vw, 4rem);
  margin-bottom: clamp(2.5rem, 7vw, 4rem);
  border-bottom: 1px solid var(--faint);
}

.cv-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(2.8rem, 9vw, 5.2rem);
  font-weight: 800;
  font-style: normal;
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 1.5rem;
}

.cv-name-last {
  display: block;
  font-weight: 700;
  font-size: 0.85em;
  letter-spacing: -0.025em;
  color: var(--text);
}

.cv-role {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 1.75rem;
  line-height: 1.6;
}

.cv-bio {
  font-size: clamp(1.05rem, 2.2vw, 1.15rem);
  line-height: 1.8;
  color: var(--text);
  font-weight: 300;
  max-width: 50ch;
  margin-bottom: 2rem;
}

.cv-contact {
  display: flex;
  gap: 1.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.cv-contact a {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  color: var(--muted);
  text-decoration: none;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--faint);
  padding-bottom: 2px;
  transition: color 0.2s, border-color 0.2s;
}
.cv-contact a:hover {
  color: var(--text);
  border-color: var(--text);
}

/* ── SECTION ── */
.section {
  margin-bottom: clamp(2.5rem, 7vw, 4rem);
}

.section-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 1.25rem;
}

/* ── JOBS ── */
.job {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0 2rem;
  padding: 1.2rem 0;
  border-top: 1px solid var(--faint);
  align-items: start;
}
.job:last-child {
  border-bottom: 1px solid var(--faint);
}

.job-main {}

.job-title {
  font-size: 1rem;
  font-weight: 600;
  font-style: italic;
  color: var(--text);
  line-height: 1.3;
}

.job-company {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  color: var(--muted);
  margin-top: 0.2rem;
  letter-spacing: 0.03em;
}

.job-detail {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--muted);
  margin-top: 0.55rem;
  font-weight: 300;
}

.job-period {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  color: var(--muted);
  white-space: nowrap;
  padding-top: 0.15rem;
  text-align: right;
  flex-shrink: 0;
}

@media (max-width: 500px) {
  .job {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .job-period {
    text-align: left;
    order: -1;
    margin-bottom: 0.25rem;
  }
}

/* ── EDUCATION ── */
.edu-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 2rem;
  padding: 1.2rem 0;
  border-top: 1px solid var(--faint);
  border-bottom: 1px solid var(--faint);
}

.edu-degree {
  font-size: 1rem;
  font-weight: 600;
  font-style: italic;
  line-height: 1.3;
}

.edu-school {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  color: var(--muted);
  margin-top: 0.2rem;
}

.edu-period {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}

@media (max-width: 500px) {
  .edu-item {
    flex-direction: column;
    gap: 0.25rem;
  }
}

/* ── SLIDER ── */
.slider { position: relative; }

.slide {
  border-top: 1px solid var(--faint);
  border-bottom: 1px solid var(--faint);
  padding: 2rem 0;
  min-height: 190px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
  animation: fadeIn 0.28s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.slide-quote {
  font-size: clamp(1rem, 2.2vw, 1.1rem);
  font-style: italic;
  font-weight: 400;
  line-height: 1.8;
  color: var(--text);
  max-width: 56ch;
}

.author-link {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.author-photo {
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  opacity: 0.9;
}

.author-name {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text);
  transition: color 0.2s;
  letter-spacing: 0.02em;
}
.author-link:hover .author-name { color: var(--muted); }

.author-role {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.58rem;
  color: var(--muted);
  margin-top: 0.15rem;
  letter-spacing: 0.01em;
}

.slider-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.slider-dots {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  max-width: 78%;
}

.dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 1px;
  border: none;
  background: var(--faint);
  cursor: pointer;
  padding: 0;
  transition: background 0.25s, width 0.25s;
}

.dot-active {
  background: var(--muted);
  width: 1.1rem;
}

.slider-arrows {
  display: flex;
  gap: 0.3rem;
}

.arrow {
  background: none;
  border: 1px solid var(--faint);
  color: var(--muted);
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.72rem;
  transition: border-color 0.2s, color 0.2s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.arrow:hover {
  border-color: var(--muted);
  color: var(--text);
}

/* ── CERTS ── */
.cert-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1.5rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--faint);
}
.cert-item:last-child {
  border-bottom: 1px solid var(--faint);
}

.cert-label {
  font-size: 0.95rem;
  font-weight: 400;
  color: var(--text);
}

.cert-meta {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.58rem;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
  text-align: right;
  letter-spacing: 0.02em;
}

@media (max-width: 460px) {
  .cert-item { flex-direction: column; gap: 0.2rem; }
  .cert-meta { text-align: left; }
}

/* ── LANGS ── */
.lang-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.85rem 0;
  border-top: 1px solid var(--faint);
}
.lang-item:last-child {
  border-bottom: 1px solid var(--faint);
}

.lang-name {
  font-size: 0.97rem;
  font-weight: 400;
}

.lang-level {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.58rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}

/* ── FOOTER ── */
.cv-footer {
  margin-top: clamp(2.5rem, 7vw, 4rem);
  padding-top: 1.25rem;
  border-top: 1px solid var(--faint);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-mark {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  color: var(--faint);
  letter-spacing: 0.08em;
}

.footer-link {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  color: var(--muted);
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--text); }
`;

export default function TempHome() {
  return (
    <>
      <style>{CSS}</style>

      <div className="cv">

        {/* HEADER */}
        <header className="cv-header">
          <h1 className="cv-name">
            Pablo
            <span className="cv-name-last">Crespo Velasco</span>
          </h1>
          <p className="cv-role">
            Director de Operaciones · Senior Product Manager · Troubleshooter
          </p>
          <p className="cv-bio">
            Ingeniero Industrial con curiosidad por el funcionamiento de todo.
            Capacidad para comprender y resolver cualquier problema que se presente.
            Los grandes retos me hacen feliz: organizar el caos, solucionar lo
            imposible, gestionar lo inmanejable.
          </p>
          <div className="cv-contact">
            <a href="mailto:crespovelasco@gmail.com">crespovelasco@gmail.com</a>
            <a
              href="https://www.linkedin.com/in/pacres/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn →
            </a>
          </div>
        </header>

        {/* EXPERIENCIA */}
        <section className="section">
          <p className="section-label">Experiencia</p>
          {JOBS.map((job) => (
            <div key={job.title} className="job">
              <div className="job-main">
                <p className="job-title">{job.title}</p>
                <p className="job-company">
                  {job.company} · {job.type}
                </p>
                <p className="job-detail">{job.detail}</p>
              </div>
              <p className="job-period">{job.period}</p>
            </div>
          ))}
        </section>

        {/* EDUCACIÓN */}
        <section className="section">
          <p className="section-label">Educación</p>
          <div className="edu-item">
            <div>
              <p className="edu-degree">Ingeniería Industrial</p>
              <p className="edu-school">
                Universidad Pontificia Comillas ICAI-ICADE
              </p>
            </div>
            <p className="edu-period">2004–2012</p>
          </div>
        </section>

        {/* RECOMENDACIONES */}
        <section className="section">
          <p className="section-label">Recomendaciones</p>
          <RecsSlider />
        </section>

        {/* CERTIFICACIONES */}
        <section className="section">
          <p className="section-label">Certificaciones</p>
          {CERTS.map((cert) => (
            <div key={cert.label} className="cert-item">
              <span className="cert-label">{cert.label}</span>
              <span className="cert-meta">
                {cert.issuer} · {cert.year}
              </span>
            </div>
          ))}
        </section>

        {/* IDIOMAS */}
        <section className="section">
          <p className="section-label">Idiomas</p>
          {LANGS.map((l) => (
            <div key={l.lang} className="lang-item">
              <span className="lang-name">{l.lang}</span>
              <span className="lang-level">{l.level}</span>
            </div>
          ))}
        </section>

        {/* FOOTER */}
        <footer className="cv-footer">
          <span className="footer-mark">pacr.es</span>
          <a
            href="https://www.linkedin.com/in/pacres/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            LinkedIn →
          </a>
        </footer>

      </div>
    </>
  );
}
