"use client";

import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import HomeNav from "../../components/HomeNav";

type Rec = { texto: string; autor: string; cargo: string; photo: string; href: string };
type ExpItem = { titulo: string; empresa: string; tipo: string; fechas: string; resumen: string; bullets: [string, string[]][] };

const EXPERIENCIA: ExpItem[] = [
  {
    titulo: "Partner",
    empresa: "CARPA Financieros",
    tipo: "Autónomo",
    fechas: "ene. 2023 — actualidad",
    resumen: "Invierte en el sector inmobiliario de forma sencilla. Obtén buenas rentabilidades sin preocuparte.",
    bullets: [],
  },
  {
    titulo: "Launch Manager / Senior Product Manager",
    empresa: "Letgo",
    tipo: "Jornada completa",
    fechas: "jun. 2015 — ago. 2023",
    resumen: "Implementación y gestión de nuevos proyectos estratégicos.",
    bullets: [
      ["Senior Product Manager", [
        "Comunicación y coordinación de diferentes equipos: «Growth», «Platform», «B2B», «Search and Discovery»",
        "Conceptualización y desarrollo de nuevas ideas en todas las plataformas (Android, iOS y Web)",
        "Priorización según valor de negocio y principales KPI",
        "Definición de especificaciones técnicas en proyectos de alto impacto",
        "Responsable de los A/B tests: construir los dashboards y dar visibilidad de los resultados",
        "Definición de los OKR y asegurarse que todos los KPI tienen los valores esperados",
      ]],
      ["Expansión internacional", [
        "Gestión inicial del contenido (23 países)",
        "Implementación del sistema de traducción, contratación de los traductores y coordinación del QA inicial (18 idiomas)",
      ]],
      ["Trust and Safety", [
        "Definición e implementación de distintos proyectos y reglas contra el fraude (spam / scam)",
      ]],
      ["Reconocimiento de imágenes con IA", [
        "Coordinación de la implantación del sistema",
        "Regulación de su aprendizaje y estudio de los resultados para el ajuste de los valores óptimos",
      ]],
      ["Customer Care", [
        "Contratación y training del equipo freelance de Customer Care (20 personas)",
        "Implementación del sistema de tickets y programación de los reports y automatismos",
      ]],
    ],
  },
  {
    titulo: "Co-founder",
    empresa: "Makai — Make an impact",
    tipo: "Jornada parcial",
    fechas: "dic. 2018 — dic. 2022",
    resumen: "Una marca optimista y positiva que crea prendas femeninas icónicas con un enfoque práctico para poder llevarlas en cualquier ocasión y ayuda a cambiar la vida de los niños más desfavorecidos, proporcionándoles alimento diario en su escuela.",
    bullets: [],
  },
  {
    titulo: "Mentor",
    empresa: "Fastísimo / IE Business School",
    tipo: "Jornada parcial",
    fechas: "abr. 2015 — may. 2015",
    resumen: "Mentor de Fastísimo en el Area 31 del IE Business School. La App nació con el fin de facilitar la vida a las personas llevándoles lo que quieran, donde y cuando quieran mediante una red de repartidores freelance.",
    bullets: [],
  },
  {
    titulo: "Director de Operaciones",
    empresa: "Nonabox",
    tipo: "Jornada completa",
    fechas: "feb. 2012 — abr. 2015",
    resumen: "",
    bullets: [
      ["", [
        "Gestión de más de 100.000 envíos realizados en 6 países",
        "Organización de la estrategia de internacionalización",
        "Posterior centralización de las operaciones en Madrid",
        "Planificación de nuevos modelos de negocio como la Tienda Online y la Suscripción de Pañales",
        "Diseño de cohortes y otras herramientas para el análisis de resultados",
        "Scrum Master de un equipo de 30 personas con 6 Product Owners",
        "Negociación con proveedores y operadores logísticos",
        "Gestión del equipo de Atención al Cliente y Desarrollo de la web",
      ]],
    ],
  },
  {
    titulo: "Operaciones y Logística",
    empresa: "GLOSSYBOX",
    tipo: "Jornada completa",
    fechas: "sept. 2011 — ene. 2012",
    resumen: "",
    bullets: [
      ["", [
        "Gestión de miles de envíos mensuales",
        "Relación con proveedores y operadores logísticos",
        "Optimización del sistema logístico on-line y el CRM",
        "Alineación entre el departamento de operaciones y atención al cliente",
      ]],
    ],
  },
  {
    titulo: "Ingeniería Industrial",
    empresa: "ICAI",
    tipo: "Formación",
    fechas: "2004 – 2012",
    resumen: "Universidad Pontificia Comillas ICAI-ICADE",
    bullets: [],
  },
];

