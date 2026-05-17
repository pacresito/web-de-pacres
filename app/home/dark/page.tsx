"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Image from "next/image";
import HomeNav from "../../components/HomeNav";

interface Job {
  title: string;
  company: string;
  period: string;
  description: ReactNode;
}

interface Rec {
  quote: string;
  author: string;
  role: string;
  photo: string;
  url: string;
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

const RECS: Rec[] = [
  { quote: "I had the privilege of working Pablo, a dynamic and proactive colleague. Pablo is a hands-on problem solver, consistently driving solutions and fostering collaboration across departments. His exceptional interpersonal skills create a positive work environment. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges seamlessly.", author: "Kerem Kocak", role: "Head of Product · ex-OLX, CAFU, Turkcell", photo: "/recomendadores/kerem.jpg", url: "https://www.linkedin.com/in/kerem-product/" },
  { quote: "Pablo and I worked together on letgo. I must say he is one of the best product managers I have worked with. His communication and prioritization skills, help team going forward a lot faster. He takes ownership on initiatives and deliveres valuable outcomes. Besides, he is very fun to work with. I believe he will be a great addition to any team.", author: "Yeliz Ustabas Lopez", role: "Risk and Fraud · Sr. Product Manager at Eventbrite", photo: "/recomendadores/yeliz.jpg", url: "https://www.linkedin.com/in/yeliz-ustabas/" },
  { quote: "I've had the pleasure of working closely with Pablo for several years, and I can confidently say that he is an exceptional professional. Pablo possesses a unique skill set that makes him a valuable asset to any team. I want to highlight his exceptional ability to solve complex problems and find practical solutions, as well as his remarkable adaptability when taking on new assignments. Above all, what sets Pablo apart is his positive attitude and friendly demeanor, which not only make working with him enjoyable but also foster a collaborative and welcoming work environment.", author: "David Adalid", role: "QA Specialist · ISTQB Certified", photo: "/recomendadores/david.jpg", url: "https://www.linkedin.com/in/david-adalid/" },
  { quote: "Pablo is a high-skilled one-man band. He is able to perform so many different roles but, at the same time, able to lead by example a group of ICs so they go the extra mile. He is easy-going, happy to negotiate and to reach agreements. He is not pure-techie, but you can throw him any kind of ball and he will be ready for it. I'd say of Pablo that he is one of a kind and I'd be delighted to work with him again.", author: "Jesús Rodríguez", role: "Agile Facilitator / People Developer", photo: "/recomendadores/jesus.jpg", url: "https://www.linkedin.com/in/jesusrh/" },
  { quote: "I had the privilege of working with Pablo for several years at the hyper-fast-growing startup letgo. Pablo is not only incredibly smart but also exceptionally hardworking. He's the kind of guy who's there to get the job done, no matter the challenge. ANY, really! Throw him a challenge and he will solve it. His fantastic sense of humor and positive attitude also make working with him a breeze.", author: "Adrià Vallès", role: "Engineering Manager · Lingokids", photo: "/recomendadores/adria.jpg", url: "https://www.linkedin.com/in/adriavalles/" },
  { quote: "Pablo showed unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions. Guided by Pablo's leadership, the team has had great business impact using complex technical initiatives like Home personalization and Search relevance. I have learned a lot from Pablo during this period, especially from his ability to quickly adapt to business changes.", author: "Julien Meynet", role: "AI/ML Leader · Search & Recommender Systems · PhD", photo: "/recomendadores/julien.jpg", url: "https://www.linkedin.com/in/julienmeynet/" },
  { quote: "You need something done and you need it quick... but you also need to align many stakeholders, while understanding the customers' pains and keeping in mind the technical limitations... Then Pablo is your man! He gets things done. He gets features shipped. And all while keeping a smile on... I miss working with him!", author: "Arnau Tibau Puig", role: "Data & AI for climate · PhD", photo: "/recomendadores/arnau.jpg", url: "https://www.linkedin.com/in/atibaup/" },
  { quote: "Es un honor recomendar a Pablo, una mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas. Su curiosidad insaciable, proactividad y enfoque implacable en los objetivos hacen que sea un compañero excepcional. Gran líder y mentor, destaco su disposición constante para compartir conocimientos y desafiar ideas para encontrar las mejores soluciones.", author: "Janna Ubach", role: "Trust & Safety PM · N26 · ex-TikTok, ex-OLX", photo: "/recomendadores/janna.jpg", url: "https://www.linkedin.com/in/jannaubach/" },
  { quote: "Lo que más aprendí de Pablo es que siempre tenía actitud positiva, te daba mucha confianza y te ayudaba a tener todo bajo control. Otra de las virtudes de Pablo es que es muy multidisciplinar. Sin duda una de las cosas que más aprendí fue todo el tema de metodologías Agile, teníamos unas metodologías muy dinámicas en los procesos de trabajo.", author: "Dani Cruz", role: "AI Advertising", photo: "/recomendadores/dani.jpg", url: "https://www.linkedin.com/in/danicruzpaidsocial/" },
  { quote: "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He considers all the possible outcomes and effects and will often think of issues in a solution that others will not. He's a great collaborator as well and will challenge you in your assumptions. He's also well versed technically and can get comfortably into the details with engineers.", author: "Mark Leung", role: "Principal Solution Strategist · Datavisor", photo: "/recomendadores/mark.jpg", url: "https://www.linkedin.com/in/mark-leung-8524105/" },
  { quote: "Pablo es una de las personas con las que mejor he trabajado. Su capacidad de comunicación es excepcional. Su organización es envidiable, siempre mantiene un enfoque claro y estructurado y sobretodo, muy pragmático. Lo que más me impresiona de Pablo es su adaptabilidad. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor y creando una atmósfera de colaboración y buen rollo como muy pocas personas son capaces de generar.", author: "Cristian Martin Mouat", role: "From tech strategy to hands-on development", photo: "/recomendadores/cristian.jpg", url: "https://www.linkedin.com/in/cristian-martin-mouat/" },
  { quote: "I thoroughly enjoyed meeting and working with Pablo for two years. He is an energetic, upbeat person who always lightens up any room he enters. Pablo has an inquisitive mind and sharp intellect and is a versatile problem solver. He has successfully found external providers, managed business operations, written SQL queries, and led mid-sized multidisciplinary teams. If this sounds too good to be true, just hop on a call with him and see for yourself.", author: "Jordi Escrich", role: "Data Specialist", photo: "/recomendadores/jordi.jpg", url: "https://www.linkedin.com/in/jordiescrich/" },
  { quote: "Pablo gets straight to the point, simplifies what is difficult and focuses on what is important. He makes the way easier for everyone to deliver the task while listening to all points of view. Nothing escapes him. As a designer I recommend Pablo 100%.", author: "Iván Bayo", role: "Designing impactful user experiences", photo: "/recomendadores/ivan.jpg", url: "https://www.linkedin.com/in/ivanbayo/" },
  { quote: "Pablo is a great professional. His strong analytical skills make him ready and able to solve every problem he has to face. He is able to manage huge work-load and to perform perfectly in stressful situations always keeping a smile on his face. I am sure he would be the perfect element for every team!", author: "Daniela Servi", role: "ESL Teacher · SCUOLA INTERNAZIONALE DI PAVIA", photo: "/recomendadores/daniela.jpg", url: "https://www.linkedin.com/in/danielaservi/" },
  { quote: "Pablo, es sin duda, una de las personas más inteligentes, trabajadoras y profesionales con las que he tenido el placer de trabajar. Además de gestionar la logística de Nonabox de forma soberbia, aplica sus conocimientos de forma práctica y antepone lo que juzga es mejor para la empresa. Siempre he intentado tener en cuenta su opinión para cualquier desarrollo, pues sabe abstraerse y pensar siempre de la forma correcta.", author: "Mario Pérez Pereira", role: "Head of Product", photo: "/recomendadores/mario.jpg", url: "https://www.linkedin.com/in/marioperezpereira/" },
];

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

const CERTS = [
  { label: "Product Executive Certificate", issuer: "Product School", year: "nov. 2021" },
  { label: "Certified Scrum Product Owner", issuer: "Agilar Spain", year: "may. 2017" },
  { label: "Certified Scrum Master", issuer: "Agilar Spain", year: "abr. 2017" },
  { label: "Retention + Engagement Deep Dive", issuer: "Reforge", year: "nov. 2018" },
  { label: "Certified Mentor", issuer: "Mentorloop", year: "abr. 2022" },
  { label: "Diplôme d'Études en Langue Française", issuer: "Ministère de l'Éducation nationale", year: "jul. 2002" },
  { label: "First Certificate Exam", issuer: "University of Cambridge", year: "jun. 2002" },
  { label: "Advanced Open Water Diver", issuer: "PADI", year: "ago. 2009" },
];

const LANGS = [
  { lang: "Español", level: "Competencia bilingüe o nativa" },
  { lang: "Inglés", level: "Competencia bilingüe o nativa" },
  { lang: "Francés", level: "Competencia básica profesional" },
  { lang: "Lengua de signos", level: "Competencia básica" },
];

const AWARDS = [
  { title: "Best Startup Products & Services. Early Stage", org: "Spain Startup & Investor Summit · Nonabox", year: "oct. 2013" },
  { title: "Finalista StartCamp Madrid 2013", org: "Wayra — Telefónica · Proyecto iVecinos", year: "mar. 2013" },
  { title: "Tercer puesto campeonato nacional de capoeira", org: "", year: "may. 2009" },
  { title: "Primer puesto campeonato local de ajedrez", org: "", year: "jun. 1995" },
];

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
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

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
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.cta-btn:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--text);
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
  font-family: 'JetBrains Mono', monospace;
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
.job-item:hover { border-color: rgba(59,130,246,0.18); }

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
.job-item:hover .job-title { color: var(--accent-bright); }
.job-company {
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
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
.job-item:hover .job-toggle { opacity: 1; }
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
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}
.edu-period {
  font-family: 'JetBrains Mono', monospace;
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
.slider-quote:hover { border-color: rgba(59,130,246,0.35); border-left-color: var(--accent-bright); }

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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text);
  transition: color 0.2s;
}
.author-link:hover .author-name { color: var(--accent-bright); }
.author-role {
  display: block;
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
}
.arrow-btn:hover { border-color: var(--border-accent); color: var(--accent-bright); }

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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  padding: 0.35rem 0.8rem;
  border: 1px solid rgba(59,130,246,0.2);
  color: var(--text-dim);
  background: transparent;
  cursor: default;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.cert-tag:hover {
  border-color: var(--border-accent);
  color: var(--accent-bright);
  background: var(--accent-dim);
}
.skill-tag {
  font-family: 'JetBrains Mono', monospace;
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
.skill-tag:hover { border-color: rgba(59,130,246,0.18); color: var(--text-dim); }

.skill-tag-shine {
  position: relative;
  overflow: hidden;
}
.skill-tag-shine::after {
  content: "";
  position: absolute;
  top: -50%; left: -75%;
  width: 50%; height: 200%;
  background: linear-gradient(
    120deg,
    transparent 0%,
    rgba(251,191,36,0.15) 40%,
    rgba(253,224,71,0.55) 50%,
    rgba(251,191,36,0.15) 60%,
    transparent 100%
  );
  transform: skewX(-20deg);
  animation: goldSweep 10s ease-in-out infinite;
}
@keyframes goldSweep {
  0%, 88%  { left: -75%; opacity: 1; }
  97%      { left: 150%; opacity: 1; }
  98%, 100%{ left: 150%; opacity: 0; }
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
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.63rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}
.award-year {
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}
.footer-brand:hover { color: var(--accent-bright); }
.footer-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
  flex-shrink: 0;
}
.footer-link:hover { color: var(--accent-bright); }

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
  const physicsActiveRef = useRef(false);

  const triggerLetterPhysics = useCallback(async () => {
    if (physicsActiveRef.current) return;
    physicsActiveRef.current = true;

    let Engine: typeof import("matter-js").Engine,
        Bodies: typeof import("matter-js").Bodies,
        Body: typeof import("matter-js").Body,
        World: typeof import("matter-js").World,
        Runner: typeof import("matter-js").Runner;
    try {
      const mod = await import("matter-js");
      const M = (mod as unknown as { default?: typeof mod }).default ?? mod;
      Engine = M.Engine; Bodies = M.Bodies; Body = M.Body; World = M.World; Runner = M.Runner;
      if (!Engine) throw new Error("matter-js no cargó");
    } catch {
      physicsActiveRef.current = false;
      return;
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;";
    document.body.appendChild(overlay);

    const pacrEl = document.querySelector("footer span") as HTMLElement | null;
    const pacrRect = pacrEl?.getBoundingClientRect();

    type LetterData = { char: string; cx: number; cy: number; w: number; h: number; fontSize: string; fontFamily: string; fontWeight: string; color: string };
    const letterData: LetterData[] = [];

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent || parent === pacrEl) return;
        const tag = parent.tagName.toLowerCase();
        if (["script", "style", "noscript"].includes(tag)) return;
        const cs = window.getComputedStyle(parent);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
        if (parent.closest("[data-no-physics]")) return;
        const text = node.textContent || "";
        for (let i = 0; i < text.length; i++) {
          if (!text[i].trim()) continue;
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0) {
            letterData.push({ char: text[i], cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height, fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, color: cs.color });
          }
        }
      } else {
        node.childNodes.forEach(walk);
      }
    };
    walk(document.body);

    const letterSpans: HTMLSpanElement[] = [];
    for (const d of letterData) {
      const span = document.createElement("span");
      span.textContent = d.char;
      span.style.cssText = `position:fixed;left:0;top:0;font-size:${d.fontSize};font-family:${d.fontFamily};font-weight:${d.fontWeight};color:${d.color};transform:translate(${d.cx}px,${d.cy}px) translate(-50%,-50%);transform-origin:50% 50%;will-change:transform;pointer-events:none;white-space:pre;`;
      overlay.appendChild(span);
      letterSpans.push(span);
    }

    const main = document.querySelector("main") as HTMLElement | null;
    const heroEl = document.querySelector(".hero") as HTMLElement | null;
    if (main) { main.style.transition = "opacity 0.15s"; main.style.opacity = "0"; }
    if (heroEl) { heroEl.style.transition = "opacity 0.15s"; heroEl.style.opacity = "0"; }

    const engine = Engine.create({ gravity: { x: 0, y: 2 } });
    const floor = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 30, window.innerWidth * 3, 60, { isStatic: true });
    const wallL = Bodies.rectangle(-30, window.innerHeight / 2, 60, window.innerHeight * 3, { isStatic: true });
    const wallR = Bodies.rectangle(window.innerWidth + 30, window.innerHeight / 2, 60, window.innerHeight * 3, { isStatic: true });
    World.add(engine.world, [floor, wallL, wallR]);

    const bodies: Matter.Body[] = [];
    for (const d of letterData) {
      const body = Bodies.rectangle(d.cx, d.cy, Math.max(d.w, 4), Math.max(d.h, 4), { restitution: 0.35, friction: 0.5, frictionAir: 0.008 });
      Body.setVelocity(body, { x: (Math.random() - 0.5) * 5, y: Math.random() * 2 });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.25);
      World.add(engine.world, body);
      bodies.push(body);
    }

    let pacrSpan: HTMLSpanElement | null = null;
    let pacrBody: Matter.Body | null = null;
    if (pacrEl && pacrRect) {
      const cs = window.getComputedStyle(pacrEl);
      pacrSpan = document.createElement("span");
      pacrSpan.textContent = "pacr.es";
      pacrSpan.style.cssText = `position:fixed;left:0;top:0;font-size:${cs.fontSize};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};color:${cs.color};transform:translate(${pacrRect.left + pacrRect.width / 2}px,${pacrRect.top + pacrRect.height / 2}px) translate(-50%,-50%);transform-origin:50% 50%;will-change:transform;white-space:pre;cursor:pointer;pointer-events:auto;`;
      overlay.appendChild(pacrSpan);
      pacrBody = Bodies.rectangle(pacrRect.left + pacrRect.width / 2, pacrRect.top + pacrRect.height / 2, pacrRect.width, Math.max(pacrRect.height, 8), { restitution: 0.4, friction: 0.5, frictionAir: 0.008 });
      World.add(engine.world, pacrBody);
    }

    const runner = Runner.create();
    Runner.run(runner, engine);

    let stopped = false;
    let animFrame: number;
    const animate = () => {
      if (stopped) return;
      for (let i = 0; i < letterSpans.length; i++) {
        const { x, y } = bodies[i].position;
        letterSpans[i].style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${bodies[i].angle}rad)`;
      }
      if (pacrSpan && pacrBody) {
        const { x, y } = pacrBody.position;
        pacrSpan.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${pacrBody.angle}rad)`;
      }
      animFrame = requestAnimationFrame(animate);
    };
    animate();

    const restore = () => {
      stopped = true;
      cancelAnimationFrame(animFrame);
      Runner.stop(runner);
      Engine.clear(engine);
      const t = "transform 0.7s cubic-bezier(0.4,0,0.2,1)";
      letterSpans.forEach((span, i) => {
        span.style.transition = t;
        span.style.transform = `translate(${letterData[i].cx}px,${letterData[i].cy}px) translate(-50%,-50%) rotate(0rad)`;
      });
      if (pacrSpan && pacrRect) {
        pacrSpan.style.transition = t;
        pacrSpan.style.transform = `translate(${pacrRect.left + pacrRect.width / 2}px,${pacrRect.top + pacrRect.height / 2}px) translate(-50%,-50%) rotate(0rad)`;
      }
      setTimeout(() => {
        overlay.remove();
        if (main) main.style.opacity = "1";
        if (heroEl) heroEl.style.opacity = "1";
        physicsActiveRef.current = false;
      }, 750);
    };

    overlay.style.pointerEvents = "auto";
    const isTouchDevice = "ontouchstart" in window;
    if (isTouchDevice) {
      let lastTap = 0;
      const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTap < 350) { overlay.removeEventListener("touchend", handleDoubleTap); restore(); }
        lastTap = now;
      };
      overlay.addEventListener("touchend", handleDoubleTap);
    } else {
      overlay.style.cursor = "pointer";
      overlay.addEventListener("click", restore, { once: true });
    }
  }, []);

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
            <a href="/lab" className="skill-tag skill-tag-shine">Resolución de problemas</a>
          </div>
        </section>

      </main>

      <footer className="footer">
        <span className="footer-brand" onClick={triggerLetterPhysics}>pacr.es</span>
        <span className="footer-brand" style={{cursor:"default"}}>Creado el 30 de abril de 2026.</span>
        <a
          href="https://www.linkedin.com/in/pacres/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >LinkedIn →</a>
      </footer>
      <HomeNav />
    </>
  );
}