const RECS: Rec[] = [
  { texto: "I had the privilege of working Pablo, a dynamic and proactive colleague. Pablo is a hands-on problem solver, consistently driving solutions and fostering collaboration across departments. His exceptional interpersonal skills create a positive work environment. I highly recommend Pablo for his dedication, teamwork, and ability to navigate challenges seamlessly.", autor: "Kerem Kocak", cargo: "Head of Product · ex-OLX, CAFU, Turkcell", photo: "/recomendadores/kerem.jpg", href: "https://www.linkedin.com/in/kerem-product/" },
  { texto: "Pablo and I worked together on letgo. I must say he is one of the best product managers I have worked with. His communication and prioritization skills, help team going forward a lot faster. He takes ownership on initiatives and deliveres valuable outcomes. Besides, he is very fun to work with. I believe he will be a great addition to any team.", autor: "Yeliz Ustabas Lopez", cargo: "Risk and Fraud · Sr. Product Manager at Eventbrite", photo: "/recomendadores/yeliz.jpg", href: "https://www.linkedin.com/in/yeliz-ustabas/" },
  { texto: "I've had the pleasure of working closely with Pablo for several years, and I can confidently say that he is an exceptional professional. Pablo possesses a unique skill set that makes him a valuable asset to any team. I want to highlight his exceptional ability to solve complex problems and find practical solutions, as well as his remarkable adaptability when taking on new assignments. Above all, what sets Pablo apart is his positive attitude and friendly demeanor, which not only make working with him enjoyable but also foster a collaborative and welcoming work environment.", autor: "David Adalid", cargo: "QA Specialist · ISTQB Certified", photo: "/recomendadores/david.jpg", href: "https://www.linkedin.com/in/david-adalid/" },
  { texto: "Pablo is a high-skilled one-man band. He is able to perform so many different roles but, at the same time, able to lead by example a group of ICs so they go the extra mile. He is easy-going, happy to negotiate and to reach agreements. He is not pure-techie, but you can throw him any kind of ball and he will be ready for it. I'd say of Pablo that he is one of a kind and I'd be delighted to work with him again.", autor: "Jesús Rodríguez", cargo: "Agile Facilitator / People Developer", photo: "/recomendadores/jesus.jpg", href: "https://www.linkedin.com/in/jesusrh/" },
  { texto: "I had the privilege of working with Pablo for several years at the hyper-fast-growing startup letgo. Pablo is not only incredibly smart but also exceptionally hardworking. He's the kind of guy who's there to get the job done, no matter the challenge. ANY, really! Throw him a challenge and he will solve it. His fantastic sense of humor and positive attitude also make working with him a breeze.", autor: "Adrià Vallès", cargo: "Engineering Manager · Lingokids", photo: "/recomendadores/adria.jpg", href: "https://www.linkedin.com/in/adriavalles/" },
  { texto: "Pablo showed unique skills for approaching challenges with pragmatism and out-of-the-box thinking that consistently resulted in innovative and effective solutions. Guided by Pablo's leadership, the team has had great business impact using complex technical initiatives like Home personalization and Search relevance. I have learned a lot from Pablo during this period, especially from his ability to quickly adapt to business changes.", autor: "Julien Meynet", cargo: "AI/ML Leader · Search & Recommender Systems · PhD", photo: "/recomendadores/julien.jpg", href: "https://www.linkedin.com/in/julienmeynet/" },
  { texto: "You need something done and you need it quick... but you also need to align many stakeholders, while understanding the customers' pains and keeping in mind the technical limitations... Then Pablo is your man! He gets things done. He gets features shipped. And all while keeping a smile on... I miss working with him!", autor: "Arnau Tibau Puig", cargo: "Data & AI for climate · PhD", photo: "/recomendadores/arnau.jpg", href: "https://www.linkedin.com/in/atibaup/" },
  { texto: "Es un honor recomendar a Pablo, una mente brillante con una habilidad asombrosa para simplificar problemas complejos y encontrar soluciones efectivas. Su curiosidad insaciable, proactividad y enfoque implacable en los objetivos hacen que sea un compañero excepcional. Gran líder y mentor, destaco su disposición constante para compartir conocimientos y desafiar ideas para encontrar las mejores soluciones.", autor: "Janna Ubach", cargo: "Trust & Safety PM · N26 · ex-TikTok, ex-OLX", photo: "/recomendadores/janna.jpg", href: "https://www.linkedin.com/in/jannaubach/" },
  { texto: "Lo que más aprendí de Pablo es que siempre tenía actitud positiva, te daba mucha confianza y te ayudaba a tener todo bajo control. Otra de las virtudes de Pablo es que es muy multidisciplinar. Sin duda una de las cosas que más aprendí fue todo el tema de metodologías Agile, teníamos unas metodologías muy dinámicas en los procesos de trabajo.", autor: "Dani Cruz", cargo: "AI Advertising", photo: "/recomendadores/dani.jpg", href: "https://www.linkedin.com/in/danicruzpaidsocial/" },
  { texto: "Pablo is a tenacious Product Owner and drives towards the best solutions with great efficiency. He considers all the possible outcomes and effects and will often think of issues in a solution that others will not. He's a great collaborator as well and will challenge you in your assumptions. He's also well versed technically and can get comfortably into the details with engineers.", autor: "Mark Leung", cargo: "Principal Solution Strategist · Datavisor", photo: "/recomendadores/mark.jpg", href: "https://www.linkedin.com/in/mark-leung-8524105/" },
  { texto: "Pablo es una de las personas con las que mejor he trabajado. Su capacidad de comunicación es excepcional. Su organización es envidiable, siempre mantiene un enfoque claro y estructurado y sobretodo, muy pragmático. Lo que más me impresiona de Pablo es su adaptabilidad. Siempre se muestra alegre y con energía, contagiando a todos los que están a su alrededor y creando una atmósfera de colaboración y buen rollo como muy pocas personas son capaces de generar.", autor: "Cristian Martin Mouat", cargo: "From tech strategy to hands-on development", photo: "/recomendadores/cristian.jpg", href: "https://www.linkedin.com/in/cristian-martin-mouat/" },
  { texto: "I thoroughly enjoyed meeting and working with Pablo for two years. He is an energetic, upbeat person who always lightens up any room he enters. Pablo has an inquisitive mind and sharp intellect and is a versatile problem solver. He has successfully found external providers, managed business operations, written SQL queries, and led mid-sized multidisciplinary teams. If this sounds too good to be true, just hop on a call with him and see for yourself.", autor: "Jordi Escrich", cargo: "Data Specialist", photo: "/recomendadores/jordi.jpg", href: "https://www.linkedin.com/in/jordiescrich/" },
  { texto: "Pablo gets straight to the point, simplifies what is difficult and focuses on what is important. He makes the way easier for everyone to deliver the task while listening to all points of view. Nothing escapes him. As a designer I recommend Pablo 100%.", autor: "Iván Bayo", cargo: "Designing impactful user experiences", photo: "/recomendadores/ivan.jpg", href: "https://www.linkedin.com/in/ivanbayo/" },
  { texto: "Pablo is a great professional. His strong analytical skills make him ready and able to solve every problem he has to face. He is able to manage huge work-load and to perform perfectly in stressful situations always keeping a smile on his face. I am sure he would be the perfect element for every team!", autor: "Daniela Servi", cargo: "ESL Teacher · SCUOLA INTERNAZIONALE DI PAVIA", photo: "/recomendadores/daniela.jpg", href: "https://www.linkedin.com/in/danielaservi/" },
  { texto: "Pablo, es sin duda, una de las personas más inteligentes, trabajadoras y profesionales con las que he tenido el placer de trabajar. Además de gestionar la logística de Nonabox de forma soberbia, aplica sus conocimientos de forma práctica y antepone lo que juzga es mejor para la empresa. Siempre he intentado tener en cuenta su opinión para cualquier desarrollo, pues sabe abstraerse y pensar siempre de la forma correcta.", autor: "Mario Pérez Pereira", cargo: "Head of Product", photo: "/recomendadores/mario.jpg", href: "https://www.linkedin.com/in/marioperezpereira/" },
];

const APTITUDES = [
  "Gestión de productos", "Gestión de proyectos", "Gestión de personas", "Gestión de crisis",
  "Liderazgo de equipos", "Liderazgo de equipos multidisciplinarios", "Habilidades sociales",
  "Comunicación", "Toma de decisiones", "Mejora continua", "Mejora de procesos",
  "Metodologías ágiles", "Estrategia empresarial", "Estrategia del producto", "Estrategia digital",
  "Analítica de datos", "Análisis de negocio", "Toma de decisiones basadas en datos",
  "Experiencia de usuario", "Diseño de la interfaz de usuario", "Investigación de mercado",
  "Comportamiento del usuario", "Requisitos de productos", "Lanzamiento de productos",
  "Para empresas (B2B)", "Negociación", "Trabajo en equipo", "Resolución de problemas",
];

const CERTIFICACIONES = [
  "Product Executive Certificate",
  "Certified Scrum Product Owner",
  "Certified Scrum Master",
  "Retention + Engagement Deep Dive",
  "Certified Mentor",
  "Diplôme d'Études en Langue Française",
  "First Certificate Exam",
  "Advanced Open Water Diver",
];

const RECONOCIMIENTOS = [
  { titulo: "Best Startup Products & Services. Early Stage", contexto: "Spain Startup & Investor Summit · Nonabox", fecha: "oct. 2013" },
  { titulo: "Finalista StartCamp Madrid 2013", contexto: "Wayra — Telefónica · Proyecto iVecinos", fecha: "mar. 2013" },
  { titulo: "Tercer puesto campeonato nacional de capoeira", contexto: "", fecha: "may. 2009" },
  { titulo: "Primer puesto campeonato local de ajedrez", contexto: "", fecha: "jun. 1995" },
];

const IDIOMAS = [
  { lengua: "Español", nivel: "Competencia bilingüe o nativa" },
  { lengua: "Inglés", nivel: "Competencia bilingüe o nativa" },
  { lengua: "Francés", nivel: "Competencia básica profesional" },
  { lengua: "Lengua de signos", nivel: "Competencia básica" },
];

const TICKER_BASE = ["GLOSSYBOX", "NONABOX", "IE BUSINESS SCHOOL", "LETGO", "MAKAI", "CARPA FINANCIEROS", "·"];

const PALABRAS_FIN = ["operaciones", "producto", "personas"];

function RecsCarousel({ recs }: { recs: Rec[] }) {
  const [i, setI] = useState(0);
  const total = recs.length;
  const r = recs[i];
  const touchX = useRef(0);

  const go = (next: number) => setI(((next % total) + total) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "ArrowRight") go(i + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i]);

  return (
    <section className="vE-recs" id="recomendaciones">
      <div className="vE-recs__hd">
        <span className="vE-recs__k">— RECOMENDACIONES —</span>
        <h2 className="vE-recs__h">Lo que dicen<br />de <em>trabajar conmigo.</em></h2>
        <div className="vE-recs__meta">
          <span>{String(i + 1).padStart(2, "0")} <i>/</i> {String(total).padStart(2, "0")}</span>
          <a href="https://www.linkedin.com/in/pacres/" className="vE-recs__src" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
        </div>
      </div>

      <div
        className="vE-recs__stage"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <button className="vE-recs__nav" onClick={() => go(i - 1)} aria-label="Anterior">←</button>
        <article key={i} className="vE-rec">
          <div className="vE-rec__mark">&ldquo;</div>
          <p className="vE-rec__txt">{r.texto}</p>
          <footer className="vE-rec__by">
            <Image
              src={r.photo}
              alt={r.autor}
              width={64}
              height={64}
              style={{ borderRadius: "999px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }}
            />
            <div className="vE-rec__who">
              <strong>{r.autor}</strong>
              <span>{r.cargo}</span>
            </div>
            <a className="vE-rec__link" href={r.href} target="_blank" rel="noopener noreferrer">Ver en LinkedIn ↗</a>
          </footer>
        </article>
        <button className="vE-recs__nav" onClick={() => go(i + 1)} aria-label="Siguiente">→</button>
      </div>

      <div className="vE-recs__dots" role="tablist" aria-label="Recomendaciones" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {recs.map((_, k) => (
          <button
            key={k}
            className={"vE-recs__dot" + (k === i ? " is-on" : "")}
            onClick={() => setI(k)}
            aria-label={`Recomendación ${k + 1}`}
            role="tab"
          >
            <i>{String(k + 1).padStart(2, "0")}</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function AnimatedCyclingWord({ words, index }: { words: string[]; index: number }) {
  const [shownIdx, setShownIdx] = useState(index);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    if (index === shownIdx) return;
    setPhase("out");
    const exitMs = words[shownIdx].length * 45 + 80;
    const t = setTimeout(() => { setShownIdx(index); setPhase("in"); }, exitMs);
    return () => clearTimeout(t);
  }, [index]);

  const word = words[shownIdx];
  return (
    <>
      {word.split("").map((ch, i) => (
        <span
          key={`${shownIdx}-${i}`}
          className={phase === "out" ? "vE-ch-out" : phase === "in" ? "vE-ch-in" : ""}
          style={{ animationDelay: phase === "out" ? `${(word.length - 1 - i) * 45}ms` : `${i * 45}ms` }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </>
  );
}

function ThemeToggle({ theme, onChange }: { theme: "light" | "dark"; onChange: (t: "light" | "dark") => void }) {
  return (
    <div className="vE-themeT" role="radiogroup" aria-label="Tema">
      <button type="button" role="radio" aria-checked={theme === "light"} className={"vE-themeT__b" + (theme === "light" ? " is-on" : "")} onClick={() => onChange("light")}>
        <i className="vE-themeT__ico vE-themeT__ico--sun" aria-hidden="true" />
        <span>Claro</span>
      </button>
      <button type="button" role="radio" aria-checked={theme === "dark"} className={"vE-themeT__b" + (theme === "dark" ? " is-on" : "")} onClick={() => onChange("dark")}>
        <i className="vE-themeT__ico vE-themeT__ico--moon" aria-hidden="true" />
        <span>Oscuro</span>
      </button>
    </div>
  );
}

const STYLES = `
.vE {
  --ink:       #1a1a1a;
  --ink-2:     #2b2b2b;
  --ink-3:     #555;
  --ink-4:     #888;
  --bg:        #f7f4ed;
  --bg-2:      #efeae0;
  --paper:     #ffffff;
  --line:      #1a1a1a;
  --line-soft: rgba(26,26,26,.18);
  --accent:    #d24a1a;
  --accent-2:  #1b3a5b;
  --hl:        #f7d774;
  --ok:        #3a7a4f;
}
.vE[data-theme="dark"] {
  --ink:       #f1ebe0;
  --ink-2:     #d8d2c6;
  --ink-3:     #a39c8d;
  --ink-4:     #6e6757;
  --bg:        #14130f;
  --bg-2:      #1c1a15;
  --paper:     #1e1c17;
  --line:      #f1ebe0;
  --line-soft: rgba(241,235,224,.18);
  --accent:    #ff6a35;
  --accent-2:  #7fb8ff;
  --hl:        #b58f1e;
  --ok:        #6fcf97;
}

.vE.wf-page {
  background: var(--bg);
  color: var(--ink);
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  letter-spacing: -.005em;
  -webkit-font-smoothing: antialiased;
  display: grid;
  grid-template-columns: 180px 1fr;
  min-height: 100vh;
}
.vE *, .vE *::before, .vE *::after { box-sizing: border-box; }
.vE p { margin: 0 0 .8em; }
.vE h1, .vE h2, .vE h3 { margin: 0; font-weight: 600; letter-spacing: -.02em; }
.vE a:not(.wf-btn) { color: inherit; text-decoration: none; cursor: pointer; }
.vE a.wf-btn { text-decoration: none; cursor: pointer; }
.vE ul { margin: 0; padding: 0 0 0 1.1em; }
.vE li { margin: .15em 0; }

/* Buttons */
.vE .wf-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px; border-radius: 999px;
  border: 1px solid var(--line); color: var(--ink); background: transparent;
  font: 500 13px/1 "IBM Plex Sans", system-ui, sans-serif;
  letter-spacing: -.005em;
  transition: transform .12s, background .12s, color .12s;
  cursor: pointer;
}
.vE .wf-btn:hover { transform: translateY(-1px); }
.vE .wf-btn--primary { background: var(--ink); color: var(--bg); }
.vE .wf-btn--ghost   { border-color: var(--line-soft); color: var(--ink-3); }

/* Rail */
.vE-rail {
  padding: 32px 24px;
  border-right: 1px solid var(--line);
  display: flex; flex-direction: column; justify-content: space-between;
  position: sticky; top: 0; align-self: start; height: 100vh; min-height: 600px;
}
.vE-rail__top { display: flex; align-items: flex-start; gap: 8px; }
.vE-rail__brand { font: 700 18px "IBM Plex Mono", monospace; letter-spacing: -.02em; }
.vE-rail__year { font: 500 12px "IBM Plex Mono", monospace; color: var(--ink-3); margin: 6px 0 0 6px; flex: 1; }
.vE-rail__burger {
  display: none; appearance: none; background: transparent; border: 1px solid var(--line);
  width: 36px; height: 36px; border-radius: 999px; padding: 0; cursor: pointer;
  align-items: center; justify-content: center; flex-direction: column; gap: 4px;
}
.vE-rail__burger span { display: block; width: 14px; height: 1.5px; background: var(--ink); border-radius: 1px; transition: transform .2s, opacity .2s; }
.vE-rail[data-nav-open="1"] .vE-rail__burger span:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
.vE-rail[data-nav-open="1"] .vE-rail__burger span:nth-child(2) { opacity: 0; }
.vE-rail[data-nav-open="1"] .vE-rail__burger span:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }
.vE-rail__nav { display: flex; flex-direction: column; gap: 14px; margin-top: 48px; }
.vE-rail__nav a { display: flex; align-items: baseline; gap: 8px; font: 500 12px "IBM Plex Sans"; color: var(--ink-2); white-space: nowrap; }
.vE-rail__nav a:hover { color: var(--accent); }
.vE-rail__nav a i { font: 500 10px "IBM Plex Mono", monospace; color: var(--ink-4); font-style: normal; width: 18px; }
.vE-rail__bot { font: 500 11px "IBM Plex Mono", monospace; color: var(--ink-3); line-height: 1.8; display: flex; flex-direction: column; gap: 18px; }
.vE-rail__loc { display: flex; flex-direction: column; }
.vE-rail__live { display: flex; align-items: center; gap: 6px; color: var(--accent); }
.vE-rail__live span { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); display: inline-block; }

/* Theme toggle */
.vE-themeT { display: flex; padding: 3px; gap: 3px; border: 1px solid var(--line); border-radius: 999px; background: color-mix(in srgb, var(--paper) 30%, transparent); overflow: hidden; }
.vE-themeT__b { appearance: none; background: transparent; border: 0; cursor: pointer; flex: 1; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 5px; border-radius: 999px; font: 500 10px/1 "IBM Plex Mono", monospace; letter-spacing: 0; text-transform: uppercase; color: var(--ink-3); transition: background .15s, color .15s; }
.vE-themeT__b:hover { color: var(--ink); }
.vE-themeT__b.is-on { background: var(--ink); color: var(--bg); }
.vE-themeT__ico { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: currentColor; position: relative; }
.vE-themeT__ico--sun { width: 8px; height: 8px; box-shadow: 0 -5px 0 -2.5px currentColor, 0 5px 0 -2.5px currentColor, -5px 0 0 -2.5px currentColor, 5px 0 0 -2.5px currentColor, -4px -4px 0 -2.5px currentColor, 4px 4px 0 -2.5px currentColor, -4px 4px 0 -2.5px currentColor, 4px -4px 0 -2.5px currentColor; }
.vE-themeT__ico--moon { background: transparent; box-shadow: inset -3px -1px 0 0 currentColor; transform: rotate(-25deg); }

/* Main */
.vE-main { padding: 32px 56px 64px; max-width: 1100px; min-width: 0; }

/* Hero */
.vE-hero { padding-bottom: 48px; border-bottom: 1px solid var(--line); }
.vE-hero__meta { display: flex; gap: 10px; flex-wrap: wrap; font: 500 11px "IBM Plex Mono", monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); padding-bottom: 24px; }
.vE-hero__meta span:first-child { color: var(--accent); }
.vE-h1 { display: flex; flex-direction: column; font-family: "Instrument Serif", Georgia, serif; font-weight: 400; line-height: .92; letter-spacing: -.04em; padding: 24px 0; }
.vE-h1__l1 { font-size: 110px; }
.vE-h1__l2 { font-size: 110px; padding-left: 80px; color: var(--ink-3); }
.vE-h1__l2 em { color: var(--accent); font-style: italic; }
.vE-h1__l3 { font-size: 110px; }
.vE-h1__l4 { font-size: 110px; padding-left: 80px; color: var(--ink-3); }
.vE-h1__l4 em { color: var(--accent); font-style: italic; }
.vE-hero__bot { display: grid; grid-template-columns: 180px 1fr; gap: 32px; align-items: end; margin-top: 24px; }
.vE-photo-ph { width: 180px; height: 220px; background: repeating-linear-gradient(135deg, var(--line-soft) 0 1px, transparent 1px 14px); border: 1px solid var(--line-soft); display: flex; align-items: center; justify-content: center; color: var(--ink-4); font: 500 10px "IBM Plex Mono", monospace; letter-spacing: .12em; text-transform: uppercase; }
.vE-photo-wrap { width: 180px; height: 220px; flex-shrink: 0; overflow: hidden; border: 1px solid var(--line-soft); }
.vE-photo-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
.vE-hero__pitch p { font-size: 17px; color: var(--ink-2); max-width: 56ch; margin-bottom: 18px; line-height: 1.5; }
.vE-hero__ctas { display: flex; gap: 10px; }

/* Ticker */
.vE-ticker { padding: 18px 0; border-bottom: 1px solid var(--line); overflow: hidden; }
.vE-ticker__lane { display: flex; gap: 32px; align-items: center; animation: vEscroll 28s linear infinite; white-space: nowrap; }
.vE-ticker__t { font-family: "Instrument Serif", Georgia, serif; font-size: 32px; color: var(--ink); }
.vE-ticker__t:nth-child(odd) { color: var(--accent); font-style: italic; }
@keyframes vEscroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* Método */
.vE-mani { padding: 64px 0; border-bottom: 1px solid var(--line); }
.vE-mani__k { font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .2em; color: var(--accent); margin-bottom: 16px; }
.vE-mani__h { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 60px; line-height: 1; letter-spacing: -.02em; margin-bottom: 48px; }
.vE-mani__rows { display: flex; flex-direction: column; }
.vE-mani__row { display: grid; grid-template-columns: 140px 1fr; gap: 32px; padding: 32px 0; border-top: 1px solid var(--line); align-items: start; }
.vE-mani__num { font-family: "Instrument Serif", Georgia, serif; font-size: 96px; line-height: .9; color: var(--accent); letter-spacing: -.04em; }
.vE-mani__txt h3 { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 36px; margin-bottom: 12px; }
.vE-mani__txt p { font-size: 17px; color: var(--ink-2); max-width: 60ch; line-height: 1.5; margin: 0; }

/* Casos */
.vE-cases { padding: 64px 0; border-bottom: 1px solid var(--line); }
.vE-cases__hd { margin-bottom: 40px; }
.vE-cases__k { font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .2em; color: var(--accent); display: block; margin-bottom: 14px; }
.vE-cases__h { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 60px; line-height: 1; letter-spacing: -.02em; }
.vE-case { display: grid; grid-template-columns: 240px 1fr 80px; gap: 32px; padding: 40px 0; border-top: 1px solid var(--line); position: relative; }
.vE-case__l { font: 500 12px "IBM Plex Mono", monospace; }
.vE-case__yr { color: var(--accent); letter-spacing: .08em; margin-bottom: 16px; }
.vE-case__co { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 28px; line-height: 1.05; letter-spacing: -.015em; margin-bottom: 6px; color: var(--ink); }
.vE-case__tipo { color: var(--ink-3); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
.vE-case__h { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 32px; line-height: 1.1; margin-bottom: 12px; letter-spacing: -.015em; }
.vE-case__lead { font-size: 16px; color: var(--ink-2); font-style: italic; max-width: 60ch; margin-bottom: 14px; line-height: 1.5; }
.vE-case__group { margin-top: 16px; }
.vE-case__sub { font: 500 11px "IBM Plex Mono", monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); margin-bottom: 6px; }
.vE-case__group ul { font-size: 14px; color: var(--ink-2); padding-left: 1.1em; }
.vE-case__group ul li { margin: 4px 0; line-height: 1.45; }
.vE-case__num { font: 500 11px "IBM Plex Mono", monospace; color: var(--ink-4); letter-spacing: .12em; text-align: right; }

/* Recomendaciones */
.vE-recs { padding: 64px 0; border-bottom: 1px solid var(--line); }
.vE-recs__hd { display: grid; grid-template-columns: 1fr auto; align-items: end; column-gap: 32px; row-gap: 14px; margin-bottom: 40px; }
.vE-recs__k { grid-column: 1 / -1; font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .2em; color: var(--accent); }
.vE-recs__h { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 60px; line-height: 1; letter-spacing: -.02em; }
.vE-recs__h em { color: var(--accent); font-style: italic; }
.vE-recs__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .14em; color: var(--ink-3); text-transform: uppercase; }
.vE-recs__meta > span:first-child { font-family: "Instrument Serif", Georgia, serif; font-size: 28px; letter-spacing: -.01em; color: var(--ink); text-transform: none; line-height: 1; }
.vE-recs__meta > span:first-child i { color: var(--accent); font-style: normal; padding: 0 4px; }
.vE-recs__src { color: var(--accent); cursor: pointer; }
.vE-recs__stage { display: grid; grid-template-columns: 56px 1fr 56px; gap: 12px; align-items: stretch; }
.vE-recs__nav { appearance: none; background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: 999px; width: 56px; height: 56px; align-self: center; font: 400 22px "Instrument Serif", Georgia, serif; cursor: pointer; transition: background .12s, color .12s, transform .12s; }
.vE-recs__nav:hover { background: var(--ink); color: var(--bg); transform: translateY(-1px); }
.vE-rec { background: var(--ink); color: var(--bg); padding: 56px 64px 36px; border-radius: 4px; display: grid; grid-template-rows: auto 1fr auto; gap: 24px; min-height: 360px; animation: vERecIn .35s cubic-bezier(.2,.7,.2,1); }
@keyframes vERecIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.vE-rec__mark { font-family: "Instrument Serif", Georgia, serif; font-size: 120px; line-height: .4; color: var(--accent); height: 36px; }
.vE-rec__txt { font-family: "Instrument Serif", Georgia, serif; font-size: 30px; line-height: 1.32; letter-spacing: -.01em; max-width: 56ch; margin: 0; color: var(--bg); text-wrap: pretty; }
.vE-rec__by { display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,.18); }
.vE-rec__who { display: flex; flex-direction: column; gap: 2px; }
.vE-rec__who strong { font: 500 15px "IBM Plex Sans", sans-serif; }
.vE-rec__who span   { font: 400 13px "IBM Plex Sans", sans-serif; opacity: .72; }
.vE-rec__link { color: var(--accent); font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .12em; text-transform: uppercase; padding: 8px 12px; border: 1px solid rgba(210,74,26,.4); border-radius: 999px; white-space: nowrap; text-decoration: none; }
.vE-rec__link:hover { background: var(--accent); color: var(--ink); border-color: var(--accent); }
.vE[data-theme="dark"] .vE-rec__link { border-color: rgba(255,106,53,.4); }
.vE-recs__dots { display: grid; gap: 4px; margin-top: 24px; padding: 0 68px; }
.vE-recs__dot { appearance: none; background: transparent; border: 0; padding: 10px 0 6px; cursor: pointer; border-top: 2px solid var(--line-soft); transition: border-color .15s, color .15s; font: 500 9px "IBM Plex Mono", monospace; letter-spacing: .08em; color: var(--ink-4); }
.vE-recs__dot:hover { border-top-color: var(--ink-3); color: var(--ink-3); }
.vE-recs__dot.is-on { border-top-color: var(--accent); color: var(--accent); }
.vE-recs__dot i { font-style: normal; }

/* Info grid */
.vE-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; padding: 64px 0; border-bottom: 1px solid var(--line); }
.vE-info { padding: 24px 0; }
.vE-info--wide { grid-column: span 2; }
.vE-info__k { font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .2em; color: var(--accent); margin-bottom: 18px; }
.vE-info__list { list-style: none; padding: 0; margin: 0; }
.vE-info__list li { padding: 10px 0; border-bottom: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 2px; }
.vE-info__list li strong { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 18px; }
.vE-info__list li span { font-size: 13px; color: var(--ink-3); }
.vE-info__list li small { font: 500 10px "IBM Plex Mono", monospace; color: var(--ink-4); letter-spacing: .08em; margin-top: 2px; }
.vE-info__nums li { flex-direction: row; gap: 12px; align-items: baseline; }
.vE-info__nums li i { font: 500 11px "IBM Plex Mono", monospace; color: var(--accent); font-style: normal; }
.vE-awards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.vE-award { padding: 16px; border: 1px solid var(--line); }
.vE-award__y { font: 500 10px "IBM Plex Mono", monospace; color: var(--accent); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
.vE-award__t { font-family: "Instrument Serif", Georgia, serif; font-size: 20px; line-height: 1.15; }
.vE-award__c { font-size: 12px; color: var(--ink-3); margin-top: 4px; }

/* Aptitudes */
.vE-skills { padding: 48px 0 64px; border-bottom: 1px solid var(--line); }
.vE-skills__k { font: 500 12px "IBM Plex Mono", monospace; letter-spacing: .2em; color: var(--ink-3); margin-bottom: 20px; }
.vE-skills__list { margin: 0; padding: 0; font-family: "Instrument Serif", Georgia, serif; font-size: 19px; line-height: 1.6; letter-spacing: -.005em; color: var(--ink-4); max-width: 800px; }
.vE-skills__list span { color: var(--ink-3); white-space: nowrap; }
.vE-skills__list span[data-line-start="1"] .vE-dot { display: none; }
.vE-skills__list em { color: var(--ink-4); font-style: normal; padding: 0 .2em; }

/* Skill shine — mismo color que los span de aptitudes (--ink-3) */
.vE-skill-shine {
  text-decoration: none;
  color: var(--ink-3);
  white-space: nowrap;
  background: linear-gradient(100deg, var(--ink-3) 0%, var(--ink-3) 35%, rgba(253,224,71,0.15) 44%, rgba(253,224,71,0.85) 48%, rgba(251,191,36,1.0) 50%, rgba(253,224,71,0.85) 52%, rgba(253,224,71,0.15) 56%, var(--ink-3) 65%, var(--ink-3) 100%);
  background-size: 300% 100%;
  background-position: 100% center;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vEGoldTextSweep 10s ease-in-out infinite;
}
.vE-skill-shine .vE-dot { -webkit-text-fill-color: var(--ink-4); }
@keyframes vEGoldTextSweep {
  0%, 87%     { background-position: 100% center; }
  89.5%       { background-position: 50% center; }
  92%         { background-position: 0% center; }
  92.1%, 100% { background-position: 100% center; }
}

/* CTA Final */
.vE-end { padding: 80px 0 5rem; text-align: left; }
.vE-end__h { font-family: "Instrument Serif", Georgia, serif; font-weight: 400; font-size: 140px; line-height: .9; letter-spacing: -.04em; margin-bottom: 56px; padding-bottom: .16em; }
.vE-end__h em { color: var(--accent); font-style: italic; }
@keyframes vEChIn  { from { opacity: 0; transform: translateX(-0.2em); } to { opacity: 1; transform: none; } }
@keyframes vEChOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(0.2em); } }
.vE-ch-in  { display: inline-block; animation: vEChIn  0.22s cubic-bezier(.2,.7,.2,1) both; }
.vE-ch-out { display: inline-block; animation: vEChOut 0.18s cubic-bezier(.6,0,.8,1) both; }
.vE-end__row { display: flex; gap: 12px; margin-bottom: 60px; margin-top: 20px; flex-wrap: wrap; }
.vE-end__btn { font-size: 14px !important; padding: 14px 22px !important; }
.vE-end__foot { display: flex; gap: 16px; flex-wrap: wrap; font: 500 11px "IBM Plex Mono", monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); padding-top: 32px; border-top: 1px solid var(--line); }
.vE .vE-end__date { font: 500 11px "IBM Plex Mono", monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-4); text-align: center; margin-top: 2rem; }
.vE-end__foot span:nth-child(even) { color: var(--accent); }

/* Mid desktop (901px – 1200px) */
@media (max-width: 1200px) and (min-width: 901px) {
  .vE-h1__l1, .vE-h1__l2, .vE-h1__l3, .vE-h1__l4 { font-size: 72px; }
  .vE-h1__l2, .vE-h1__l4 { padding-left: 48px; }
  .vE-end__h { font-size: 100px; }
}

/* Mobile (≤ 900px) */
@media (max-width: 900px) {
  .vE.wf-page { display: block; }
  .vE-rail { position: sticky; top: 0; z-index: 50; height: auto; min-height: 0; display: flex; flex-direction: column; padding: 0; border-right: 0; border-bottom: 1px solid var(--line); background: var(--bg); }
  .vE-rail__top { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 14px 20px; }
  .vE-rail__brand { flex-shrink: 0; }
  .vE-rail__year { margin: 4px 0 0 0; flex: 1; }
  .vE-rail__burger { display: inline-flex; flex-shrink: 0; }
  .vE-rail__nav, .vE-rail__bot { overflow: hidden; max-height: 0; padding-top: 0; padding-bottom: 0; margin: 0; transition: max-height .25s cubic-bezier(.2,.7,.2,1), padding .2s, opacity .15s; opacity: 0; }
  .vE-rail__nav { padding-left: 20px; padding-right: 20px; }
  .vE-rail__bot { padding-left: 20px; padding-right: 20px; flex-direction: column; gap: 14px; }
  .vE-rail[data-nav-open="1"] .vE-rail__nav { max-height: 360px; padding-top: 8px; padding-bottom: 18px; opacity: 1; border-top: 1px solid var(--line-soft); }
  .vE-rail[data-nav-open="1"] .vE-rail__bot { max-height: 200px; padding-top: 14px; padding-bottom: 20px; opacity: 1; border-top: 1px solid var(--line-soft); }
  .vE-rail__nav a { font-size: 16px; }
  .vE-rail__nav a i { font-size: 11px; width: 22px; }
  .vE-rail__loc { flex-direction: row; gap: 16px; flex-wrap: wrap; }
  .vE-main { padding: 24px 20px 48px; max-width: 100%; }
  .vE-hero { padding-bottom: 32px; }
  .vE-hero__meta { gap: 6px; font-size: 10px; padding-bottom: 16px; }
  .vE-h1 { padding: 12px 0; }
  .vE-h1__l1, .vE-h1__l2, .vE-h1__l3, .vE-h1__l4 { font-size: 56px; }
  .vE-h1__l2, .vE-h1__l4 { padding-left: 32px; }
  .vE-hero__bot { grid-template-columns: 1fr; gap: 20px; margin-top: 20px; }
  .vE-photo-ph { width: 100%; height: 300px; }
  .vE-photo-wrap { width: 100%; height: 300px; }
  .vE-photo-wrap img { object-position: center 45%; }
  .vE-hero__pitch p { font-size: 15px; }
  .vE-hero__ctas { flex-wrap: wrap; }
  .vE-ticker__t { font-size: 22px; }
  .vE-mani { padding: 40px 0; }
  .vE-mani__h { font-size: 36px; margin-bottom: 24px; }
  .vE-mani__row { grid-template-columns: 64px 1fr; gap: 18px; padding: 22px 0; }
  .vE-mani__num { font-size: 56px; }
  .vE-mani__txt h3 { font-size: 24px; margin-bottom: 8px; }
  .vE-mani__txt p { font-size: 15px; }
  .vE-cases { padding: 40px 0; }
  .vE-cases__h { font-size: 36px; }
  .vE-cases__hd { margin-bottom: 24px; }
  .vE-case { grid-template-columns: 1fr; gap: 14px; padding: 28px 0; }
  .vE-case__l { display: flex; flex-direction: column; gap: 4px; }
  .vE-case__yr { margin-bottom: 4px; font-size: 11px; }
  .vE-case__co { font-size: 22px; }
  .vE-case__h { font-size: 22px; margin-bottom: 8px; }
  .vE-case__lead { font-size: 14px; }
  .vE-case__group ul { font-size: 13px; }
  .vE-case__num { position: absolute; top: 28px; right: 0; font-size: 10px; }
  .vE-recs { padding: 40px 0; }
  .vE-recs__hd { grid-template-columns: 1fr; }
  .vE-recs__h { font-size: 36px; }
  .vE-recs__meta { flex-direction: row; align-items: center; gap: 12px; }
  .vE-recs__meta > span:first-child { font-size: 22px; }
  .vE-recs__stage { grid-template-columns: 1fr; }
  .vE-recs__nav { display: none; }
  .vE-rec { padding: 32px 22px 22px; min-height: 0; }
  .vE-rec__mark { font-size: 80px; height: 22px; }
  .vE-rec__txt { font-size: 20px; line-height: 1.35; }
  .vE-rec__by { grid-template-columns: auto 1fr; row-gap: 12px; }
  .vE-rec__link { grid-column: 1 / -1; justify-self: start; }
  .vE-recs__dots { padding: 0; gap: 3px; margin-top: 16px; }
  .vE-recs__dot { font-size: 0; padding: 8px 0 4px; }
  .vE-grid { grid-template-columns: 1fr; gap: 18px; padding: 40px 0; }
  .vE-info--wide { grid-column: 1; }
  .vE-awards { grid-template-columns: 1fr; }
  .vE-skills { padding: 32px 0 40px; }
  .vE-skills__list { font-size: 18px; }
  .vE-end { padding: 48px 0 5rem; }
  .vE-end__h { font-size: 64px; margin-bottom: 56px; padding-bottom: .14em; }
  .vE-end__row { gap: 10px; margin-bottom: 36px; margin-top: 20px; }
  .vE-end__foot { gap: 10px; font-size: 10px; padding-top: 20px; }
}

@media (max-width: 480px) {
  .vE-h1__l1, .vE-h1__l2, .vE-h1__l3, .vE-h1__l4 { font-size: 44px; }
  .vE-h1__l2, .vE-h1__l4 { padding-left: 20px; }
  .vE-end__h { font-size: 52px; }
}
`;

export default function Manifesto() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [navOpen, setNavOpen] = useState(false);
  const [palabraIdx, setPalabraIdx] = useState(0);
  const skillsRef = useRef<HTMLParagraphElement>(null);
  const physicsActiveRef = useRef(false);
  const restoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("manifesto-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    document.body.style.background = theme === "dark" ? "#14130f" : "#f7f4ed";
    return () => { document.body.style.background = ""; };
  }, [theme]);

  useEffect(() => {
    const t = setInterval(() => setPalabraIdx(p => (p + 1) % PALABRAS_FIN.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const update = () => {
      const container = skillsRef.current;
      if (!container) return;
      const firstSpan = container.querySelector<HTMLSpanElement>("span:not([data-line-start])");
      const spans = container.querySelectorAll<HTMLSpanElement>("span[data-line-start]");
      if (!spans.length) return;
      // Start clean: no dots
      spans.forEach(s => { s.dataset.lineStart = "1"; });
      void container.offsetHeight;
      // Process left-to-right: tentatively add dot to each span, keep it only if the span
      // stays on the same visual line as its predecessor. Each decision is committed before
      // the next span is processed — no oscillation.
      let prevTop = firstSpan ? Math.round(firstSpan.getBoundingClientRect().top) : 0;
      spans.forEach(span => {
        span.dataset.lineStart = "0"; // try dot
        const myTop = Math.round(span.getBoundingClientRect().top); // forces reflow
        if (myTop !== prevTop) {
          span.dataset.lineStart = "1"; // dot causes overflow → revert
          prevTop = Math.round(span.getBoundingClientRect().top);
        } else {
          prevTop = myTop;
        }
      });
    };
    update();
    document.fonts.ready.then(update);
    const t = setTimeout(update, 500);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
    };
  }, []);

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
      const M = (mod as any).default ?? mod;
      Engine = M.Engine; Bodies = M.Bodies; Body = M.Body; World = M.World; Runner = M.Runner;
      if (!Engine) throw new Error("matter-js no cargó");
    } catch (e) {
      console.error("Error cargando matter-js:", e);
      physicsActiveRef.current = false;
      return;
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;";
    document.body.appendChild(overlay);

    const pacrEl = document.querySelector("[data-pacres]") as HTMLElement | null;
    const pacrRect = pacrEl?.getBoundingClientRect();

    const letterData: { char: string; cx: number; cy: number; w: number; h: number; fontSize: string; fontFamily: string; fontWeight: string; color: string; isGradient: boolean }[] = [];

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
            letterData.push({ char: text[i], cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height, fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, color: cs.color, isGradient: false });
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

    const main = document.querySelector(".vE") as HTMLElement | null;
    if (main) { main.style.transition = "opacity 0.15s"; main.style.opacity = "0"; }

    const engine = Engine.create({ gravity: { x: 0, y: 2 } });
    const floor = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 30, window.innerWidth * 3, 60, { isStatic: true });
    const wallL = Bodies.rectangle(-30, window.innerHeight / 2, 60, window.innerHeight * 3, { isStatic: true });
    const wallR = Bodies.rectangle(window.innerWidth + 30, window.innerHeight / 2, 60, window.innerHeight * 3, { isStatic: true });
    const hardCeilingY = -window.scrollY;
    const ceiling = Bodies.rectangle(window.innerWidth / 2, hardCeilingY - 30, window.innerWidth * 3, 60, { isStatic: true, restitution: 0.3, friction: 0.5 });
    World.add(engine.world, [floor, wallL, wallR, ceiling]);
    const FOLD_CEILING_Y = -30; // 30px por encima del top del viewport

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

    let gyroFired = false;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      if (Math.abs(e.gamma) < 3 && Math.abs(e.beta) < 3) return;
      gyroFired = true;
      const maxTilt = 45;
      engine.gravity.x = Math.max(-1, Math.min(1, e.gamma / maxTilt)) * 2;
      engine.gravity.y = Math.max(-1, Math.min(1, e.beta / maxTilt)) * 2;
    };
    window.addEventListener("deviceorientation", handleOrientation);

    const handleTouchGravity = (e: TouchEvent) => {
      if (gyroFired) return;
      const touch = e.touches[0];
      if (!touch) return;
      engine.gravity.x = ((touch.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 2;
      engine.gravity.y = ((touch.clientY - window.innerHeight / 2) / (window.innerHeight / 2)) * 2;
    };
    window.addEventListener("touchmove", handleTouchGravity, { passive: true });

    const handleMouseGravity = (e: MouseEvent) => {
      engine.gravity.x = ((e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 2;
      engine.gravity.y = ((e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)) * 2;
    };
    window.addEventListener("mousemove", handleMouseGravity);

    let stopped = false;
    let animFrame: number;
    // Trackea qué letras ya han bajado por debajo del techo — solo esas no pueden volver a subir
    const hasCrossedCeiling = new Array(bodies.length).fill(false);
    const animate = () => {
      if (stopped) return;
      for (let i = 0; i < letterSpans.length; i++) {
        const b = bodies[i];
        if (b.position.y >= FOLD_CEILING_Y) hasCrossedCeiling[i] = true;
        if (hasCrossedCeiling[i] && b.position.y < FOLD_CEILING_Y) {
          Body.setPosition(b, { x: b.position.x, y: FOLD_CEILING_Y });
          if (b.velocity.y < 0) Body.setVelocity(b, { x: b.velocity.x * 0.9, y: -b.velocity.y * 0.5 });
        }
        const { x, y } = b.position;
        letterSpans[i].style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${b.angle}rad)`;
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
        physicsActiveRef.current = false;
      }, 750);
    };

    const cleanupListeners = () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouseGravity);
      window.removeEventListener("touchmove", handleTouchGravity);
    };

    overlay.style.pointerEvents = "auto";
    const isTouchDevice = "ontouchstart" in window;
    if (isTouchDevice) {
      let lastTapTime = 0;
      const handleDoubleTap = () => {
        const now = Date.now();
        if (now - lastTapTime < 350) {
          overlay.removeEventListener("touchend", handleDoubleTap);
          cleanupListeners();
          restore();
        }
        lastTapTime = now;
      };
      overlay.addEventListener("touchend", handleDoubleTap);
    } else {
      overlay.style.cursor = "pointer";
      overlay.addEventListener("click", () => {
        cleanupListeners();
        restore();
      }, { once: true });
    }
    restoreRef.current = restore;
  }, []);

  const handleThemeChange = (t: "light" | "dark") => {
    setTheme(t);
    localStorage.setItem("manifesto-theme", t);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="vE wf-page" data-theme={theme}>

        {/* RAIL LATERAL FIJO */}
        <aside className="vE-rail" data-nav-open={navOpen ? "1" : "0"}>
          <div className="vE-rail__top">
            <div className="vE-rail__brand">pacr.es</div>
            <div className="vE-rail__year">&apos;{new Date().getFullYear().toString().slice(-2)}</div>
            <button
              type="button"
              className="vE-rail__burger"
              aria-label={navOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={navOpen}
              onClick={() => setNavOpen(v => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
          <nav className="vE-rail__nav" onClick={() => setNavOpen(false)}>
            <a href="#hola"><i>00</i>Hola</a>
            <a href="#metodo"><i>01</i>Método</a>
            <a href="#casos"><i>02</i>Casos</a>
            <a href="#recomendaciones"><i>03</i>Recomendaciones</a>
            <a href="#info"><i>04</i>Info</a>
            <a href="#contacto"><i>05</i>Contacto</a>
          </nav>
          <div className="vE-rail__bot">
            <ThemeToggle theme={theme} onChange={handleThemeChange} />
            <div className="vE-rail__loc">
              <div>Madrid</div>
              <div>UTC+1</div>
              <div className="vE-rail__live"><span />open to work</div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="vE-main">

          {/* HERO */}
          <section className="vE-hero" id="hola">
            <div className="vE-hero__meta">
              <span>★</span>
              <span>Pablo Crespo Velasco</span>
              <span>·</span>
              <span>Director de Operaciones</span>
              <span>·</span>
              <span>2011 → ahora</span>
            </div>
            <h1 className="vE-h1">
              <span className="vE-h1__l1">Organizar</span>
              <span className="vE-h1__l2">el <em>caos.</em></span>
              <span className="vE-h1__l3">Solucionar</span>
              <span className="vE-h1__l4">lo <em>imposible.</em></span>
            </h1>
            <div className="vE-hero__bot">
              <div className="vE-photo-wrap">
                <Image src="/pablo.png" alt="Pablo Crespo Velasco" width={180} height={220} />
              </div>
              <div className="vE-hero__pitch">
                <p>Ingeniero Industrial con curiosidad por el funcionamiento de todo y gran capacidad para comprender y resolver cualquier problema que se presente. Siempre con una sonrisa, los grandes retos me hacen feliz: organizar el caos, solucionar lo imposible, gestionar lo inmanejable.</p>
                <div className="vE-hero__ctas">
                  <a href="mailto:crespovelasco@gmail.com" className="wf-btn wf-btn--primary">Contactar →</a>
                  <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer" className="wf-btn">LinkedIn ↗</a>
                </div>
              </div>
            </div>
          </section>

          {/* TICKER */}
          <section className="vE-ticker">
            <div className="vE-ticker__lane">
              {[...TICKER_BASE, ...TICKER_BASE].map((t, i) => (
                <span key={i} className="vE-ticker__t">{t}</span>
              ))}
            </div>
          </section>

          {/* MÉTODO */}
          <section className="vE-mani" id="metodo">
            <div className="vE-mani__k">— EL MÉTODO —</div>
            <h2 className="vE-mani__h">Tres cosas se me dan bien.</h2>
            <div className="vE-mani__rows">
              <div className="vE-mani__row">
                <div className="vE-mani__num">01</div>
                <div className="vE-mani__txt">
                  <h3>Operaciones</h3>
                  <p>12 años montando, escalando y centralizando operaciones — de 0 a 100k+ envíos, de 1 a 23 países, de 3 a 30 personas en mi equipo.</p>
                </div>
              </div>
              <div className="vE-mani__row">
                <div className="vE-mani__num">02</div>
                <div className="vE-mani__txt">
                  <h3>Producto</h3>
                  <p>8 años como Senior Product Manager en Letgo, coordinando Growth, Platform, B2B y Search&amp;Discovery — A/B tests, OKR y especificaciones en proyectos de alto impacto.</p>
                </div>
              </div>
              <div className="vE-mani__row">
                <div className="vE-mani__num">03</div>
                <div className="vE-mani__txt">
                  <h3>Personas</h3>
                  <p>Contratación, training, mentoring y Scrum Master de equipos de 30 personas con 6 Product Owners. Mentor en IE Business School.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CASOS */}
          <section className="vE-cases" id="casos" data-no-physics>
            <div className="vE-cases__hd">
              <span className="vE-cases__k">— CASOS —</span>
              <h2 className="vE-cases__h">Las paradas del camino</h2>
            </div>
            {EXPERIENCIA.map((e, idx) => (
              <article className="vE-case" key={idx}>
                <div className="vE-case__l">
                  <div className="vE-case__yr">{e.fechas}</div>
                  <div className="vE-case__co">{e.empresa}</div>
                  <div className="vE-case__tipo">{e.tipo}</div>
                </div>
                <div className="vE-case__r">
                  <h3 className="vE-case__h">{e.titulo}</h3>
                  {e.resumen && <p className="vE-case__lead">{e.resumen}</p>}
                  {e.bullets.map(([sub, items], j) => (
                    <div className="vE-case__group" key={j}>
                      {sub && <div className="vE-case__sub">{sub}</div>}
                      <ul>{items.map((it, k) => <li key={k}>{it}</li>)}</ul>
                    </div>
                  ))}
                </div>
                <div className="vE-case__num">{String(idx + 1).padStart(2, "0")} / {String(EXPERIENCIA.length).padStart(2, "0")}</div>
              </article>
            ))}
          </section>

          {/* RECOMENDACIONES */}
          <div data-no-physics><RecsCarousel recs={RECS} /></div>

          {/* INFO GRID */}
          <section className="vE-grid" id="info">
            <div className="vE-info">
              <div className="vE-info__k">— IDIOMAS —</div>
              <ul className="vE-info__list">
                {IDIOMAS.map(l => (
                  <li key={l.lengua}>
                    <strong>{l.lengua}</strong>
                    <span>{l.nivel}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="vE-info">
              <div className="vE-info__k">— CERTIFICACIONES —</div>
              <ul className="vE-info__list vE-info__nums">
                {CERTIFICACIONES.map((c, ci) => (
                  <li key={c}><i>{String(ci + 1).padStart(2, "0")}</i>{c}</li>
                ))}
              </ul>
            </div>
            <div className="vE-info vE-info--wide">
              <div className="vE-info__k">— RECONOCIMIENTOS —</div>
              <div className="vE-awards">
                {RECONOCIMIENTOS.map((r, ri) => (
                  <div className="vE-award" key={ri}>
                    <div className="vE-award__y">{r.fecha}</div>
                    <div className="vE-award__t">{r.titulo}</div>
                    {r.contexto && <div className="vE-award__c">{r.contexto}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* APTITUDES */}
          <section className="vE-skills" id="skills">
            <div className="vE-skills__k">— APTITUDES —</div>
            <p className="vE-skills__list" ref={skillsRef}>
              {APTITUDES.map((a, ai) => (
                <Fragment key={a}>
                  {ai > 0 && " "}
                  {a === "Resolución de problemas" ? (
                    <a href="/lab" className="vE-skill-shine" {...(ai > 0 ? { "data-line-start": "0" } : {})}>
                      {ai > 0 && <em className="vE-dot">· </em>}{a}
                    </a>
                  ) : (
                    <span {...(ai > 0 ? { "data-line-start": "0" } : {})}>
                      {ai > 0 && <em className="vE-dot">· </em>}{a}
                    </span>
                  )}
                </Fragment>
              ))}
            </p>
          </section>

          {/* CTA FINAL */}
          <section className="vE-end" id="contacto">
            <h2 className="vE-end__h">
              ¿Hablamos<br />de <em><AnimatedCyclingWord words={PALABRAS_FIN} index={palabraIdx} />?</em>
            </h2>
            <div className="vE-end__row">
              <a href="mailto:crespovelasco@gmail.com" className="wf-btn wf-btn--primary vE-end__btn">Contactar →</a>
              <a href="https://www.linkedin.com/in/pacres/" target="_blank" rel="noopener noreferrer" className="wf-btn">LinkedIn ↗</a>
              <a href="/CV-Pablo-Crespo.pdf" download className="wf-btn wf-btn--ghost">Descargar CV ↓</a>
            </div>
            <div className="vE-end__foot">
              <span data-pacres onClick={triggerLetterPhysics} style={{cursor:"pointer",userSelect:"none"}}>pacr.es</span>
              <span>★</span>
              <span>Pablo Crespo Velasco</span>
              <span>★</span>
              <span>Madrid &apos;{new Date().getFullYear().toString().slice(-2)}</span>
            </div>
            {pathname === "/home/manifesto" && (
              <p className="vE-end__date">
                Creado el 24 de mayo de 2026
              </p>
            )}
          </section>

        </div>
      </div>
      <HomeNav />
    </>
  );
}
